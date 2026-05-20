class ComputerSystem {
    constructor(game) {
        this.game = game;
        this.isOpen = false;
        this.activeApp = null;
        this.notepadContent = localStorage.getItem('notepad_content') || '';

        this.createUI();
        this.bindEvents();
    }

    createUI() {
        // Create main container
        const container = document.createElement('div');
        container.id = 'computer-overlay';
        container.className = 'computer-overlay hidden';
        container.innerHTML = `
            <div class="monitor-screen">
                <div class="desktop-icons">
                    <div class="desktop-icon" data-app="notepad">
                        <div class="icon-img">
                            <img src="https://win98icons.alexmeub.com/icons/png/notepad-0.png" alt="Notepad" width="32" height="32">
                        </div>
                        <span>Notepad</span>
                    </div>
                    <div class="desktop-icon" data-app="paint">
                        <div class="icon-img">
                            <img src="https://win98icons.alexmeub.com/icons/png/paint_file-2.png" alt="Paint" width="32" height="32">
                        </div>
                        <span>Paint</span>
                    </div>
                    <div class="desktop-icon" data-app="voltsim">
                        <div class="icon-img">
                            <img src="https://win98icons.alexmeub.com/icons/png/chip_ram-0.png" alt="VoltSim" width="32" height="32">
                        </div>
                        <span>VoltSim</span>
                    </div>
                </div>

                <!-- Windows -->
                <div id="window-notepad" class="app-window hidden">
                    <div class="window-header">
                        <span>Notepad</span>
                        <div class="window-controls">
                            <button class="btn-maximize" data-app="notepad">□</button>
                            <button class="btn-close" data-app="notepad">X</button>
                        </div>
                    </div>
                    <div class="window-content">
                        <textarea id="notepad-area" placeholder="Type here..."></textarea>
                        <div class="window-footer">
                            <button id="btn-save-note">Kaydet</button>
                        </div>
                    </div>
                </div>

                <div id="window-paint" class="app-window hidden">
                    <div class="window-header">
                        <span>Paint</span>
                        <div class="window-controls">
                            <button class="btn-maximize" data-app="paint">□</button>
                            <button class="btn-close" data-app="paint">X</button>
                        </div>
                    </div>
                    <div class="window-content">
                        <canvas id="paint-canvas" width="80" height="60"></canvas>
                        <div class="paint-tools">
                            <input type="color" id="paint-color" value="#000000">
                            <input type="range" id="paint-size" min="1" max="10" value="1">
                            <button id="btn-clear-paint">Temizle</button>
                            <button id="btn-save-paint">İndir</button>
                        </div>
                    </div>
                </div>

                <div id="window-voltsim" class="app-window hidden" style="width: 780px; height: 520px; left: 10px; top: 10px;">
                    <div class="window-header">
                        <span>VoltSim - Devre Simülatörü</span>
                        <div class="window-controls">
                            <button class="btn-maximize" data-app="voltsim">□</button>
                            <button class="btn-close" data-app="voltsim">X</button>
                        </div>
                    </div>
                    <div class="window-content" style="padding: 0; background: #0f172a; position: relative;">
                        <iframe src="devresim/index.html" style="width: 100%; height: 100%; border: none;"></iframe>
                        
                        <!-- Tutorial Overlay -->
                        <div id="tutorial-overlay" class="hidden" style="position: absolute; top: 10px; right: 10px; width: 250px; background: rgba(0,0,0,0.8); color: #fff; padding: 15px; border: 1px solid #4ade80; border-radius: 5px; font-family: 'PixelFont', Arial; z-index: 1000;">
                            <h4 style="margin-top: 0; color: #4ade80; text-align: center;">DERS 1: LED YAKMA</h4>
                            <div style="margin: 10px 0; font-size: 14px; text-align: center;">
                                <img src="assets/circuit_example.png" alt="Örnek Devre" style="width: 100%; border: 1px solid #555; margin-bottom: 10px; display: none;" id="tutorial-img">
                                <p id="tutorial-text">Lütfen bekleyin...</p>
                            </div>
                            <button id="btn-tutorial-next" style="width: 100%; background: #4ade80; color: #000; border: none; padding: 5px; cursor: pointer; font-weight: bold;">ONAYLIYORUM</button>
                        </div>
                    </div>
                </div>

                <div class="taskbar">
                    <button id="btn-start" class="start-button">
                        Data-Pencereler
                    </button>
                    <div class="taskbar-right">
                        <button id="btn-monitor-fullscreen" title="Ekranı Kapla">⛶</button>
                        <div class="clock" id="computer-clock">12:00</div>
                    </div>
                </div>

                <!-- Start Menu -->
                <div id="start-menu" class="start-menu hidden">
                    <div class="start-menu-sidebar">
                        <span class="vertical-text">DATA-PENCERELER</span>
                    </div>
                    <div class="start-menu-items">
                        <div class="menu-item disabled">
                            <img src="https://win98icons.alexmeub.com/icons/png/directory_open_file_mydocs-4.png" width="24" height="24">
                            Belgelerim
                        </div>
                        <div class="menu-item disabled">
                            <img src="https://win98icons.alexmeub.com/icons/png/settings_gear-0.png" width="24" height="24">
                            Ayarlar
                        </div>
                        <div class="menu-item" id="btn-voltsim-menu">
                            <img src="https://win98icons.alexmeub.com/icons/png/chip_ram-0.png" width="24" height="24">
                            VoltSim
                        </div>
                        <div class="menu-divider"></div>
                        <div class="menu-item" id="btn-shutdown">
                            <img src="https://win98icons.alexmeub.com/icons/png/shut_down_normal-0.png" width="24" height="24">
                            Bilgisayarı Kapat
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(container);

        // References
        this.overlay = document.getElementById('computer-overlay');
        this.notepadArea = document.getElementById('notepad-area');
        this.paintCanvas = document.getElementById('paint-canvas');
        this.paintCtx = this.paintCanvas.getContext('2d');

        // Paint state
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;

        // Window Dragging State
        this.draggingWindow = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.zIndex = 100;
    }

    bindEvents() {
        // Desktop Icons
        document.querySelectorAll('.desktop-icon').forEach(icon => {
            icon.addEventListener('click', () => {
                const appName = icon.dataset.app;
                this.openApp(appName);
            });
        });

        // Close Buttons
        document.querySelectorAll('.btn-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const appName = btn.dataset.app;
                this.closeApp(appName);
            });
        });

        document.querySelectorAll('.btn-maximize').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const appName = btn.dataset.app;
                this.toggleMaximize(appName);
            });
        });

        document.getElementById('btn-monitor-fullscreen').addEventListener('click', () => {
            this.toggleMonitorFullscreen();
        });

        // Start Menu Toggle
        const startBtn = document.getElementById('btn-start');
        const startMenu = document.getElementById('start-menu');

        startBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            startMenu.classList.toggle('hidden');
            startBtn.classList.toggle('active');
        });

        // Close start menu when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (this.isOpen && !startMenu.contains(e.target) && e.target !== startBtn) {
                startMenu.classList.add('hidden');
                startBtn.classList.remove('active');
            }
        });

        // Window Dragging Logic
        document.querySelectorAll('.app-window').forEach(win => {
            // Bring to front on click
            win.addEventListener('mousedown', () => {
                this.bringToFront(win);
            });

            const header = win.querySelector('.window-header');
            header.addEventListener('mousedown', (e) => {
                // Prevent drag if clicking close button or if window is maximized
                if (e.target.classList.contains('btn-close') || e.target.classList.contains('btn-maximize') || win.classList.contains('maximized')) return;

                this.draggingWindow = win;
                this.dragOffsetX = e.clientX - win.offsetLeft;
                this.dragOffsetY = e.clientY - win.offsetTop;

                // Disable iframes during drag to prevent capturing mouse events
                const iframes = win.querySelectorAll('iframe');
                iframes.forEach(f => f.style.pointerEvents = 'none');
            });
        });

        document.addEventListener('mousemove', (e) => {
            if (this.draggingWindow) {
                e.preventDefault();
                this.draggingWindow.style.left = `${e.clientX - this.dragOffsetX}px`;
                this.draggingWindow.style.top = `${e.clientY - this.dragOffsetY}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.draggingWindow) {
                // Re-enable iframes
                const iframes = this.draggingWindow.querySelectorAll('iframe');
                iframes.forEach(f => f.style.pointerEvents = 'auto');
                this.draggingWindow = null;
            }
        });

        // Shutdown (from Start Menu)
        document.getElementById('btn-shutdown').addEventListener('click', () => {
            this.close();
        });

        // VoltSim Menu Launch
        document.getElementById('btn-voltsim-menu').addEventListener('click', () => {
            this.openApp('voltsim');
            startMenu.classList.add('hidden');
            startBtn.classList.remove('active');
        });

        // Notepad Save
        document.getElementById('btn-save-note').addEventListener('click', () => {
            this.saveNote();
        });

        // Paint Events
        this.paintCanvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.paintCanvas.addEventListener('mousemove', (e) => this.draw(e));
        this.paintCanvas.addEventListener('mouseup', () => this.stopDrawing());
        this.paintCanvas.addEventListener('mouseout', () => this.stopDrawing());

        document.getElementById('btn-clear-paint').addEventListener('click', () => {
            this.paintCtx.clearRect(0, 0, this.paintCanvas.width, this.paintCanvas.height);
        });

        document.getElementById('btn-save-paint').addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = 'resim.png';
            link.href = this.paintCanvas.toDataURL();
            link.click();
        });

        // Update Clock
        setInterval(() => {
            const now = new Date();
            const timeString = now.getHours().toString().padStart(2, '0') + ':' +
                now.getMinutes().toString().padStart(2, '0');
            const clock = document.getElementById('computer-clock');
            if (clock) clock.innerText = timeString;
        }, 1000);
    }

    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        this.overlay.classList.remove('hidden');
        this.game.togglePause(true); // Pause game when computer is open

        // Load note
        this.notepadArea.value = this.notepadContent;
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.overlay.classList.add('hidden');
        this.game.togglePause(false); // Resume game
        this.closeAllApps();
    }

    openApp(appName) {
        // Don't close other apps, allow multitasking
        const win = document.getElementById(`window-${appName}`);
        if (win) {
            win.classList.remove('hidden');
            this.activeApp = appName;
            this.bringToFront(win);
        }
    }

    bringToFront(win) {
        this.zIndex++;
        win.style.zIndex = this.zIndex;
    }

    toggleMaximize(appName) {
        const win = document.getElementById(`window-${appName}`);
        if (!win) return;

        if (win.classList.contains('maximized')) {
            win.classList.remove('maximized');
            // Restore original position/size logic if needed, but CSS handles removing the class
            win.style.width = ''; // Revert to inline style or css default
            win.style.height = '';
            win.style.top = '';
            win.style.left = '';
            // Restore previous size logic would be better but simple toggle is okay for now
            // Actually, we need to save the state before maximizing
            if (win.dataset.preMaxStyle) {
                win.style.cssText = win.dataset.preMaxStyle;
            }
        } else {
            // Save current state
            win.dataset.preMaxStyle = win.style.cssText;
            win.classList.add('maximized');
            win.style.top = '0';
            win.style.left = '0';
            win.style.width = '100%';
            win.style.height = 'calc(100% - 30px)'; // Full monitor height minus taskbar
            win.style.transform = 'none';
        }
        this.bringToFront(win);
    }

    toggleMonitorFullscreen() {
        const screen = document.querySelector('.monitor-screen');
        screen.classList.toggle('fullscreen-monitor');

        // Update maximize windows if they are open
        document.querySelectorAll('.app-window.maximized').forEach(win => {
            // Re-trigger styles
            win.style.width = '100%';
            win.style.height = 'calc(100% - 30px)';
        });
    }
    closeApp(appName) {
        const win = document.getElementById(`window-${appName}`);
        if (win) {
            win.classList.add('hidden');
        }
        this.activeApp = null;
    }

    closeAllApps() {
        document.querySelectorAll('.app-window').forEach(win => win.classList.add('hidden'));
        this.activeApp = null;
    }

    saveNote() {
        this.notepadContent = this.notepadArea.value;
        localStorage.setItem('notepad_content', this.notepadContent);
        alert('Not kaydedildi!');
    }

    // Paint Functions
    getMousePos(evt) {
        const rect = this.paintCanvas.getBoundingClientRect();
        // Calculate scaling factors between internal canvas size and displayed size
        const scaleX = this.paintCanvas.width / rect.width;
        const scaleY = this.paintCanvas.height / rect.height;

        return {
            x: (evt.clientX - rect.left) * scaleX,
            y: (evt.clientY - rect.top) * scaleY
        };
    }

    startDrawing(e) {
        this.isDrawing = true;
        const pos = this.getMousePos(e);
        this.lastX = pos.x;
        this.lastY = pos.y;
    }

    draw(e) {
        if (!this.isDrawing) return;
        const pos = this.getMousePos(e);
        const ctx = this.paintCtx;

        // Pixel alignment: use integers
        const x = Math.floor(pos.x);
        const y = Math.floor(pos.y);

        ctx.beginPath();
        ctx.moveTo(Math.floor(this.lastX), Math.floor(this.lastY));
        ctx.lineTo(x, y);
        ctx.strokeStyle = document.getElementById('paint-color').value;
        ctx.lineWidth = document.getElementById('paint-size').value;
        ctx.lineCap = 'square'; // Sharper edges for pixel look
        ctx.imageSmoothingEnabled = false;
        ctx.stroke();

        this.lastX = x;
        this.lastY = y;
    }

    stopDrawing() {
        this.isDrawing = false;
    }

    // Demo Tutorial Logic
    startTutorial() {
        this.tutorialStep = 0;
        this.tutorialOverlay = document.getElementById('tutorial-overlay');
        this.tutorialText = document.getElementById('tutorial-text');
        this.tutorialImg = document.getElementById('tutorial-img');
        this.tutorialNextBtn = document.getElementById('btn-tutorial-next');

        if (!this.tutorialOverlay) return;

        this.tutorialOverlay.classList.remove('hidden');

        // Bind next button
        this.tutorialNextBtn.onclick = () => {
            if (this.tutorialStep === 4) {
                // End tutorial
                this.tutorialOverlay.classList.add('hidden');
                this.game.showSubtitle("Aferin! Basit bir devreyi kurdunuz. Simülasyon devam edebilir.", 5000);
                // Advance game demo phase if needed
                if (this.game.sceneManager.isDemo) {
                    this.game.sceneManager.demoPhase = 5;
                    this.game.setCustomTask("Serbest çalışma");
                }
            } else {
                this.nextTutorialStep();
            }
        };

        this.nextTutorialStep();
    }

    nextTutorialStep() {
        this.tutorialStep++;

        // Ensure image is hidden by default
        this.tutorialImg.style.display = 'none';
        this.tutorialNextBtn.innerHTML = "ONAYLIYORUM";

        switch (this.tutorialStep) {
            case 1:
                this.tutorialText.innerText = "1. Sol menüden 'Güç Kaynakları'na tıklayın ve 5V Gerilim Kaynağını (Pil) çalışma alanına ekleyin.";
                // We don't have images ready yet, but structure is there
                // this.tutorialImg.src = 'assets/tutorial_battery.png';
                // this.tutorialImg.style.display = 'block';
                break;
            case 2:
                this.tutorialText.innerText = "2. 'Pasif elemanlar' menüsünden bir tane Anahtar ekleyin.";
                break;
            case 3:
                this.tutorialText.innerText = "3. 'Çıkışlar' menüsünden bir tane LED ekleyin.";
                break;
            case 4:
                this.tutorialText.innerText = "4. Elemanları birbirine kablo ile bağlayın ve Anahtarı kapatarak LED'i yakın.";
                this.tutorialNextBtn.innerHTML = "TAMAMLADIM";
                // Show example circuit
                this.tutorialImg.src = 'assets/tutorial_circuit.png';
                this.tutorialImg.style.display = 'block';
                break;
        }
    }
}
