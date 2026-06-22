/**
 * showroom.js — Three.js Virtual Showroom Scene Manager
 * 
 * Creates and manages the 3D virtual showroom for SmartEV Vision:
 * - Three.js scene with professional automotive lighting
 * - Reflective floor with grid pattern
 * - Gradient background with particle system
 * - OrbitControls for user interaction
 * - Camera preset animations (exterior, interior, front, side, rear)
 * - Raycasting for component identification at screen positions
 * - Session management (timer, API integration)
 * 
 * Depends on:
 * - Three.js r128 (global THREE namespace)
 * - ev_models.js (EVModelBuilder)
 * - eye_tracker.js (EyeTracker)
 * - heatmap.js (GazeHeatmap)
 * 
 * Uses global namespace (no ES6 modules).
 */

(function () {
    'use strict';

    // ========================================================================
    // CAMERA PRESETS — Predefined camera positions for quick views
    // ========================================================================

    var CAMERA_PRESETS = {
        exterior: { position: { x: 8, y: 4, z: 8 }, lookAt: { x: 0, y: 1, z: 0 } },
        interior: { position: { x: 0, y: 1.2, z: 0.3 }, lookAt: { x: 0, y: 1.2, z: -1 } },
        front:    { position: { x: 0, y: 2, z: 6 }, lookAt: { x: 0, y: 1, z: 0 } },
        side:     { position: { x: 6, y: 2, z: 0 }, lookAt: { x: 0, y: 1, z: 0 } },
        rear:     { position: { x: 0, y: 2, z: -6 }, lookAt: { x: 0, y: 1, z: 0 } }
    };

    /** Duration of camera animation transitions in ms */
    var CAMERA_TRANSITION_MS = 1200;

    // ========================================================================
    // SHOWROOM SCENE CLASS
    // ========================================================================

    /**
     * ShowroomScene — Main 3D scene manager for the virtual EV showroom.
     * 
     * @param {string} canvasId - ID of the canvas element for WebGL rendering
     */
    function ShowroomScene(canvasId) {
        this._canvasId = canvasId;
        this._canvas = document.getElementById(canvasId);

        // Three.js core objects
        this._scene = null;
        this._camera = null;
        this._renderer = null;
        this._controls = null;

        // Scene objects
        this._currentModel = null;
        this._currentModelName = 'A';
        this._currentColor = 0x2255cc; // Default blue
        this._floor = null;
        this._particles = null;

        // Raycasting
        this._raycaster = new THREE.Raycaster();
        this._mouse = new THREE.Vector2();

        // Camera animation
        this._cameraAnimating = false;
        this._cameraAnimStart = null;
        this._cameraAnimDuration = CAMERA_TRANSITION_MS;
        this._cameraStartPos = new THREE.Vector3();
        this._cameraEndPos = new THREE.Vector3();
        this._cameraStartLookAt = new THREE.Vector3();
        this._cameraEndLookAt = new THREE.Vector3();
        this._currentLookAt = new THREE.Vector3(0, 1, 0);

        // Session management
        this._sessionId = null;
        this._userId = null;
        this._sessionStartTime = null;
        this._sessionTimerInterval = null;

        // Eye tracking & heatmap
        this._eyeTracker = null;
        this._heatmap = null;
        this._underglowLight = null;

        // Animation frame ID
        this._animFrameId = null;

        // Bound methods for event listeners
        this._boundOnResize = this.onWindowResize.bind(this);
        this._boundAnimate = this._animate.bind(this);
    }

    /**
     * Initialize the entire showroom: scene, camera, renderer, lighting, floor, model, controls.
     */
    ShowroomScene.prototype.init = function () {
        console.log('ShowroomScene: Initializing...');

        // Create Three.js scene
        this._scene = new THREE.Scene();

        // Create camera (perspective, automotive-style FOV)
        this._camera = new THREE.PerspectiveCamera(
            45, // FOV — 45° gives a natural automotive look
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this._camera.position.set(8, 4, 8);
        this._camera.lookAt(0, 1, 0);

        // Create WebGL renderer with antialiasing and shadows
        this._renderer = new THREE.WebGLRenderer({
            canvas: this._canvas,
            antialias: true,
            alpha: false
        });
        this._renderer.setSize(window.innerWidth, window.innerHeight);
        this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this._renderer.shadowMap.enabled = true;
        this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this._renderer.toneMappingExposure = 1.2;
        this._renderer.outputEncoding = THREE.sRGBEncoding;

        // Setup scene components
        this._setupLighting();
        this._createFloor();
        this._createEnvironment();
        this._setupControls();

        // Load default model
        this.loadModel('A');

        // Handle window resize
        window.addEventListener('resize', this._boundOnResize);

        // Initialize eye tracker and heatmap
        this._initEyeTracking();
        this._initHeatmap();

        // Parse session info from URL
        this._initSession();

        // Start render loop
        this._animate();

        // Setup HUD event listeners
        this._setupHUD();

        console.log('ShowroomScene: Initialization complete');
    };

    // ========================================================================
    // LIGHTING
    // ========================================================================

    /**
     * Set up professional automotive showroom lighting.
     * 
     * Lighting design:
     * 1. Ambient light (soft blue) — provides base illumination, gives cool EV feel
     * 2. Directional light (white) — main key light with shadows
     * 3. Two spotlights — accent lights focused on the car from different angles
     * 4. Hemisphere light — sky/ground color gradient for natural feel
     */
    ShowroomScene.prototype._setupLighting = function () {
        // 1. Ambient light — soft blue-white base, prevents pure black shadows
        var ambient = new THREE.AmbientLight(0x4466aa, 0.4);
        this._scene.add(ambient);

        // 2. Directional light — main key light (simulates overhead panel light)
        var directional = new THREE.DirectionalLight(0xffffff, 0.8);
        directional.position.set(5, 10, 5);
        directional.castShadow = true;
        directional.shadow.mapSize.width = 2048;
        directional.shadow.mapSize.height = 2048;
        directional.shadow.camera.near = 0.5;
        directional.shadow.camera.far = 50;
        directional.shadow.camera.left = -10;
        directional.shadow.camera.right = 10;
        directional.shadow.camera.top = 10;
        directional.shadow.camera.bottom = -10;
        directional.shadow.bias = -0.001;
        this._scene.add(directional);

        // 3. Spotlight 1 — front-left accent, highlights front quarter
        var spot1 = new THREE.SpotLight(0xffeedd, 0.6);
        spot1.position.set(6, 6, 4);
        spot1.target.position.set(0, 1, 0);
        spot1.angle = Math.PI / 6;
        spot1.penumbra = 0.5;
        spot1.decay = 1.5;
        spot1.distance = 30;
        spot1.castShadow = true;
        this._scene.add(spot1);
        this._scene.add(spot1.target);

        // 4. Spotlight 2 — rear-right accent, highlights rear quarter
        var spot2 = new THREE.SpotLight(0xddeeff, 0.4);
        spot2.position.set(-4, 5, -5);
        spot2.target.position.set(0, 1, 0);
        spot2.angle = Math.PI / 5;
        spot2.penumbra = 0.6;
        spot2.decay = 1.5;
        spot2.distance = 25;
        this._scene.add(spot2);
        this._scene.add(spot2.target);

        // 5. Hemisphere light — blue sky above, dark ground below
        var hemisphere = new THREE.HemisphereLight(0x6688cc, 0x222222, 0.3);
        this._scene.add(hemisphere);

        // 6. Fill light from below — subtle ground bounce
        var fillLight = new THREE.PointLight(0x334466, 0.2, 15);
        fillLight.position.set(0, 0.2, 0);
        this._scene.add(fillLight);

        // 7. Chassis Underglow Light (shines color under the car onto the floor)
        this._underglowLight = new THREE.PointLight(this._currentColor, 3.5, 6, 1.2);
        this._underglowLight.position.set(0, 0.08, 0);
        this._scene.add(this._underglowLight);
    };

    // ========================================================================
    // FLOOR
    // ========================================================================

    /**
     * Create a large reflective floor plane with a grid pattern.
     * Uses a dark, slightly reflective material to simulate a showroom floor.
     */
    ShowroomScene.prototype._createFloor = function () {
        // Main floor plane — large, dark, slightly reflective
        var floorGeometry = new THREE.PlaneGeometry(50, 50);
        var floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x111118,
            metalness: 0.8,
            roughness: 0.3
        });
        this._floor = new THREE.Mesh(floorGeometry, floorMaterial);
        this._floor.rotation.x = -Math.PI / 2;
        this._floor.position.y = 0;
        this._floor.receiveShadow = true;
        this._scene.add(this._floor);

        // Grid overlay — subtle grid lines on the floor
        var gridHelper = new THREE.GridHelper(50, 50, 0x222233, 0x181825);
        gridHelper.position.y = 0.005; // Slightly above floor to avoid z-fighting
        this._scene.add(gridHelper);

        // Inner grid (finer detail near the car)
        var innerGrid = new THREE.GridHelper(10, 20, 0x2a2a3a, 0x1a1a28);
        innerGrid.position.y = 0.006;
        this._scene.add(innerGrid);
    };

    // ========================================================================
    // ENVIRONMENT
    // ========================================================================

    /**
     * Create the showroom environment: gradient background and particle system.
     * The gradient goes from dark blue (top) to near-black (bottom) for a premium feel.
     * Particles add a subtle atmospheric effect.
     */
    ShowroomScene.prototype._createEnvironment = function () {
        // Gradient background using a large sphere
        // We create a vertex-colored sphere that surrounds the scene
        var skyGeometry = new THREE.SphereGeometry(100, 32, 32);
        var skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0a1628) },    // Dark blue
                bottomColor: { value: new THREE.Color(0x020408) }, // Near black
                offset: { value: 10 },
                exponent: { value: 0.6 }
            },
            vertexShader: [
                'varying vec3 vWorldPosition;',
                'void main() {',
                '  vec4 worldPosition = modelMatrix * vec4(position, 1.0);',
                '  vWorldPosition = worldPosition.xyz;',
                '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
                '}'
            ].join('\n'),
            fragmentShader: [
                'uniform vec3 topColor;',
                'uniform vec3 bottomColor;',
                'uniform float offset;',
                'uniform float exponent;',
                'varying vec3 vWorldPosition;',
                'void main() {',
                '  float h = normalize(vWorldPosition + offset).y;',
                '  gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);',
                '}'
            ].join('\n'),
            side: THREE.BackSide
        });

        var sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this._scene.add(sky);

        // Particle system — floating dust/light particles for atmosphere
        var particleCount = 500;
        var particleGeometry = new THREE.BufferGeometry();
        var positions = new Float32Array(particleCount * 3);

        for (var i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 40;     // X
            positions[i * 3 + 1] = Math.random() * 15 + 1;      // Y (above floor)
            positions[i * 3 + 2] = (Math.random() - 0.5) * 40;  // Z
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        var particleMaterial = new THREE.PointsMaterial({
            color: 0x4466aa,
            size: 0.05,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this._particles = new THREE.Points(particleGeometry, particleMaterial);
        this._scene.add(this._particles);

        // Overhead studio softbox panels (for beautiful clearcoat reflections)
        var softboxMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide
        });
        
        // Large center softbox
        var panel1Geo = new THREE.PlaneGeometry(8, 4);
        var panel1 = new THREE.Mesh(panel1Geo, softboxMat);
        panel1.position.set(0, 7.5, 0);
        panel1.rotation.x = Math.PI / 2; // facing down
        this._scene.add(panel1);

        // Front-left softbox
        var panel2Geo = new THREE.PlaneGeometry(6, 2);
        var panel2 = new THREE.Mesh(panel2Geo, softboxMat);
        panel2.position.set(3, 7.0, 3);
        panel2.rotation.x = Math.PI / 2;
        panel2.rotation.y = 0.15;
        this._scene.add(panel2);

        // Rear-right softbox
        var panel3 = panel2.clone();
        panel3.position.set(-3, 7.0, -3);
        this._scene.add(panel3);
    };

    // ========================================================================
    // CONTROLS
    // ========================================================================

    /**
     * Set up OrbitControls for interactive camera manipulation.
     * Configures damping, zoom limits, and vertical angle restrictions.
     */
    ShowroomScene.prototype._setupControls = function () {
        // OrbitControls — check for the class in the global namespace
        if (typeof THREE.OrbitControls === 'undefined') {
            console.warn('ShowroomScene: OrbitControls not available. Using basic mouse controls.');
            return;
        }

        this._controls = new THREE.OrbitControls(this._camera, this._renderer.domElement);
        this._controls.enableDamping = true;          // Smooth deceleration
        this._controls.dampingFactor = 0.08;
        this._controls.enablePan = true;
        this._controls.panSpeed = 0.5;

        // Zoom limits
        this._controls.minDistance = 2;   // Don't zoom too close
        this._controls.maxDistance = 20;  // Don't zoom too far

        // Vertical angle limits (prevent going below the floor)
        this._controls.minPolarAngle = 0.1;            // Near top-down but not quite
        this._controls.maxPolarAngle = Math.PI / 2.1;  // Slightly above horizon

        // Target (what the camera orbits around)
        this._controls.target.set(0, 1, 0);
        this._controls.update();
    };

    // ========================================================================
    // MODEL MANAGEMENT
    // ========================================================================

    /**
     * Load/switch the EV model displayed in the showroom.
     * Removes the current model and adds the new one.
     * 
     * @param {string} modelName - "A", "B", or "C"
     */
    ShowroomScene.prototype.loadModel = function (modelName) {
        console.log('ShowroomScene: Loading model ' + modelName);

        // Remove existing model
        if (this._currentModel) {
            this._scene.remove(this._currentModel);
            // Dispose geometries and materials to free GPU memory
            this._currentModel.traverse(function (child) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(function (m) { m.dispose(); });
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }

        // Build new model
        if (typeof window.EVModelBuilder === 'undefined') {
            console.error('ShowroomScene: EVModelBuilder not loaded');
            return;
        }

        this._currentModel = window.EVModelBuilder.build(modelName, this._currentColor);
        this._currentModelName = modelName.toUpperCase();

        // Enable shadows on all meshes
        this._currentModel.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        this._scene.add(this._currentModel);

        // Update active button state in HUD
        this._updateModelButtons(modelName);

        console.log('ShowroomScene: Model ' + modelName + ' loaded');
    };

    /**
     * Change the body color of the current model with visual feedback.
     * @param {number} colorHex - New hex color value
     */
    ShowroomScene.prototype.setColor = function (colorHex) {
        this._currentColor = colorHex;

        if (this._currentModel && window.EVModelBuilder) {
            window.EVModelBuilder.setBodyColor(this._currentModel, colorHex);
        }

        if (this._underglowLight) {
            this._underglowLight.color.setHex(colorHex);
        }

        // Update active color swatch in HUD
        this._updateColorSwatches(colorHex);
    };

    /**
     * Animate the camera to a preset position.
     * Uses smooth interpolation (ease-in-out) for cinematic transitions.
     * 
     * @param {string} preset - One of: "exterior", "interior", "front", "side", "rear"
     */
    ShowroomScene.prototype.setCameraPreset = function (preset) {
        var target = CAMERA_PRESETS[preset];
        if (!target) {
            console.warn('ShowroomScene: Unknown camera preset "' + preset + '"');
            return;
        }

        // Disable controls during animation
        if (this._controls) {
            this._controls.enabled = false;
        }

        // Store animation start state
        this._cameraStartPos.copy(this._camera.position);
        this._cameraEndPos.set(target.position.x, target.position.y, target.position.z);
        this._cameraStartLookAt.copy(this._currentLookAt);
        this._cameraEndLookAt.set(target.lookAt.x, target.lookAt.y, target.lookAt.z);

        this._cameraAnimStart = performance.now();
        this._cameraAnimating = true;

        // Update active view button
        this._updateViewButtons(preset);

        console.log('ShowroomScene: Camera animating to "' + preset + '"');
    };

    /**
     * Update camera animation each frame.
     * Uses smoothstep easing for natural motion.
     * @param {number} now - Current timestamp from performance.now()
     */
    ShowroomScene.prototype._updateCameraAnimation = function (now) {
        if (!this._cameraAnimating) return;

        var elapsed = now - this._cameraAnimStart;
        var progress = Math.min(elapsed / this._cameraAnimDuration, 1);

        // Smoothstep easing: 3t² - 2t³ (ease-in-out)
        var t = progress * progress * (3 - 2 * progress);

        // Interpolate position
        this._camera.position.lerpVectors(this._cameraStartPos, this._cameraEndPos, t);

        // Interpolate look-at target
        this._currentLookAt.lerpVectors(this._cameraStartLookAt, this._cameraEndLookAt, t);
        this._camera.lookAt(this._currentLookAt);

        // Update controls target
        if (this._controls) {
            this._controls.target.copy(this._currentLookAt);
        }

        // Check if animation is complete
        if (progress >= 1) {
            this._cameraAnimating = false;
            if (this._controls) {
                this._controls.enabled = true;
                this._controls.update();
            }
        }
    };

    // ========================================================================
    // RAYCASTING
    // ========================================================================

    /**
     * Identify which car component is at a given screen position.
     * Uses Three.js raycasting to find intersected objects.
     * 
     * @param {number} screenX - X coordinate in pixels
     * @param {number} screenY - Y coordinate in pixels
     * @returns {string|null} Name of the component group hit, or null
     */
    ShowroomScene.prototype.getComponentAtScreenPos = function (screenX, screenY) {
        if (!this._currentModel) return null;

        // Convert screen coordinates to normalized device coordinates (-1 to +1)
        this._mouse.x = (screenX / window.innerWidth) * 2 - 1;
        this._mouse.y = -(screenY / window.innerHeight) * 2 + 1;

        this._raycaster.setFromCamera(this._mouse, this._camera);

        // Test intersection with all car model children
        var intersects = this._raycaster.intersectObjects(this._currentModel.children, true);

        if (intersects.length > 0) {
            // Walk up the object tree to find the named group
            var obj = intersects[0].object;
            while (obj && obj !== this._currentModel) {
                if (obj.name && obj.parent === this._currentModel) {
                    return obj.name;
                }
                obj = obj.parent;
            }
            // If we reached the model without finding a named group,
            // return the direct child name
            return intersects[0].object.name || 'unknown';
        }

        return null;
    };

    // ========================================================================
    // RENDER LOOP
    // ========================================================================

    /**
     * Main animation/render loop.
     * Called every frame via requestAnimationFrame.
     */
    ShowroomScene.prototype._animate = function () {
        this._animFrameId = requestAnimationFrame(this._boundAnimate);

        var now = performance.now();

        // Update camera animation
        this._updateCameraAnimation(now);

        // Update orbit controls
        if (this._controls && !this._cameraAnimating) {
            this._controls.update();
        }

        // Animate particles (slow drift)
        if (this._particles) {
            this._particles.rotation.y += 0.0002;
            // Gentle vertical float
            var positions = this._particles.geometry.attributes.position.array;
            for (var i = 1; i < positions.length; i += 3) {
                positions[i] += Math.sin(now * 0.001 + i) * 0.0003;
            }
            this._particles.geometry.attributes.position.needsUpdate = true;
        }

        // Render scene
        this._renderer.render(this._scene, this._camera);
    };

    /**
     * Handle window resize — update camera aspect ratio and renderer size.
     */
    ShowroomScene.prototype.onWindowResize = function () {
        var width = window.innerWidth;
        var height = window.innerHeight;

        this._camera.aspect = width / height;
        this._camera.updateProjectionMatrix();
        this._renderer.setSize(width, height);

        // Resize heatmap overlay
        if (this._heatmap) {
            this._heatmap.resize(width, height);
        }
    };

    // ========================================================================
    // EYE TRACKING INTEGRATION
    // ========================================================================

    /**
     * Initialize the eye tracker module.
     */
    ShowroomScene.prototype._initEyeTracking = function () {
        this._eyeTracker = new window.EyeTracker('webcam-video', 'gaze-dot');

        var self = this;

        // When gaze updates, feed data to heatmap and identify components
        this._eyeTracker.onGazeUpdate(function (x, y) {
            // Add point to heatmap
            if (self._heatmap) {
                self._heatmap.addPoint(x, y, 1);
            }

            // Identify component being looked at (throttled)
            if (!self._lastComponentCheck || performance.now() - self._lastComponentCheck > 100) {
                self._lastComponentCheck = performance.now();
                var component = self.getComponentAtScreenPos(x, y);
                var compEl = document.getElementById('gaze-component');
                if (compEl && component) {
                    compEl.textContent = component;
                }
            }
        });

        // Update tracking status indicator
        this._eyeTracker.onTrackingStatusChange(function (isTracking, message) {
            var dotEl = document.getElementById('tracking-dot');
            var textEl = document.getElementById('tracking-status-text');
            if (dotEl) {
                dotEl.style.background = isTracking ? '#00ff66' : '#ff4444';
            }
            if (textEl) {
                textEl.textContent = message || (isTracking ? 'Tracking' : 'Not tracking');
            }
        });
    };

    /**
     * Initialize the heatmap overlay.
     */
    ShowroomScene.prototype._initHeatmap = function () {
        this._heatmap = new window.GazeHeatmap('heatmap-overlay', window.innerWidth, window.innerHeight);
        this._heatmap.hide(); // Hidden by default, toggle with button

        // Periodic heatmap render (every 100ms)
        var self = this;
        setInterval(function () {
            if (self._heatmap) {
                self._heatmap.render();
            }
        }, 100);
    };

    // ========================================================================
    // SESSION MANAGEMENT
    // ========================================================================

    /**
     * Initialize session from URL parameters or create a new one.
     */
    ShowroomScene.prototype._initSession = function () {
        var params = new URLSearchParams(window.location.search);
        this._userId = params.get('user_id') || 'anonymous';
        this._sessionId = params.get('session_id');

        if (!this._sessionId) {
            // Start a new session via API
            this._startNewSession();
        } else {
            this._startSessionTimer();
        }
    };

    /**
     * Start a new session by calling the API.
     */
    ShowroomScene.prototype._startNewSession = function () {
        var self = this;

        fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: this._userId })
        })
            .then(function (response) { return response.json(); })
            .then(function (data) {
                self._sessionId = data.session_id || ('session_' + Date.now());
                console.log('ShowroomScene: New session started: ' + self._sessionId);
                self._startSessionTimer();

                // Start eye tracking with session ID
                self._eyeTracker.init().then(function (success) {
                    if (success) {
                        self._eyeTracker.startTracking(self._sessionId);
                    }
                });
            })
            .catch(function (error) {
                console.warn('ShowroomScene: Failed to create session via API, using local session');
                self._sessionId = 'local_' + Date.now();
                self._startSessionTimer();

                // Still try to init eye tracking
                self._eyeTracker.init().then(function (success) {
                    if (success) {
                        self._eyeTracker.startTracking(self._sessionId);
                    }
                });
            });
    };

    /**
     * Start the session duration timer display.
     */
    ShowroomScene.prototype._startSessionTimer = function () {
        this._sessionStartTime = Date.now();
        var self = this;

        var timerEl = document.getElementById('session-timer');
        if (!timerEl) return;

        this._sessionTimerInterval = setInterval(function () {
            var elapsed = Math.floor((Date.now() - self._sessionStartTime) / 1000);
            var minutes = Math.floor(elapsed / 60);
            var seconds = elapsed % 60;
            timerEl.textContent =
                (minutes < 10 ? '0' : '') + minutes + ':' +
                (seconds < 10 ? '0' : '') + seconds;
        }, 1000);
    };

    /**
     * End the current session: stop tracking, call API, redirect to report.
     */
    ShowroomScene.prototype.endSession = function () {
        // Stop eye tracking
        if (this._eyeTracker) {
            this._eyeTracker.stopTracking();
        }

        // Stop timer
        if (this._sessionTimerInterval) {
            clearInterval(this._sessionTimerInterval);
        }

        var self = this;

        // Call API to end session
        fetch('/api/sessions/' + this._sessionId + '/end', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
            .then(function () {
                // Redirect to session report
                window.location.href = '/sessions/' + self._sessionId + '/report';
            })
            .catch(function (error) {
                console.warn('ShowroomScene: Failed to end session via API:', error);
                // Redirect anyway
                window.location.href = '/sessions/' + self._sessionId + '/report';
            });
    };

    // ========================================================================
    // HUD (Heads-Up Display) SETUP
    // ========================================================================

    /**
     * Set up event listeners for all HUD controls.
     */
    ShowroomScene.prototype._setupHUD = function () {
        var self = this;

        // Model selector buttons
        var modelButtons = document.querySelectorAll('.model-btn');
        modelButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var model = this.getAttribute('data-model');
                self.loadModel(model);
            });
        });

        // Color swatches
        var colorSwatches = document.querySelectorAll('.color-swatch');
        colorSwatches.forEach(function (swatch) {
            swatch.addEventListener('click', function () {
                var color = parseInt(this.getAttribute('data-color'), 16);
                self.setColor(color);
            });
        });

        // View preset buttons
        var viewButtons = document.querySelectorAll('.view-btn');
        viewButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var preset = this.getAttribute('data-view');
                self.setCameraPreset(preset);
            });
        });

        // Zoom slider
        var zoomSlider = document.getElementById('zoom-slider');
        if (zoomSlider) {
            zoomSlider.addEventListener('input', function () {
                var val = parseFloat(this.value);
                // Map slider value (1-100) to camera distance (2-20)
                var distance = 2 + (100 - val) / 100 * 18;
                var direction = self._camera.position.clone().sub(
                    self._controls ? self._controls.target : new THREE.Vector3(0, 1, 0)
                ).normalize();
                self._camera.position.copy(
                    (self._controls ? self._controls.target : new THREE.Vector3(0, 1, 0))
                        .clone().add(direction.multiplyScalar(distance))
                );
            });
        }

        // End session button
        var endBtn = document.getElementById('end-session-btn');
        if (endBtn) {
            endBtn.addEventListener('click', function () {
                if (confirm('End this showroom session?')) {
                    self.endSession();
                }
            });
        }

        // Heatmap toggle button
        var heatmapBtn = document.getElementById('toggle-heatmap-btn');
        if (heatmapBtn) {
            heatmapBtn.addEventListener('click', function () {
                if (self._heatmap) {
                    var visible = self._heatmap.toggle();
                    this.textContent = visible ? '🔥 Hide Heatmap' : '🔥 Show Heatmap';
                }
            });
        }

        // Calibrate eye tracking button
        var calibrateBtn = document.getElementById('calibrate-btn');
        if (calibrateBtn) {
            calibrateBtn.addEventListener('click', function () {
                if (self._eyeTracker && self._eyeTracker.isTracking()) {
                    self._eyeTracker.calibrate(function (accuracy) {
                        alert('Calibration complete! Average accuracy: ' + accuracy.toFixed(0) + 'px');
                    });
                } else {
                    alert('Start eye tracking first.');
                }
            });
        }

        // Start tracking button (manual start)
        var startTrackingBtn = document.getElementById('start-tracking-btn');
        if (startTrackingBtn) {
            startTrackingBtn.addEventListener('click', function () {
                if (self._eyeTracker) {
                    self._eyeTracker.init().then(function (success) {
                        if (success) {
                            self._eyeTracker.startTracking(self._sessionId || 'local_' + Date.now());
                        }
                    });
                }
            });
        }
    };

    /**
     * Update model button active states.
     * @param {string} activeModel - "A", "B", or "C"
     */
    ShowroomScene.prototype._updateModelButtons = function (activeModel) {
        var buttons = document.querySelectorAll('.model-btn');
        buttons.forEach(function (btn) {
            if (btn.getAttribute('data-model') === activeModel.toUpperCase()) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    };

    /**
     * Update color swatch active states.
     * @param {number} activeColor - Active hex color
     */
    ShowroomScene.prototype._updateColorSwatches = function (activeColor) {
        var hex = activeColor.toString(16).padStart(6, '0');
        var swatches = document.querySelectorAll('.color-swatch');
        swatches.forEach(function (swatch) {
            if (swatch.getAttribute('data-color') === hex) {
                swatch.classList.add('active');
            } else {
                swatch.classList.remove('active');
            }
        });
    };

    /**
     * Update view button active states.
     * @param {string} activeView - Preset name
     */
    ShowroomScene.prototype._updateViewButtons = function (activeView) {
        var buttons = document.querySelectorAll('.view-btn');
        buttons.forEach(function (btn) {
            if (btn.getAttribute('data-view') === activeView) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    };

    // ========================================================================
    // CLEANUP
    // ========================================================================

    /**
     * Dispose all Three.js resources and event listeners.
     */
    ShowroomScene.prototype.dispose = function () {
        // Stop animation loop
        if (this._animFrameId) {
            cancelAnimationFrame(this._animFrameId);
        }

        // Stop session timer
        if (this._sessionTimerInterval) {
            clearInterval(this._sessionTimerInterval);
        }

        // Dispose eye tracker
        if (this._eyeTracker) {
            this._eyeTracker.dispose();
        }

        // Remove event listeners
        window.removeEventListener('resize', this._boundOnResize);

        // Dispose Three.js objects
        if (this._controls) {
            this._controls.dispose();
        }

        if (this._scene) {
            this._scene.traverse(function (obj) {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(function (m) { m.dispose(); });
                    } else {
                        obj.material.dispose();
                    }
                }
            });
        }

        if (this._renderer) {
            this._renderer.dispose();
        }

        console.log('ShowroomScene: disposed');
    };

    // ========================================================================
    // GLOBAL EXPORT
    // ========================================================================

    window.ShowroomScene = ShowroomScene;

})();
