/**
 * Dialogue System
 * Handles dialogue rendering and progression
 */

class DialogueSystem {
    constructor(game, canvas, width, height) {
        this.game = game;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = width;
        this.height = height;

        this.active = false;
        this.dialogues = [];
        this.currentIndex = 0;
        this.currentText = '';
        this.fullText = '';
        this.charIndex = 0;
        this.typewriterSpeed = 0.5; // Slower speed for better reading and sound
        this.finished = false;

        // Choice system
        this.onChoice = null;
        this.hasChoices = false;
        this.choices = [];
        this.selectedChoice = 0;

        // Visual settings
        this.boxHeight = 180;
        this.boxPadding = 30;
        this.fontSize = 28;
        this.lineHeight = 36;

        // Animation
        this.boxAlpha = 0;
        this.fadeSpeed = 0.1;

        // Audio
        this.lastBlipTime = 0;
    }

    start(dialogues) {
        this.dialogues = dialogues;
        this.currentIndex = 0;
        this.active = true;
        this.finished = false;
        this.boxAlpha = 0;
        this.loadCurrentDialogue();
    }

    loadCurrentDialogue() {
        if (this.currentIndex >= this.dialogues.length) {
            this.active = false;
            return;
        }

        const [speaker, text, iconPath] = this.dialogues[this.currentIndex];
        this.currentSpeaker = speaker;
        this.fullText = text;
        this.currentText = '';
        this.charIndex = 0;
        this.finished = false;

        // Reset and load icon if present
        this.currentIcon = null;
        if (iconPath) {
            Utils.loadImage(iconPath).then(img => {
                this.currentIcon = img;
            });
        }
    }

    update(keys, dt = 16.67) {
        if (!this.active) return;

        // Fade in dialogue box (frame-independent)
        if (this.boxAlpha < 1) {
            this.boxAlpha = Math.min(1, this.boxAlpha + this.fadeSpeed * (dt / 16.67));
        }

        // Typewriter effect (frame-independent)
        if (!this.finished && this.charIndex < this.fullText.length) {
            const oldIndex = Math.floor(this.charIndex);
            this.charIndex += this.typewriterSpeed * (dt / 16.67);
            const newIndex = Math.floor(this.charIndex);

            this.currentText = this.fullText.substring(0, newIndex);

            // Play blip sound
            if (newIndex > oldIndex && this.game) {
                const now = Date.now();
                // Limit blip rate to match Python version (90ms)
                if (now - this.lastBlipTime > 90) {
                    this.game.playSfx('blip', this.currentSpeaker);
                    this.lastBlipTime = now;

                    // Trigger player emote if Tunahan is speaking
                    const name = this.currentSpeaker ? this.currentSpeaker.toLowerCase().trim() : '';
                    if (name.includes('tunahan') && this.game.player) {
                        this.game.player.triggerSpeak();
                    }
                }
            }

            if (this.charIndex >= this.fullText.length) {
                this.currentText = this.fullText;
                this.finished = true;
            }
        }

        // Skip animation on X or x
        if (keys && (keys['x'] || keys['X']) && !this.finished) {
            keys['x'] = keys['X'] = false;
            this.skip();
        }

        // Progress dialogue/choice on Enter
        if (keys && keys['Enter'] && this.finished) {
            keys['Enter'] = false; // Consume key

            if (this.hasChoices) {
                const choice = this.choices[this.selectedChoice];
                this.active = false;
                this.boxAlpha = 0;
                if (this.onChoice) this.onChoice(choice.toLowerCase());
                this.hasChoices = false;
            } else {
                this.next();
            }
        }

        // Handle choice navigation
        if (this.hasChoices && this.finished) {
            if (keys['ArrowUp'] || keys['w'] || keys['W']) {
                this.selectedChoice = (this.selectedChoice - 1 + this.choices.length) % this.choices.length;
                keys['ArrowUp'] = keys['w'] = keys['W'] = false;
                if (this.game) this.game.playSfx('blip', this.currentSpeaker); // Audio feedback
            }
            if (keys['ArrowDown'] || keys['s'] || keys['S']) {
                this.selectedChoice = (this.selectedChoice + 1) % this.choices.length;
                keys['ArrowDown'] = keys['s'] = keys['S'] = false;
                if (this.game) this.game.playSfx('blip', this.currentSpeaker); // Audio feedback
            }
        }
    }

    next() {
        this.currentIndex++;
        if (this.currentIndex >= this.dialogues.length) {
            this.active = false;
            this.boxAlpha = 0;
        } else {
            this.loadCurrentDialogue();
        }
    }

    ask(speaker, text, callback, choices = ['Evet', 'Hayır']) {
        this.start([[speaker, text]]);
        this.hasChoices = true;
        this.choices = choices;
        this.selectedChoice = 0;
        this.onChoice = callback;
    }

    skip() {
        if (!this.finished) {
            this.currentText = this.fullText;
            this.charIndex = this.fullText.length;
            this.finished = true;
        }
    }

    draw() {
        if (!this.active || this.boxAlpha <= 0) return;

        const ctx = this.ctx;

        // Dialogue box background
        const boxY = this.height - this.boxHeight - 20;

        ctx.save();
        ctx.globalAlpha = this.boxAlpha;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(25, boxY + 5, this.width - 50, this.boxHeight);

        // Main box with gradient
        const gradient = ctx.createLinearGradient(0, boxY, 0, boxY + this.boxHeight);
        gradient.addColorStop(0, 'rgba(20, 20, 40, 0.95)');
        gradient.addColorStop(1, 'rgba(10, 10, 30, 0.95)');
        ctx.fillStyle = gradient;
        ctx.fillRect(20, boxY, this.width - 40, this.boxHeight);

        // Border
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = 3;
        ctx.strokeRect(20, boxY, this.width - 40, this.boxHeight);

        // Speaker name
        ctx.fillStyle = '#ffd700';
        ctx.font = `bold ${this.fontSize + 4}px PixelFont, 'Courier New', monospace`;
        ctx.fillText(this.currentSpeaker, this.boxPadding + 20, boxY + this.boxPadding + 5);

        // Dialogue text
        ctx.fillStyle = '#ffffff';
        ctx.font = `${this.fontSize}px PixelFont, 'Courier New', monospace`;

        const textY = boxY + this.boxPadding + 45;
        let textX = this.boxPadding + 20;
        let maxWidth = this.width - (this.boxPadding + 20) * 2;

        // Draw Icon if present
        if (this.currentIcon) {
            const iconSize = 100;
            const iconX = this.boxPadding + 20;
            const iconY = textY - 10;

            // Icon background/box
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(iconX, iconY, iconSize, iconSize);
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.strokeRect(iconX, iconY, iconSize, iconSize);

            // Draw the actual image
            ctx.drawImage(this.currentIcon, iconX + 5, iconY + 5, iconSize - 10, iconSize - 10);

            // Offset text to the right
            textX += iconSize + 25;
            maxWidth -= iconSize + 25;
        }

        this.wrapText(ctx, this.currentText, textX, textY, maxWidth, this.lineHeight);

        // Continue indicator or Choices
        if (this.finished) {
            if (this.hasChoices) {
                this.drawChoices(ctx, boxY);
            } else {
                const indicatorY = boxY + this.boxHeight - 25;
                const indicatorX = this.width - 60;

                // Blinking arrow
                const blink = Math.sin(Date.now() / 300) > 0;
                if (blink) {
                    ctx.fillStyle = '#ffd700';
                    ctx.font = 'bold 24px PixelFont, Arial';
                    ctx.fillText('▼', indicatorX, indicatorY);
                }
            }
        }

        ctx.restore();
    }

    drawChoices(ctx, boxY) {
        // Position choices nicely on the right, but well within bounds
        // Assuming boxPadding ~ 30, width ~ 1536
        // Let's align them from the right side with more padding
        const choiceX = this.width - 300;

        // Adjust vertical start to accommodate potentially more choices
        // boxHeight is 180. 3 choices * 40px = 120px. 
        // We should start higher.
        const totalHeight = this.choices.length * 40;
        const choiceYStart = boxY + (this.boxHeight - totalHeight) / 2 + 20;

        this.choices.forEach((choice, i) => {
            const isSelected = i === this.selectedChoice;

            // Background for selected choice
            if (isSelected) {
                const metrics = ctx.measureText('> ' + choice);
                ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
                ctx.fillRect(choiceX - 10, choiceYStart + i * 40 - 25, metrics.width + 20, 35);
            }

            ctx.fillStyle = isSelected ? '#ffd700' : '#ffffff';
            ctx.font = isSelected ? 'bold 26px PixelFont, Arial' : '24px PixelFont, Arial';
            ctx.fillText(isSelected ? '> ' + choice : '  ' + choice, choiceX, choiceYStart + i * 40);
        });
    }

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;

        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && i > 0) {
                ctx.fillText(line, x, currentY);
                line = words[i] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
    }

    isActive() {
        return this.active;
    }
}
