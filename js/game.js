/**
 * Main Game Engine
 * Ties all systems together and runs the game loop
 */

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');


        // Game dimensions (3:2 aspect ratio)
        this.RENDER_WIDTH = 1536;
        this.RENDER_HEIGHT = 1024;

        // Setup canvas
        this.setupCanvas();

        // Game state
        this.state = 'loading'; // loading, menu, playing, paused
        this.keys = {};
        this.lastTime = 0;
        this.fps = 60;
        this.fpsCounter = 0;
        this.lastFpsUpdate = 0;

        // FPS limiting (like Python's clock.tick(60))
        this.targetFPS = 60;
        this.frameTime = 1000 / this.targetFPS; // 16.666ms per frame
        this.lastFrameTime = 0;
        this.deltaAccumulator = 0;
        this.debugMenuVisible = false;

        // Game systems
        this.menu = null;
        this.sceneManager = null;
        this.player = null;
        this.enemies = [];
        this.npcs = [];
        this.paperPlanes = [];
        this.stones = [];
        this.injectors = [];
        this.combat = new CombatSystem();
        this.computer = new ComputerSystem(this);

        // Audio
        this.audio = {
            bgm: {},
            sfx: {}
        };
        this.currentMusic = null;
        this.musicLocked = false;

        // Mouse interaction for throwing
        this.mouse = { x: 0, y: 0, down: false };
        this.aimStartPos = null;

        // UI Feedback
        this.feedbackMessages = [];

        // Auto-save
        this.autoSaveTimer = 0;
        this.planeSpawnTimer = 0;
        this.autoSaveInterval = 30000; // 30 seconds

        // Mobile controls
        console.log('📱 Setting up mobile controls...');
        this.setupMobileControls();

        // Input
        console.log('⌨️ Setting up input...');
        this.setupInput();

        // Load game
        console.log('🎯 Calling init()...');
        try {
            this.init();
            this.setupDebugMenu();
        } catch (error) {
            console.error('❌ Error in init():', error);
            throw error;
        }
    }

    setupCanvas() {
        // Set canvas size to maintain 3:2 aspect ratio
        const windowAspect = window.innerWidth / window.innerHeight;
        const gameAspect = this.RENDER_WIDTH / this.RENDER_HEIGHT;

        let w, h;

        if (windowAspect > gameAspect) {
            // Window is wider - fit to height
            h = window.innerHeight;
            w = Math.floor(window.innerHeight * gameAspect);
        } else {
            // Window is taller - fit to width
            w = window.innerWidth;
            h = Math.floor(window.innerWidth / gameAspect);
        }

        this.canvas.width = w;
        this.canvas.height = h;
        if (this.ctx) this.ctx.imageSmoothingEnabled = false;

        // Resize UI Canvas if exists
        if (this.uiCanvas) {
            this.uiCanvas.width = w;
            this.uiCanvas.height = h;
            if (this.uiCtx) this.uiCtx.imageSmoothingEnabled = false;
        }

        // Handle window resize
        window.addEventListener('resize', () => this.setupCanvas());
    }

    setupInput() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;

            // Prevent default for game keys
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter', 'Escape', '1'].includes(e.key)) {
                e.preventDefault();
            }

            // Toggle mobile controls with 'L' key
            if (e.key === 'l' || e.key === 'L') {
                const mobileControls = document.getElementById('mobile-controls');
                mobileControls.classList.toggle('hidden');
                console.log('📱 Mobile controls toggled');
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // Mouse (Aim & Throw)
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    setupMobileControls() {
        const mobileControls = document.getElementById('mobile-controls');
        const joystickBase = document.querySelector('.joystick-base');
        const joystickStick = document.querySelector('.joystick-stick');
        const actionButtons = document.querySelectorAll('.btn-action');

        if (!joystickBase || !joystickStick) return;

        // Joystick state
        let joystickActive = false;
        let joystickStartX = 0;
        let joystickStartY = 0;

        // Joystick handlers
        const startJoystick = (e) => {
            e.preventDefault();
            joystickActive = true;
            const rect = joystickBase.getBoundingClientRect();
            joystickStartX = rect.left + rect.width / 2;
            joystickStartY = rect.top + rect.height / 2;
        };

        const moveJoystick = (e) => {
            if (!joystickActive) return;
            e.preventDefault();

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const deltaX = clientX - joystickStartX;
            const deltaY = clientY - joystickStartY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const maxDistance = 40;

            const clampedDistance = Math.min(distance, maxDistance);
            const angle = Math.atan2(deltaY, deltaX);

            const stickX = clampedDistance * Math.cos(angle);
            const stickY = clampedDistance * Math.sin(angle);

            joystickStick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;

            // Map to virtual keys
            const threshold = 15;
            this.keys['ArrowLeft'] = stickX < -threshold;
            this.keys['ArrowRight'] = stickX > threshold;
            this.keys['ArrowUp'] = stickY < -threshold;
            this.keys['ArrowDown'] = stickY > threshold;
        };

        const endJoystick = (e) => {
            if (!joystickActive) return;
            e.preventDefault();
            joystickActive = false;
            joystickStick.style.transform = 'translate(-50%, -50%)';
            this.keys['ArrowLeft'] = false;
            this.keys['ArrowRight'] = false;
            this.keys['ArrowUp'] = false;
            this.keys['ArrowDown'] = false;
        };

        // Touch events
        joystickBase.addEventListener('touchstart', startJoystick);
        joystickBase.addEventListener('touchmove', moveJoystick);
        joystickBase.addEventListener('touchend', endJoystick);

        // Mouse events (for testing on PC)
        joystickBase.addEventListener('mousedown', startJoystick);
        document.addEventListener('mousemove', moveJoystick);
        document.addEventListener('mouseup', endJoystick);

        // Action buttons
        actionButtons.forEach(button => {
            const action = button.dataset.action;

            const pressButton = (e) => {
                e.preventDefault();
                button.classList.add('active');

                switch (action) {
                    case 'jump':
                        this.keys['ArrowUp'] = true;
                        this.keys['w'] = true;
                        break;
                    case 'punch-left':
                        this.keys['q'] = true;
                        break;
                    case 'punch-right':
                        this.keys['e'] = true;
                        break;
                    case 'adrenaline':
                        this.keys['x'] = true;
                        break;
                    case 'enter':
                        this.keys['Enter'] = true;
                        break;
                    case 'collect':
                        this.keys['f'] = true;
                        // Trigger collection immediately for responsive feel
                        this.tryCollectPaperPlane();
                        break;
                    case 'aim':
                        this.keys['1'] = true;
                        if (this.player && this.player.isAiming !== undefined) {
                            if (this.player.isAiming) this.player.stopAim();
                            else this.player.startAim();
                        }
                        break;
                    case 'item2':
                        this.keys['2'] = true;
                        break;
                    case 'escape':
                        this.keys['Escape'] = true;
                        break;
                }
            };

            const releaseButton = (e) => {
                e.preventDefault();
                button.classList.remove('active');

                switch (action) {
                    case 'jump':
                        this.keys['ArrowUp'] = false;
                        this.keys['w'] = false;
                        break;
                    case 'punch-left':
                        this.keys['q'] = false;
                        break;
                    case 'punch-right':
                        this.keys['e'] = false;
                        break;
                    case 'adrenaline':
                        this.keys['x'] = false;
                        break;
                    case 'enter':
                        this.keys['Enter'] = false;
                        break;
                    case 'collect':
                        this.keys['f'] = false;
                        break;
                    case 'aim':
                        this.keys['1'] = false;
                        break;
                    case 'item2':
                        this.keys['2'] = false;
                        break;
                    case 'escape':
                        this.keys['Escape'] = false;
                        break;
                }
            };

            // Touch events
            button.addEventListener('touchstart', pressButton);
            button.addEventListener('touchend', releaseButton);

            // Mouse events
            button.addEventListener('mousedown', pressButton);
            button.addEventListener('mouseup', releaseButton);
        });

        console.log('📱 Mobile controls initialized');
    }

    updateLoadingText(text) {
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) loadingText.textContent = text;
        console.log(`⏳ ${text}`);
    }

    async init() {
        this.updateLoadingText('Oyun başlatılıyor...');
        console.log('🎮 Initializing game...');

        // Setup UI Canvas
        this.uiCanvas = document.getElementById('ui-canvas');
        if (this.uiCanvas) {
            this.uiCanvas.width = this.canvas.width;
            this.uiCanvas.height = this.canvas.height;
            this.uiCtx = this.uiCanvas.getContext('2d');
        } else {
            // Fallback if HTML wasn't updated correctly, use main canvas ctx
            this.uiCtx = this.ctx;
        }

        // Check WebGL support
        this.rendererType = 'Canvas 2D'; // Default
        this.webGpuRenderer = null;

        // Auto-detect and switch to WebGL if supported (Disabled by default as requested)
        const autoUseWebGL = false;
        if (autoUseWebGL && window.WebGLRenderer && window.WebGLRenderingContext) {
            this.updateLoadingText('WebGL Hazırlanıyor...');
            try {
                // Must swap canvas because constructor already initialized 2D context
                const oldCanvas = this.canvas;
                const newCanvas = document.createElement('canvas');
                newCanvas.id = 'game-canvas';
                newCanvas.className = oldCanvas.className;
                newCanvas.style.cssText = oldCanvas.style.cssText;
                newCanvas.width = oldCanvas.width;
                newCanvas.height = oldCanvas.height;

                oldCanvas.parentNode.replaceChild(newCanvas, oldCanvas);
                this.canvas = newCanvas;
                this.ctx = null; // Clear 2D context ref temporarily

                const renderer = new WebGLRenderer();

                // Add Timeout to prevent hanging
                const initPromise = renderer.init(this.canvas);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('WebGL Init Timeout')), 3000)
                );

                await Promise.race([initPromise, timeoutPromise]);

                this.webGpuRenderer = renderer;
                this.rendererType = 'WebGL';
                console.log('💚 WebGL initialized successfully (Auto-detected).');

                // Create a separate 2D canvas overlay for aim lines (WebGL can't draw lines well)
                this.aimCanvas = document.createElement('canvas');
                this.aimCanvas.id = 'aim-canvas';
                this.aimCanvas.width = this.canvas.width;
                this.aimCanvas.height = this.canvas.height;
                this.aimCanvas.style.position = 'absolute';
                this.aimCanvas.style.top = this.canvas.style.top || '50%';
                this.aimCanvas.style.left = this.canvas.style.left || '50%';
                this.aimCanvas.style.transform = this.canvas.style.transform || 'translate(-50%, -50%)';
                this.aimCanvas.style.pointerEvents = 'none';
                this.aimCanvas.style.zIndex = '3';
                this.canvas.parentNode.appendChild(this.aimCanvas);
                this.aimCtx = this.aimCanvas.getContext('2d');
                this.aimCtx.imageSmoothingEnabled = false;


                // Enhance Proxy Context to forward Text/UI calls to uiCtx
                const proxy = this.webGpuRenderer.proxyContext;

                proxy.fillText = (text, x, y, maxWidth) => {
                    this.uiCtx.fillText(text, x, y, maxWidth);
                };
                proxy.strokeText = (text, x, y, maxWidth) => {
                    this.uiCtx.strokeText(text, x, y, maxWidth);
                };
                proxy.measureText = (text) => this.uiCtx.measureText(text);

                proxy.fillRect = (x, y, w, h) => {
                    this.uiCtx.fillRect(x, y, w, h);
                };
                proxy.strokeRect = (x, y, w, h) => {
                    this.uiCtx.strokeRect(x, y, w, h);
                };
                proxy.clearRect = (x, y, w, h) => {
                    this.uiCtx.clearRect(x, y, w, h);
                };

                // Map properties (getters/setters)
                Object.defineProperty(proxy, 'font', {
                    set: (v) => { this.uiCtx.font = v; },
                    get: () => this.uiCtx.font
                });
                Object.defineProperty(proxy, 'fillStyle', {
                    set: (v) => { this.uiCtx.fillStyle = v; },
                    get: () => this.uiCtx.fillStyle
                });
                Object.defineProperty(proxy, 'strokeStyle', {
                    set: (v) => { this.uiCtx.strokeStyle = v; },
                    get: () => this.uiCtx.strokeStyle
                });
                Object.defineProperty(proxy, 'textAlign', {
                    set: (v) => { this.uiCtx.textAlign = v; },
                    get: () => this.uiCtx.textAlign
                });
                Object.defineProperty(proxy, 'textBaseline', {
                    set: (v) => { this.uiCtx.textBaseline = v; },
                    get: () => this.uiCtx.textBaseline
                });
                Object.defineProperty(proxy, 'globalAlpha', {
                    set: (v) => { this.uiCtx.globalAlpha = v; },
                    get: () => this.uiCtx.globalAlpha
                });
                Object.defineProperty(proxy, 'imageSmoothingEnabled', {
                    set: (v) => { this.uiCtx.imageSmoothingEnabled = v; },
                    get: () => this.uiCtx.imageSmoothingEnabled
                });

                this.uiCtx.imageSmoothingEnabled = false;

            } catch (e) {
                console.warn('WebGL init failed or timed out, falling back to Canvas 2D:', e);

                // Fallback: Get 2D context on the NEW canvas (since we swapped it)
                this.ctx = this.canvas.getContext('2d');
                this.ctx.imageSmoothingEnabled = false;

                this.rendererType = 'Canvas 2D (Fallback)';
                this.webGpuRenderer = null;
            }
        } else {
            this.rendererType = 'Canvas 2D';
            // Constructor already set this.ctx, so we are good.
        }

        // Load audio
        this.updateLoadingText('Sesler Yükleniyor...');
        await this.loadAudio();

        // Hide loading screen and show menu
        this.updateLoadingText('Hazır!');
        this.hideLoadingScreen();

        // Initialize menu
        this.menu = new MenuSystem(this.canvas, this.RENDER_WIDTH, this.RENDER_HEIGHT);
        this.state = 'menu';

        // Start game loop
        requestAnimationFrame((t) => this.gameLoop(t));

        console.log('✅ Game initialized!');
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    // ... existing loadAudio ...

    showSubtitle(text, duration = 3000) {
        this.subtitleText = text;
        this.subtitleTimer = duration;
    }

    drawUI() {
        const ctx = this.ctx;

        // ... existing health bar code ...
        this.player.drawHealth(ctx);

        // FPS
        ctx.fillStyle = '#969696';
        ctx.font = '20px PixelFont, Arial';
        ctx.fillText(`FPS: ${this.fps}`, 10, 20);

        // Renderer Type (Visible with F3 Debug)
        if (this.debugMenuVisible) {
            ctx.fillStyle = '#00ff00';
            ctx.font = '16px PixelFont, Arial';
            ctx.fillText(`Renderer: ${this.rendererType}`, 10, 40);
        }

        // Tasks
        ctx.fillStyle = '#FFD700'; // Gold color to stand out
        ctx.font = 'bold 24px PixelFont, Arial';
        ctx.fillText('GÖREVLER:', 10, 70); // Shifted down

        ctx.fillStyle = '#ffffff';
        ctx.font = '20px PixelFont, Arial';
        let taskY = 100; // Shifted down
        const currentTasks = this.getCurrentTasks();
        currentTasks.forEach(task => {
            ctx.fillText(`- ${task}`, 15, taskY);
            taskY += 25;
        });

        // Draw Subtitle (Non-intrusive dialogue)
        if (this.subtitleText && this.subtitleTimer > 0) {
            ctx.save();
            ctx.font = '20px "Press Start 2P", Arial'; // Fallback to Arial if font not loaded
            ctx.textAlign = 'center';
            const textWidth = ctx.measureText(this.subtitleText).width;
            const x = this.RENDER_WIDTH / 2;
            const y = 140; // Below tasks or top center
            const padding = 10;

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(x - textWidth / 2 - padding, y - 30, textWidth + padding * 2, 40);

            // Text
            ctx.fillStyle = '#4ade80'; // Greenish text
            ctx.fillText(this.subtitleText, x, y);
            ctx.restore();
        }
    }

    async loadAudio() {
        // Background music
        this.audio.bgm['normal'] = document.getElementById('bgm-normal');
        this.audio.bgm['battle'] = document.getElementById('bgm-battle');
        this.audio.bgm['dialogue'] = document.getElementById('bgm-dialogue');
        this.audio.bgm['fight'] = document.getElementById('bgm-fight');
        this.audio.bgm['horror'] = document.getElementById('bgm-horror');
        this.audio.bgm['intro'] = document.getElementById('bgm-intro');
        this.audio.bgm['wind'] = document.getElementById('bgm-wind');

        // Sound effects
        this.audio.sfx['punch'] = document.getElementById('sfx-punch');
        this.audio.sfx['walk'] = document.getElementById('sfx-walk');
        this.audio.sfx['injector'] = document.getElementById('sfx-injector');
        this.audio.sfx['gun'] = document.getElementById('sfx-gun');
        this.audio.sfx['jumpscare'] = document.getElementById('sfx-jumpscare');
        this.audio.sfx['blip'] = document.getElementById('sfx-blip');
        this.audio.sfx['phone'] = document.getElementById('sfx-phone');
        this.audio.sfx['zil_sesi'] = document.getElementById('sfx-zil-sesi');
        this.audio.sfx['ogrenci_zilsesisonu'] = document.getElementById('sfx-ogrenci-zilsesisonu');
        this.audio.sfx['horror'] = document.getElementById('sfx-horror');

        // Set volumes
        const settings = Utils.loadSettings();
        this.setMusicVolume(settings.musicVolume);
        this.setSfxVolume(settings.sfxVolume);
    }

    setMusicVolume(volume) {
        const vol = volume / 100;
        Object.values(this.audio.bgm).forEach(audio => {
            if (audio) audio.volume = vol;
        });
    }

    setSfxVolume(volume) {
        const vol = volume / 100;
        Object.values(this.audio.sfx).forEach(audio => {
            if (audio) audio.volume = vol;
        });
    }

    playMusic(name) {
        if (this.musicLocked) return;
        // Stop current music
        if (this.currentMusic && this.currentMusic !== this.audio.bgm[name]) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
        }

        // Play new music
        const music = this.audio.bgm[name];
        if (music) {
            const playPromise = music.play();

            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn('Music play failed (likely autoplay policy):', error);
                    // Add one-time listener to play on interaction
                    const playOnInteraction = () => {
                        music.play();
                        this.currentMusic = music;
                        this.currentMusicName = name;
                        window.removeEventListener('click', playOnInteraction);
                        window.removeEventListener('keydown', playOnInteraction);
                        window.removeEventListener('touchstart', playOnInteraction);
                    };

                    window.addEventListener('click', playOnInteraction);
                    window.addEventListener('keydown', playOnInteraction);
                    window.addEventListener('touchstart', playOnInteraction);
                });
            }

            this.currentMusic = music;
            this.currentMusicName = name;
        }
    }

    fadeMusic(nextMusicName, duration = 2000) {
        if (!this.currentMusic) {
            this.playMusic(nextMusicName);
            return;
        }

        const startVolume = this.currentMusic.volume;
        const startTime = Date.now();
        const currentToFade = this.currentMusic;

        const fadeOut = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = elapsed / duration;

            if (progress < 1) {
                currentToFade.volume = startVolume * (1 - progress);
                requestAnimationFrame(fadeOut);
            } else {
                currentToFade.pause();
                currentToFade.currentTime = 0;
                // Don't reset volume of the element globally, just play next
                this.playMusic(nextMusicName);

                // Ensure new music starts at standard volume
                const settings = Utils.loadSettings();
                if (this.currentMusic) {
                    this.currentMusic.volume = settings.musicVolume / 100;
                }

                console.log(`🎵 Faded into: ${nextMusicName}`);
            }
        };

        fadeOut();
    }

    playSfx(name, speaker = null) {
        const sfx = this.audio.sfx[name];
        if (sfx) {
            // For blip sound, allow overlapping (polyphony)
            if (name === 'blip') {
                const src = sfx.currentSrc || sfx.src;
                const clone = new Audio(src);
                clone.volume = sfx.volume;

                // Set pitch based on speaker
                if (speaker) {
                    const speakerLower = speaker.toLowerCase();
                    clone.preservesPitch = false; // Key to changing the actual pitch
                    if (speakerLower.includes('anne')) {
                        clone.playbackRate = 1.6; // High pitch
                    } else if (speakerLower.includes('data koleji') || speakerLower.includes('bilinmeyen')) {
                        clone.playbackRate = 1.3; // Medium-high
                    } else if (speakerLower.includes('tunahan')) {
                        clone.playbackRate = 1.0; // Normal
                    } else if (speakerLower.includes('baba')) {
                        clone.playbackRate = 0.85; // Deeper than Tunahan, higher than System
                    } else if (speakerLower.includes('system') || speakerLower.includes('sistem')) {
                        clone.playbackRate = 0.7; // Low pitch (Thickest)
                    } else if (speakerLower.includes('????')) {
                        clone.playbackRate = 0.9; // Unknown
                    }
                }

                clone.play().catch(e => console.warn('SFX clone play failed:', e));
            } else {
                // For other sounds, restart current instance
                sfx.currentTime = 0;
                sfx.play().catch(e => console.warn('SFX play failed:', e));
            }
        }
    }

    stopMusic() {
        if (this.currentMusic) {
            this.currentMusic.pause();
            Object.values(this.audio.bgm).forEach(audio => {
                if (audio) {
                    audio.pause();
                    audio.currentTime = 0;
                }
            });
        }
    }

    // Procedural Tinnitus (Çınlama) Sound
    playTinnitus(volume = 0.1) {
        this.stopMusic();
        this.musicLocked = true;
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            // Create oscillator if not exists
            if (!this.tinnitusOscillator) {
                this.tinnitusOscillator = this.audioContext.createOscillator();
                this.tinnitusGain = this.audioContext.createGain();

                this.tinnitusOscillator.type = 'sine';
                this.tinnitusOscillator.frequency.setValueAtTime(3000, this.audioContext.currentTime); // 3000Hz high pitch

                this.tinnitusOscillator.connect(this.tinnitusGain);
                this.tinnitusGain.connect(this.audioContext.destination);

                this.tinnitusOscillator.start();
            }

            // Update volume safely
            const now = this.audioContext.currentTime;
            this.tinnitusGain.gain.cancelScheduledValues(now);
            this.tinnitusGain.gain.setValueAtTime(this.tinnitusGain.gain.value, now);
            this.tinnitusGain.gain.linearRampToValueAtTime(volume, now + 0.1);
        } catch (e) {
            console.warn('AudioContext error:', e);
        }
    }

    stopTinnitus() {
        if (this.tinnitusOscillator && this.tinnitusGain) {
            try {
                const now = this.audioContext.currentTime;
                // Fade out
                this.tinnitusGain.gain.cancelScheduledValues(now);
                this.tinnitusGain.gain.setValueAtTime(this.tinnitusGain.gain.value, now);
                this.tinnitusGain.gain.linearRampToValueAtTime(0, now + 0.5);

                setTimeout(() => {
                    if (this.tinnitusOscillator) {
                        try {
                            this.tinnitusOscillator.stop();
                            this.tinnitusOscillator.disconnect();
                            this.tinnitusGain.disconnect();
                        } catch (e) { console.warn('Oscillator stop error:', e); }
                        this.tinnitusOscillator = null;
                        this.tinnitusGain = null;
                    }
                }, 550);
            } catch (e) {
                console.warn('Error stopping tinnitus:', e);
            }
        }
    }

    stopSfx(name) {
        const sfx = this.audio.sfx[name];
        if (sfx) {
            sfx.pause();
            sfx.currentTime = 0;
        }
    }

    startNewGame() {
        console.log('🎮 Starting new game...');

        Utils.clearSave();

        this.state = 'playing';
        this.sceneManager = new SceneManager(this, this.canvas, this.RENDER_WIDTH, this.RENDER_HEIGHT, true, false);
        this.player = new Player(this.RENDER_WIDTH / 2, this.RENDER_HEIGHT - 100, this.sceneManager.getCharScale());
        if (this.menu) this.menu.destroy();
        this.menu = new MenuSystem(this.canvas, this.RENDER_WIDTH, this.RENDER_HEIGHT);
        this.combat = new CombatSystem();

        this.enemies = [];
        this.npcs = [];
        this.paperPlanes = [];
        this.stones = [];
        this.injectors = [];
        this.autoSaveTimer = 0;
        this.stoneSpawnTimer = 0;
        this.planeSpawnTimer = 0;

        this.setupDebugMenu();
        this.playMusic('intro');
        this.sceneManager.changeScene('intro1', this.player, 'center');
    }

    startDemoGame() {
        console.log('🎮 Starting DEMO game...');

        Utils.clearSave();

        this.state = 'playing';
        // Pass playIntro = false, isDemo = true
        this.sceneManager = new SceneManager(this, this.canvas, this.RENDER_WIDTH, this.RENDER_HEIGHT, false, true);
        this.player = new Player(this.RENDER_WIDTH / 2, this.RENDER_HEIGHT - 100, this.sceneManager.getCharScale());
        if (this.menu) this.menu.destroy();
        this.menu = new MenuSystem(this.canvas, this.RENDER_WIDTH, this.RENDER_HEIGHT);
        this.combat = new CombatSystem();

        this.enemies = [];
        this.npcs = [];
        this.paperPlanes = [];
        this.stones = [];
        this.injectors = [];
        this.autoSaveTimer = 0;
        this.stoneSpawnTimer = 0;
        this.planeSpawnTimer = 0;

        this.setupDebugMenu();
        this.playMusic('normal'); // Use normal music for gameplay
        // Start directly in game scene, not intro1
        this.sceneManager.changeScene('game', this.player, 'center');
    }

    continueGame() {
        console.log('📂 Loading save...');

        const saveData = Utils.loadGame();
        if (!saveData) {
            console.error('No save data found!');
            this.startNewGame();
            return;
        }

        this.state = 'playing';
        this.sceneManager = new SceneManager(this, this.canvas, this.RENDER_WIDTH, this.RENDER_HEIGHT, false, saveData.isDemo || false);
        const initialScene = saveData.scene || 'game';

        this.player = new Player(
            saveData.x || this.RENDER_WIDTH / 2,
            saveData.y || this.RENDER_HEIGHT - 100,
            this.sceneManager.getCharScale()
        );

        this.player.health = saveData.health || 100;
        this.player.combo = saveData.combo || 0;
        this.player.hasAdrenaline = saveData.hasAdrenaline || false;

        // Restore quest items to sceneManager
        if (this.sceneManager) {
            this.sceneManager.backpackTaken = saveData.backpackTaken || false;
            this.sceneManager.waterTaken = saveData.waterTaken || false;
            this.sceneManager.keyTaken = saveData.keyTaken || false;
            this.sceneManager.moneyTaken = saveData.moneyTaken || false;
            this.sceneManager.doorOpened = saveData.doorOpened || false;
            this.sceneManager.corridorDoorOpened = saveData.corridorDoorOpened || false;
            this.sceneManager.backpackDialoguesSeen = saveData.backpackDialoguesSeen || false;
            this.sceneManager.tourCompleted = saveData.tourCompleted || false;
            this.sceneManager.radioHeadsetFound = saveData.radioHeadsetFound || false;
            this.sceneManager.headsetDialogueFinished = saveData.headsetDialogueFinished || false;
            this.sceneManager.zilSesiPlayed = saveData.zilSesiPlayed || false;

            // Reset cinematic states if they were interrupted
            if (initialScene === 'atolye_koridor' && !this.sceneManager.tourCompleted) {
                this.sceneManager.tourPhase = 1; // Restart the tour
            }
            
            if (saveData.bullyPhase > 0 && saveData.bullyPhase < 99) {
                // If bully cinematic was interrupted, restart it
                this.sceneManager.bullyPhase = 0;
                this.sceneManager.bullyTriggered = false;
            } else {
                this.sceneManager.bullyPhase = saveData.bullyPhase || 0;
                this.sceneManager.bullyTriggered = saveData.bullyTriggered || false;
            }
        }

        // Clear entities BEFORE changing scene so changeScene can populate them
        this.enemies = [];
        this.npcs = [];
        this.paperPlanes = [];
        this.stones = [];
        this.injectors = [];
        this.autoSaveTimer = 0;

        // Restore music BEFORE changeScene
        this.playMusic(saveData.music || 'normal');

        // Sync scene settings (including invisible walls)
        this.sceneManager.changeScene(initialScene, this.player);

        // Restore saved position after changeScene (since changeScene might move player)
        if (saveData.x !== undefined) this.player.x = saveData.x;
        if (saveData.y !== undefined) this.player.y = saveData.y;

        if (this.sceneManager) {
            // Reflect wall changes based on restored states
            if (this.sceneManager.waterTaken) {
                this.sceneManager.scenes['game'].rightWall = 1436;
                if (initialScene === 'game') this.player.maxX = 1436;
            }
            if (this.sceneManager.doorOpened) {
                this.sceneManager.scenes['game'].rightWall = 1536 + 100;
                if (initialScene === 'game') this.player.maxX = this.sceneManager.scenes['game'].rightWall;
            }
            if (this.sceneManager.keyTaken) {
                this.sceneManager.scenes['koridor'].rightWall = 2500; // As per user manual edit earlier
            }
            if (this.sceneManager.moneyTaken) {
                this.sceneManager.scenes['koridor'].rightWall = 2720;
                if (initialScene === 'koridor') this.player.maxX = 2720;
            }
            if (this.sceneManager.corridorDoorOpened) {
                this.sceneManager.scenes['koridor'].rightWall = 2800;
                if (initialScene === 'koridor') this.player.maxX = 2800;
            }

            // Re-sync interaction states based on item counts
            if (this.sceneManager.waterTaken) this.sceneManager.backpackInteractionState = 'completed';
            else if (this.sceneManager.backpackTaken) this.sceneManager.backpackInteractionState = 'waiting_water';
        }
    }

    spawnTestEnemy() {
        // Random enemy type 0-6
        const type = Utils.randomInt(0, 6);
        const enemy = new Enemy(
            this.RENDER_WIDTH / 2 + 250,
            this.RENDER_HEIGHT - 100 - this.sceneManager.getEnemyFootOffset(),
            this.sceneManager.getEnemyScale(),
            this.RENDER_WIDTH,
            this.RENDER_HEIGHT,
            type
        );
        this.enemies.push(enemy);
        console.log(`👹 Enemy spawned (Type: ${type})`);
    }

    spawnTeacher() {
        // Random teacher index 0-5
        const index = Utils.randomInt(0, 6);
        // Spawn slightly off-center or near player
        const x = this.player ? this.player.x + 100 : this.RENDER_WIDTH / 2;
        const y = this.RENDER_HEIGHT - 100; // Standard ground level

        const teacher = new MultiTeacherNPC(
            x,
            y,
            index,
            this.sceneManager.getCharScale(), // Use char scale for teachers
            this.RENDER_WIDTH,
            this.RENDER_HEIGHT
        );

        // Add to NPCs list
        this.npcs.push(teacher);
        console.log(`👨‍🏫 Teacher spawned (Index: ${index})`);
    }

    spawnPaperPlane() {
        if (!this.sceneManager) return;

        const sceneData = this.sceneManager.scenes[this.sceneManager.currentScene];
        const worldWidth = sceneData.worldWidth || this.RENDER_WIDTH;
        const cameraX = this.sceneManager.cameraX || 0;

        // Choose spawn type: 70% fly-through, 30% distant-lander
        const isDistant = Math.random() < 0.3;
        const spawnFromRight = Math.random() < 0.8;

        // Spawn coordinates
        let startX = spawnFromRight ? cameraX + this.RENDER_WIDTH + 150 : cameraX - 150;
        let startY = 50 + Math.random() * 200;

        // Momentum
        let vx, vy;

        const plane = new PaperPlane(startX, startY, 0, 0, worldWidth, this.RENDER_HEIGHT);

        if (isDistant) {
            // Distant lander: appears to come from background
            plane.scale = 0.2; // Start very small
            plane.targetScale = 0.8; // Grow as it comes closer

            // Slower speeds so it lands inside
            vx = (spawnFromRight ? -1 : 1) * (4 + Math.random() * 4);
            vy = -2 - Math.random() * 3;

            // Adjust Y to look like it's coming from horizon
            plane.y = 300 + Math.random() * 100;

            console.log('✈️ Distant paper plane spawned - will land inside');
        } else {
            // Classic fly-through: high speed, full size
            plane.scale = 1.0;
            plane.targetScale = 1.0;

            vx = (spawnFromRight ? -1 : 1) * (15 + Math.random() * 8);
            vy = -1.5 - Math.random() * 2;

            console.log('✈️ Fast paper plane spawned - flying through');
        }

        plane.vx = vx;
        plane.vy = vy;
        this.paperPlanes.push(plane);
    }

    handleMouseDown(e) {
        if (this.state !== 'playing' || !this.player) return;
        this.mouse = this.getMousePos(e);

        if (this.player.isAiming || this.player.isAimingStone) {
            this.aimStartPos = { x: this.mouse.x, y: this.mouse.y };
        }
    }

    handleMouseMove(e) {
        this.mouse = this.getMousePos(e);
    }

    handleMouseUp(e) {
        if (this.state !== 'playing' || !this.player) return;
        if (!this.player.isAiming && !this.player.isAimingStone) return;

        const mousePos = this.getMousePos(e);

        const dx = this.player.x - mousePos.x;
        const dy = (this.player.y - this.getAimHeightOffset()) - mousePos.y;

        // Horizontal direction
        this.player.facing_left = dx < 0;

        if (this.player.isAimingStone) {
            // Stone physics - heavier, limited range
            // Velocity multiplier for stones (still heavier than planes)
            let vx = dx * 0.12; // 80% of plane velocity
            let vy = dy * 0.12;

            // Limit maximum throw velocity (stones can't be thrown infinitely far)
            const maxVelocity = 18; // Maximum speed (increased for better range)
            const velocity = Math.sqrt(vx * vx + vy * vy);

            if (velocity > maxVelocity) {
                const scale = maxVelocity / velocity;
                vx *= scale;
                vy *= scale;
            }

            // Limit upward velocity (can't throw stones too high, but allow decent arc)
            if (vy < -12) {
                vy = -12; // Maximum upward velocity
            }

            const stone = new Stone(
                this.player.x,
                this.player.y - this.getAimHeightOffset(),
                vx,
                vy,
                this.sceneManager.scenes[this.sceneManager.currentScene].worldWidth,
                this.RENDER_HEIGHT
            );
            this.stones.push(stone);

            this.player.stoneCount--;
            this.player.stopAimStone();
            console.log(`🪨 Stone thrown! vx: ${vx.toFixed(1)}, vy: ${vy.toFixed(1)}`);
        } else {
            // Paper plane physics - light, floaty
            const vx = dx * 0.15;
            const vy = dy * 0.15;

            const plane = new PaperPlane(
                this.player.x,
                this.player.y - this.getAimHeightOffset(),
                vx,
                vy,
                this.sceneManager.scenes[this.sceneManager.currentScene].worldWidth,
                this.RENDER_HEIGHT
            );
            this.paperPlanes.push(plane);

            this.player.paperPlaneCount--;
            this.player.stopAim();
            console.log(`✈️ Plane thrown! Velocity: ${vx.toFixed(1)}, ${vy.toFixed(1)}`);
        }

        this.aimStartPos = null;
    }

    getAimHeightOffset() {
        // Calculate aim height based on current scene's character scale
        // Base offset is for scale 4, adjust proportionally
        if (!this.sceneManager || !this.sceneManager.currentScene) {
            return 180; // Default fallback
        }

        const sceneData = this.sceneManager.scenes[this.sceneManager.currentScene];
        const charScale = sceneData.charScale || 4;

        // Base calculation: scale 4 = 180 offset, scale 11 = 450 offset
        // Linear interpolation: offset = 45 * charScale
        return 45 * charScale;
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.RENDER_WIDTH / rect.width;
        const scaleY = this.RENDER_HEIGHT / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX + (this.sceneManager ? this.sceneManager.cameraX : 0),
            y: (e.clientY - rect.top) * scaleY
        };
    }

    tryCollectPaperPlane() {
        if (!this.player || this.player.isCollecting) return;

        const playerRect = this.player.getRect();

        for (let i = this.paperPlanes.length - 1; i >= 0; i--) {
            const plane = this.paperPlanes[i];

            // Collection: Use a large entity box covering the whole character
            // Player x,y is at feet/center bottom usually.
            const collectionRect = {
                x: this.player.x - 100,
                y: this.player.y - 400, // Cover head and above
                width: 200,
                height: 400 // Full height down to feet
            };

            const planeRect = plane.getRect();

            if (plane.onGround && Utils.rectCollision(collectionRect, planeRect)) {
                // Collect!
                this.paperPlanes.splice(i, 1);
                this.player.startCollect();
                this.playSfx('blip', 'Tunahan');

                // Feedback message
                this.feedbackMessages.push({
                    text: "+1 Kağıt Uçak",
                    x: this.player.x,
                    y: this.player.y - 150,
                    timer: 1000,
                    color: '#ffffff'
                });

                return true;
            }
        }
        return false;
    }

    tryCollectStone() {
        if (!this.player || this.player.isCollecting) return false;

        const collectionRect = {
            x: this.player.x - 100,
            y: this.player.y - 400,
            width: 200,
            height: 400
        };

        for (let i = this.stones.length - 1; i >= 0; i--) {
            const stone = this.stones[i];
            const stoneRect = stone.getRect();

            if (stone.onGround && Utils.rectCollision(collectionRect, stoneRect)) {
                this.stones.splice(i, 1);
                this.player.startCollect('stone');
                this.playSfx('blip', 'Tunahan');

                this.feedbackMessages.push({
                    text: "+1 Taş",
                    x: this.player.x,
                    y: this.player.y - 150,
                    timer: 1000,
                    color: '#aaaaaa'
                });
                return true;
            }
        }
        return false;
    }

    spawnRandomStone() {
        if (!this.sceneManager) return;

        const currentScene = this.sceneManager.currentScene;
        // Only spawn in outside and school scenes
        if (currentScene !== 'outside' && currentScene !== 'school') return;

        const sceneData = this.sceneManager.scenes[currentScene];
        const worldWidth = sceneData.worldWidth || this.RENDER_WIDTH;

        // Random X within world bounds
        const x = Math.random() * (worldWidth - 100) + 50;

        // Spawn slightly above ground to let it fall/settle
        const groundY = this.RENDER_HEIGHT - 100 - this.sceneManager.getFootOffset();
        const y = groundY - 200;

        const stone = new Stone(x, y, 0, 0, worldWidth, this.RENDER_HEIGHT);
        this.stones.push(stone);
    }

    saveGame() {
        const saveData = {
            x: this.player.x,
            y: this.player.y,
            health: this.player.health,
            scene: this.sceneManager.currentScene,
            combo: this.player.combo,
            hasAdrenaline: this.player.hasAdrenaline,
            backpackTaken: this.sceneManager.backpackTaken,
            waterTaken: this.sceneManager.waterTaken,
            keyTaken: this.sceneManager.keyTaken,
            moneyTaken: this.sceneManager.moneyTaken,
            doorOpened: this.sceneManager.doorOpened,
            corridorDoorOpened: this.sceneManager.corridorDoorOpened,
            backpackDialoguesSeen: this.sceneManager.backpackDialoguesSeen,
            tourCompleted: this.sceneManager.tourCompleted,
            radioHeadsetFound: this.sceneManager.radioHeadsetFound,
            headsetDialogueFinished: this.sceneManager.headsetDialogueFinished,
            zilSesiPlayed: this.sceneManager.zilSesiPlayed,
            bullyPhase: this.sceneManager.bullyPhase,
            bullyTriggered: this.sceneManager.bullyTriggered,
            music: this.currentMusicName,
            isDemo: this.sceneManager.isDemo,
            timestamp: Date.now()
        };

        if (Utils.saveGame(saveData)) {
            console.log('💾 Game saved!');
            this.showSaveNotification();
            return true;
        }
        return false;
    }

    showSaveNotification() {
        // Draw save notification
        this.ctx.save();
        this.ctx.font = 'bold 36px PixelFont, Arial';
        this.ctx.fillStyle = '#00ff00';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('KAYDEDILDI!', this.RENDER_WIDTH / 2, 100);
        this.ctx.restore();
    }

    update(dt) {
        // Update subtitle timer (Always run)
        if (this.subtitleTimer > 0) {
            this.subtitleTimer -= dt;
            if (this.subtitleTimer <= 0) {
                this.subtitleText = null;
            }
        }

        if (this.state === 'menu') {
            const result = this.menu.update(this.keys, dt);

            if (result === 'new_game') {
                this.startNewGame();
            } else if (result === 'demo') {
                this.startDemoGame();
            } else if (result === 'continue') {
                this.continueGame();
            } else if (result === 'exit') {
                window.close();
            }
        } else if (this.state === 'playing') {
            // Game over
            if (this.player.health <= 0) {
                console.log('🎮 Game Over!');
                this.state = 'menu';
                if (this.menu) this.menu.destroy();
                this.menu = new MenuSystem(this.canvas, this.RENDER_WIDTH, this.RENDER_HEIGHT);
                this.playMusic('battle');
            }

            // ESC to pause
            if (this.keys['Escape']) {
                this.keys['Escape'] = false;
                this.state = 'paused';
                if (this.menu) this.menu.destroy();
                this.menu = new MenuSystem(this.canvas, this.RENDER_WIDTH, this.RENDER_HEIGHT);
                this.menu.showPauseMenu();
                return;
            }

            // F3 to toggle debug menu
            if (this.keys['F3']) {
                this.keys['F3'] = false;
                this.toggleDebugMenu();
            }

            if (this.debugMenuVisible) return;

            // F5 to save
            if (this.keys['F5']) {
                this.keys['F5'] = false;
                this.saveGame();
            }

            // Punch controls
            if (this.keys['e'] || this.keys['E']) {
                this.player.startPunch(false);
                this.playSfx('punch');
                this.keys['e'] = false;
                this.keys['E'] = false;
            }

            if (this.keys['f'] || this.keys['F']) {
                if (!this.tryCollectPaperPlane()) {
                    this.tryCollectStone();
                }
                this.keys['f'] = false;
                this.keys['F'] = false;
            }

            if (this.keys['q'] || this.keys['Q']) {
                this.player.startPunch(true);
                this.playSfx('punch');
                this.keys['q'] = false;
                this.keys['Q'] = false;
            }

            if ((this.keys['x'] || this.keys['X']) && !this.sceneManager.dialogue.isActive()) {
                this.player.useAdrenaline();
                this.playSfx('injector');
                this.keys['x'] = false;
                this.keys['X'] = false;
            }

            // Paper Plane Aim Mode Toggle
            if (this.keys['1']) {
                if (this.player.isAiming) {
                    this.player.stopAim();
                } else {
                    this.player.startAim(); // Planes
                }
                this.keys['1'] = false;
            }

            // Stone Aim Mode Toggle
            if (this.keys['2']) {
                if (this.player.isAimingStone) {
                    this.player.stopAimStone();
                } else {
                    this.player.startAimStone();
                }
                this.keys['2'] = false;
            }

            // Update player
            const groundY = this.RENDER_HEIGHT - 100 - this.sceneManager.getFootOffset();
            this.player.update(this.keys, dt, groundY, this.sceneManager.dialogue.isActive() || !!this.sceneManager.cinematicTarget, this.sceneManager.backpackTaken);

            // Update scene
            this.sceneManager.update(this.player, this.keys, this.enemies, dt);

            // Update enemies
            // Use specific enemy ground offset (for fixing sprite height differences)
            const enemyGroundY = this.RENDER_HEIGHT - 100 - this.sceneManager.getEnemyFootOffset();
            const playerRect = this.player.getRect();
            const isDialogueActive = this.sceneManager.dialogue.isActive();

            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i];
                const result = enemy.update(playerRect, dt, this.injectors, this.stones, enemyGroundY, isDialogueActive);

                if (!enemy.alive) {
                    // Drop injector
                    if (Math.random() < 0.3) {
                        const injector = new AdrenalineInjector(enemy.x, enemy.y - 20);
                        this.injectors.push(injector);
                        console.log('💉 Injector dropped');
                    }
                    this.enemies.splice(i, 1);
                    continue;
                }

                // Enemy attack
                if (result === 'attack' && !this.player.invulnerable && !isDialogueActive) {
                    this.player.takeDamage(enemy.damage);
                }

                // Projectile collision
                for (const proj of enemy.projectiles) {
                    if (proj.active && Utils.rectCollision(proj.getRect(), playerRect)) {
                        proj.active = false;
                        // Disable damage if dialogue is active
                        if (!this.player.invulnerable && !isDialogueActive) {
                            this.player.takeDamage(proj.damage);
                        }
                    }
                }
            }

            // Update NPCs
            for (const npc of this.npcs) {
                npc.update(dt, this.npcs, this.player);
            }

            // Update paper planes
            for (let i = this.paperPlanes.length - 1; i >= 0; i--) {
                this.paperPlanes[i].update(dt, groundY); // Pass current ground level
                if (!this.paperPlanes[i].alive) {
                    this.paperPlanes.splice(i, 1);
                }
            }

            // Paper plane spawning (for kat1 and atolye_koridor scenes)
            const currentScene = this.sceneManager?.currentScene;
            if (currentScene === 'kat1' || currentScene === 'atolye_koridor') {
                this.planeSpawnTimer += dt;

                // Check every 10-15 seconds
                const spawnCheckInterval = 10000 + Math.random() * 5000;

                if (this.planeSpawnTimer >= spawnCheckInterval) {
                    this.planeSpawnTimer = 0;

                    // 55% chance to actually spawn as requested
                    if (Math.random() < 0.55) {
                        this.spawnPaperPlane();
                    }
                }
            }

            // Update stones
            const groundYStone = this.RENDER_HEIGHT - 100 - this.sceneManager.getFootOffset();

            // Calculate ground offset based on scene
            // Negative footOffset means character is higher, so stone should be too
            // Positive footOffset means character is lower
            const sceneFootOffset = this.sceneManager.getFootOffset();
            const stoneGroundOffset = Math.abs(sceneFootOffset) * 0.3; // 30% of footOffset for stones

            for (let i = this.stones.length - 1; i >= 0; i--) {
                this.stones[i].update(dt, groundYStone, stoneGroundOffset);
                if (!this.stones[i].alive) {
                    this.stones.splice(i, 1);
                }
            }

            // Stone spawning (outside, school)
            const sceneName = this.sceneManager?.currentScene;
            if (sceneName === 'outside' || sceneName === 'school') {
                this.stoneSpawnTimer += dt;

                // Spawn randomly every 1-3 seconds
                const spawnInterval = 1000 + Math.random() * 2000;

                if (this.stoneSpawnTimer >= spawnInterval) {
                    this.stoneSpawnTimer = 0;
                    if (Math.random() < 1.0) { // 100% chance for testing
                        console.log('🪨 Auto-spawning random stone');
                        this.spawnRandomStone();
                    }
                }
            }

            if (this.player.punching && this.player.currentAnimation === 'punch' &&
                this.player.frameIndex >= 0.5 && this.player.frameIndex < 4 &&
                !this.player.punchHitRegistered) {
                const punchRect = this.player.getPunchRect();
                const now = Date.now();

                for (const enemy of this.enemies) {
                    if (enemy.alive && Utils.rectCollision(punchRect, enemy.getRect())) {
                        // Mark hit as registered to prevent multiple hits
                        this.player.punchHitRegistered = true;

                        // Update combo
                        if (now - this.player.lastHitTime <= this.player.comboDecay) {
                            this.player.combo++;
                        } else {
                            this.player.combo = 1;
                        }
                        this.player.lastHitTime = now;

                        // Calculate damage
                        const damage = this.combat.calculateDamage(
                            this.combat.PUNCH_DAMAGE,
                            this.player.combo,
                            this.player.damageMultiplier
                        );

                        enemy.takeDamage(damage);

                        // Special case for Bully Cinematic Phase 13
                        if (enemy.isBully && this.sceneManager.currentScene === 'kat1' && this.sceneManager.bullyPhase === 13) {
                            this.sceneManager.bullyPhase = 14;
                            this.sceneManager.bullyTimer = 0;
                            this.stopTinnitus();
                            this.sceneManager.dialogue.start(this.sceneManager.sceneDialogues.bully_hit_reaction);
                            console.log('👊 Bully hit during cinematic! Phase 13 -> 14, Tinnitus STOPPED.');
                        }

                        console.log(`👊 Punch hit! Combo: ${this.player.combo}x, Damage: ${damage}`);
                        break; // Only hit one enemy per punch
                    }
                }
            }

            // Injector collection
            for (let i = this.injectors.length - 1; i >= 0; i--) {
                const inj = this.injectors[i];
                if (inj.active && Utils.rectCollision(inj.getRect(), playerRect)) {
                    inj.active = false;
                    this.injectors.splice(i, 1);
                    this.player.hasAdrenaline = true;
                    this.playSfx('injector');
                    console.log('💉 Adrenaline collected!');
                }
            }

            // Update feedback messages
            for (let i = this.feedbackMessages.length - 1; i >= 0; i--) {
                const msg = this.feedbackMessages[i];
                msg.y -= 1; // Float up
                msg.timer -= dt;
                if (msg.timer <= 0) this.feedbackMessages.splice(i, 1);
            }

            // Auto-save
            this.autoSaveTimer += dt;
            if (this.autoSaveTimer >= this.autoSaveInterval) {
                this.autoSaveTimer = 0;
                this.saveGame();
            }

            // Game over
            if (this.player.health <= 0) {
                console.log('💀 Game Over!');
                this.state = 'menu';
                this.menu = new MenuSystem(this.canvas, this.RENDER_WIDTH, this.RENDER_HEIGHT);
                this.playMusic('battle');
            }
        } else if (this.state === 'paused') {
            // If computer is open, don't update menu
            if (this.computer && this.computer.isOpen) {
                return;
            }

            const result = this.menu.update(this.keys);

            // Computer update (if open, it handles its own events really, but good to have a hook if needed)
            if (this.computer && this.computer.isOpen) {
                // Computer logic is mostly DOM based, so no update needed here
            }

            if (result === 'resume') {
                this.state = 'playing';
                this.menu.hidePauseMenu();
            } else if (result === 'save') {
                this.saveGame();
            } else if (result === 'main_menu') {
                this.state = 'menu';
                this.menu = new MenuSystem(this.canvas, this.RENDER_WIDTH, this.RENDER_HEIGHT);
                this.playMusic('battle');
            } else if (result === 'exit') {
                window.close();
            }
        }
    }

    draw(dt) {
        // Clear screen (Canvas 2D) or Prepare WebGL
        if (this.webGpuRenderer) {
            // Check if WebGL context is lost
            const renderStarted = this.webGpuRenderer.startRender();
            if (!renderStarted) {
                // Context is lost - fallback to Canvas 2D drawing if possible
                if (this.webGpuRenderer.isContextLost) {
                    // Try to use fallback 2D context
                    if (!this.ctx) {
                        // Create new 2D context as emergency fallback
                        console.warn('⚠️ WebGL context lost, switching to Canvas 2D fallback');
                        this.ctx = this.canvas.getContext('2d');
                        if (this.ctx) {
                            this.ctx.imageSmoothingEnabled = false;
                            this.webGpuRenderer = null;
                            this.rendererType = 'Canvas 2D (Fallback)';
                        }
                    }
                }
                // Skip this frame if still no valid context
                if (!this.ctx) return;
            }
            if (this.uiCtx) {
                this.uiCtx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
                this.uiCtx.clearRect(0, 0, this.uiCanvas.width, this.uiCanvas.height);
            }
        } else {
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        let currentCtx = this.ctx;

        // Scale for resolution independence
        const scaleX = this.canvas.width / this.RENDER_WIDTH;
        const scaleY = this.canvas.height / this.RENDER_HEIGHT;

        if (this.webGpuRenderer) {
            currentCtx = this.webGpuRenderer.proxyContext;
            currentCtx.save();
            currentCtx.scale(scaleX, scaleY);
            currentCtx.imageSmoothingEnabled = false;

            this.uiCtx.save();
            this.uiCtx.scale(scaleX, scaleY);
            this.uiCtx.imageSmoothingEnabled = false;

            // Swap SceneManager ctx
            if (this.sceneManager) this.sceneManager.ctx = currentCtx;
        } else {
            this.ctx.save();
            this.ctx.imageSmoothingEnabled = false;
            this.ctx.scale(scaleX, scaleY);
            this.ctx.imageSmoothingEnabled = false;
        }

        if (this.state === 'menu' || this.state === 'paused') {
            if (this.state === 'paused' && this.sceneManager) {
                // Draw game in background
                this.sceneManager.draw(currentCtx);

                if (this.webGpuRenderer) currentCtx.save();
                else this.ctx.save();

                // Camera Transform
                if (this.webGpuRenderer) currentCtx.translate(-this.sceneManager.cameraX, 0);
                else this.ctx.translate(-this.sceneManager.cameraX, 0);

                this.paperPlanes.forEach(p => p.draw(currentCtx));
                this.stones.forEach(s => s.draw(currentCtx));

                // Layering logic: Tunahan < Enemies < Teachers < Students
                if (this.player) this.player.draw(currentCtx);

                this.enemies.forEach(e => e.draw(currentCtx, dt));

                // Separate NPCs into Teachers and Students
                const teachers = this.npcs.filter(n => n instanceof TeacherNPC || n instanceof MultiTeacherNPC);
                const students = this.npcs.filter(n => !(n instanceof TeacherNPC || n instanceof MultiTeacherNPC));

                teachers.forEach(n => n.draw(currentCtx, dt));
                students.forEach(n => n.draw(currentCtx, dt));

                this.injectors.forEach(i => i.draw(currentCtx, dt));

                if (this.webGpuRenderer) currentCtx.restore();
                else this.ctx.restore();

                this.sceneManager.drawForeground(currentCtx);
                this.drawUI();
            }

            // Menu Draw - Assuming Menu uses UI Canvas or simple 2D
            const menuCtx = this.webGpuRenderer ? (this.uiCtx || this.ctx) : this.ctx;
            if (this.menu && menuCtx) {
                this.menu.draw(menuCtx);
            } else if (!menuCtx) {
                console.warn('⚠️ No context available for menu draw');
            }

        } else if (this.state === 'playing') {
            // Draw scene
            if (this.sceneManager) {
                this.sceneManager.draw(currentCtx);
            }

            // Draw player, enemies, injectors with camera translation
            if (this.webGpuRenderer) currentCtx.save();
            else this.ctx.save();

            if (this.webGpuRenderer) currentCtx.translate(-this.sceneManager.cameraX, 0);
            else this.ctx.translate(-this.sceneManager.cameraX, 0);

            // Draw Layer Order: PaperPlanes -> Stones -> Tunahan -> Zorbalar -> Öğretmenler -> Öğrenciler
            this.paperPlanes.forEach(p => p.draw(currentCtx));
            this.stones.forEach(s => s.draw(currentCtx));

            // 1. Tunahan (Player) - En alt katman
            if (!this.sceneManager.scenes[this.sceneManager.currentScene]?.noPlayer && this.player) {
                this.player.draw(currentCtx);
            }

            // 2. Zorbalar (Enemies)
            this.enemies.forEach(enemy => enemy.draw(currentCtx, dt));

            // 3. Öğretmenler ve Öğrenciler (NPCs)
            // Öğretmenleri ayırıyoruz (Öğrencilerin altında olması için)
            const teachers = this.npcs.filter(n => n instanceof TeacherNPC || n instanceof MultiTeacherNPC);
            const students = this.npcs.filter(n => !(n instanceof TeacherNPC || n instanceof MultiTeacherNPC));

            teachers.forEach(teacher => teacher.draw(currentCtx, dt));
            students.forEach(student => student.draw(currentCtx, dt));

            // 4. Enjektörler (En ön)
            this.injectors.forEach(inj => inj.draw(currentCtx, dt));

            currentCtx.setLineDash([]);
        }

        if (this.webGpuRenderer) currentCtx.restore();
        else this.ctx.restore();

        // Draw foreground (door, intro cinematic)
        if (this.sceneManager) this.sceneManager.drawForeground(currentCtx);

        // Draw UI (Uses this.uiCtx implicitly if setup correctly in drawUI)
        this.drawUI();

        // Draw Dialogue (Always on top)
        if (this.sceneManager && this.sceneManager.dialogue) {
            if (this.webGpuRenderer) {
                this.sceneManager.dialogue.ctx = this.uiCtx;
            }
            this.sceneManager.dialogue.draw();
        }

        // Draw Aim Line - Always use uiCtx in WebGL mode (it already works for UI)
        if (this.player && (this.player.isAiming || this.player.isAimingStone) && this.mouse) {
            // In WebGL mode, use uiCtx. In Canvas mode, use ctx.
            const targetCtx = this.webGpuRenderer ? this.uiCtx : this.ctx;

            if (!targetCtx) {
                console.error('AIM LINE: No context!');
                return;
            }

            targetCtx.save();

            // Apply scaling for WebGL mode (uiCtx doesn't have scale applied at this point)
            if (this.webGpuRenderer) {
                const scaleX = this.canvas.width / this.RENDER_WIDTH;
                const scaleY = this.canvas.height / this.RENDER_HEIGHT;
                targetCtx.setTransform(scaleX, 0, 0, scaleY, -this.sceneManager.cameraX * scaleX, 0);
            } else {
                // Canvas mode - scale is already applied, just translate for camera
                targetCtx.translate(-this.sceneManager.cameraX, 0);
            }

            // Draw the aim line
            const startX = this.player.x;
            const startY = this.player.y - this.getAimHeightOffset();

            targetCtx.beginPath();
            targetCtx.setLineDash([10, 10]);
            targetCtx.lineCap = 'round';
            targetCtx.moveTo(startX, startY);
            targetCtx.lineTo(this.mouse.x, this.mouse.y);

            if (this.player.isAimingStone) {
                targetCtx.strokeStyle = '#FFEB3B';
                targetCtx.lineWidth = 6;
            } else {
                targetCtx.strokeStyle = '#00FFFF';
                targetCtx.lineWidth = 5;
            }

            targetCtx.stroke();

            // Target circle
            targetCtx.setLineDash([]);
            targetCtx.fillStyle = targetCtx.strokeStyle;
            targetCtx.beginPath();
            targetCtx.arc(this.mouse.x, this.mouse.y, 10, 0, Math.PI * 2);
            targetCtx.fill();

            targetCtx.restore();
        }

        // Restore
        if (this.webGpuRenderer) {
            currentCtx.restore();
            this.uiCtx.restore();
            this.webGpuRenderer.finishRender();
            if (this.sceneManager) this.sceneManager.ctx = this.ctx;
            if (this.sceneManager && this.sceneManager.dialogue) this.sceneManager.dialogue.ctx = this.ctx;
        } else {
            this.ctx.restore();
        }
    }

    drawUI() {
        const ctx = this.webGpuRenderer ? this.uiCtx : this.ctx;
        if (!ctx) return;

        ctx.save();
        // REMOVED setTransform - We must keep the scale set in draw()


        // Health bar
        const barWidth = 200;
        const barHeight = 25;
        const barX = this.RENDER_WIDTH - barWidth - 10;
        const barY = 20;

        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const hpRatio = this.player.health / this.player.maxHealth;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // HP text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px PixelFont, Arial';
        ctx.fillText(`${Math.floor(this.player.health)}/${this.player.maxHealth}`, barX + 5, barY + 20);

        // Combo
        if (this.player.combo > 1) {
            this.combat.drawComboText(ctx, this.player.combo, this.RENDER_WIDTH / 2 - 150, 80);
        }

        // Adrenaline indicator
        if (this.player.hasAdrenaline) {
            ctx.fillStyle = '#ff3232';
            ctx.beginPath();
            ctx.arc(40, 75, 16, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px PixelFont, Arial';
            ctx.fillText('Adrenalin (X)', 65, 82);
        }

        if (this.player.adrenalineActive) {
            const timeLeft = this.player.adrenalineTimer / 1000;
            ctx.fillStyle = '#ff6464';
            ctx.font = 'bold 30px PixelFont, Arial';
            ctx.fillText(`BOOST: ${timeLeft.toFixed(1)}s`, 20, 115);
        }

        // Paper Plane Count UI
        if (this.player.paperPlaneCount > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 26px PixelFont, Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`✈️  x ${this.player.paperPlaneCount}`, 25, 120);
        }

        // Feedback messages
        this.feedbackMessages.forEach(msg => {
            ctx.save();
            ctx.globalAlpha = msg.timer / 1000;
            ctx.fillStyle = msg.color;
            ctx.font = 'bold 24px PixelFont, Arial';
            ctx.textAlign = 'center';
            ctx.fillText(msg.text, msg.x - (this.sceneManager ? this.sceneManager.cameraX : 0), msg.y);
            ctx.restore();
        });
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1.0;

        // FPS
        ctx.fillStyle = '#969696';
        ctx.font = '20px PixelFont, Arial';
        ctx.fillText(`FPS: ${this.fps}`, 10, 20);

        // Renderer Type (Visible with F3 Debug)
        if (this.debugMenuVisible) {
            ctx.fillStyle = '#00ff00';
            ctx.font = '16px PixelFont, Arial';
            ctx.fillText(`Renderer: ${this.rendererType}`, 10, 40);
        }

        // Tasks
        ctx.fillStyle = '#FFD700'; // Gold color to stand out
        ctx.font = 'bold 24px PixelFont, Arial';
        ctx.fillText('GÖREVLER:', 10, 70); // Shifted down due to debug info

        ctx.fillStyle = '#ffffff';
        ctx.font = '20px PixelFont, Arial';
        let taskY = 100; // Shifted down
        const currentTasks = this.getCurrentTasks();
        currentTasks.forEach(task => {
            ctx.fillText(`- ${task}`, 15, taskY);
            taskY += 25;
        });

        ctx.restore();
    }

    setCustomTask(task) {
        this.customTask = task;
    }

    clearCustomTask() {
        this.customTask = null;
    }

    getCurrentTasks() {
        if (this.customTask) {
            return [this.customTask];
        }

        const tasks = [];
        if (!this.sceneManager) return tasks;

        const sm = this.sceneManager;

        // Intro scenes
        if (sm.currentScene.startsWith('intro')) {
            tasks.push('Sinematiği izle');
            return tasks;
        }

        // Scene: game (Room)
        if (sm.currentScene === 'game') {
            // Logic: Task starts after initial dialogue (implied) or just default to 'Çantanı al'
            if (!sm.backpackTaken) {
                tasks.push('Çantanı al');
            } else {
                // After backpack (and potentially water if that logic is still there), task becomes 'Leave room'
                // The user simplified it: "Çantayı aldıktan sonra Görev:Odandan çık"
                // Check if door is opened to maybe clear it? But usually you are still in scene until you leave.
                tasks.push('Odandan çık');
            }
        }
        // Scene: koridor
        else if (sm.currentScene === 'koridor') {
            tasks.push('Koridorun sonuna ulaş');

            if (!sm.keyTaken) tasks.push('Anahtarı al');
            if (!sm.moneyTaken) tasks.push('Parayı al');

            if (sm.keyTaken && sm.moneyTaken && !sm.corridorDoorOpened) {
                tasks.push('Kapıyı aç');
            }
        }
        // Scene: outside
        else if (sm.currentScene === 'outside') {
            tasks.push('Okula git');
        }
        // Scene: school
        else if (sm.currentScene === 'school') {
            tasks.push('Okula gir');
            tasks.push("Kat 1'e ulaş");
        }
        // Scene: kantin
        else if (sm.currentScene === 'kantin') {
            tasks.push('Kantin menüsünü aç (Sağ)');
            if (sm.zilSesiPlayed && sm.bullyPhase === 0) {
                tasks.push("Kat 1'e git");
            } else {
                tasks.push("Kat 1'e ulaş");
            }
        }
        // Scene: kat1
        else if (sm.currentScene === 'kat1') {
            if (sm.bullyPhase >= 1 && sm.bullyPhase <= 4) {
                tasks.push('Sinematiği izle');
            } else if (sm.bullyPhase === 5) {
                tasks.push('Zorbayı durdur');
            } else if (sm.bullyPhase >= 6 && sm.bullyPhase <= 12) {
                tasks.push('Sinematiği izle');
            } else if (sm.bullyPhase === 13) {
                tasks.push("Sağa doğru vurmak için E'ye bas");
            } else if (sm.bullyPhase >= 14 && sm.bullyPhase < 99) {
                tasks.push('Sinematiği izle');
            } else if (sm.bullyPhase >= 99) {
                tasks.push('Etrafı keşfet');
            } else {
                tasks.push("Emre Hoca'yı bul");
            }
        }
        // Scene: atolye_koridor
        else if (sm.currentScene === 'atolye_koridor') {
            if (sm.tourPhase < 6) {
                tasks.push("Emre Hoca'yı takip et");
            } else if (sm.zilSesiPlayed && sm.bullyPhase === 0) {
                tasks.push("Kat 1'e git");
            } else {
                tasks.push("Uçak atölyesine git");
            }
        }
        else {
            tasks.push('Etrafı keşfet');
        }

        return tasks;
    }

    gameLoop(timestamp) {
        requestAnimationFrame((t) => this.gameLoop(t));

        // Calculate time since last frame
        if (this.lastFrameTime === 0) {
            this.lastFrameTime = timestamp;
        }

        let elapsed = timestamp - this.lastFrameTime;

        // FPS limiting
        if (elapsed < this.frameTime) {
            return;
        }

        // Clamp delta time to maximum 100ms (10fps) to prevent jumping/speeding up
        // after hitching or context switching
        if (elapsed > 100) elapsed = 100;

        // Update
        this.update(elapsed);

        // Draw
        this.draw(elapsed);

        this.lastFrameTime = timestamp;

        // FPS counter
        this.fpsCounter++;
        if (timestamp - this.lastFpsUpdate >= 1000) {
            this.fps = this.fpsCounter;
            this.fpsCounter = 0;
            this.lastFpsUpdate = timestamp;
        }
    }

    async switchRenderer(type) {
        if (type === 'webgl') {
            if (this.webGpuRenderer) return; // Already on WebGL (checking same var name)

            if (!window.WebGLRenderingContext) {
                alert('Tarayıcınız WebGL API\'sini desteklemiyor.');
                return;
            }

            if (!window.WebGLRenderer) {
                alert('WebGLRenderer scripti yüklenemedi.');
                return;
            }

            try {
                // 1. Create new Canvas for WebGL to ensure clean context
                const oldCanvas = this.canvas;
                const newCanvas = document.createElement('canvas');
                newCanvas.id = 'game-canvas';
                newCanvas.className = oldCanvas.className; // Preserve classes
                newCanvas.style.cssText = oldCanvas.style.cssText; // Preserve inline styles
                newCanvas.width = oldCanvas.width;
                newCanvas.height = oldCanvas.height;

                // Replace in DOM
                oldCanvas.parentNode.replaceChild(newCanvas, oldCanvas);
                this.canvas = newCanvas;
                this.ctx = null; // Invalidate 2D context

                // 2. Init WebGL
                const renderer = new WebGLRenderer();
                await renderer.init(this.canvas);

                // Setup Proxy
                const proxy = renderer.proxyContext;
                proxy.fillText = (text, x, y, maxWidth) => {
                    this.uiCtx.fillText(text, x, y, maxWidth);
                };
                proxy.strokeText = (text, x, y, maxWidth) => {
                    this.uiCtx.strokeText(text, x, y, maxWidth);
                };
                proxy.measureText = (text) => this.uiCtx.measureText(text);

                Object.defineProperty(proxy, 'font', { set: (v) => { this.uiCtx.font = v; }, get: () => this.uiCtx.font });
                Object.defineProperty(proxy, 'fillStyle', { set: (v) => { this.uiCtx.fillStyle = v; }, get: () => this.uiCtx.fillStyle });
                Object.defineProperty(proxy, 'strokeStyle', { set: (v) => { this.uiCtx.strokeStyle = v; }, get: () => this.uiCtx.strokeStyle });
                Object.defineProperty(proxy, 'textAlign', { set: (v) => { this.uiCtx.textAlign = v; }, get: () => this.uiCtx.textAlign });
                Object.defineProperty(proxy, 'textBaseline', { set: (v) => { this.uiCtx.textBaseline = v; }, get: () => this.uiCtx.textBaseline });
                Object.defineProperty(proxy, 'globalAlpha', { set: (v) => { this.uiCtx.globalAlpha = v; }, get: () => this.uiCtx.globalAlpha });

                this.webGpuRenderer = renderer;
                this.rendererType = 'WebGL';

                this.setupCanvas();

                console.log('🔄 Switched to WebGL (Clean Context)');
            } catch (e) {
                console.error('Failed to switch to WebGL:', e);
                alert('WebGL başlatılamadı! Hata: ' + e.message);
            }
        } else {
            // Switch to Canvas
            if (!this.webGpuRenderer) return; // Already on Canvas/WebGL

            // 1. Create new Canvas for 2D to ensure clean context
            const oldCanvas = this.canvas;
            const newCanvas = document.createElement('canvas');
            newCanvas.id = 'game-canvas';
            newCanvas.className = oldCanvas.className; // Preserve classes
            newCanvas.style.cssText = oldCanvas.style.cssText; // Preserve inline styles
            newCanvas.width = oldCanvas.width;
            newCanvas.height = oldCanvas.height;

            // Replace in DOM
            oldCanvas.parentNode.replaceChild(newCanvas, oldCanvas);
            this.canvas = newCanvas;

            // 2. Init Canvas 2D
            this.ctx = this.canvas.getContext('2d');
            this.ctx.imageSmoothingEnabled = false;

            this.webGpuRenderer = null;
            this.rendererType = 'Canvas 2D';

            // Restore contexts
            if (this.sceneManager) this.sceneManager.ctx = this.ctx;
            if (this.sceneManager && this.sceneManager.dialogue) this.sceneManager.dialogue.ctx = this.ctx;

            this.setupCanvas();
            console.log('🔄 Switched to Canvas 2D (Clean Context)');
        }
        this.updateDebugButtonStates();
    }

    setupDebugMenu() {
        const listMain = document.getElementById('scene-jump-list-main');
        const listDemo = document.getElementById('scene-jump-list-demo');
        const taskList = document.getElementById('task-debug-list');
        const itemList = document.getElementById('item-debug-list');
        const closeBtn = document.getElementById('close-debug');

        if (!listMain || !listDemo || !itemList || !closeBtn) {
            console.warn('⚠️ Debug menu elements not found in HTML');
            return;
        }

        // Renderer Buttons
        const btnWebgl = document.getElementById('btn-render-webgl');
        if (btnWebgl) btnWebgl.onclick = () => this.switchRenderer('webgl');

        const btnCanvas = document.getElementById('btn-render-canvas');
        if (btnCanvas) btnCanvas.onclick = () => this.switchRenderer('canvas');

        // Health Button
        const btnFullHealth = document.getElementById('btn-full-health');
        if (btnFullHealth) {
            btnFullHealth.onclick = () => {
                if (this.player) {
                    this.player.health = 100;
                    console.log('❤️ Health restored to 100% via debug menu');
                    this.toggleDebugMenu();
                }
            };
        }

        const changeModeAndScene = (scene, isDemo) => {
            if (this.sceneManager) {
                if (this.sceneManager.isDemo !== isDemo) {
                    this.sceneManager.isDemo = isDemo;
                    this.sceneManager.sceneDialogues = isDemo ? this.sceneManager.defineDemoDialogues() : this.sceneManager.defineSceneDialogues();
                }
                this.sceneManager.changeScene(scene, this.player, 'left');
                this.toggleDebugMenu();
            }
        };

        // Scenes list (Main Game)
        const mainScenes = ['game', 'koridor', 'outside', 'school', 'kantin', 'kat1', 'atolye_koridor', 'atolye1', 'atolye2'];
        mainScenes.forEach(scene => {
            const btn = document.createElement('button');
            btn.className = 'debug-btn';
            btn.textContent = scene.toUpperCase();
            btn.onclick = () => changeModeAndScene(scene, false);
            listMain.appendChild(btn);
        });

        // Scenes list (Demo Mode)
        const demoScenes = ['game', 'koridor', 'kat1', 'atolye_koridor', 'atolye1'];
        demoScenes.forEach(scene => {
            const btn = document.createElement('button');
            btn.className = 'debug-btn';
            btn.textContent = scene.toUpperCase();
            btn.onclick = () => changeModeAndScene(scene, true);
            listDemo.appendChild(btn);
        });

        // Tasks list
        if (taskList) {
            const commonTasks = [
                'Çantanı al', 'Odandan çık', 'Koridorun sonuna ulaş', 
                'Anahtarı al', 'Parayı al', 'Kapıyı aç', 'Sinematiği izle',
                'Zorbayı durdur', 'Emre Hoca\'yı bul', 'Atölyeleri gez (0/2)'
            ];

            const btnClear = document.createElement('button');
            btnClear.className = 'debug-btn';
            btnClear.textContent = 'Otomatik (Sıfırla)';
            btnClear.style.backgroundColor = '#444';
            btnClear.onclick = () => {
                this.clearCustomTask();
                this.toggleDebugMenu();
            };
            taskList.appendChild(btnClear);

            commonTasks.forEach(task => {
                const btn = document.createElement('button');
                btn.className = 'debug-btn';
                btn.textContent = task;
                btn.onclick = () => {
                    this.setCustomTask(task);
                    this.toggleDebugMenu();
                };
                taskList.appendChild(btn);
            });
        }

        // Items list
        const items = [
            { id: 'backpackTaken', name: 'Çanta' },
            { id: 'waterTaken', name: 'Su' },
            { id: 'keyTaken', name: 'Anahtar' },
            { id: 'moneyTaken', name: '15 TL' },
            { id: 'doorOpened', name: 'Oda Kapısı' },
            { id: 'corridorDoorOpened', name: 'Koridor Kapısı' }
        ];

        items.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'debug-btn';
            btn.id = `debug-item-${item.id}`;
            btn.textContent = item.name;
            btn.onclick = () => {
                if (this.sceneManager) {
                    this.sceneManager[item.id] = !this.sceneManager[item.id];

                    // Special case for wall boundaries if doors are opened
                    if (item.id === 'doorOpened') {
                        this.sceneManager.scenes['game'].rightWall = this.sceneManager[item.id] ? 1536 : 1000;
                        if (this.sceneManager.currentScene === 'game') this.player.maxX = this.sceneManager.scenes['game'].rightWall;
                    }
                    if (item.id === 'corridorDoorOpened') {
                        this.sceneManager.scenes['koridor'].rightWall = this.sceneManager[item.id] ? 2800 : 2500;
                        if (this.sceneManager.currentScene === 'koridor') this.player.maxX = this.sceneManager.scenes['koridor'].rightWall;
                    }

                    this.updateDebugButtonStates();
                }
            };
            itemList.appendChild(btn);
        });

        // Add paper plane spawn button
        const planeBtn = document.createElement('button');
        planeBtn.className = 'debug-btn';
        planeBtn.textContent = '✈️ Kağıt Uçak';
        planeBtn.onclick = () => {
            this.spawnPaperPlane();
        };
        itemList.appendChild(planeBtn);

        // Add stone spawn button
        const stoneBtn = document.createElement('button');
        stoneBtn.className = 'debug-btn';
        stoneBtn.textContent = '🪨 Taş';
        stoneBtn.onclick = () => {
            // For debug spawn, prefer spawning near player if possible, 
            // but spawnRandomStone uses random x.
            // Let's just call spawnRandomStone as requested.
            this.spawnRandomStone();
            // Also give player a stone directly for easier testing
            if (this.player) this.player.stoneCount++;
        };
        itemList.appendChild(stoneBtn);

        // Add zorba spawn button
        const enemyBtn = document.createElement('button');
        enemyBtn.className = 'debug-btn';
        enemyBtn.textContent = '👹 Zorba';
        enemyBtn.onclick = () => {
            this.spawnTestEnemy();
        };
        itemList.appendChild(enemyBtn);

        // Add teacher spawn button
        const teacherBtn = document.createElement('button');
        teacherBtn.className = 'debug-btn';
        teacherBtn.textContent = '👨‍🏫 Öğretmen';
        teacherBtn.onclick = () => {
            this.spawnTeacher();
        };
        itemList.appendChild(teacherBtn);

        console.log('Items buttons added to debug menu');

        closeBtn.onclick = () => this.toggleDebugMenu();
    }

    populateDebugDialogues() {
        const dialogueList = document.getElementById('dialogue-debug-list');
        if (!dialogueList || !this.sceneManager || !this.sceneManager.sceneDialogues) return;

        dialogueList.innerHTML = '';

        const dialogueKeys = Object.keys(this.sceneManager.sceneDialogues);
        dialogueKeys.sort().forEach(key => {
            const btn = document.createElement('button');
            btn.className = 'debug-btn';
            btn.textContent = key;
            btn.title = key;
            btn.style.fontSize = '12px';

            btn.onclick = (e) => {
                e.stopPropagation();
                if (this.sceneManager && this.sceneManager.dialogue) {
                    this.debugJumpToDialogue(key);
                    this.toggleDebugMenu();
                }
            };
            dialogueList.appendChild(btn);
        });
    }

    debugJumpToDialogue(dialogueKey) {
        if (!this.sceneManager || !this.player) return;

        let targetScene = null;
        let targetX = null;
        let stateModifiers = {};

        // 1. Scene & Pos Mapping
        if (dialogueKey.startsWith('intro')) {
            targetScene = 'outside';
            targetX = 400;
        } else if (dialogueKey === 'room_start') {
            targetScene = 'game';
            targetX = 200;
        } else if (dialogueKey.startsWith('backpack')) {
            targetScene = 'game';
            targetX = 800;
        } else if (dialogueKey === 'outside_1') {
            targetScene = 'outside';
            targetX = 1000;
        } else if (dialogueKey.startsWith('school_1')) {
            targetScene = 'school';
            targetX = 400;
        } else if (dialogueKey === 'data_agents_intro') {
            targetScene = 'koridor';
            targetX = 2650;
            stateModifiers.keyTaken = true;
        } else if (dialogueKey === 'bully_yell') {
            targetScene = 'kat1';
            targetX = 100;
            stateModifiers.zilSesiPlayed = true;
        } else if (dialogueKey.startsWith('bully_approach')) {
            targetScene = 'kat1';
            targetX = 4400;
            stateModifiers.zilSesiPlayed = true;
            stateModifiers.bullyTriggered = true;
            stateModifiers.bullyPhase = 5;
        } else if (dialogueKey === 'bully_flashback' || dialogueKey === 'bully_return' || dialogueKey === 'bully_taunt') {
            targetScene = 'kat1';
            targetX = 4750;
            stateModifiers.zilSesiPlayed = true;
            stateModifiers.bullyTriggered = true;
            stateModifiers.bullyPhase = 8;
        } else if (dialogueKey === 'bully_punch_prompt') {
            targetScene = 'kat1';
            targetX = 4750;
            stateModifiers.zilSesiPlayed = true;
            stateModifiers.bullyTriggered = true;
            stateModifiers.bullyPhase = 12;
        } else if (dialogueKey === 'bully_telsiz') {
            targetScene = 'kat1';
            targetX = 4750;
            stateModifiers.zilSesiPlayed = true;
            stateModifiers.bullyTriggered = true;
            stateModifiers.bullyPhase = 15;
            stateModifiers.bullyTimer = 2000; // Skip walk away
        } else if (dialogueKey.startsWith('emre_school')) {
            targetScene = 'kat1';
            targetX = 8000;
            stateModifiers.bullyTriggered = true;
            stateModifiers.bullyPhase = 99;
        } else if (dialogueKey.startsWith('emre_tour')) {
            targetScene = 'atolye_koridor';
            targetX = 4000;
            stateModifiers.tourPhase = parseInt(dialogueKey.split('_').pop()) || 1;
        }

        // 2. Perform Scene Jump
        if (targetScene) {
            this.sceneManager.changeScene(targetScene, this.player);
            if (targetX !== null) this.player.x = targetX;
        }

        // 3. Apply State Modifiers
        for (let key in stateModifiers) {
            this.sceneManager[key] = stateModifiers[key];
        }

        // 4. Force Spawn Bully if needed
        if (stateModifiers.bullyTriggered && targetScene === 'kat1') {
            if (!this.enemies.find(e => e.isBully)) {
                const sceneData = this.sceneManager.scenes['kat1'];
                const bullyY = this.RENDER_HEIGHT - 100 - sceneData.enemyFootOffset;
                const bully = new Enemy(4800, bullyY, sceneData.enemyScale, sceneData.worldWidth, this.RENDER_HEIGHT, 0);
                bully.isBully = true;
                bully.speed = 0;
                bully.state = 'idle';
                this.enemies.push(bully);
            }
        }

        // 5. Start Dialog
        if (this.sceneManager.sceneDialogues[dialogueKey]) {
            this.sceneManager.dialogue.start(this.sceneManager.sceneDialogues[dialogueKey]);
        }
    }

    updateDebugButtonStates() {
        // Update Renderer Buttons
        const btnWebGL = document.getElementById('btn-render-webgl');
        const btnCanvas = document.getElementById('btn-render-canvas');

        if (btnWebGL && btnCanvas) {
            btnWebGL.classList.toggle('active', this.webGpuRenderer !== null);
            btnCanvas.classList.toggle('active', this.webGpuRenderer === null);
        }

        if (!this.sceneManager) return;

        const items = ['backpackTaken', 'waterTaken', 'keyTaken', 'moneyTaken', 'doorOpened', 'corridorDoorOpened'];
        items.forEach(id => {
            const btn = document.getElementById(`debug-item-${id}`);
            if (btn) {
                btn.classList.toggle('active', this.sceneManager[id]);
            }
        });

        // Update Dialogue List
        this.populateDebugDialogues();
    }

    toggleDebugMenu() {
        this.debugMenuVisible = !this.debugMenuVisible;
        const menu = document.getElementById('debug-menu');
        if (menu) {
            menu.classList.toggle('hidden', !this.debugMenuVisible);
            if (this.debugMenuVisible) {
                this.updateDebugButtonStates();
            }
        }
    }

    togglePause(paused) {
        if (paused) {
            this.state = 'paused';
            // Don't show pause menu if it's for computer interaction
            // We'll just rely on the state being 'paused' to stop updates
        } else {
            this.state = 'playing';
        }
    }
}

// Start game when page loads
window.addEventListener('load', () => {
    try {
        console.log('🌐 Window loaded, creating game instance...');
        const game = new Game();

        // Make game accessible globally for debugging
        window.game = game;

        console.log('✅ Game instance created successfully');
    } catch (error) {
        console.error('❌ CRITICAL ERROR during game initialization:', error);
        console.error('Error stack:', error.stack);

        // Display error on screen for mobile debugging
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #ff6464;">
                    <h2>Initialization Error</h2>
                    <p style="font-size: 14px; margin: 10px 0;">${error.message}</p>
                    <p style="font-size: 12px; color: #cccccc;">Check console for details</p>
                    <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; font-size: 16px;">
                        Reload
                    </button>
                </div>
            `;
        }
    }
});

// Fallback for older browsers
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM loaded (fallback)');
    });
} else {
    console.log('📄 DOM already loaded');
}



