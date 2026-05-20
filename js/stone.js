/**
 * Stone Class
 * A throwable object with heavy physics
 */

class Stone {
    constructor(x, y, vx, vy, worldWidth, screenHeight) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.worldWidth = worldWidth;
        this.screenHeight = screenHeight;

        this.gravity = 0.5; // Heavier than paper plane
        this.friction = 0.8; // Stops quickly on ground
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.5;
        this.alive = true;
        this.onGround = false;

        // Dimensions - increased to match character scale
        // Original texture will be scaled up to this size
        this.width = 120;
        this.height = 120;

        this.image = null;
        this.loaded = false;
        this.loadTexture();
    }

    async loadTexture() {
        // Initialize cache if doesn't exist
        if (!Stone.textureCache) {
            Stone.textureCache = {
                image: null,
                promise: null
            };
        }

        // If already cached, use it
        if (Stone.textureCache.image) {
            this.image = Stone.textureCache.image;
            this.loaded = true;
            // console.log('✅ Stone texture used from cache'); // Reduced spam
            return;
        }

        // If currently loading, wait for it
        if (Stone.textureCache.promise) {
            try {
                const img = await Stone.textureCache.promise;
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
            const loadPromise = Utils.loadImage('assets/stone.png');
            Stone.textureCache.promise = loadPromise;

            const img = await loadPromise;
            if (img) {
                Stone.textureCache.image = img;
                this.image = img;
                this.loaded = true;
                console.log('✅ Stone texture loaded successfully (Cached)');
            } else {
                console.warn('⚠️ Stone texture not found, using fallback');
                this.createFallback();
            }
        } catch (error) {
            console.error('❌ Error loading stone texture:', error);
            this.createFallback();
        }
    }

    createFallback() {
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');

        // More visible fallback - bright orange stone
        ctx.fillStyle = '#FF6B35';
        ctx.beginPath();
        ctx.arc(60, 60, 50, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#C44D2C';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Add highlight
        ctx.fillStyle = '#FFB088';
        ctx.beginPath();
        ctx.arc(45, 45, 15, 0, Math.PI * 2);
        ctx.fill();

        this.image = canvas;
        this.loaded = true;
        console.log('🟠 Stone fallback created (120x120)');
    }

    update(dt, currentGroundY = null, groundOffset = null) {
        if (!this.loaded || !this.alive) return;

        const deltaFactor = dt / 16.67;

        // Apply physics
        if (!this.onGround) {
            this.vy += this.gravity * deltaFactor;
            this.rotation += this.rotationSpeed * deltaFactor;
        } else {
            // Friction on ground
            this.vx *= Math.pow(this.friction, deltaFactor);
            if (Math.abs(this.vx) < 0.1) this.vx = 0;

            // Stop rotation on ground
            this.rotation = 0;
        }

        this.x += this.vx * deltaFactor;
        this.y += this.vy * deltaFactor;

        // Ground collision
        const gY = currentGroundY !== null ? currentGroundY : (this.screenHeight - 100);

        // Ground offset - if not provided, use half the stone height as default
        // This ensures the stone sits on the ground naturally
        const offset = groundOffset !== null ? groundOffset : (this.height / 2);
        const groundLevel = gY - offset;

        // Check if hitting or below ground (with a small margin for stability)
        if (this.y + this.height / 2 >= groundLevel - 2) {
            // Snap to ground
            this.y = groundLevel - this.height / 2;

            // Bounce slightly if falling fast
            if (Math.abs(this.vy) > 2 && !this.onGround) {
                this.vy = -this.vy * 0.3; // Low bounciness
            } else {
                // Otherwise, stop movement and stay grounded
                this.vy = 0;
                this.onGround = true;
            }
        } else {
            this.onGround = false;
        }

        // Out of bounds
        if (this.x < -1000 || this.x > this.worldWidth + 1000) {
            this.alive = false;
        }

        // If fell too far below ground (glitch safeguard)
        if (this.y > gY + 100) {
            this.y = gY - this.height / 2;
            this.vy = 0;
            this.onGround = true;
        }
    }

    draw(ctx) {
        if (!this.loaded || !this.alive) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);

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
