/**
 * Utility Functions
 * Helper functions for the game
 */

const Utils = {
    /**
     * Save game data to localStorage
     */
    saveGame(data) {
        try {
            localStorage.setItem('dataAgentsSave', JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Save failed:', e);
            return false;
        }
    },

    /**
     * Load game data from localStorage
     */
    loadGame() {
        try {
            const data = localStorage.getItem('dataAgentsSave');
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Load failed:', e);
            return null;
        }
    },

    /**
     * Check if save exists
     */
    hasSave() {
        return localStorage.getItem('dataAgentsSave') !== null;
    },

    /**
     * Clear save data
     */
    clearSave() {
        localStorage.removeItem('dataAgentsSave');
    },

    /**
     * Save settings
     */
    saveSettings(settings) {
        try {
            localStorage.setItem('dataAgentsSettings', JSON.stringify(settings));
            return true;
        } catch (e) {
            console.error('Settings save failed:', e);
            return false;
        }
    },

    /**
     * Load settings
     */
    loadSettings() {
        try {
            const data = localStorage.getItem('dataAgentsSettings');
            return data ? JSON.parse(data) : {
                musicVolume: 50,
                sfxVolume: 50,
                fullscreen: false
            };
        } catch (e) {
            console.error('Settings load failed:', e);
            return {
                musicVolume: 50,
                sfxVolume: 50,
                fullscreen: false
            };
        }
    },

    /**
     * Rectangle collision detection
     */
    rectCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y;
    },

    /**
     * Distance between two points
     */
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Clamp value between min and max
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    /**
     * Linear interpolation
     */
    lerp(start, end, t) {
        return start + (end - start) * t;
    },

    /**
     * Load image with promise
     */
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => {
                console.warn(`Failed to load image: ${src}`);
                resolve(null);
            };
            img.src = src;
        });
    },

    /**
     * Load audio with promise
     */
    loadAudio(src) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.oncanplaythrough = () => resolve(audio);
            audio.onerror = () => {
                console.warn(`Failed to load audio: ${src}`);
                resolve(null);
            };
            audio.src = src;
        });
    },

    /**
     * Create fallback image (colored rectangle)
     */
    createFallbackImage(width, height, color = '#ff6464') {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
        return canvas;
    },

    /**
     * Format time (ms to seconds)
     */
    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        return `${seconds}s`;
    },

    /**
     * Random integer between min and max (inclusive)
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Random float between min and max
     */
    randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    },

    /**
     * Check if mobile device
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            (window.innerWidth <= 768);
    },

    /**
     * Request fullscreen
     */
    requestFullscreen(element) {
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    },

    /**
     * Exit fullscreen
     */
    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
};
