/**
 * Paper Plane Class
 * A paper plane that flies across the scene with physics
 */

class PaperPlane {
    constructor(x, y, vx, vy, worldWidth, screenHeight) {
        this.x = x;
        this.y = y;
        this.vx = vx; // Horizontal velocity
        this.vy = vy; // Vertical velocity
        this.worldWidth = worldWidth;
        this.screenHeight = screenHeight;

        this.gravity = 0.15;
        this.rotation = 0;
        this.alive = true;
        this.alive = true;
        this.onGround = false;

        // Custom offset to easily adjust landing height
        // Increase this to make plane land HIGHER
        // Decrease this to make plane land LOWER
        this.landingOffset = 270;

        // Depth effect
        this.scale = 1.0;
        this.targetScale = 1.0;
        this.scaleSpeed = 0.005;

        // Dimensions - base size
        this.baseWidth = 240;
        this.baseHeight = 240;
        this.width = this.baseWidth;
        this.height = this.baseHeight;

        this.image = null;
        this.loaded = false;
        this.loadTexture();
    }

    async loadTexture() {
        // Initialize cache if doesn't exist
        if (!PaperPlane.textureCache) {
            PaperPlane.textureCache = {
                image: null,
                promise: null
            };
        }

        // If already cached, use it
        if (PaperPlane.textureCache.image) {
            this.image = PaperPlane.textureCache.image;
            this.loaded = true;
            return;
        }

        // If currently loading, wait for it
        if (PaperPlane.textureCache.promise) {
            try {
                const img = await PaperPlane.textureCache.promise;
                if (img) {
                    this.image = img;
                    this.loaded = true;
                } else {
                    this.createFallback();
                }
            } catch (e) {
                this.createFallback();
            }
            return;
        }

        // Start loading
        try {
            const loadPromise = Utils.loadImage('assets/kagıt_ucak.png');
            PaperPlane.textureCache.promise = loadPromise;

            const img = await loadPromise;
            if (img) {
                PaperPlane.textureCache.image = img;
                this.image = img;
                this.loaded = true;
            } else {
                this.createFallback();
            }
        } catch (error) {
            console.error('Error loading paper plane texture:', error);
            this.createFallback();
        }
    }

    createFallback() {
        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');

        // Draw a simple triangle as fallback
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(220, 120);
        ctx.lineTo(40, 60);
        ctx.lineTo(40, 180);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 6;
        ctx.stroke();

        this.image = canvas;
        this.loaded = true;
    }

    update(dt, currentGroundY = null) {
        if (!this.loaded || !this.alive) return;

        const deltaFactor = dt / 16.67;

        // Apply scaling (depth effect)
        if (this.scale < this.targetScale) {
            this.scale += this.scaleSpeed * deltaFactor;
            if (this.scale > this.targetScale) this.scale = this.targetScale;
        } else if (this.scale > this.targetScale) {
            this.scale -= this.scaleSpeed * deltaFactor;
            if (this.scale < this.targetScale) this.scale = this.targetScale;
        }

        this.width = this.baseWidth * this.scale;
        this.height = this.baseHeight * this.scale;

        // Apply physics
        if (!this.onGround) {
            this.vy += this.gravity * deltaFactor;
            this.x += this.vx * deltaFactor;
            this.y += this.vy * deltaFactor;
        } else {
            // Sliding on ground
            this.x += this.vx * deltaFactor;
            this.vx *= Math.pow(0.95, deltaFactor); // Friction

            if (Math.abs(this.vx) < 0.1) {
                this.vx = 0;
            }
        }

        // Ground collision (using simple offset)
        const gY = currentGroundY !== null ? currentGroundY : (this.screenHeight - 100);

        // Use landingOffset to determine where the center of the plane should stop
        // This is much easier to tune than height/3
        if (this.y > gY - this.landingOffset) {
            this.y = gY - this.landingOffset;
            this.vy = 0;
            this.onGround = true;
        }

        // Remove if out of bounds (only if not on ground)
        if (!this.onGround && (this.x < -1000 || this.x > this.worldWidth + 1000)) {
            this.alive = false;
        }
    }

    draw(ctx) {
        if (!this.loaded || !this.alive) return;

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        // Force flat on ground, otherwise use velocity angle
        const angle = this.onGround ? 0 : Math.atan2(this.vy, this.vx);

        ctx.translate(this.x, this.y);
        ctx.rotate(angle);

        // Orientation logic
        if (Math.abs(angle) > Math.PI / 2) {
            ctx.scale(1, -1);
        }
        ctx.scale(-1, 1);

        // Draw centered. No complex offsets needed if collision sets Y correctly.
        // We might want to nudge it slightly differently based on landingOffset visually if needed
        const drawOffsetY = this.onGround ? 10 : 0; // Small visual tweak
        ctx.drawImage(this.image, -this.width / 2, -this.height / 2 + drawOffsetY, this.width, this.height);

        ctx.restore();
    }

    getRect() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }
}
