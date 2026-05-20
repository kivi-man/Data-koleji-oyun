/**
 * Combat System
 * Handles combat mechanics, damage, and effects
 */

class CombatSystem {
    constructor() {
        this.PUNCH_DAMAGE = 20;
        this.COMBO_MULTIPLIER = 0.3; // +30% per combo
        this.COMBO_DECAY_TIME = 1500; // ms
        this.INVULN_TIME = 500; // ms
    }

    /**
     * Calculate damage with combo multiplier
     */
    calculateDamage(baseDamage, combo, damageMultiplier = 1.0) {
        const comboMult = 1.0 + (combo - 1) * this.COMBO_MULTIPLIER;
        return Math.floor(baseDamage * comboMult * damageMultiplier);
    }

    /**
     * Calculate knockback distance
     */
    calculateKnockback(combo, baseKnockback = 25, comboKnockbackAdd = 10, maxKnockback = 80) {
        const kb = baseKnockback + comboKnockbackAdd * (combo - 1);
        return Math.min(kb, maxKnockback);
    }

    /**
     * Check if punch hits enemy
     */
    checkPunchHit(punchRect, enemyRect) {
        return Utils.rectCollision(punchRect, enemyRect);
    }

    /**
     * Create damage flash effect
     */
    createFlashEffect(entity) {
        entity.flashAlpha = 200;
    }

    /**
     * Update flash effect
     */
    updateFlashEffect(entity, fadeSpeed = 15) {
        if (entity.flashAlpha > 0) {
            entity.flashAlpha = Math.max(0, entity.flashAlpha - fadeSpeed);
        }
    }

    /**
     * Apply invulnerability
     */
    applyInvulnerability(entity, duration = this.INVULN_TIME) {
        entity.invulnerable = true;
        entity.invulnTimer = duration;
    }

    /**
     * Update invulnerability
     */
    updateInvulnerability(entity, dt) {
        if (entity.invulnTimer > 0) {
            entity.invulnTimer = Math.max(0, entity.invulnTimer - dt);
            if (entity.invulnTimer <= 0) {
                entity.invulnerable = false;
            }
        }
    }

    /**
     * Check combo decay
     */
    checkComboDecay(lastHitTime, currentTime, combo) {
        if (currentTime - lastHitTime > this.COMBO_DECAY_TIME) {
            return 0;
        }
        return combo;
    }

    /**
     * Draw damage number (floating text)
     */
    drawDamageNumber(ctx, damage, x, y, alpha = 1.0) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 32px PixelFont, Arial';
        ctx.fillStyle = '#ff4444';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(`-${damage}`, x, y);
        ctx.fillText(`-${damage}`, x, y);
        ctx.restore();
    }

    /**
     * Draw combo text
     */
    drawComboText(ctx, combo, x, y) {
        if (combo <= 1) return;

        ctx.save();

        // Glow effect
        ctx.font = 'bold 60px PixelFont, Arial';
        ctx.fillStyle = 'rgba(255, 100, 0, 0.5)';
        ctx.fillText(`COMBO x${combo}`, x + 2, y + 2);

        // Main text
        ctx.fillStyle = '#ffc800';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText(`COMBO x${combo}`, x, y);
        ctx.fillText(`COMBO x${combo}`, x, y);

        ctx.restore();
    }
}
