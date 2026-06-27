/**
 * heatmap.js — Client-Side Gaze Heatmap Overlay
 * 
 * Renders a heatmap visualization of eye-tracking gaze data on a transparent
 * canvas overlay. Uses 2D Gaussian blobs with additive blending and a
 * blue → yellow → red color mapping for attention intensity.
 * 
 * The heatmap canvas is overlaid on top of the Three.js showroom canvas
 * with pointer-events: none so it doesn't interfere with interaction.
 * 
 * Uses global namespace (no ES6 modules).
 */

(function () {
    'use strict';

    /**
     * GazeHeatmap — Accumulates gaze points and renders a colored heatmap.
     * 
     * Architecture:
     * 1. A hidden "accumulation" canvas stores raw intensity data (grayscale)
     * 2. For each gaze point, a radial gradient blob is drawn additively
     * 3. On render(), the accumulation data is color-mapped to the visible canvas
     * 4. Color mapping: low intensity (blue) → medium (yellow) → high (red)
     * 
     * @param {string} canvasId - ID of the visible heatmap overlay canvas
     * @param {number} width - Canvas width in pixels
     * @param {number} height - Canvas height in pixels
     */
    function GazeHeatmap(canvasId, width, height) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('GazeHeatmap: Canvas element "' + canvasId + '" not found');
            return;
        }

        this.width = width || window.innerWidth;
        this.height = height || window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext('2d');

        // Create hidden accumulation canvas for intensity data
        // We draw Gaussian blobs here with additive blending (grayscale alpha)
        this._accumCanvas = document.createElement('canvas');
        this._accumCanvas.width = this.width;
        this._accumCanvas.height = this.height;
        this._accumCtx = this._accumCanvas.getContext('2d');

        // Heatmap configuration
        this._pointRadius = 60;        // Radius of each Gaussian blob in pixels
        this._opacity = 0.6;           // Overall heatmap opacity (0-1)
        this._visible = true;          // Whether the overlay is shown
        this._pointBuffer = [];        // Buffer of accumulated points
        this._maxIntensity = 0;        // Track max for normalization
        this._dirty = false;           // Whether accumulation canvas needs re-render

        // Initialize canvas styling
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.opacity = this._opacity;

        console.log('GazeHeatmap initialized (' + this.width + 'x' + this.height + ')');
    }

    /**
     * Add a gaze point to the heatmap.
     * Each point creates a Gaussian blob on the accumulation canvas using
     * additive blending (globalCompositeOperation = 'lighter'), so overlapping
     * gaze points naturally increase in intensity.
     * 
     * @param {number} x - X coordinate in pixels
     * @param {number} y - Y coordinate in pixels
     * @param {number} [intensity=1] - Point intensity (0-1), can represent fixation duration
     */
    GazeHeatmap.prototype.addPoint = function (x, y, intensity) {
        intensity = intensity || 1;

        // Clamp coordinates to canvas bounds
        x = Math.max(0, Math.min(this.width, x));
        y = Math.max(0, Math.min(this.height, y));

        // Store point for potential re-rendering on resize
        this._pointBuffer.push({ x: x, y: y, intensity: intensity });

        // Draw a radial gradient blob on the accumulation canvas
        // The gradient goes from opaque center to fully transparent edge,
        // creating a Gaussian-like falloff of attention intensity
        var ctx = this._accumCtx;
        var radius = this._pointRadius;

        // Create radial gradient: center is bright, edge is transparent
        var gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        // Alpha channel represents intensity — we use white color and vary alpha
        var alpha = Math.min(1, intensity * 0.15); // Scale down so it takes many points to saturate
        gradient.addColorStop(0, 'rgba(255, 255, 255, ' + alpha + ')');
        gradient.addColorStop(0.4, 'rgba(255, 255, 255, ' + (alpha * 0.5) + ')');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        // Additive blending — overlapping blobs accumulate brightness
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = gradient;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);

        this._dirty = true;
    };

    /**
     * Render the heatmap by color-mapping the accumulation canvas.
     * 
     * Process:
     * 1. Read pixel data from accumulation canvas (grayscale intensity)
     * 2. For each pixel, map intensity value to a color:
     *    - 0 → transparent (no gaze)
     *    - Low → blue (brief glances)
     *    - Medium → green/yellow (moderate attention)
     *    - High → red (sustained fixation)
     * 3. Write colored pixels to the visible heatmap canvas
     * 
     * This is the most compute-intensive operation — call sparingly (e.g., every 100ms)
     */
    GazeHeatmap.prototype.render = function () {
        if (!this._dirty || !this._visible) return;

        var accumData = this._accumCtx.getImageData(0, 0, this.width, this.height);
        var pixels = accumData.data; // RGBA array

        // Create output image data for the visible canvas
        var outputData = this.ctx.createImageData(this.width, this.height);
        var output = outputData.data;

        // Process each pixel — map grayscale intensity to color
        for (var i = 0; i < pixels.length; i += 4) {
            // Use the red channel as intensity (since we drew white blobs)
            var value = pixels[i]; // 0-255 intensity

            if (value < 2) {
                // Below threshold — fully transparent (no gaze data here)
                output[i] = 0;
                output[i + 1] = 0;
                output[i + 2] = 0;
                output[i + 3] = 0;
                continue;
            }

            // Normalize to 0-1 range
            var normalized = Math.min(1, value / 200); // 200 = practical max before saturation

            // Color mapping using linear interpolation between color stops:
            // 0.0 → blue (0, 0, 255)
            // 0.25 → cyan (0, 255, 255)
            // 0.5 → green (0, 255, 0)
            // 0.75 → yellow (255, 255, 0)
            // 1.0 → red (255, 0, 0)
            var r, g, b;
            if (normalized < 0.25) {
                var t = normalized / 0.25;
                r = 0;
                g = Math.round(255 * t);
                b = 255;
            } else if (normalized < 0.5) {
                var t = (normalized - 0.25) / 0.25;
                r = 0;
                g = 255;
                b = Math.round(255 * (1 - t));
            } else if (normalized < 0.75) {
                var t = (normalized - 0.5) / 0.25;
                r = Math.round(255 * t);
                g = 255;
                b = 0;
            } else {
                var t = (normalized - 0.75) / 0.25;
                r = 255;
                g = Math.round(255 * (1 - t));
                b = 0;
            }

            // Alpha scales with intensity for natural fadeout at edges
            var alpha = Math.min(255, Math.round(normalized * 220 + 35));

            output[i] = r;
            output[i + 1] = g;
            output[i + 2] = b;
            output[i + 3] = alpha;
        }

        this.ctx.putImageData(outputData, 0, 0);
        this._dirty = false;
    };

    /**
     * Clear all accumulated heatmap data and reset the display.
     */
    GazeHeatmap.prototype.clear = function () {
        this._accumCtx.clearRect(0, 0, this.width, this.height);
        this.ctx.clearRect(0, 0, this.width, this.height);
        this._pointBuffer = [];
        this._maxIntensity = 0;
        this._dirty = false;
        console.log('GazeHeatmap: cleared');
    };

    /**
     * Set the overall opacity of the heatmap overlay.
     * @param {number} value - Opacity from 0 (invisible) to 1 (fully opaque)
     */
    GazeHeatmap.prototype.setOpacity = function (value) {
        this._opacity = Math.max(0, Math.min(1, value));
        this.canvas.style.opacity = this._opacity;
    };

    /**
     * Toggle heatmap overlay visibility.
     * @returns {boolean} New visibility state
     */
    GazeHeatmap.prototype.toggle = function () {
        this._visible = !this._visible;
        this.canvas.style.display = this._visible ? 'block' : 'none';
        if (this._visible) {
            this._dirty = true;
            this.render();
        }
        return this._visible;
    };

    /**
     * Show the heatmap overlay.
     */
    GazeHeatmap.prototype.show = function () {
        this._visible = true;
        this.canvas.style.display = 'block';
        this._dirty = true;
        this.render();
    };

    /**
     * Hide the heatmap overlay.
     */
    GazeHeatmap.prototype.hide = function () {
        this._visible = false;
        this.canvas.style.display = 'none';
    };

    /**
     * Export the current heatmap as a data URL (PNG image).
     * Useful for saving snapshots or sending to the server.
     * @returns {string} Data URL of the heatmap image
     */
    GazeHeatmap.prototype.getHeatmapImage = function () {
        // Make sure latest data is rendered before export
        this._dirty = true;
        this.render();
        return this.canvas.toDataURL('image/png');
    };

    /**
     * Resize the heatmap canvases.
     * Note: This clears existing data — call rebuild() after if needed.
     * @param {number} width - New width
     * @param {number} height - New height
     */
    GazeHeatmap.prototype.resize = function (width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        this._accumCanvas.width = width;
        this._accumCanvas.height = height;

        // Re-render all stored points at new dimensions
        this.rebuild();
    };

    /**
     * Rebuild the heatmap from the stored point buffer.
     * Called after resize to maintain heatmap data.
     */
    GazeHeatmap.prototype.rebuild = function () {
        // Clear accumulation canvas
        this._accumCtx.clearRect(0, 0, this.width, this.height);

        // Re-add all stored points
        var points = this._pointBuffer;
        this._pointBuffer = []; // Clear to prevent doubling
        for (var i = 0; i < points.length; i++) {
            this.addPoint(points[i].x, points[i].y, points[i].intensity);
        }
        this.render();
    };

    /**
     * Set the radius of each Gaussian blob.
     * Larger values create a more diffuse, blurry heatmap.
     * @param {number} radius - Blob radius in pixels
     */
    GazeHeatmap.prototype.setRadius = function (radius) {
        this._pointRadius = Math.max(10, Math.min(200, radius));
    };

    /**
     * Get the total number of accumulated gaze points.
     * @returns {number}
     */
    GazeHeatmap.prototype.getPointCount = function () {
        return this._pointBuffer.length;
    };

    // Expose globally
    window.GazeHeatmap = GazeHeatmap;

})();
