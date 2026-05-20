/**
 * Projectile Class
 * Throwable stone with realistic physics
 */

class Projectile {
    constructor(x, y, targetX, targetY, damage = 15) {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.active = true;

        // Physics
        const dx = targetX - x;
        const dy = targetY - y - 50;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const initialSpeed = 15;
        if (dist > 0) {
            this.vx = (dx / dist) * initialSpeed;
            this.vy = (dy / dist) * initialSpeed - 8;
        } else {
            this.vx = initialSpeed;
            this.vy = -8;
        }

        this.gravity = 0.5;
        this.rotation = 0;
        this.rotationSpeed = Utils.randomInt(10, 20);
        this.lifetime = 180;

        this.width = 20;
        this.height = 20;
    }

    update(dt = 16.67, groundY = 900) {
        if (!this.active) return;

        // Frame-independent physics
        const dtScale = dt / 16.67;
        this.vy += this.gravity * dtScale;
        this.x += this.vx * dtScale;
        this.y += this.vy * dtScale;
        this.rotation += this.rotationSpeed * dtScale;

        this.lifetime--;
        // Ground hit
        if (this.y > groundY) {
            this.y = groundY;
            this.active = false;
            this.hitGround = true; // Mark as hit ground
        }

        if (this.lifetime <= 0) {
            this.active = false;
        }
    }

    getRect() {
        return {
            x: this.x - 10,
            y: this.y - 10,
            width: 20,
            height: 20
        };
    }

    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);

        // Draw stone
        ctx.fillStyle = '#5a5a5a';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#464646';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Highlights
        ctx.fillStyle = '#6e6e6e';
        ctx.beginPath();
        ctx.arc(-3, -3, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 15, 7, 4, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Adrenaline Injector Class
 * Collectible item that drops from enemies
 */

class AdrenalineInjector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.active = true;
        this.pulse = 0;
        this.pulseSpeed = 0.1;
        this.width = 30;
        this.height = 30;
    }

    getRect() {
        return {
            x: this.x - 15,
            y: this.y - 15,
            width: 30,
            height: 30
        };
    }

    draw(ctx, dt = 16.67) {
        if (!this.active) return;

        // Pulse animation (frame-independent)
        const dtScale = dt / 16.67;
        this.pulse += this.pulseSpeed * dtScale;
        if (this.pulse > 1 || this.pulse < 0) {
            this.pulseSpeed *= -1;
        }

        const scale = 1.0 + (this.pulse * 0.3);
        const size = 12 * scale;

        ctx.save();

        // Glow effect
        const glowSize = 25 * scale;
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowSize);
        gradient.addColorStop(0, 'rgba(255, 50, 50, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 50, 50, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
        ctx.fill();

        // Injector body
        ctx.fillStyle = '#ff3232';
        ctx.beginPath();
        ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#c80000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Needle
        ctx.fillStyle = '#969696';
        ctx.fillRect(this.x - 3, this.y - size - 5, 6, 10);

        ctx.restore();
    }
}

/**
 * Enemy Class
 * Advanced AI enemy with multiple behaviors
 */

class Enemy {
    constructor(x, y, scale = 3, screenWidth = 1536, screenHeight = 1024, type = 0) {
        this.x = x;
        this.y = y;
        this.scale = scale;
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        this.type = type; // 0-6 indicating enemy variant

        // Dimensions
        this.baseWidth = 386 / 7; // ~55.14px
        this.baseHeight = 100;    // Matching Player height
        this.width = this.baseWidth * scale;
        this.height = this.baseHeight * scale;

        // Physics
        this.baseSpeed = 3.8;
        this.speed = this.baseSpeed;
        this.retreatSpeed = 3.2;
        this.escapeSpeed = 4.5;

        // AI State
        this.state = 'idle'; // idle, walk, attack, retreat, inject, block, throw
        this.facingLeft = false;
        this.aggressionRange = 800;
        this.attackRange = 90;
        this.attackCooldown = 0;
        this.attackDelay = 800;
        this.attackActive = false;
        this.attackFrameCount = 0;

        // Health
        this.maxHealth = 100;
        this.health = 100;
        this.alive = true;
        this.invulnerable = false;
        this.invulnTimer = 0;

        // Combat
        this.damage = 12;
        this.blocking = false;
        this.blockChance = 0.25;
        this.blockCooldown = 0;

        // Knockback/Stun
        this.stunTimer = 0;
        this.retreatTimer = 0;
        this.retreatDuration = 200;
        this.comboCount = 0;
        this.lastHitTime = 0;
        this.comboDecayMs = 2000;
        this.baseKnockback = 25;
        this.comboKnockbackAdd = 10;
        this.maxKnockback = 80;

        // Escape/Adrenaline
        this.escapeThreshold = 0.3;
        this.escaping = false;
        this.injecting = false;
        this.injectTimer = 0;
        this.injectDuration = 2000;
        this.adrenalineBoost = false;
        this.boostTimer = 0;
        this.boostDuration = 5000;
        this.hasAdrenaline = false;

        // Projectiles
        this.projectiles = [];
        this.throwCooldown = 0;
        this.throwDelay = 3000;
        this.canThrow = true;
        this.throwAnimationTimer = 0;
        this.isThrowing = false;

        // Injector seeking
        this.searchingInjector = false;
        this.targetInjector = null;

        // Animation
        this.frameIndex = 0;
        this.animationSpeed = 0.18;
        this.currentAnimation = 'idle';
        this.animations = {
            idle: [],
            walk: [],
            attack: [],
            inject: []
        };

        // Visual effects
        this.flashAlpha = 0;

        // Load animations
        this.loadAnimations();
    }

    async loadAnimations() {
        // Load enemy animations
        const animTypes = ['idle', 'walk', 'attack', 'inject'];
        this.baseWidth = 386 / 7;
        this.baseHeight = 128;
        this.width = this.baseWidth * this.scale;
        this.height = this.baseHeight * this.scale;

        for (const anim of animTypes) {
            // Each animation type folder (enemy_idle, etc) has a 0.png 
            // containing all 7 character variants side-by-side
            const sheet = await Utils.loadImage(`Enemy_textures/enemy_${anim}/0.png`);
            if (sheet) {
                const startX = Math.round(this.type * this.baseWidth);
                const frameWidth = Math.ceil(this.baseWidth);

                const frame = this.extractFrame(sheet, startX, 0, frameWidth, this.baseHeight);
                this.animations[anim].push(frame);
            }
        }

        // Fallback if no animations loaded
        if (this.animations.idle.length === 0) {
            const fallback = Utils.createFallbackImage(this.baseWidth, this.baseHeight, '#c83232');
            this.animations.idle = [fallback];
            this.animations.walk = [fallback];
            this.animations.attack = [fallback];
            this.animations.inject = [fallback];
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

    update(playerRect, dt, injectors = [], stones = [], groundY = 900, combatPaused = false) {
        if (!this.alive) return null;

        const now = Date.now();

        // Update timers
        this.attackCooldown = Math.max(0, this.attackCooldown - dt);
        this.stunTimer = Math.max(0, this.stunTimer - dt);
        this.retreatTimer = Math.max(0, this.retreatTimer - dt);
        this.throwCooldown = Math.max(0, this.throwCooldown - dt);
        this.blockCooldown = Math.max(0, this.blockCooldown - dt);
        this.invulnTimer = Math.max(0, this.invulnTimer - dt);

        if (this.invulnTimer <= 0) this.invulnerable = false;

        // Combo decay
        if (now - this.lastHitTime > this.comboDecayMs) {
            this.comboCount = 0;
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.update(dt, groundY);

            if (!proj.active) {
                // If hit ground, transform into Stone
                if (proj.hitGround && stones) {
                    // Create stone at projectile location
                    const stone = new Stone(proj.x, proj.y - 12, 0, 0, this.screenWidth, this.screenHeight);
                    stone.onGround = true;

                    // Position stone on ground with proper offset
                    // Use a default offset since we don't have scene info here
                    const defaultOffset = stone.height / 2;
                    stone.y = groundY - stone.height / 2 - defaultOffset;

                    stones.push(stone);
                }

                this.projectiles.splice(i, 1);
            }
        }

        // Early return if combat is paused (e.g. during dialogue)
        if (combatPaused) {
            // If it's the bully, we let SceneManager handle his state/pos
            // For others, they just stay in current state
            return null;
        }

        // Flash effect
        if (this.flashAlpha > 0) {
            this.flashAlpha = Math.max(0, this.flashAlpha - 20);
        }

        // Stun state
        if (this.stunTimer > 0) {
            this.state = 'retreat';
            this.attackActive = false;
            this.blocking = false;
            this.isThrowing = false;
            return null;
        }

        // Throwing animation
        if (this.isThrowing) {
            this.throwAnimationTimer -= dt;
            if (this.throwAnimationTimer <= 0) {
                this.isThrowing = false;
                this.state = 'idle';
            }
            return null;
        }

        // Adrenaline boost
        if (this.adrenalineBoost) {
            this.boostTimer -= dt;
            if (this.boostTimer <= 0) {
                this.adrenalineBoost = false;
                this.speed = this.baseSpeed;
                this.hasAdrenaline = false;
            }
            return this.aggressiveBehavior(playerRect, dt);
        }

        // Injecting
        if (this.injecting) {
            this.state = 'inject';
            this.injectTimer -= dt;
            if (this.injectTimer <= 0) {
                this.injecting = false;
                this.escaping = false;
                this.searchingInjector = false;
                const healAmount = Utils.randomInt(30, 50);
                this.health = Math.min(this.maxHealth, this.health + healAmount);
                this.startAdrenalineBoost();
            }
            return null;
        }

        // Injector seeking
        if (injectors.length > 0 && this.health < this.maxHealth * 0.5 && !this.hasAdrenaline) {
            const nearest = this.findNearestInjector(injectors);
            if (nearest && !this.searchingInjector) {
                this.searchingInjector = true;
                this.targetInjector = nearest;
            }
        }

        if (this.searchingInjector && this.targetInjector) {
            return this.seekInjector(playerRect, dt);
        }

        // Escape mode
        if (this.health <= this.maxHealth * this.escapeThreshold && !this.hasAdrenaline) {
            this.escaping = true;
        }

        if (this.escaping) {
            this.escapeFromPlayer(playerRect, dt);
            return null;
        }

        // Normal aggressive behavior
        return this.aggressiveBehavior(playerRect, dt);
    }

    findNearestInjector(injectors) {
        let nearest = null;
        let minDist = Infinity;

        for (const inj of injectors) {
            if (!inj.active) continue;
            const dist = Math.abs(inj.x - this.x);
            if (dist < minDist) {
                minDist = dist;
                nearest = inj;
            }
        }

        return minDist < 500 ? nearest : null;
    }

    seekInjector(playerRect, dt) {
        if (!this.targetInjector || !this.targetInjector.active) {
            this.searchingInjector = false;
            this.targetInjector = null;
            return null;
        }

        this.state = 'walk';

        if (this.targetInjector.x < this.x - 10) {
            this.x -= this.speed;
            this.facingLeft = true;
        } else if (this.targetInjector.x > this.x + 10) {
            this.x += this.speed;
            this.facingLeft = false;
        } else {
            const dist = Math.abs(this.targetInjector.x - this.x);
            if (dist < 30) {
                this.targetInjector.active = false;
                this.searchingInjector = false;
                this.targetInjector = null;
                this.startInjection();
            }
        }

        this.keepInsideScreen();
        return null;
    }

    aggressiveBehavior(playerRect, dt) {
        const distance = Math.abs(playerRect.x + playerRect.width / 2 - this.x);
        const playerLeft = (playerRect.x + playerRect.width / 2) < this.x;
        this.facingLeft = playerLeft;

        // Attack animation
        if (this.attackActive) {
            this.attackFrameCount++;
            const attackDuration = Math.floor(this.animations.attack.length / Math.max(0.01, this.animationSpeed));

            if (this.attackFrameCount >= attackDuration) {
                this.attackActive = false;
                this.attackFrameCount = 0;
                this.state = 'idle';
            }
            return null;
        }

        // Random blocking
        if (this.blockCooldown <= 0 && Math.random() < 0.05) {
            this.blocking = true;
            this.state = 'block';
            this.blockCooldown = 2000;
            return null;
        }

        if (this.blocking && this.blockCooldown <= 0) {
            this.blocking = false;
        }

        // Behavior based on distance
        if (distance > this.aggressionRange) {
            this.state = 'idle';
        } else if (distance > 250 && distance < 600 && this.throwCooldown <= 0 && this.canThrow) {
            this.throwProjectile(playerRect);
        } else if (distance > this.attackRange) {
            this.state = 'walk';
            if (playerLeft) {
                this.x -= this.speed;
            } else {
                this.x += this.speed;
            }
        } else if (this.attackCooldown <= 0) {
            this.state = 'attack';
            this.attackActive = true;
            this.attackFrameCount = 0;
            this.attackCooldown = this.attackDelay;
            this.frameIndex = 0;

            // Check if attack hits
            const attackRect = this.getAttackRect();
            if (Utils.rectCollision(attackRect, playerRect)) {
                return 'attack';
            }
        } else {
            this.state = 'idle';
        }

        this.keepInsideScreen();
        return null;
    }

    throwProjectile(playerRect) {
        this.throwCooldown = this.throwDelay;
        this.isThrowing = true;
        this.throwAnimationTimer = 400;
        this.state = 'throw';
        this.frameIndex = 0;

        const startX = this.x + (this.facingLeft ? -40 : 40);
        const startY = this.y - this.height / 2;

        const proj = new Projectile(
            startX, startY,
            playerRect.x + playerRect.width / 2,
            playerRect.y + playerRect.height / 2 - 40,
            15
        );
        this.projectiles.push(proj);

        console.log('🪨 Enemy threw stone!');
    }

    escapeFromPlayer(playerRect, dt) {
        this.state = 'walk';

        if (playerRect.x + playerRect.width / 2 < this.x) {
            this.x += this.escapeSpeed;
            this.facingLeft = false;
        } else {
            this.x -= this.escapeSpeed;
            this.facingLeft = true;
        }

        const margin = 50;
        if (this.x < margin || this.x > this.screenWidth - margin) {
            this.x = Utils.clamp(this.x, margin, this.screenWidth - margin);
            this.startInjection();
        }

        this.keepInsideScreen();
    }

    keepInsideScreen() {
        const margin = 20;
        this.x = Utils.clamp(this.x, margin, this.screenWidth - margin);
    }

    startInjection() {
        if (!this.injecting) {
            this.injecting = true;
            this.injectTimer = this.injectDuration;
            this.state = 'inject';
            this.frameIndex = 0;
            console.log('💉 Enemy injecting adrenaline...');
        }
    }

    startAdrenalineBoost() {
        this.adrenalineBoost = true;
        this.hasAdrenaline = true;
        this.boostTimer = this.boostDuration;
        this.speed = this.baseSpeed * 1.7;
        console.log('⚡ Enemy adrenaline boost!');
    }

    takeDamage(damage) {
        if (!this.alive || this.invulnerable) return false;

        // Blocking reduces damage
        if (this.blocking) {
            damage = Math.floor(damage * 0.3);
            this.blocking = false;
            console.log(`🛡️ Enemy blocked! Damage: ${damage}`);
        }

        const now = Date.now();

        // Combo tracking
        if (now - this.lastHitTime <= this.comboDecayMs) {
            this.comboCount++;
        } else {
            this.comboCount = 1;
        }
        this.lastHitTime = now;

        this.health -= damage;
        console.log(`💥 Enemy took ${damage} damage! HP: ${this.health}/${this.maxHealth}`);

        this.flashAlpha = 200;
        this.invulnerable = true;
        this.invulnTimer = 100;

        if (this.health <= 0) {
            this.alive = false;
            this.health = 0;
            console.log('☠️ Enemy defeated!');
            return true;
        }

        // Knockback
        const kb = Math.min(
            this.baseKnockback + this.comboKnockbackAdd * (this.comboCount - 1),
            this.maxKnockback
        );

        // Knockback - push enemy away from player
        // If enemy is facing left, player is on the right, so push enemy AWAY (left = negative)
        // But actually, facing direction is TOWARD player, so reverse it
        this.x += this.facingLeft ? kb : -kb;

        this.stunTimer = 200;
        this.retreatTimer = this.retreatDuration;
        this.state = 'retreat';
        this.frameIndex = 0;
        this.attackActive = false;
        this.isThrowing = false;

        this.keepInsideScreen();
        return false;
    }

    getRect() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height,
            width: this.width,
            height: this.height
        };
    }

    getAttackRect() {
        const rect = {
            x: this.x,
            y: this.y - this.height,
            width: 50,
            height: this.height
        };

        if (this.facingLeft) {
            rect.x -= 50;
        }

        return rect;
    }

    animate(dt = 16.67) {
        if (this.currentAnimation !== this.state) {
            this.currentAnimation = this.state;
            this.frameIndex = 0;
        }

        const anim = this.animations[this.currentAnimation] || this.animations.idle;
        if (!anim || anim.length === 0) return;

        // Frame-independent animation
        this.frameIndex += this.animationSpeed * (dt / 16.67);
        if (this.frameIndex >= anim.length) {
            this.frameIndex = 0;
        }
    }

    draw(ctx, dt = 16.67) {
        if (!this.alive) return;

        this.animate(dt);

        const anim = this.animations[this.currentAnimation] || this.animations.idle;
        if (!anim || anim.length === 0) return;

        const frame = anim[Math.floor(this.frameIndex)] || anim[0];
        if (!frame) return;

        // Disable image smoothing for pixel-perfect rendering
        ctx.imageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;

        // Create or reuse canvas for effects
        if (!this.effectCanvas) {
            this.effectCanvas = document.createElement('canvas');
        }
        const canvas = this.effectCanvas;
        const scaledWidth = this.width;
        const scaledHeight = this.height;

        if (canvas.width !== scaledWidth || canvas.height !== scaledHeight) {
            canvas.width = scaledWidth;
            canvas.height = scaledHeight;
        }

        const tempCtx = canvas.getContext('2d');

        // Disable smoothing on temp canvas
        tempCtx.imageSmoothingEnabled = false;
        tempCtx.webkitImageSmoothingEnabled = false;
        tempCtx.mozImageSmoothingEnabled = false;
        tempCtx.msImageSmoothingEnabled = false;

        tempCtx.drawImage(frame, 0, 0, scaledWidth, scaledHeight);

        // Apply effects
        if (this.injecting) {
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = 'rgba(200, 255, 200, 0.4)';
            tempCtx.fillRect(0, 0, scaledWidth, scaledHeight);
        }

        if (this.adrenalineBoost) {
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = 'rgba(255, 80, 80, 0.4)';
            tempCtx.fillRect(0, 0, scaledWidth, scaledHeight);
        }

        if (this.flashAlpha > 0) {
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha / 255})`;
            tempCtx.fillRect(0, 0, scaledWidth, scaledHeight);
        }

        if (this.stunTimer > 0) {
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            tempCtx.fillRect(0, 0, scaledWidth, scaledHeight);
        }

        if (this.blocking) {
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = 'rgba(50, 50, 255, 0.4)';
            tempCtx.fillRect(0, 0, scaledWidth, scaledHeight);
        }

        // Draw flipped if facing left
        ctx.save();
        if (this.facingLeft) {
            ctx.scale(-1, 1);
            ctx.drawImage(canvas, -this.x - scaledWidth / 2, this.y - scaledHeight);
        } else {
            ctx.drawImage(canvas, this.x - scaledWidth / 2, this.y - scaledHeight);
        }
        ctx.restore();

        // Health bar
        this.drawHealthBar(ctx);

        // Draw projectiles
        for (const proj of this.projectiles) {
            proj.draw(ctx);
        }
    }

    drawHealthBar(ctx) {
        const barWidth = 100;
        const barHeight = 10;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.height - 18;
        const ratio = Math.max(0, Math.min(1, this.health / this.maxHealth));

        // Background
        ctx.fillStyle = 'rgba(100, 0, 0, 0.8)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health
        ctx.fillStyle = 'rgba(0, 200, 0, 0.8)';
        ctx.fillRect(barX, barY, barWidth * ratio, barHeight);

        // Border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Status text
        if (this.adrenalineBoost) {
            ctx.fillStyle = '#ff6464';
            ctx.font = 'bold 16px PixelFont, Arial';
            ctx.fillText('BOOST!', barX + barWidth + 5, barY + 8);
        }

        if (this.blocking) {
            ctx.fillStyle = '#6464ff';
            ctx.font = 'bold 16px PixelFont, Arial';
            ctx.fillText('BLOCK', barX + barWidth + 5, barY + 8);
        }
    }
}
