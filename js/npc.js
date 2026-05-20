/**
 * NPC Class
 * Simple interactive characters in the game
 */

class NPC {
    constructor(x, y, npcIndex = 0, scale = 4, worldWidth = 1536, screenHeight = 1024, yOffset = 0) {
        this.x = x;
        this.y = y;
        this.npcIndex = npcIndex;
        this.scale = scale;
        this.worldWidth = worldWidth;
        this.screenHeight = screenHeight;
        this.yOffset = yOffset; // For fine-tuning foot alignment

        // Dimensions (371 pixels wide spritesheet containing 8 NPCs)
        this.baseWidth = 371 / 8; // 46.375px
        this.baseHeight = 74;
        this.width = 46 * scale;
        this.height = this.baseHeight * scale;

        // State
        this.state = 'walk'; // NPCs walk more by default
        this.facingLeft = Math.random() < 0.5;
        this.speed = 0.8 + Math.random() * 0.8; // Relaxed walking speed
        this.alive = true;
        this.leader = null;
        this.followDistance = 50 + Math.random() * 30;
        this.moveOnlyLeft = false; // For conveyor-belt like movement
        this.wrapAround = false;   // Respawn on the other side

        // Animation
        this.frameIndex = Math.random() * 4; // Start at random frame to prevent sync
        this.animationSpeed = 0.12;
        this.animations = {
            idle: [],
            walk: []
        };

        // Personality (AI variation)
        this.laziness = 0.002 + Math.random() * 0.01;      // Chance to stop walking (0.2% - 1.2%)
        this.restlessness = 0.005 + Math.random() * 0.02;  // Chance to start walking (0.5% - 2.5%)

        this.loaded = false;
        this.loadTextures();
    }

    async loadTextures() {
        try {
            const idleSheet = await Utils.loadImage('npc_textures/npc_idle.png');
            const walk0 = await Utils.loadImage('npc_textures/npc_walk0.png');
            const walk1 = await Utils.loadImage('npc_textures/npc_walk1.png');
            const walk2 = await Utils.loadImage('npc_textures/npc_walk2.png');

            if (idleSheet && walk0 && walk1 && walk2) {
                const startX = Math.round(this.npcIndex * this.baseWidth);
                const frameWidth = Math.ceil(this.baseWidth);

                this.animations.idle.push(this.extractFrame(idleSheet, startX, 0, frameWidth, this.baseHeight));
                this.animations.walk.push(this.extractFrame(walk0, startX, 0, frameWidth, this.baseHeight));
                this.animations.walk.push(this.extractFrame(walk1, startX, 0, frameWidth, this.baseHeight));
                this.animations.walk.push(this.extractFrame(walk2, startX, 0, frameWidth, this.baseHeight));
                this.animations.walk.push(this.extractFrame(walk1, startX, 0, frameWidth, this.baseHeight)); // Loop back through neutral

                this.loaded = true;
            } else {
                this.createFallbacks();
            }
        } catch (error) {
            console.error('Error loading NPC textures:', error);
            this.createFallbacks();
        }
    }

    extractFrame(sheet, x, y, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sheet, x, y, width, height, 0, 0, width, height);
        return canvas;
    }

    createFallbacks() {
        const colors = ['#32c832', '#3232c8', '#c8c832', '#c832c8', '#32c8c8'];
        const color = colors[this.npcIndex % colors.length];
        const fallback = Utils.createFallbackImage(this.baseWidth, this.baseHeight, color);
        this.animations.idle = [fallback];
        this.animations.walk = [fallback];
        this.loaded = true;
    }

    update(dt, npcs, player) {
        if (!this.loaded) return;

        // Player Avoidance (Personal Space)
        if (player && !this.leader && !this.id && !this.groupId) {
            const dx = this.x - player.x;
            const distance = Math.abs(dx);
            const dy = Math.abs((this.y + this.yOffset) - player.y);

            if (distance < 60 && dy < 50) {
                // If walking towards player, turn or stop
                const movingTowardsPlayer = (this.facingLeft && dx > 0) || (!this.facingLeft && dx < 0);
                if (movingTowardsPlayer && this.state === 'walk') {
                    if (Math.random() < 0.1) this.facingLeft = !this.facingLeft;
                    else if (Math.random() < 0.05) this.state = 'idle';
                }

                // Subtle push if very close
                if (distance < 40) {
                    this.x += (dx > 0 ? 1 : -1) * (dt / 16.67);
                }
            }
        }



        if (this.leader) {
            // Group following behavior
            const targetX = this.leader.x + (this.x < this.leader.x ? -this.followDistance : this.followDistance);
            const dx = targetX - this.x;

            if (Math.abs(dx) > 20) { // Slight buffer
                this.state = 'walk';
                this.facingLeft = dx < 0;
                this.x += (this.facingLeft ? -this.speed : this.speed) * (dt / 16.67);
            } else {
                // Mimic leader state when close
                this.state = this.leader.state;
                this.facingLeft = this.leader.facingLeft;
            }
        } else if (this.state === 'walk') {
            this.x += (this.facingLeft ? -this.speed : this.speed) * (dt / 16.67);

            // Check world boundaries
            if (this.wrapAround) {
                // Wrap around slightly off-screen for continuity
                if (this.x < -150) this.x = this.worldWidth + 150;
                else if (this.x > this.worldWidth + 150) this.x = -150;
            } else {
                if (this.x < 10) {
                    this.x = 11;
                    this.facingLeft = false;
                } else if (this.x > this.worldWidth - 10) {
                    this.x = this.worldWidth - 11;
                    this.facingLeft = true;
                }
            }

            // Rarely stop walking (Skip if moveOnlyLeft)
            if (!this.moveOnlyLeft && Math.random() < this.laziness) {
                this.state = 'idle';
            }
        } else {
            // Idle state: occasionally start walking
            // Skip random movement if NPC has an ID or Group (usually cinematic or following)
            if (!this.id && !this.groupId && Math.random() < this.restlessness) {
                this.state = 'walk';
                if (!this.moveOnlyLeft && Math.random() < 0.3) this.facingLeft = !this.facingLeft;
            }
        }

        // Update animation
        const anim = this.animations[this.state] || this.animations.idle;
        this.frameIndex += this.animationSpeed * (dt / 16.67);
        if (this.frameIndex >= anim.length) {
            this.frameIndex = 0;
        }
    }

    draw(ctx, dt = 16.67) {
        if (!this.loaded || !this.alive) return;

        const anim = this.animations[this.state] || this.animations.idle;
        const frame = anim[Math.floor(this.frameIndex)] || anim[0];

        if (!frame) return;

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        // Foot alignment adjustment
        const drawY = this.y + this.yOffset;

        if (this.facingLeft) {
            ctx.scale(-1, 1);
            ctx.drawImage(frame, -this.x - this.width / 2, drawY - this.height, this.width, this.height);
        } else {
            ctx.drawImage(frame, this.x - this.width / 2, drawY - this.height, this.width, this.height);
        }

        ctx.restore();
    }

    getRect() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height,
            width: this.width,
            height: this.height
        };
    }
}

class TeacherNPC extends NPC {
    constructor(x, y, name, scale = 4, worldWidth = 1536, screenHeight = 1024, yOffset = 0) {
        super(x, y, 0, scale, worldWidth, screenHeight, yOffset);
        this.name = name;
        this.baseWidth = 46;
        this.width = 46 * scale;

        // Emre Hoca faces left as requested and sits still
        this.facingLeft = true;
        this.state = 'idle';

        this.loadTextures();
    }

    async loadTextures() {
        if (!this.name) return;

        console.log(`👤 Loading TeacherNPC: ${this.name}...`);

        try {
            // Path: teachers/emre_hoca/idle/idle.png
            const idleImg = await Utils.loadImage(`teachers/${this.name}/idle/idle.png`);

            if (idleImg) {
                console.log(`✅ ${this.name} idle image loaded: ${idleImg.width}x${idleImg.height}`);
                this.baseWidth = idleImg.width;
                this.baseHeight = idleImg.height;
                this.width = this.baseWidth * this.scale;
                this.height = this.baseHeight * this.scale;

                this.animations.idle = [this.createCanvasFromImage(idleImg)];

                // Load walk sequence (0.png, 1.png, 2.png, 3.png)
                this.animations.walk = [];
                for (let i = 0; i < 4; i++) {
                    const walkFrame = await Utils.loadImage(`teachers/${this.name}/walk/${i}.png`);
                    if (walkFrame) {
                        this.animations.walk.push(this.createCanvasFromImage(walkFrame));
                    }
                }

                // Fallback for walk if sequence missing
                if (this.animations.walk.length === 0) {
                    this.animations.walk = [this.createCanvasFromImage(idleImg)];
                }

                this.loaded = true;
            } else {
                console.error(`❌ Teacher ${this.name} idle image NOT found at: teachers/${this.name}/idle/idle.png`);
                this.createFallbacks();
            }
        } catch (error) {
            console.error(`❌ Error loading textures for Teacher ${this.name}:`, error);
            this.createFallbacks();
        }
    }

    createCanvasFromImage(img) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return canvas;
    }

    update(dt) {
        // Teachers are static unless explicitly set to walk (for cinematics)
        if (this.state !== 'walk') {
            this.state = 'idle';
        } else {
            // If in walk state, update position based on speed/direction
            this.x += this.facingLeft ? -this.speed : this.speed;
        }

        // Update animation frame if multiple frames exist
        const anim = this.animations[this.state];
        if (anim && anim.length > 1) {
            this.frameIndex = (this.frameIndex + 0.1) % anim.length;
        }
    }
}

class MultiTeacherNPC extends NPC {
    constructor(x, y, index, scale = 4, worldWidth = 1536, screenHeight = 1024, yOffset = 0) {
        // Teachers: smaller scale (0.60x) and increased yOffset (+60) to fix floating/foot alignment
        const adjustedScale = scale * 0.60;
        const footFixOffset = yOffset + 60;

        super(x, y, index, adjustedScale, worldWidth, screenHeight, footFixOffset);

        // Force fully static behavior
        this.state = 'idle';
        this.laziness = 1.0;
        this.restlessness = 0.0;
    }

    // Override update completely to disable movement
    update(dt) {
        if (!this.loaded) return;

        // Force idle state
        this.state = 'idle';

        // Only update animation frame (if we had animation)
        const anim = this.animations.idle;
        if (anim && anim.length > 1) {
            this.frameIndex += (this.animationSpeed * 0.5) * (dt / 16.67);
            if (this.frameIndex >= anim.length) {
                this.frameIndex = 0;
            }
        }
    }

    async loadTextures() {
        try {
            const sheet = await Utils.loadImage('teachers/npcteachers/idle/0.png');

            if (sheet) {
                const totalTeachers = 6;
                const singleWidth = Math.floor(sheet.width / totalTeachers);
                const height = sheet.height;

                this.baseWidth = singleWidth;
                this.baseHeight = height;
                this.width = this.baseWidth * this.scale;
                this.height = this.baseHeight * this.scale;

                // Extract specific teacher frame using npcIndex
                const safeIndex = this.npcIndex % totalTeachers;
                const startX = Math.floor(safeIndex * singleWidth);

                const frame = this.extractFrame(sheet, startX, 0, singleWidth, height);

                this.animations.idle = [frame];
                this.animations.walk = [frame];

                this.loaded = true;
                console.log(`👨‍🏫 MultiTeacherNPC ${this.npcIndex} loaded.`);
            } else {
                console.warn('⚠️ Failed to load teacher sprite sheet (0.png).');
                this.createFallbacks();
            }
        } catch (error) {
            console.error('❌ Error loading MultiTeacherNPC:', error);
            this.createFallbacks();
        }
    }
}
