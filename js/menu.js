/**
 * Menu System
 * Main menu, settings menu, and pause menu
 */

class MenuSystem {
    constructor(canvas, width, height) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = width;
        this.height = height;

        // If primary context is null (e.g. WebGL is active), try to find UI canvas
        if (!this.ctx) {
            const uiCanvas = document.getElementById('ui-canvas');
            if (uiCanvas) this.ctx = uiCanvas.getContext('2d');
        }

        this.active = true;
        this.currentMenu = 'main'; // main, settings, pause
        this.selectedIndex = 0;

        // Menu options
        this.mainMenuOptions = ['Devam Et', 'Yeni Oyun', 'Oyunu Yapanlar', 'Dokunmatik Kontroller', 'Ayarlar', 'Çıkış'];
        this.settingsOptions = ['Müzik Seviyesi', 'Ses Efektleri', 'Tam Ekran', 'Geri Dön'];
        this.pauseMenuOptions = ['Devam Et', 'Kaydet', 'Ana Menü', 'Çıkış'];

        // Settings
        this.settings = Utils.loadSettings();

        // Animation - using time-based sine wave for smooth pulse
        this.pulseTime = 0;

        // Navigation cooldown (100ms = 0.1 seconds)
        this.navigationCooldown = 0;
        this.navigationCooldownTime = 100; // milliseconds

        // Check for save
        this.hasSave = Utils.hasSave();

        // If no save, skip "Devam Et"
        if (!this.hasSave && this.selectedIndex === 0) {
            this.selectedIndex = 1;
        }

        // Touch/Click support
        this.setupTouchControls();
    }

    setupTouchControls() {
        // Store menu option positions for click detection
        this.menuOptionRects = [];

        // Click/Touch handler
        this.handleClick = (e) => {
            e.preventDefault();

            // Get click/touch position
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.width / rect.width;
            const scaleY = this.height / rect.height;

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const x = (clientX - rect.left) * scaleX;
            const y = (clientY - rect.top) * scaleY;

            // Check which menu option was clicked
            for (let i = 0; i < this.menuOptionRects.length; i++) {
                const optRect = this.menuOptionRects[i];
                if (x >= optRect.x && x <= optRect.x + optRect.width &&
                    y >= optRect.y && y <= optRect.y + optRect.height) {

                    // Check if option is disabled
                    const options = this.getCurrentOptions();
                    const option = options[i];
                    const isDisabled = option === 'Devam Et' && !this.hasSave;

                    if (!isDisabled) {
                        this.selectedIndex = i;
                        // Trigger selection
                        setTimeout(() => {
                            const result = this.select();
                            if (result && window.game) {
                                // Handle result in game
                                if (result === 'continue') {
                                    window.game.continueGame();
                                } else if (result === 'new_game') {
                                    window.game.startNewGame();
                                } else if (result === 'demo') {
                                    window.game.startDemoGame();
                                } else if (result === 'exit') {
                                    window.close();
                                } else if (result === 'resume') {
                                    window.game.state = 'playing';
                                    window.game.menu.hidePauseMenu();
                                } else if (result === 'save') {
                                    window.game.saveGame();
                                } else if (result === 'main_menu') {
                                    window.game.state = 'menu';
                                    if (window.game.menu) window.game.menu.destroy();
                                    window.game.menu = new MenuSystem(window.game.canvas, window.game.RENDER_WIDTH, window.game.RENDER_HEIGHT);
                                    window.game.playMusic('battle');
                                }
                            }
                        }, 100);
                    }
                    break;
                }
            }
        };

        // Add event listeners
        this.canvas.addEventListener('click', this.handleClick, { passive: false });
        this.canvas.addEventListener('touchstart', this.handleClick, { passive: false });
    }

    destroy() {
        if (this.handleClick) {
            this.canvas.removeEventListener('click', this.handleClick);
            this.canvas.removeEventListener('touchstart', this.handleClick);
        }
    }

    update(keys, dt = 16.67) {
        // Pulse animation using sine wave for smooth oscillation
        this.pulseTime += dt / 1000; // Convert to seconds

        // Update navigation cooldown
        if (this.navigationCooldown > 0) {
            this.navigationCooldown -= dt;
        }

        // Navigation with fixed cooldown
        if (keys['ArrowUp'] && this.navigationCooldown <= 0) {
            this.navigateUp();
            keys['ArrowUp'] = false;
            this.navigationCooldown = this.navigationCooldownTime;
        }

        if (keys['ArrowDown'] && this.navigationCooldown <= 0) {
            this.navigateDown();
            keys['ArrowDown'] = false;
            this.navigationCooldown = this.navigationCooldownTime;
        }

        if (keys['ArrowLeft'] && this.currentMenu === 'settings' && this.navigationCooldown <= 0) {
            this.adjustSetting(-1);
            keys['ArrowLeft'] = false;
            this.navigationCooldown = this.navigationCooldownTime;
        }

        if (keys['ArrowRight'] && this.currentMenu === 'settings' && this.navigationCooldown <= 0) {
            this.adjustSetting(1);
            keys['ArrowRight'] = false;
            this.navigationCooldown = this.navigationCooldownTime;
        }

        if (keys['Enter']) {
            const result = this.select();
            keys['Enter'] = false;
            return result;
        }

        if (keys['Escape'] && this.currentMenu === 'pause') {
            keys['Escape'] = false;
            return 'resume';
        }

        return null;
    }

    navigateUp() {
        const options = this.getCurrentOptions();
        this.selectedIndex = (this.selectedIndex - 1 + options.length) % options.length;

        // Skip "Devam Et" if no save
        if (this.currentMenu === 'main' && this.selectedIndex === 0 && !this.hasSave) {
            this.selectedIndex = options.length - 1;
        }
    }

    navigateDown() {
        const options = this.getCurrentOptions();
        this.selectedIndex = (this.selectedIndex + 1) % options.length;

        // Skip "Devam Et" if no save
        if (this.currentMenu === 'main' && this.selectedIndex === 0 && !this.hasSave) {
            this.selectedIndex = 1;
        }
    }

    adjustSetting(direction) {
        const option = this.settingsOptions[this.selectedIndex];

        if (option === 'Müzik Seviyesi') {
            this.settings.musicVolume = Utils.clamp(this.settings.musicVolume + direction * 10, 0, 100);
            Utils.saveSettings(this.settings);
        } else if (option === 'Ses Efektleri') {
            this.settings.sfxVolume = Utils.clamp(this.settings.sfxVolume + direction * 10, 0, 100);
            Utils.saveSettings(this.settings);
        } else if (option === 'Tam Ekran') {
            this.settings.fullscreen = !this.settings.fullscreen;
            Utils.saveSettings(this.settings);

            if (this.settings.fullscreen) {
                Utils.requestFullscreen(document.documentElement);
            } else {
                Utils.exitFullscreen();
            }
        }
    }

    select() {
        if (this.currentMenu === 'main') {
            const option = this.mainMenuOptions[this.selectedIndex];

            if (option === 'Devam Et' && this.hasSave) {
                return 'continue';
            } else if (option === 'Yeni Oyun') {
                return 'demo';
            } else if (option === 'Oyunu Yapanlar') {
                const creditsScreen = document.getElementById('credits-screen');
                if (creditsScreen) {
                    creditsScreen.style.display = 'flex';
                }
            } else if (option === 'Dokunmatik Kontroller') {
                // Toggle mobile controls
                const mobileControls = document.getElementById('mobile-controls');
                if (mobileControls) {
                    const isHidden = mobileControls.classList.contains('hidden');
                    if (isHidden) {
                        mobileControls.classList.remove('hidden');
                        this.settings.mobileControlsEnabled = true;
                        console.log('📱 Mobile controls enabled');
                    } else {
                        mobileControls.classList.add('hidden');
                        this.settings.mobileControlsEnabled = false;
                        console.log('📱 Mobile controls disabled');
                    }
                    Utils.saveSettings(this.settings);
                }
            } else if (option === 'Ayarlar') {
                this.currentMenu = 'settings';
                this.selectedIndex = 0;
            } else if (option === 'Çıkış') {
                return 'exit';
            }
        } else if (this.currentMenu === 'settings') {
            const option = this.settingsOptions[this.selectedIndex];

            if (option === 'Geri Dön') {
                this.currentMenu = 'main';
                this.selectedIndex = 0;
                if (!this.hasSave) this.selectedIndex = 1;
            }
        } else if (this.currentMenu === 'pause') {
            const option = this.pauseMenuOptions[this.selectedIndex];

            if (option === 'Devam Et') {
                return 'resume';
            } else if (option === 'Kaydet') {
                return 'save';
            } else if (option === 'Ana Menü') {
                return 'main_menu';
            } else if (option === 'Çıkış') {
                return 'exit';
            }
        }

        return null;
    }

    getCurrentOptions() {
        if (this.currentMenu === 'main') {
            return this.mainMenuOptions;
        } else if (this.currentMenu === 'settings') {
            return this.settingsOptions;
        } else if (this.currentMenu === 'pause') {
            return this.pauseMenuOptions;
        }
        return [];
    }

    draw(context) {
        let ctx = context || this.ctx;

        // Final fallback to global game UI context
        if (!ctx && window.game && window.game.uiCtx) {
            ctx = window.game.uiCtx;
        }

        if (!ctx) {
            console.error('❌ MenuSystem: No valid drawing context found!');
            return;
        }

        // Background
        if (typeof ctx.createLinearGradient !== 'function') {
            console.warn('⚠️ Context does not support gradients');
            ctx.fillStyle = '#14142e';
            ctx.fillRect(0, 0, this.width, this.height);
        } else {
            const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
            gradient.addColorStop(0, '#14142e');
            gradient.addColorStop(1, '#0a0a1e');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        if (this.currentMenu === 'main') {
            this.drawMainMenu(ctx);
        } else if (this.currentMenu === 'settings') {
            this.drawSettingsMenu(ctx);
        } else if (this.currentMenu === 'pause') {
            this.drawPauseMenu(ctx);
        }
    }

    drawMainMenu(ctx) {
        if (!ctx) return;

        // Title
        ctx.save();
        ctx.font = 'bold 70px PixelFont, Arial';
        ctx.textAlign = 'center';

        if (typeof ctx.createLinearGradient === 'function') {
            const gradient = ctx.createLinearGradient(0, 100, 0, 200);
            gradient.addColorStop(0, '#ffd700');
            gradient.addColorStop(1, '#ffed4e');
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = '#ffd700';
        }

        ctx.fillText('DATA KOLEJİ OYUNU', this.width / 2, 150);
        ctx.restore();

        // Menu options
        const startY = 350;
        const spacing = 80;

        // Clear previous rects
        this.menuOptionRects = [];

        this.mainMenuOptions.forEach((option, i) => {
            const y = startY + i * spacing;
            const isSelected = i === this.selectedIndex;
            const isDisabled = option === 'Devam Et' && !this.hasSave;

            ctx.save();
            ctx.textAlign = 'center';

            // Get display text
            let displayText = option;
            if (option === 'Dokunmatik Kontroller') {
                const mobileControls = document.getElementById('mobile-controls');
                const isEnabled = mobileControls && !mobileControls.classList.contains('hidden');
                displayText += `: ${isEnabled ? 'Açık' : 'Kapalı'}`;
            }

            // Measure text for click detection
            ctx.font = isSelected ? 'bold 48px PixelFont, Arial' : '48px PixelFont, Arial';
            const metrics = ctx.measureText(isSelected ? '> ' + displayText + ' <' : displayText);
            const textWidth = metrics.width;
            const textHeight = 60;

            // Store clickable region
            this.menuOptionRects.push({
                x: this.width / 2 - textWidth / 2,
                y: y - textHeight,
                width: textWidth,
                height: textHeight + 20
            });

            if (isDisabled) {
                ctx.font = '48px PixelFont, Arial';
                ctx.fillStyle = '#646464';
                ctx.fillText(displayText + ' (Kayıt Yok)', this.width / 2, y);
            } else if (isSelected) {
                // Selected option
                ctx.font = 'bold 48px PixelFont, Arial';
                ctx.fillStyle = '#ffc832';

                // Background
                const metrics = ctx.measureText('> ' + displayText + ' <');
                ctx.fillStyle = 'rgba(80, 80, 100, 0.5)';
                ctx.fillRect(
                    this.width / 2 - metrics.width / 2 - 20,
                    y - 50,
                    metrics.width + 40,
                    70
                );

                // Border
                ctx.strokeStyle = '#ffc832';
                ctx.lineWidth = 3;
                ctx.strokeRect(
                    this.width / 2 - metrics.width / 2 - 20,
                    y - 50,
                    metrics.width + 40,
                    70
                );

                ctx.fillStyle = '#ffc832';
                ctx.fillText('> ' + displayText + ' <', this.width / 2, y);
            } else {
                ctx.font = '48px PixelFont, Arial';
                ctx.fillStyle = '#c8c8c8';
                ctx.fillText(displayText, this.width / 2, y);
            }

            ctx.restore();
        });

        // Controls info
        ctx.save();
        ctx.font = '24px PixelFont, Arial';
        ctx.fillStyle = '#969696';
        ctx.textAlign = 'center';
        ctx.fillText('Yukarı/Aşağı: Seç  |  Enter: Onayla  |  ESC: Çık', this.width / 2, this.height - 50);
        ctx.restore();
    }

    drawSettingsMenu(ctx) {
        // const ctx = this.ctx; // REMOVE

        // Title
        ctx.save();
        ctx.font = 'bold 80px PixelFont, Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd700';
        ctx.fillText('AYARLAR', this.width / 2, 100);
        ctx.restore();

        // Settings options
        const startY = 270;
        const spacing = 90;

        this.menuOptionRects = [];

        this.settingsOptions.forEach((option, i) => {
            const y = startY + i * spacing;
            const isSelected = i === this.selectedIndex;

            ctx.save();
            ctx.textAlign = 'center';

            let displayText = option;

            if (option === 'Müzik Seviyesi') {
                displayText += `: ${this.settings.musicVolume}`;
            } else if (option === 'Ses Efektleri') {
                displayText += `: ${this.settings.sfxVolume}`;
            } else if (option === 'Tam Ekran') {
                displayText += `: ${this.settings.fullscreen ? 'Açık' : 'Kapalı'}`;
            }

            ctx.font = isSelected && option !== 'Geri Dön' ? 'bold 50px PixelFont, Arial' : '50px PixelFont, Arial';
            const measureTextStr = isSelected ? '> ' + displayText + ' <' : displayText;
            const metrics = ctx.measureText(measureTextStr);

            this.menuOptionRects.push({
                x: this.width / 2 - metrics.width / 2 - 20,
                y: y - 50,
                width: metrics.width + 40,
                height: 70
            });

            if (isSelected && option !== 'Geri Dön') {
                ctx.font = 'bold 50px PixelFont, Arial';
                ctx.fillStyle = '#ffc832';

                const metrics = ctx.measureText('> ' + displayText + ' <');
                ctx.fillStyle = 'rgba(80, 80, 100, 0.5)';
                ctx.fillRect(
                    this.width / 2 - metrics.width / 2 - 20,
                    y - 40,
                    metrics.width + 40,
                    60
                );

                ctx.strokeStyle = '#ffc832';
                ctx.lineWidth = 3;
                ctx.strokeRect(
                    this.width / 2 - metrics.width / 2 - 20,
                    y - 40,
                    metrics.width + 40,
                    60
                );

                ctx.fillStyle = '#ffc832';
                ctx.fillText('> ' + displayText + ' <', this.width / 2, y);
            } else if (isSelected) {
                ctx.font = 'bold 50px PixelFont, Arial';
                ctx.fillStyle = '#ffc832';
                ctx.fillText('> ' + displayText + ' <', this.width / 2, y);
            } else {
                ctx.font = '50px PixelFont, Arial';
                ctx.fillStyle = '#c8c8c8';
                ctx.fillText(displayText, this.width / 2, y);
            }

            ctx.restore();
        });

        // Controls info
        ctx.save();
        ctx.font = '24px PixelFont, Arial';
        ctx.fillStyle = '#969696';
        ctx.textAlign = 'center';
        ctx.fillText('Sol/Sağ: Değiştir  |  Enter: Onayla', this.width / 2, this.height - 50);
        ctx.restore();
    }

    drawPauseMenu(ctx) {
        // const ctx = this.ctx; // REMOVE

        // Semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.width, this.height);

        // Title
        ctx.save();
        ctx.font = 'bold 80px PixelFont, Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd700';
        ctx.fillText('DURAKLAT', this.width / 2, 150);
        ctx.restore();

        // Pause options
        const startY = 350;
        const spacing = 80;

        this.menuOptionRects = [];

        this.pauseMenuOptions.forEach((option, i) => {
            const y = startY + i * spacing;
            const isSelected = i === this.selectedIndex;

            ctx.save();
            ctx.textAlign = 'center';

            ctx.font = isSelected ? 'bold 60px PixelFont, Arial' : '60px PixelFont, Arial';
            const metrics = ctx.measureText(isSelected ? '> ' + option + ' <' : option);

            this.menuOptionRects.push({
                x: this.width / 2 - metrics.width / 2 - 20,
                y: y - 60,
                width: metrics.width + 40,
                height: 80
            });

            if (isSelected) {
                ctx.fillStyle = '#ffc832';
                ctx.fillText('> ' + option + ' <', this.width / 2, y);
            } else {
                ctx.font = '60px PixelFont, Arial';
                ctx.fillStyle = '#c8c8c8';
                ctx.fillText(option, this.width / 2, y);
            }

            ctx.restore();
        });

        // Controls info
        ctx.save();
        ctx.font = '24px PixelFont, Arial';
        ctx.fillStyle = '#969696';
        ctx.textAlign = 'center';
        ctx.fillText('Yukarı/Aşağı: Seç  |  Enter: Onayla  |  ESC: Devam Et', this.width / 2, this.height - 50);
        ctx.restore();
    }

    showPauseMenu() {
        this.currentMenu = 'pause';
        this.selectedIndex = 0;
        this.active = true;
    }

    hidePauseMenu() {
        this.active = false;
    }
}
