/* ═══════════════════════════════════════════════════════
   SmartEV Vision — Shared Utilities
   ═══════════════════════════════════════════════════════ */

/**
 * Universal API call wrapper with error handling
 * @param {string} url - API endpoint
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {object|null} data - Request body (auto-serialized to JSON)
 * @returns {Promise<object>} Parsed JSON response
 */
async function apiCall(url, method = 'GET', data = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            const errorBody = await response.text();
            let message;
            try {
                const parsed = JSON.parse(errorBody);
                message = parsed.error || parsed.message || `HTTP ${response.status}`;
            } catch {
                message = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(message);
        }

        // Handle 204 No Content
        if (response.status === 204) return null;

        return await response.json();
    } catch (error) {
        console.error(`[API] ${method} ${url} failed:`, error);
        showNotification(error.message || 'An unexpected error occurred', 'danger');
        throw error;
    }
}

/**
 * Format seconds into human-readable duration
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted string e.g. "2m 30s"
 */
function formatDuration(seconds) {
    if (seconds == null || isNaN(seconds)) return '—';

    seconds = Math.round(seconds);

    if (seconds < 0) return '0s';
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (minutes < 60) {
        return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Show a toast notification
 * @param {string} message - Notification text
 * @param {string} type - 'success' | 'danger' | 'warning' | 'info'
 */
function showNotification(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.warn('[Notification] Toast container not found');
        return;
    }

    const iconMap = {
        success: 'fas fa-check-circle',
        danger: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };

    const colorMap = {
        success: '#00ff88',
        danger: '#ff006e',
        warning: '#ffc107',
        info: '#00d4ff'
    };

    const id = 'toast-' + Date.now();

    const toastHTML = `
        <div id="${id}" class="toast toast-glass align-items-center border-0" role="alert"
             aria-live="assertive" aria-atomic="true" data-bs-delay="4500">
            <div class="d-flex align-items-center p-3">
                <i class="${iconMap[type] || iconMap.info}" style="color: ${colorMap[type] || colorMap.info}; font-size: 1.2rem;" class="me-2"></i>
                <div class="toast-body flex-grow-1" style="font-size: 0.9rem;">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white ms-2" data-bs-dismiss="toast" aria-label="Close" style="font-size: 0.65rem;"></button>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', toastHTML);

    const toastEl = document.getElementById(id);
    const toast = new bootstrap.Toast(toastEl);
    toast.show();

    // Cleanup after hidden
    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
}

/**
 * Format a timestamp into a readable date string
 * @param {string|number} timestamp - ISO string, Unix timestamp, or Date-compatible value
 * @returns {string} Formatted date string
 */
function formatDate(timestamp) {
    if (!timestamp) return '—';

    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return '—';

        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        };

        return date.toLocaleDateString('en-US', options);
    } catch {
        return '—';
    }
}

/**
 * Debounce helper — delays function execution until after a quiet period
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(fn, delay = 300) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Animate a number counting up (for stat cards)
 * @param {HTMLElement} element - Target element
 * @param {number} target - Target number
 * @param {number} duration - Animation duration in ms
 * @param {string} suffix - Optional suffix like '%'
 */
function animateCounter(element, target, duration = 1500, suffix = '') {
    if (!element) return;

    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (target - start) * eased);

        element.textContent = current.toLocaleString() + suffix;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

/**
 * Generate a random color from the accent palette
 * @returns {string} CSS color string
 */
function getAccentColor(index) {
    const colors = ['#00d4ff', '#00ff88', '#a855f7', '#ff006e', '#ffc107', '#06d6a0'];
    return colors[index % colors.length];
}

/* ── Export for module usage (if needed) ── */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { apiCall, formatDuration, showNotification, formatDate, debounce, animateCounter, getAccentColor };
}
