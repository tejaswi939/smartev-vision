/**
 * eye_tracker.js — MediaPipe Face Mesh Eye Tracking
 * 
 * Uses the MediaPipe Face Mesh solution with iris refinement to track
 * the user's gaze direction in real-time via webcam. The gaze position
 * is mapped to screen coordinates using a calibration procedure.
 * 
 * Computer Vision Pipeline:
 * 1. Webcam captures video frames
 * 2. MediaPipe Face Mesh detects 478 facial landmarks (with iris refinement)
 * 3. Iris landmarks (468-477) are extracted to determine gaze direction
 * 4. Iris position is normalized relative to eye corner landmarks
 * 5. Calibration maps normalized iris position → screen coordinates
 * 6. Exponential moving average smooths the gaze signal
 * 7. Smoothed gaze points are batched and sent to the server API
 * 
 * Landmark Reference (MediaPipe Face Mesh with refineLandmarks):
 *   Left iris center:  468
 *   Left iris ring:    469-472
 *   Right iris center: 473
 *   Right iris ring:   474-477
 *   Left eye outer:    33
 *   Left eye inner:    133
 *   Left eye top:      159
 *   Left eye bottom:   145
 *   Right eye outer:   362
 *   Right eye inner:   263
 *   Right eye top:     386
 *   Right eye bottom:  374
 * 
 * Uses global namespace (no ES6 modules).
 */

(function () {
    'use strict';

    // ========================================================================
    // CONSTANTS
    // ========================================================================

    /** Gaze data collection interval in ms */
    var GAZE_SAMPLE_INTERVAL = 50;

    /** Batch send interval in ms — gaze data is sent to server this often */
    var BATCH_SEND_INTERVAL = 500;

    /** Smoothing factor for exponential moving average (0-1, higher = more smoothing) */
    var SMOOTHING_FACTOR = 0.3;

    /** MediaPipe Face Mesh landmark indices */
    var LANDMARKS = {
        LEFT_IRIS_CENTER: 468,
        RIGHT_IRIS_CENTER: 473,
        LEFT_EYE_OUTER: 33,
        LEFT_EYE_INNER: 133,
        LEFT_EYE_TOP: 159,
        LEFT_EYE_BOTTOM: 145,
        RIGHT_EYE_OUTER: 362,
        RIGHT_EYE_INNER: 263,
        RIGHT_EYE_TOP: 386,
        RIGHT_EYE_BOTTOM: 374
    };

    // ========================================================================
    // EYE TRACKER CLASS
    // ========================================================================

    /**
     * EyeTracker — Webcam-based eye tracking using MediaPipe Face Mesh.
     * 
     * @param {string} videoElementId - ID of the hidden video element for webcam
     * @param {string} gazeDotId - ID of the gaze dot overlay element
     */
    function EyeTracker(videoElementId, gazeDotId) {
        this._videoElement = document.getElementById(videoElementId);
        this._gazeDot = document.getElementById(gazeDotId);
        this._faceMesh = null;
        this._camera = null;
        this._stream = null;

        // Tracking state
        this._isTracking = false;
        this._isInitialized = false;
        this._hasPermission = false;

        // Current gaze data
        this._currentGaze = { x: 0, y: 0 };
        this._smoothedGaze = { x: 0, y: 0 };
        this._rawIrisPos = { relX: 0.5, relY: 0.5 }; // Normalized iris position

        // Calibration data
        this._isCalibrated = false;
        this._calibrationPoints = [];  // [{screenX, screenY, irisRelX, irisRelY}]
        this._calibCoeffs = {
            // Linear mapping coefficients: screenX = ax * irisRelX + bx * irisRelY + cx
            ax: 0, bx: 0, cx: 0,
            // screenY = ay * irisRelX + by * irisRelY + cy
            ay: 0, by: 0, cy: 0
        };
        this._calibrationAccuracy = 0;

        // Gaze data batching for API
        this._gazeBuffer = [];
        this._batchTimer = null;
        this._sampleTimer = null;
        this._sessionId = null;

        // Callbacks
        this._onGazeUpdate = null;
        this._onTrackingStatusChange = null;

        console.log('EyeTracker created');
    }

    /**
     * Initialize the eye tracker: request webcam permission, set up MediaPipe Face Mesh.
     * @returns {Promise<boolean>} True if initialization succeeded
     */
    EyeTracker.prototype.init = async function () {
        try {
            // Check if MediaPipe is available
            if (typeof FaceMesh === 'undefined' && typeof window.FaceMesh === 'undefined') {
                console.error('EyeTracker: MediaPipe Face Mesh not loaded. Make sure CDN scripts are included.');
                this._showError('Eye tracking unavailable: MediaPipe library not loaded');
                return false;
            }

            // Request webcam access
            console.log('EyeTracker: Requesting webcam access...');
            this._stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });

            this._videoElement.srcObject = this._stream;
            this._videoElement.setAttribute('playsinline', '');
            await this._videoElement.play();
            this._hasPermission = true;
            console.log('EyeTracker: Webcam access granted');

            // Set up MediaPipe Face Mesh
            this._setupFaceMesh();

            this._isInitialized = true;
            return true;

        } catch (error) {
            console.error('EyeTracker: Initialization failed:', error);

            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                this._showError('Webcam permission denied. Eye tracking requires camera access.');
            } else if (error.name === 'NotFoundError') {
                this._showError('No webcam found. Please connect a camera for eye tracking.');
            } else {
                this._showError('Eye tracking initialization failed: ' + error.message);
            }

            return false;
        }
    };

    /**
     * Configure and initialize MediaPipe Face Mesh.
     * Uses refineLandmarks: true to enable iris tracking (478 landmarks instead of 468).
     */
    EyeTracker.prototype._setupFaceMesh = function () {
        var self = this;

        // Get the FaceMesh constructor (MediaPipe exposes it globally)
        var FaceMeshConstructor = window.FaceMesh || FaceMesh;

        this._faceMesh = new FaceMeshConstructor({
            locateFile: function (file) {
                return 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/' + file;
            }
        });

        // Configuration for iris tracking
        this._faceMesh.setOptions({
            maxNumFaces: 1,           // Only track one face (the user)
            refineLandmarks: true,    // CRITICAL: enables iris landmarks (468-477)
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        // Register results callback
        this._faceMesh.onResults(function (results) {
            self._onResults(results);
        });

        // Set up MediaPipe Camera utility for frame-by-frame processing
        if (typeof Camera !== 'undefined' || typeof window.Camera !== 'undefined') {
            var CameraConstructor = window.Camera || Camera;
            this._camera = new CameraConstructor(this._videoElement, {
                onFrame: async function () {
                    if (self._faceMesh && self._isTracking) {
                        await self._faceMesh.send({ image: self._videoElement });
                    }
                },
                width: 640,
                height: 480
            });
        } else {
            // Fallback: manual frame loop if Camera utility isn't available
            console.warn('EyeTracker: MediaPipe Camera utility not found, using manual frame loop');
            this._manualFrameLoop = true;
        }

        console.log('EyeTracker: Face Mesh configured with iris refinement');
    };

    /**
     * Process Face Mesh detection results.
     * Called for every processed video frame with detected face landmarks.
     * 
     * @param {Object} results - MediaPipe Face Mesh results
     * @param {Array} results.multiFaceLandmarks - Array of face landmark arrays
     */
    EyeTracker.prototype._onResults = function (results) {
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            // No face detected — update tracking status
            if (this._onTrackingStatusChange) {
                this._onTrackingStatusChange(false, 'No face detected');
            }
            return;
        }

        // Get landmarks for the first (and only) detected face
        var landmarks = results.multiFaceLandmarks[0];

        // Extract gaze direction from iris landmarks
        var gazeData = this._extractGaze(landmarks);

        if (gazeData) {
            this._rawIrisPos = gazeData;

            // Map to screen coordinates
            var screenPos;
            if (this._isCalibrated) {
                screenPos = this._mapToScreen(gazeData.relX, gazeData.relY);
            } else {
                // Default mapping: center the gaze on screen using simple linear mapping
                // This gives rough accuracy without calibration
                screenPos = {
                    x: (1 - gazeData.relX) * window.innerWidth,  // Mirror X (webcam is mirrored)
                    y: gazeData.relY * window.innerHeight
                };
            }

            // Apply smoothing
            this._smoothGaze(screenPos.x, screenPos.y);

            // Update gaze dot position
            this._updateGazeDot();

            // Notify callback
            if (this._onGazeUpdate) {
                this._onGazeUpdate(this._smoothedGaze.x, this._smoothedGaze.y);
            }

            if (this._onTrackingStatusChange) {
                this._onTrackingStatusChange(true, 'Tracking');
            }
        }
    };

    /**
     * Extract gaze direction from iris and eye landmarks.
     * 
     * The gaze is estimated by computing the relative position of the iris center
     * within the eye opening. This gives us a normalized (0-1) position:
     *   - relX: 0 = looking far left, 0.5 = center, 1 = looking far right
     *   - relY: 0 = looking up, 0.5 = center, 1 = looking down
     * 
     * We average both eyes for more stable tracking.
     * 
     * @param {Array} landmarks - Array of 478 face mesh landmarks
     * @returns {Object|null} {relX, relY} normalized iris position, or null if invalid
     */
    EyeTracker.prototype._extractGaze = function (landmarks) {
        try {
            // === LEFT EYE ===
            var leftIris = landmarks[LANDMARKS.LEFT_IRIS_CENTER];
            var leftOuter = landmarks[LANDMARKS.LEFT_EYE_OUTER];
            var leftInner = landmarks[LANDMARKS.LEFT_EYE_INNER];
            var leftTop = landmarks[LANDMARKS.LEFT_EYE_TOP];
            var leftBottom = landmarks[LANDMARKS.LEFT_EYE_BOTTOM];

            // Compute horizontal iris position relative to eye width
            // irisRelX = (iris.x - inner.x) / (outer.x - inner.x)
            var leftEyeWidth = leftOuter.x - leftInner.x;
            var leftIrisRelX = 0.5;
            if (Math.abs(leftEyeWidth) > 0.001) {
                leftIrisRelX = (leftIris.x - leftInner.x) / leftEyeWidth;
            }

            // Compute vertical iris position relative to eye height
            var leftEyeHeight = leftBottom.y - leftTop.y;
            var leftIrisRelY = 0.5;
            if (Math.abs(leftEyeHeight) > 0.001) {
                leftIrisRelY = (leftIris.y - leftTop.y) / leftEyeHeight;
            }

            // === RIGHT EYE ===
            var rightIris = landmarks[LANDMARKS.RIGHT_IRIS_CENTER];
            var rightOuter = landmarks[LANDMARKS.RIGHT_EYE_OUTER];
            var rightInner = landmarks[LANDMARKS.RIGHT_EYE_INNER];
            var rightTop = landmarks[LANDMARKS.RIGHT_EYE_TOP];
            var rightBottom = landmarks[LANDMARKS.RIGHT_EYE_BOTTOM];

            var rightEyeWidth = rightInner.x - rightOuter.x;
            var rightIrisRelX = 0.5;
            if (Math.abs(rightEyeWidth) > 0.001) {
                rightIrisRelX = (rightIris.x - rightOuter.x) / rightEyeWidth;
            }

            var rightEyeHeight = rightBottom.y - rightTop.y;
            var rightIrisRelY = 0.5;
            if (Math.abs(rightEyeHeight) > 0.001) {
                rightIrisRelY = (rightIris.y - rightTop.y) / rightEyeHeight;
            }

            // Average both eyes for stability
            // Both eyes should give similar readings; averaging reduces noise
            var avgRelX = (leftIrisRelX + rightIrisRelX) / 2;
            var avgRelY = (leftIrisRelY + rightIrisRelY) / 2;

            // Clamp to valid range
            avgRelX = Math.max(0, Math.min(1, avgRelX));
            avgRelY = Math.max(0, Math.min(1, avgRelY));

            return { relX: avgRelX, relY: avgRelY };

        } catch (error) {
            console.warn('EyeTracker: Error extracting gaze:', error);
            return null;
        }
    };

    /**
     * Run 9-point calibration procedure.
     * Shows calibration points on screen one at a time, records iris position
     * at each known screen location, then computes mapping coefficients.
     * 
     * @param {Function} [onComplete] - Callback when calibration finishes
     * @param {Function} [onProgress] - Callback with progress (pointIndex, totalPoints)
     */
    EyeTracker.prototype.calibrate = function (onComplete, onProgress) {
        var self = this;

        // 9-point calibration grid: evenly distributed across screen
        var margin = 0.1; // 10% margin from edges
        var positions = [];
        for (var row = 0; row < 3; row++) {
            for (var col = 0; col < 3; col++) {
                positions.push({
                    screenX: margin * window.innerWidth + col * ((1 - 2 * margin) * window.innerWidth / 2),
                    screenY: margin * window.innerHeight + row * ((1 - 2 * margin) * window.innerHeight / 2)
                });
            }
        }

        this._calibrationPoints = [];
        var pointIndex = 0;

        // Create calibration overlay
        var overlay = document.createElement('div');
        overlay.id = 'calibration-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
            'background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:center;' +
            'justify-content:center;flex-direction:column;';

        var instruction = document.createElement('div');
        instruction.style.cssText = 'color:white;font-size:18px;margin-bottom:20px;text-align:center;';
        instruction.textContent = 'Look at each dot and press SPACE or click when ready';
        overlay.appendChild(instruction);

        // Calibration dot
        var dot = document.createElement('div');
        dot.style.cssText = 'position:absolute;width:20px;height:20px;border-radius:50%;' +
            'background:lime;border:3px solid white;transition:all 0.3s ease;';
        overlay.appendChild(dot);

        document.body.appendChild(overlay);

        // Position first dot
        function showPoint(index) {
            if (index >= positions.length) {
                // Calibration complete — compute coefficients
                document.body.removeChild(overlay);
                self._computeCalibration();
                if (onComplete) onComplete(self._calibrationAccuracy);
                return;
            }

            var pos = positions[index];
            dot.style.left = (pos.screenX - 10) + 'px';
            dot.style.top = (pos.screenY - 10) + 'px';
            instruction.textContent = 'Point ' + (index + 1) + ' of ' + positions.length +
                ' — Look at the green dot and press SPACE';

            if (onProgress) onProgress(index, positions.length);
        }

        // Handle user confirmation for each calibration point
        function onConfirm() {
            // Record the current iris position paired with the known screen position
            self._calibrationPoints.push({
                screenX: positions[pointIndex].screenX,
                screenY: positions[pointIndex].screenY,
                irisRelX: self._rawIrisPos.relX,
                irisRelY: self._rawIrisPos.relY
            });

            pointIndex++;
            showPoint(pointIndex);
        }

        // Listen for SPACE key or click
        function onKeyDown(e) {
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                onConfirm();
            } else if (e.code === 'Escape') {
                // Cancel calibration
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', onKeyDown);
                overlay.removeEventListener('click', onClick);
            }
        }

        function onClick() {
            onConfirm();
        }

        document.addEventListener('keydown', onKeyDown);
        overlay.addEventListener('click', onClick);

        // Show first point
        showPoint(0);

        // Cleanup listener when done
        var origShowPoint = showPoint;
        showPoint = function (index) {
            if (index >= positions.length) {
                document.removeEventListener('keydown', onKeyDown);
                overlay.removeEventListener('click', onClick);
            }
            origShowPoint(index);
        };
    };

    /**
     * Compute calibration mapping coefficients using least squares regression.
     * 
     * We solve two linear systems:
     *   screenX = ax * irisRelX + bx * irisRelY + cx
     *   screenY = ay * irisRelX + by * irisRelY + cy
     * 
     * Using the normal equations: (A^T * A) * coeffs = A^T * b
     * where A is the matrix of [irisRelX, irisRelY, 1] rows
     */
    EyeTracker.prototype._computeCalibration = function () {
        var points = this._calibrationPoints;
        var n = points.length;

        if (n < 3) {
            console.warn('EyeTracker: Need at least 3 calibration points, got', n);
            return;
        }

        // Build the design matrix A and target vectors
        // A = [[relX_0, relY_0, 1], [relX_1, relY_1, 1], ...]
        // bx = [screenX_0, screenX_1, ...]
        // by = [screenY_0, screenY_1, ...]

        var sumX = 0, sumY = 0, sumXX = 0, sumYY = 0, sumXY = 0;
        var sumSX = 0, sumSY = 0, sumSXx = 0, sumSXy = 0, sumSYx = 0, sumSYy = 0;
        var sum1 = n;

        for (var i = 0; i < n; i++) {
            var ix = points[i].irisRelX;
            var iy = points[i].irisRelY;
            var sx = points[i].screenX;
            var sy = points[i].screenY;

            sumX += ix;
            sumY += iy;
            sumXX += ix * ix;
            sumYY += iy * iy;
            sumXY += ix * iy;
            sumSX += sx;
            sumSY += sy;
            sumSXx += sx * ix;
            sumSXy += sx * iy;
            sumSYx += sy * ix;
            sumSYy += sy * iy;
        }

        // Solve via 3x3 matrix inversion (Cramer's rule for small system)
        // Normal equations: A^T A = [[sumXX, sumXY, sumX], [sumXY, sumYY, sumY], [sumX, sumY, n]]
        // Solving for screenX coefficients: A^T b_x = [sumSXx, sumSXy, sumSX]

        var det = sumXX * (sumYY * n - sumY * sumY)
            - sumXY * (sumXY * n - sumY * sumX)
            + sumX * (sumXY * sumY - sumYY * sumX);

        if (Math.abs(det) < 1e-10) {
            console.warn('EyeTracker: Calibration matrix is singular, using default mapping');
            this._isCalibrated = false;
            return;
        }

        var invDet = 1 / det;

        // Cofactor matrix for inversion
        var c00 = sumYY * n - sumY * sumY;
        var c01 = -(sumXY * n - sumY * sumX);
        var c02 = sumXY * sumY - sumYY * sumX;
        var c10 = -(sumXY * n - sumX * sumY);
        var c11 = sumXX * n - sumX * sumX;
        var c12 = -(sumXX * sumY - sumXY * sumX);
        var c20 = sumXY * sumY - sumX * sumYY;
        var c21 = -(sumXX * sumY - sumX * sumXY);
        var c22 = sumXX * sumYY - sumXY * sumXY;

        // Solve for screenX coefficients
        this._calibCoeffs.ax = invDet * (c00 * sumSXx + c01 * sumSXy + c02 * sumSX);
        this._calibCoeffs.bx = invDet * (c10 * sumSXx + c11 * sumSXy + c12 * sumSX);
        this._calibCoeffs.cx = invDet * (c20 * sumSXx + c21 * sumSXy + c22 * sumSX);

        // Solve for screenY coefficients
        this._calibCoeffs.ay = invDet * (c00 * sumSYx + c01 * sumSYy + c02 * sumSY);
        this._calibCoeffs.by = invDet * (c10 * sumSYx + c11 * sumSYy + c12 * sumSY);
        this._calibCoeffs.cy = invDet * (c20 * sumSYx + c21 * sumSYy + c22 * sumSY);

        this._isCalibrated = true;

        // Compute accuracy (average pixel error on calibration points)
        var totalError = 0;
        for (var j = 0; j < n; j++) {
            var predicted = this._mapToScreen(points[j].irisRelX, points[j].irisRelY);
            var dx = predicted.x - points[j].screenX;
            var dy = predicted.y - points[j].screenY;
            totalError += Math.sqrt(dx * dx + dy * dy);
        }
        this._calibrationAccuracy = totalError / n;

        console.log('EyeTracker: Calibration complete. Average error: ' +
            this._calibrationAccuracy.toFixed(1) + 'px');
    };

    /**
     * Map normalized iris position to screen coordinates using calibration data.
     * 
     * @param {number} irisRelX - Normalized horizontal iris position (0-1)
     * @param {number} irisRelY - Normalized vertical iris position (0-1)
     * @returns {Object} {x, y} screen coordinates in pixels
     */
    EyeTracker.prototype._mapToScreen = function (irisRelX, irisRelY) {
        var c = this._calibCoeffs;
        return {
            x: c.ax * irisRelX + c.bx * irisRelY + c.cx,
            y: c.ay * irisRelX + c.by * irisRelY + c.cy
        };
    };

    /**
     * Apply exponential moving average (EMA) smoothing to reduce jitter.
     * 
     * EMA formula: smoothed = alpha * raw + (1 - alpha) * previousSmoothed
     * Lower alpha = more smoothing (more lag), higher = less smoothing (more responsive)
     * 
     * @param {number} rawX - Raw X coordinate
     * @param {number} rawY - Raw Y coordinate
     */
    EyeTracker.prototype._smoothGaze = function (rawX, rawY) {
        var alpha = SMOOTHING_FACTOR;
        this._smoothedGaze.x = alpha * rawX + (1 - alpha) * this._smoothedGaze.x;
        this._smoothedGaze.y = alpha * rawY + (1 - alpha) * this._smoothedGaze.y;
    };

    /**
     * Get the current smoothed gaze point.
     * @returns {Object} {x, y} smoothed screen coordinates
     */
    EyeTracker.prototype.getGazePoint = function () {
        return {
            x: Math.round(this._smoothedGaze.x),
            y: Math.round(this._smoothedGaze.y)
        };
    };

    /**
     * Start eye tracking and gaze data collection.
     * @param {string} sessionId - Session ID for API calls
     */
    EyeTracker.prototype.startTracking = function (sessionId) {
        if (!this._isInitialized) {
            console.error('EyeTracker: Not initialized. Call init() first.');
            return;
        }

        this._sessionId = sessionId;
        this._isTracking = true;

        var self = this;

        // Start camera frame processing
        if (this._camera) {
            this._camera.start();
        } else if (this._manualFrameLoop) {
            // Manual frame loop fallback
            this._frameLoopId = null;
            var processFrame = function () {
                if (!self._isTracking) return;
                if (self._faceMesh && self._videoElement.readyState >= 2) {
                    self._faceMesh.send({ image: self._videoElement }).then(function () {
                        self._frameLoopId = requestAnimationFrame(processFrame);
                    });
                } else {
                    self._frameLoopId = requestAnimationFrame(processFrame);
                }
            };
            processFrame();
        }

        // Start gaze sampling timer (collect points at fixed interval)
        this._sampleTimer = setInterval(function () {
            if (self._isTracking) {
                var gaze = self.getGazePoint();
                self._gazeBuffer.push({
                    timestamp: Date.now(),
                    x: gaze.x,
                    y: gaze.y
                });
            }
        }, GAZE_SAMPLE_INTERVAL);

        // Start batch send timer (send collected points to server)
        this._batchTimer = setInterval(function () {
            self._sendGazeBatch();
        }, BATCH_SEND_INTERVAL);

        console.log('EyeTracker: Tracking started (session: ' + sessionId + ')');
    };

    /**
     * Stop eye tracking and clean up timers.
     */
    EyeTracker.prototype.stopTracking = function () {
        this._isTracking = false;

        // Stop camera
        if (this._camera) {
            this._camera.stop();
        }
        if (this._frameLoopId) {
            cancelAnimationFrame(this._frameLoopId);
            this._frameLoopId = null;
        }

        // Clear timers
        if (this._sampleTimer) {
            clearInterval(this._sampleTimer);
            this._sampleTimer = null;
        }
        if (this._batchTimer) {
            clearInterval(this._batchTimer);
            this._batchTimer = null;
        }

        // Send any remaining buffered gaze data
        this._sendGazeBatch();

        // Hide gaze dot
        if (this._gazeDot) {
            this._gazeDot.style.display = 'none';
        }

        console.log('EyeTracker: Tracking stopped');
    };

    /**
     * Check if the tracker is currently active.
     * @returns {boolean}
     */
    EyeTracker.prototype.isTracking = function () {
        return this._isTracking;
    };

    /**
     * Get calibration accuracy metric.
     * @returns {number} Average pixel error, or -1 if not calibrated
     */
    EyeTracker.prototype.getCalibrationAccuracy = function () {
        return this._isCalibrated ? this._calibrationAccuracy : -1;
    };

    /**
     * Check if the tracker has been calibrated.
     * @returns {boolean}
     */
    EyeTracker.prototype.isCalibrated = function () {
        return this._isCalibrated;
    };

    /**
     * Set callback for gaze position updates.
     * @param {Function} callback - Called with (x, y) screen coordinates
     */
    EyeTracker.prototype.onGazeUpdate = function (callback) {
        this._onGazeUpdate = callback;
    };

    /**
     * Set callback for tracking status changes.
     * @param {Function} callback - Called with (isTracking, statusMessage)
     */
    EyeTracker.prototype.onTrackingStatusChange = function (callback) {
        this._onTrackingStatusChange = callback;
    };

    /**
     * Update the visual gaze dot position on screen.
     * The gaze dot is a small colored circle that follows the user's gaze.
     */
    EyeTracker.prototype._updateGazeDot = function () {
        if (!this._gazeDot) return;
        this._gazeDot.style.display = 'block';
        this._gazeDot.style.left = (this._smoothedGaze.x - 8) + 'px';
        this._gazeDot.style.top = (this._smoothedGaze.y - 8) + 'px';
    };

    /**
     * Send buffered gaze points to the server API in a batch.
     * POST /api/gaze with {session_id, gaze_points: [{timestamp, x, y}]}
     */
    EyeTracker.prototype._sendGazeBatch = function () {
        if (this._gazeBuffer.length === 0 || !this._sessionId) return;

        var batch = this._gazeBuffer.splice(0); // Take all buffered points

        var payload = {
            session_id: this._sessionId,
            gaze_points: batch
        };

        // Send via fetch (non-blocking)
        fetch('/api/gaze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(function (error) {
            console.warn('EyeTracker: Failed to send gaze batch:', error);
            // Don't re-buffer on failure to prevent memory growth
        });
    };

    /**
     * Show an error message to the user.
     * @param {string} message - Error message text
     */
    EyeTracker.prototype._showError = function (message) {
        var statusEl = document.getElementById('tracking-status-text');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.style.color = '#ff4444';
        }
        console.error('EyeTracker:', message);
    };

    /**
     * Dispose of all resources.
     */
    EyeTracker.prototype.dispose = function () {
        this.stopTracking();

        // Stop webcam stream
        if (this._stream) {
            this._stream.getTracks().forEach(function (track) {
                track.stop();
            });
            this._stream = null;
        }

        // Clear face mesh
        if (this._faceMesh) {
            this._faceMesh.close();
            this._faceMesh = null;
        }

        this._isInitialized = false;
        console.log('EyeTracker: disposed');
    };

    // Expose globally
    window.EyeTracker = EyeTracker;

})();
