/**
 * Player Class
 * Handles player character mechanics, movement, combat, and animations
 */

class Player {
    constructor(x, y, scale = 4) {
        this.x = x;
        this.y = y;
        this.scale = scale;

        // Boundaries (Easy to edit)
        this.minX = 0;
        this.maxX = 1536; // Default to RENDER_WIDTH

        // Physics
        this.vx = 0;
        this.vy = 0;
        this.walkSpeed = 6;
        this.jumpForce = 25;
        this.gravity = 1;
        this.onGround = true;

        // Dimensions
        this.width = 80;
        this.height = 100;

        // State
        this.facing_left = false;
        this.moving = false;
        this.punching = false;

        // Health and combat
        this.maxHealth = 100;
        this.health = 100;
        this.combo = 0;
        this.lastHitTime = 0;
        this.comboDecay = 1500;

        // Adrenaline
        this.hasAdrenaline = false;
        this.adrenalineActive = false;
        this.adrenalineTimer = 0;
        this.adrenalineDuration = 5000;
        this.speedMultiplier = 1.0;
        this.damageMultiplier = 1.0;

        // Invulnerability
        this.invulnerable = false;
        this.invulnTimer = 0;
        this.flashAlpha = 0;

        // Animation System (Unified with Enemy)
        this.frameIndex = 0;
        this.animationSpeed = 0.2;
        this.currentAnimation = 'idle';
        this.animations = {
            idle: [],
            walk: [],
            punch: [],
            jump: [],
            collect: [],
            aim: []
        };
        this.hasBackpack = false;
        this.punchHitRegistered = false;

        // Input reversal state
        this.reverseRightInputUntilRelease = false;

        // Paper Plane mechanics
        this.paperPlaneCount = 0;
        this.isCollecting = false;
        this.isAiming = false; // Aiming Plane

        // Stone mechanics
        this.stoneCount = 0;
        this.isAimingStone = false;

        // Emote system
        this.emotes = {
            normal: null,
            speak: null
        };
        this.isSpeaking = false;
        this.speakTimer = 0;

        // Load animations
        this.loadAnimations();
    }

    async loadAnimations() {
        // Cache buster for development
        const version = Date.now();

        // Load idle animation
        for (let i = 0; i < 4; i++) {
            const img = await Utils.loadImage(`player/idle/${i}.png?v=${version}`);
            if (img) this.animations.idle.push(img);
        }
        // Fallback for idle: if no frames loaded, use placeholder
        if (this.animations.idle.length === 0) {
            this.animations.idle = [Utils.createFallbackImage(60, 80, '#c8c8c8')];
        }

        // Load walk animation
        for (let i = 0; i < 8; i++) {
            const img = await Utils.loadImage(`player/walk/${i}.png?v=${version}`);
            if (img) this.animations.walk.push(img);
        }

        // Load punch animation
        for (let i = 0; i < 6; i++) {
            const img = await Utils.loadImage(`player/punch/${i}.png?v=${version}`);
            if (img) this.animations.punch.push(img);
        }

        // Load jump animation
        for (let i = 0; i < 4; i++) {
            const img = await Utils.loadImage(`player/jump/${i}.png?v=${version}`);
            if (img) this.animations.jump.push(img);
        }

        // Load collect animation
        for (let i = 0; i < 1; i++) {
            const img = await Utils.loadImage(`player/collect/${i}.png?v=${version}`);
            if (img) this.animations.collect.push(img);
        }

        // Load aim animation
        for (let i = 0; i < 1; i++) {
            const img = await Utils.loadImage(`player/aim/${i}.png?v=${version}`);
            if (img) this.animations.aim.push(img);
        }

        // Load aim layer (paper plane held in hand)
        this.aimLayerImg = await Utils.loadImage(`player/aim/kagıt_ucak_layer.png?v=${version}`);

        // Load emotes
        this.emotes.normal = await Utils.loadImage(`player/emotes/normal.png?v=${version}`);
        if (!this.emotes.normal) console.error('❌ FAILED to load: player/emotes/normal.png');

        this.emotes.speak = await Utils.loadImage(`player/emotes/speak.png?v=${version}`);
        if (!this.emotes.speak) console.error('❌ FAILED to load: player/emotes/speak.png');

        // Load backpack layer
        this.backpackImg = await Utils.loadImage(`player/backpack.png?v=${version}`);
        if (!this.backpackImg) console.error('❌ FAILED to load: player/backpack.png');

        // Fallback if animations didn't load
        if (this.animations.walk.length === 0) this.animations.walk = this.animations.idle;
        if (this.animations.punch.length === 0) this.animations.punch = this.animations.idle;
        if (this.animations.jump.length === 0) this.animations.jump = this.animations.idle;
    }

    startRightInputReversal() {
        this.reverseRightInputUntilRelease = true;
    }

    triggerSpeak() {
        this.isSpeaking = true;
        this.speakTimer = 65; // Short duration for blip pulse
    }


    update(keys, dt, groundY, dialogueActive, backpackTaken = false) {
        // Update backpack state
        this.hasBackpack = backpackTaken;

        // Update timers
        this.invulnTimer = Math.max(0, this.invulnTimer - dt);
        if (this.invulnTimer <= 0) this.invulnerable = false;

        // Update emote speak timer
        if (this.speakTimer > 0) {
            this.speakTimer -= dt;
            if (this.speakTimer <= 0) {
                this.isSpeaking = false;
            }
        }

        if (this.adrenalineActive) {
            this.adrenalineTimer -= dt;
            if (this.adrenalineTimer <= 0) {
                this.adrenalineActive = false;
                this.speedMultiplier = 1.0;
                this.damageMultiplier = 1.0;
            }
        }

        // Combo decay
        const now = Date.now();
        if (now - this.lastHitTime > this.comboDecay) {
            this.combo = 0;
        }

        // Flash effect
        if (this.flashAlpha > 0) {
            this.flashAlpha = Math.max(0, this.flashAlpha - 15);
        }

        // Movement (only if not in dialogue and not punching/collecting/aiming)
        this.moving = false;
        if (!dialogueActive && !this.punching && !this.isCollecting && !this.isAiming) {

            const currentSpeed = this.walkSpeed * this.speedMultiplier;

            let moveLeft = keys['ArrowLeft'] || keys['a'] || keys['A'];
            let moveRight = keys['ArrowRight'] || keys['d'] || keys['D'];

            // Handle input reversal for smooth scene transitions
            // If player spawns on right and holds right, they should walk left until release
            if (this.reverseRightInputUntilRelease) {
                if (moveRight) {
                    moveLeft = true;
                    moveRight = false;
                } else {
                    // Key released, disable reversal
                    this.reverseRightInputUntilRelease = false;
                }
            }

            if (moveLeft) {
                this.x -= currentSpeed;
                this.moving = true;
                this.facing_left = true;
            }

            if (moveRight) {
                this.x += currentSpeed;
                this.moving = true;
                this.facing_left = false;
            }

            if ((keys['ArrowUp'] || keys['w'] || keys['W']) && this.onGround) {
                this.vy = -this.jumpForce;
                this.onGround = false;
            }

            // Boundary clamping (Invisible walls)
            this.x = Utils.clamp(this.x, this.minX, this.maxX);
        }

        // Physics
        this.vy += this.gravity;
        this.y += this.vy;

        // Ground collision
        if (this.y >= groundY) {
            this.y = groundY;
            this.vy = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        // Determine Animation State
        let newState = 'idle';
        if (this.punching) {
            newState = 'punch';
        } else if (this.isCollecting) {
            newState = 'collect';
        } else if (this.isAiming || this.isAimingStone) {
            newState = 'aim';
        } else if (!this.onGround) {
            newState = 'jump';
        } else if (this.moving) {
            newState = 'walk';
        } else {
            newState = 'idle';
        }

        // Update Animation
        this.animate(newState, dt);
    }

    animate(newState, dt = 16.67) {
        if (this.currentAnimation !== newState) {
            this.currentAnimation = newState;
            this.frameIndex = 0;
        }

        const anim = this.animations[this.currentAnimation];
        if (!anim || anim.length === 0) return;

        // Frame-independent animation: normalize to 60 FPS
        this.frameIndex += this.animationSpeed * (dt / 16.67);

        // Loop handling
        if (this.frameIndex >= anim.length) {
            if (this.currentAnimation === 'punch') {
                this.punching = false;
                this.frameIndex = 0;
                this.currentAnimation = 'idle';
            } else if (this.currentAnimation === 'collect') {
                // Stay on collect frame for ~0.5s (progress to frameIndex 6)
                if (this.frameIndex >= 6) {
                    this.isCollecting = false;
                    this.frameIndex = 0;
                    this.currentAnimation = 'idle';
                }
            } else if (this.currentAnimation === 'jump') {
                this.frameIndex = anim.length - 1;
            } else if (this.currentAnimation === 'jump') {
                this.frameIndex = anim.length - 1;
            } else if (this.currentAnimation === 'aim') {
                this.frameIndex = anim.length - 1; // Stay on aim frame
            } else {
                this.frameIndex = 0;
            }
        }
    }

    startPunch(facingLeft) {
        if (this.punching) return;

        this.punching = true;
        this.facing_left = facingLeft;
        this.frameIndex = 0;
        this.punchHitRegistered = false;
    }

    useAdrenaline() {
        if (!this.hasAdrenaline || this.adrenalineActive) return;

        this.hasAdrenaline = false;
        this.adrenalineActive = true;
        this.adrenalineTimer = this.adrenalineDuration;
        this.health = Math.min(this.maxHealth, this.health + 30);
        this.speedMultiplier = 1.5;
        this.damageMultiplier = 1.5;

        console.log('✨ Adrenaline activated!');
    }

    stopAim() {
        this.isAiming = false;
        // Only reset animation if NOT aiming stone either (since both use 'aim' anim)
        if (!this.isAimingStone && this.currentAnimation === 'aim') {
            this.currentAnimation = 'idle';
            this.frameIndex = 0;
        }
    }

    startAimStone() {
        if (this.stoneCount <= 0 || this.punching) return;

        if (this.isCollecting) this.isCollecting = false;
        if (this.isAiming) this.stopAim();

        this.isAimingStone = true;
        this.frameIndex = 0;
    }

    stopAimStone() {
        this.isAimingStone = false;
        if (!this.isAiming && this.currentAnimation === 'aim') {
            this.currentAnimation = 'idle';
            this.frameIndex = 0;
        }
    }

    startCollect(type = 'plane') {
        if (this.isCollecting || this.punching) return;

        this.isCollecting = true;
        this.frameIndex = 0;

        if (type === 'plane') {
            this.paperPlaneCount++;
            console.log(`Inventory: ${this.paperPlaneCount} paper planes`);
        } else if (type === 'stone') {
            this.stoneCount++;
            console.log(`Inventory: ${this.stoneCount} stones`);
        }
    }

    startAim() {
        if (this.paperPlaneCount <= 0 || this.punching) return;

        // Interrupt collection if aiming
        if (this.isCollecting) {
            this.isCollecting = false;
        }

        if (this.isAimingStone) this.stopAimStone();

        this.isAiming = true;
        this.frameIndex = 0;
    }

    takeDamage(damage) {
        if (this.invulnerable) return;

        this.health = Math.max(0, this.health - damage);
        this.flashAlpha = 200;
        this.invulnerable = true;
        this.invulnTimer = 500;

        console.log(`🩸 Player took ${damage} damage. HP: ${this.health}`);
    }

    getRect() {
        return {
            x: this.x - 40,
            y: this.y - 100,
            width: 80,
            height: 100
        };
    }

    getPunchRect() {
        const rect = {
            x: this.x,
            y: this.y - 100,
            width: 60,
            height: 100
        };

        if (this.facing_left) {
            rect.x -= 60;
        }

        return rect;
    }

    draw(ctx) {
        const anim = this.animations[this.currentAnimation];
        if (!anim || anim.length === 0) return;

        const img = anim[Math.floor(this.frameIndex)] || anim[0];
        if (!img) return;

        ctx.save();

        // Disable image smoothing for pixel-perfect rendering
        ctx.imageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;

        // Create image with effects
        const canvas = document.createElement('canvas');

        // Scale image
        const scaledWidth = img.width * this.scale;
        const scaledHeight = img.height * this.scale;
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
        const tempCtx = canvas.getContext('2d');

        // Disable smoothing on temp canvas too
        tempCtx.imageSmoothingEnabled = false;
        tempCtx.webkitImageSmoothingEnabled = false;
        tempCtx.mozImageSmoothingEnabled = false;
        tempCtx.msImageSmoothingEnabled = false;

        tempCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

        // Adrenaline effect
        if (this.adrenalineActive) {
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = 'rgba(255, 100, 100, 0.3)';
            tempCtx.fillRect(0, 0, scaledWidth, scaledHeight);
        }

        // Flash effect
        if (this.flashAlpha > 0) {
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha / 255})`;
            tempCtx.fillRect(0, 0, scaledWidth, scaledHeight);
        }

        // Draw flipped if facing left
        if (this.facing_left) {
            ctx.save();
            ctx.scale(-1, 1);

            // Draw backpack layer UNDERNEATH
            if (this.hasBackpack && this.backpackImg) {
                ctx.drawImage(this.backpackImg, -this.x - scaledWidth / 2, this.y - scaledHeight, scaledWidth, scaledHeight);
            }

            ctx.drawImage(canvas, -this.x - scaledWidth / 2, this.y - scaledHeight);

            // Draw aim layer if aiming
            if (this.isAiming && this.aimLayerImg) {
                // Directly overlay on character using SAME dimensions and position
                ctx.drawImage(this.aimLayerImg, -this.x - scaledWidth / 2, this.y - scaledHeight, scaledWidth, scaledHeight);
            }

            // Draw emote layer (Hidden during collection as requested)
            if (!this.isCollecting) {
                let emoteImg = this.isSpeaking ? this.emotes.speak : this.emotes.normal;
                if (this.isSpeaking && !emoteImg) emoteImg = this.emotes.normal;

                if (emoteImg) {
                    ctx.drawImage(emoteImg, -this.x - scaledWidth / 2, this.y - scaledHeight, scaledWidth, scaledHeight);
                }
            }

            ctx.restore();
        } else {
            // Draw weightless backpack UNDERNEATH
            if (this.hasBackpack && this.backpackImg) {
                ctx.drawImage(this.backpackImg, this.x - scaledWidth / 2, this.y - scaledHeight, scaledWidth, scaledHeight);
            }

            ctx.drawImage(canvas, this.x - scaledWidth / 2, this.y - scaledHeight);

            // Draw aim layer if aiming
            if (this.isAiming && this.aimLayerImg) {
                // Directly overlay on character using SAME dimensions and position
                ctx.drawImage(this.aimLayerImg, this.x - scaledWidth / 2, this.y - scaledHeight, scaledWidth, scaledHeight);
            }

            // Draw emote layer (Hidden during collection as requested)
            if (!this.isCollecting) {
                let emoteImg = this.isSpeaking ? this.emotes.speak : this.emotes.normal;
                if (this.isSpeaking && !emoteImg) emoteImg = this.emotes.normal;

                if (emoteImg) {
                    ctx.drawImage(emoteImg, this.x - scaledWidth / 2, this.y - scaledHeight, scaledWidth, scaledHeight);
                }
            }
        }

        ctx.restore();
    }
}
