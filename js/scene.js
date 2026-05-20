/**
 * Scene Manager
 * Handles scene transitions, backgrounds, and scene-specific logic
 */

class SceneManager {
    constructor(game, canvas, width, height, playIntro = true, isDemo = false) {
        this.game = game;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = width;
        this.height = height;
        this.isDemo = isDemo; // Store demo flag

        this.currentScene = playIntro ? 'intro1' : 'game';
        this.scenes = this.defineScenes();
        this.sceneOrder = ['intro1', 'intro2', 'intro3', 'scene_phone', 'game', 'kantin'];
        this.backgrounds = {};
        this.overlays = {};
        this.cameraX = 0;

        // Dialogue system
        this.dialogue = new DialogueSystem(game, canvas, width, height);
        this.sceneDialogues = this.isDemo ? this.defineDemoDialogues() : this.defineSceneDialogues();
        if (this.isDemo) console.log('⚠️ DEMO MODE ACTIVATED: Using limited dialogues');
        this.dialogueTriggered = new Set();

        // Intro scene states
        this.intro2SecondDialogueTimer = 0;
        this.intro2WaitingForSecond = false;
        this.intro2SecondShown = false;
        this.intro3FirstDialogueTimer = 0;
        this.intro3SecondDialogueTimer = 0;
        this.intro3WaitingForFirst = true;
        this.intro3FirstShown = false;
        this.intro3WaitingForSecond = false;
        this.intro3SecondShown = false;
        this.intro3StartTime = 0;

        // Intro cinematic states
        this.introCinematicActive = playIntro;
        this.introCinematicPhase = 0; // 0: black, 1: fade in text, 2: show text, 3: fade out text, 4: black, 5: done
        this.introCinematicTimer = 0;
        this.dateTextAlpha = 0;

        // Scene phone states
        this.scenePhoneDelayTimer = 0;
        this.scenePhoneWaiting = true;
        this.scenePhoneDialogueShown = false;

        // Backpack interaction states
        this.backpackInteractionState = 'idle'; // idle, waiting_backpack, waiting_water
        this.backpackTaken = false;
        this.waterTaken = false;
        this.doorOpened = false;
        this.keyTaken = false;
        this.moneyTaken = false;
        this.corridorDoorOpened = false;
        this.backpackDialoguesSeen = false;
        this.interactionPrompt = null;
        this.radioHeadsetFound = false;
        this.headsetDialogueFinished = false;
        this.zilSesiPlayed = false;
        this.tourCompleted = false; // Persistent flag for tour status

        // Bully cinematic state
        this.bullyPhase = 0; // 0=not started, 1=cam to bully, 2=bully yells, 3=npcs flee, 4=cam back, 5=task active, 6=approach dialogue, 7=tinnitus+flashback, 8=pink screen, 9=return, 10=punch prompt, 11=punched, 12=bully leaves, 13=telsiz, 99=done
        this.bullyTriggered = false;
        this.bullyTimer = 0;
        this.bullyFlashAlpha = 0;
        this.bullyTraumaAlpha = 0;
        this.bullyPinkAlpha = 0;
        this.bullyShake = 0;
        this.bullyTinnitusVolume = 0;
        this.traumaImg = null;
        this.pinkImg = null;

        // Load trauma/pink images
        Utils.loadImage('trauma/trauma.png').then(img => this.traumaImg = img);
        Utils.loadImage('backgrounds/pink.png').then(img => this.pinkImg = img);

        this.loadBackgrounds();
    }

    defineScenes() {
        return {
            intro1: { file: 'INTRO1.png', charScale: 4, footOffset: 0, noPlayer: true, leftWall: 300, rightWall: 1536 },
            intro2: { file: 'INTRO2.png', charScale: 4, footOffset: 0, noPlayer: true, leftWall: 0, rightWall: 1536 },
            intro3: { file: 'INTRO3.png', charScale: 4, footOffset: 0, noPlayer: true, leftWall: 0, rightWall: 1536 },
            scene_phone: { file: 'background10.png', charScale: 4, footOffset: 0, noPlayer: true, leftWall: 0, rightWall: 1536, layer: 'backpack_layer.png' },
            game: { file: 'background6.png', charScale: 11, footOffset: -230, enemyFootOffset: -330, enemyScale: 11, leftWall: 300, rightWall: 1000, layer: 'backpack_layer.png' },
            koridor: { file: 'koridor.png', charScale: 11, footOffset: -230, enemyFootOffset: -330, enemyScale: 11, leftWall: 40, rightWall: 2500, worldWidth: 2760, layer: 'key_layer.png' },
            outside: {
                file: 'background5.png', charScale: 4, footOffset: 1, enemyFootOffset: 1, enemyScale: 4, leftWall: 40, rightWall: 1200, npcFootOffset: 1, moveLeft: true, wrap: true, npcs: [
                    { x: 300, y: 0, index: 0 }, { x: 500, y: 0, index: 1 }, { x: 700, y: 0, index: 2 },
                    { x: 900, y: 0, index: 3 }, { x: 1100, y: 0, index: 4 }, { x: 1300, y: 0, index: 5 },
                    { x: 1500, y: 0, index: 6 }, { x: 1700, y: 0, index: 7 }
                ]
            },
            school: {
                file: 'background.png', charScale: 4, footOffset: -150, enemyFootOffset: -150, enemyScale: 4, leftWall: 40, rightWall: 1536 * 2, worldWidth: 3216, npcFootOffset: -140, npcs: [
                    { x: 200, y: 0, index: 0, groupId: 'g1' }, { x: 250, y: 0, index: 1, groupId: 'g1' },
                    { x: 500, y: 0, index: 2, groupId: 'g2' }, { x: 550, y: 0, index: 3, groupId: 'g2' }, { x: 600, y: 0, index: 4, groupId: 'g2' },
                    { x: 800, y: 0, index: 5 }, { x: 900, y: 0, index: 6 }, { x: 1000, y: 0, index: 7 },
                    { x: 1200, y: 0, index: 0, groupId: 'g3' }, { x: 1250, y: 0, index: 2, groupId: 'g3' },
                    { x: 1400, y: 0, index: 3, groupId: 'g4' }, { x: 1460, y: 0, index: 4, groupId: 'g4' },
                    { x: 1700, y: 0, index: 5, groupId: 'g5' }, { x: 1750, y: 0, index: 6, groupId: 'g5' },
                    { x: 1900, y: 0, index: 7 }, { x: 2100, y: 0, index: 0 }, { x: 2300, y: 0, index: 1 },
                    { x: 2500, y: 0, index: 2, groupId: 'g6' }, { x: 2550, y: 0, index: 3, groupId: 'g6' },
                    { x: 2800, y: 0, index: 4, groupId: 'g7' }, { x: 2860, y: 0, index: 5, groupId: 'g7' }, { x: 2920, y: 0, index: 6, groupId: 'g7' },
                    { x: 3100, y: 0, index: 7 }
                ]
            },
            atolye_koridor: {
                file: 'Atolye_koridor.png', charScale: 8, footOffset: -200, enemyFootOffset: -300, enemyScale: 8, leftWall: 0, rightWall: 4544, worldWidth: 4544,
                doors: [
                    // Door '01' (Left): ~21-155px in 950px img -> Center ~420 in 4544px world
                    { x: 420, width: 250, target: 'atolye1', name: 'Uçak Atölyesi' },
                    // Door '02' (Middle): ~499-647px -> Center ~2740
                    { x: 2740, width: 250, target: 'atolye2', name: 'Elektrik Atölyesi' }
                ],
                npcs: [
                    { x: 3700, y: 0, type: 'teacher', name: 'emre_hoca', id: 'emre_guide' },
                    { x: 3750, y: 0, index: 5, groupId: 'tour_group' },
                    { x: 3804, y: 0, index: 6, groupId: 'tour_group' },
                    { x: 3830, y: 0, index: 7, groupId: 'tour_group' },
                    { x: 3880, y: 0, index: 0, groupId: 'tour_group' },
                    { x: 3930, y: 0, index: 1, groupId: 'tour_group' },
                    { x: 3980, y: 0, index: 2, groupId: 'tour_group' },
                    { x: 4030, y: 0, index: 3, groupId: 'tour_group' }
                ]
            },
            atolye1: {
                file: 'Atolye1.png', charScale: 8, footOffset: -200, enemyFootOffset: -300, enemyScale: 8, leftWall: 0, rightWall: 1536
            },
            atolye2: {
                file: 'Atolye2.png', charScale: 8, footOffset: -200, enemyFootOffset: -300, enemyScale: 8, leftWall: 0, rightWall: 1536,
                // Door at 132px -> 132 * 8 = 1056
                doors: [{ x: 1056, width: 200, target: 'atolye_koridor', name: 'Atölye Koridoru' }]
            },
            kat1: {
                file: 'kat1.png', charScale: 9, footOffset: -210, enemyFootOffset: -310, enemyScale: 9, leftWall: 0, rightWall: 16424, worldWidth: 16424, npcFootOffset: -200, npcs: [
                    { x: 8200, y: 0, type: 'teacher', name: 'emre_hoca' }, // Teacher drawn first = in background
                    { x: 500, y: 0, index: 0, groupId: 'k1' }, { x: 600, y: 0, index: 1, groupId: 'k1' },
                    { x: 1500, y: 0, index: 2 }, { x: 2000, y: 0, index: 3 },
                    { x: 3000, y: 0, index: 4, groupId: 'k2' }, { x: 3100, y: 0, index: 5, groupId: 'k2' }, { x: 3200, y: 0, index: 6, groupId: 'k2' },
                    { x: 4500, y: 0, index: 7 }, { x: 5000, y: 0, index: 0 },
                    { x: 6000, y: 0, index: 1, groupId: 'k3' }, { x: 6100, y: 0, index: 2, groupId: 'k3' },
                    { x: 7500, y: 0, index: 3 }, { x: 8000, y: 0, index: 4 },
                    // Cinematic Chasers
                    { x: 7950, y: 0, index: 1, id: 'runner' },
                    { x: 7850, y: 0, index: 2, id: 'chaser' },
                    // Emre Hoca Cluster (Crowd)
                    { x: 8050, y: 0, index: 0, groupId: 'ec1' },
                    { x: 8100, y: 0, index: 5, groupId: 'ec1' },
                    { x: 8140, y: 0, index: 2, groupId: 'ec1' },
                    { x: 8180, y: 0, index: 3, groupId: 'ec1' },
                    { x: 8225, y: 0, index: 1, groupId: 'ec2' },
                    { x: 8260, y: 0, index: 4, groupId: 'ec2' },
                    { x: 8300, y: 0, index: 6, groupId: 'ec2' },
                    { x: 8350, y: 0, index: 7, groupId: 'ec2' },
                    { x: 9000, y: 0, index: 5, groupId: 'k4' }, { x: 9100, y: 0, index: 6, groupId: 'k4' },
                    { x: 10500, y: 0, index: 7 }, { x: 11000, y: 0, index: 0 },
                    { x: 12000, y: 0, index: 1, groupId: 'k5' }, { x: 12100, y: 0, index: 2, groupId: 'k5' }, { x: 12200, y: 0, index: 3, groupId: 'k5' },
                    { x: 13500, y: 0, index: 4 }, { x: 14000, y: 0, index: 5 },
                    { x: 15000, y: 0, index: 6, groupId: 'k6' }, { x: 15100, y: 0, index: 7, groupId: 'k6' },
                    // Bully nearby NPCs (will flee)
                    { x: 4700, y: 0, index: 3, groupId: 'bully_crowd' },
                    { x: 4800, y: 0, index: 5, groupId: 'bully_crowd' },
                    { x: 4900, y: 0, index: 1, groupId: 'bully_crowd' }
                ]
            },
            kantin: {
                file: 'kantin.png', charScale: 5, footOffset: 130, enemyFootOffset: 130, enemyScale: 5, leftWall: 150, rightWall: 1400, npcFootOffset: 125, npcs: [
                    { x: 300, y: 0, index: 0, yOffset: 10, groupId: 'c1' }, { x: 380, y: 0, index: 1, yOffset: 10, groupId: 'c1' },
                    { x: 450, y: 0, index: 2, yOffset: 10, groupId: 'c2' }, { x: 520, y: 0, index: 3, yOffset: 10, groupId: 'c2' },
                    { x: 650, y: 0, index: 4, yOffset: 10 }, { x: 750, y: 0, index: 5, yOffset: 10 },
                    { x: 900, y: 0, index: 2, yOffset: 10, groupId: 'c3' }, { x: 980, y: 0, index: 6, yOffset: 10, groupId: 'c3' },
                    { x: 1100, y: 0, index: 7, yOffset: 10, groupId: 'c4' }, { x: 1180, y: 0, index: 0, yOffset: 10, groupId: 'c4' }, { x: 1260, y: 0, index: 1, yOffset: 10, groupId: 'c4' },
                    { x: 1350, y: 0, index: 4, yOffset: 10 }
                ]
            }
        };
    }

    async loadBackgrounds() {
        for (const [key, data] of Object.entries(this.scenes)) {
            // Load main background
            const img = await Utils.loadImage(`backgrounds/${data.file}`);
            this.backgrounds[key] = img || this.createFallbackBackground();

            // Load additional layer if specified
            if (data.layer) {
                const layerImg = await Utils.loadImage(`backgrounds/${data.layer}`);
                if (layerImg) {
                    this.overlays[key] = layerImg;
                }
            }
        }

        // Preload water layer
        this.waterLayerImg = await Utils.loadImage('backgrounds/water_layer.png');
        // Preload door layer
        this.doorLayerImg = await Utils.loadImage('backgrounds/door_layer.png');
        // Preload key layer
        this.keyLayerImg = await Utils.loadImage('backgrounds/key_layer.png');
        // Preload money layer
        this.moneyLayerImg = await Utils.loadImage('backgrounds/koridor_money_layer.png');
        // Preload corridor door layer
        this.corridorDoorLayerImg = await Utils.loadImage('backgrounds/koridor_door_layer.png');
    }

    createFallbackBackground() {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#1e1e2e');
        gradient.addColorStop(1, '#0a0a0f');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
        return canvas;
    }

    defineSceneDialogues() {
        return {
            intro1: [
                ['????', 'Bunlarda ne buluyorsunuz anlamıyorum']
            ],
            intro2: [
                ['????', 'Evet yani internet kafelerde bayağı oynardık Ama...']
            ],
            intro2_second: [
                ['????', 'Parka gelincede parkta vakit geçirirdik']
            ],
            intro3_first: [
                ['Tunahan', 'Baba bi oyun oynuyorum çok abartın ya']
            ],
            intro3_second: [
                ['baba', 'Kalk hadi gidiyoruz Akşam oldu Annen merak etmesin']
            ],
            scene_phone: [
                ['tunahan', 'Alo?'],
                ['bilinmeyen', 'Merhaba Tunahan Kuzu ile mi konuşuyorum?'],
                ['tunahan', 'E-evet...'],
                ['data koleji', 'Merhaba Tunahan Kuzu. Data Kolejine yazıldığın için gerçekten teşekkür ederiz. Biz bir soru için aradık.'],
                ['tunahan', 'Okulda diyebilirdiniz ama...'],
                ['data koleji', 'Evet, ancak telefondan konuşmak daha rahat. Ayrıca sizin güvenliğiniz için daha iyi.'],
                ['tunahan', 'Ne güvenliği?'],
                ['data koleji', 'Size bir görev vermek istiyoruz. Tabii kabul ederseniz.'],
                ['tunahan', 'Neymiş o?'],
                ['data koleji', 'Data Agents olmak istiyorsanız Uçak atölyesini incelemenizi tavsiye ederiz.'],
                ['telefon', 'Din Din Din']
            ],
            game: [
                ['tunahan', 'Allah Allah… çattık ya sabah sabah.'],
                ['Anne', 'Oğlum, uyandın mı?'],
                ['tunahan', 'Uyandım anne!'],
                ['Anne', 'Kapının yanında anahtar var, biraz da para bıraktım. Çıkarken alırsın.']
            ],
            emre_school: [
                ['Emre Hoca', 'Hadi bakalım gençler, yerleşiyoruz. Ayakta dikilmek yok.']
            ],
            emre_school_2: [
                ['Emre Hoca', 'Saf Saf hareket yapma, geç yerine.']
            ],
            emre_school_3: [
                ['Emre Hoca', 'Sen 9lardansın değilmi?']
            ],
            tunahan_reply: [
                ['tunahan', 'E-E-Evet']
            ],
            emre_school_4: [
                ['Emre Hoca', '9/E burası. Alışırsın bu okulun ortamına merak etme.']
            ],
            emre_school_5: [
                ['Emre Hoca', 'Okulumuzda sadece ders yok.']
            ],
            emre_tour_1: [
                ['Emre Hoca', 'Bilgisayar atölyesi var...']
            ],
            emre_tour_2: [
                ['Emre Hoca', 'Elektrik atölyesi var...']
            ],
            emre_tour_3: [
                ['Emre Hoca', 'Laboratuvar var...']
            ],
            emre_tour_4: [
                ['Emre Hoca', 'Merak eden girer, çalışan öğrenir.']
            ],
            emre_tour_5: [
                ['Emre Hoca', 'Sonra...'],
                ['Emre Hoca', 'Adam olur iyi maaşlı yere girer.'],
                ['Emre Hoca', 'Basit yani anlayacağınız sıkıntı çıkarmazsanız iyi yerlere gelirsiniz.'],
                ['Emre Hoca', 'Hadi dersinizi dinleyin iyi dersler.']
            ],
            headset_discovery: [
                ['BAŞARIM', 'Telsiz Kulaklık buldun!', 'assets/Telsiz_kulaklik.png'],
                ['Tunahan', 'Çalışıyordur umarım…'],
                ['Telsiz', '— Sinyal alındı.'],
                ['Tunahan', '...'],
                ['Bilinmeyen Ses', 'Merhaba. Tunahan Kuzu ile mi görüşüyorum?'],
                ['Tunahan', 'Evet… Benim.'],
                ['Data Agents', 'Merhaba Tunahan. Biz Data Agents. 9. sınıflar arasında yaptığımız arşiv kayıtlarını inceledik ve seni uygun gördük.'],
                ['Tunahan', 'Uygun… neye?'],
                ['Data Agents', 'Data Agents ekibi için. Okul içinde bizimle çalışmanı istiyoruz.'],
                ['Tunahan', 'Ne işi yapacağım ki?'],
                ['Data Agents', 'İşin basit. Okulda taşkınlık çıkaran, kuralları ihlal eden öğrencileri tespit edip öğretmenlere bildirmen.'],
                ['Tunahan', 'Gammazlık yani. Yapmam ben bunu.'],
                ['Data Agents', 'Her haklı bildirim başına 15 TL ödeme yapılır. Ancak diğer Data Agents tarafından izleneceksin. Asılsız bildirim yaparsan, bu bize raporlanır ve programdan çıkarılırsın.'],
                ['Tunahan', 'Bundan çıkarım ne ki zaten…'],
                ['Data Agents', 'Programı reddetmen durumunda, Data Koleji ile olan ilişiğin kesilecektir.'],
                ['Tunahan', 'Yani… okuldan atılacağım?'],
                ['Data Agents', 'Evet.'],
                ['Tunahan', '…T-tamam. Kabul ediyorum.'],
                ['Data Agents', 'Doğru karar.'],
                ['Data Agents', 'Eğer bir zorbayla karşılaşırsan ve öğretmeni çağırmak istersen, telsizin üzerindeki “C” tuşuna basman yeterli.'],
                ['Tunahan', ' Bu iş sandığımdan çok daha büyük…']
            ],
            bell_aftermath: [
                ['Tunahan', 'S-sınıfa Gitmeliyim İlk günden i-ilk derse geç kalamam']
            ],
            bully_yell: [
                ['Bağıran Öğrenci', 'Çekilin lan!']
            ],
            bully_approach_1: [
                ['Zorba', '— Oğlum şuna bak, suratı niye bu kadar pembe bunun?']
            ],
            bully_approach_2: [
                ['Zorba', '— Hey pembe surat, yüzün kaynar suya mı düştü?']
            ],
            bully_flashback: [
                ['Baba (uzaktan)', '— Takma kafana oğlum onları.'],
                ['Serseri (alaycı)', '— Ne bakıyon la pembe suratlı?']
            ],
            bully_return: [
                ['...', '...'] // Kept as a tiny pause for the flash/shake
            ],
            bully_taunt: [
                ['Bağıran Öğrenci', '— Ne oldu lan, donup kaldın?']
            ],
            bully_punch_prompt: [
                ['System', 'Sağa doğru vurmak için E ye bas']
            ],
            bully_hit_reaction: [
                ['Bağıran Öğrenci', '— Lan ne yapıyorsun sen?!']
            ],
            bully_telsiz: [
                ['Telsiz', '— Davranış kaydedildi.']
            ]
        };
    }

    defineDemoDialogues() {
        const base = this.defineSceneDialogues();
        // Instantiate DemoSceneManager if not already done
        const demoManager = new DemoSceneManager(this.game, this);
        const demoDialogues = demoManager.dialogues;

        // Custom Demo Dialogues Override/Addition
        const manualDemoOverrides = {
            bully_yell: [['Bağıran Öğrenci', 'Çekilin lan!']],
            bully_approach_1: [['Zorba', '— Oğlum şuna bak, suratı niye bu kadar pembe bunun?']],
            bully_hit_reaction: [['Bağıran Öğrenci', '— Lan ne yapıyorsun sen?!']],
            bully_telsiz: [['Telsiz', '— Davranış kaydedildi.']],

            // Emre Hoca Dialogues (Restored for Demo)
            emre_school: [['Emre Hoca', 'Hadi bakalım gençler, yerleşiyoruz. Ayakta dikilmek yok.']],
            emre_school_2: [['Emre Hoca', 'Saf Saf hareket yapma, geç yerine.']],
            emre_school_3: [['Emre Hoca', 'Sen 9lardansın değilmi?']],
            tunahan_reply: [['tunahan', 'E-E-Evet']],
            emre_school_4: [['Emre Hoca', '9/E burası. Alışırsın bu okulun ortamına merak etme.']],
            emre_school_5: [['Emre Hoca', 'Okulumuzda sadece ders yok.']],
            emre_tour_1: [['Emre Hoca', 'Bilgisayar atölyesi var...']],
            emre_tour_2: [['Emre Hoca', 'Elektrik atölyesi var...']],
            emre_tour_3: [['Emre Hoca', 'Laboratuvar var...']],
            emre_tour_4: [['Emre Hoca', 'Merak eden girer, çalışan öğrenir.']],
            emre_tour_5: [
                ['Emre Hoca', 'Sonra...'],
                ['Emre Hoca', 'Adam olur iyi maaşlı yere girer.'],
                ['Emre Hoca', 'Basit yani anlayacağınız sıkıntı çıkarmazsanız iyi yerlere gelirsiniz.'],
                ['Emre Hoca', 'Hadi dersinizi dinleyin iyi dersler.']
            ]
        };

        // Merge base, manual overrides, and demo manager dialogues
        return { ...base, ...manualDemoOverrides, ...demoDialogues };
    }

    update(player, keys, enemies, dt = 16) {
        // Update camera position
        const sceneData = this.scenes[this.currentScene];
        this.interactionPrompt = null; // Reset prompt each frame

        // Proximity checks for Prompts
        const isTourActive = this.currentScene === 'atolye_koridor' && !this.tourCompleted;

        if (!this.dialogue.isActive()) {
            // 1. Generic Door Prompts
            if (sceneData.doors && !isTourActive) {
                sceneData.doors.forEach(door => {
                    if (Math.abs(player.x - door.x) < (door.width / 2)) {
                        this.interactionPrompt = door.name.includes('Koridor') ?
                            `Geri dönmek için ENTER'a bas (${door.name})` :
                            `Girmek için ENTER'a bas (${door.name})`;
                    }
                });
            }

            // 2. Room Exit (Game Scene)
            if (this.currentScene === 'game') {
                const distanceToWall = Math.abs(player.x - player.maxX);
                if (distanceToWall < 50) {
                    if (this.backpackInteractionState === 'idle') {
                        this.interactionPrompt = "Çantayı incelemek için ENTER'a bas";
                    } else if (this.backpackInteractionState === 'completed' && !this.doorOpened) {
                        this.interactionPrompt = "Kapıyı açmak için ENTER'a bas";
                    } else if (this.doorOpened) {
                        this.interactionPrompt = "Geçmek için ENTER'a bas";
                    }
                }
            }

            // 3. Corridor (Key, Money, Door)
            if (this.currentScene === 'koridor') {
                const distanceToWall = Math.abs(player.x - player.maxX);
                if (distanceToWall < 50) {
                    if (!this.keyTaken) this.interactionPrompt = "Anahtarı almak için ENTER'a bas";
                    else if (!this.moneyTaken) this.interactionPrompt = "Parayı almak için ENTER'a bas";
                    else if (!this.corridorDoorOpened) this.interactionPrompt = "Kapıyı açmak için ENTER'a bas";
                }
            }

            // 4. School (Canteen)
            if (this.currentScene === 'school') {
                const distanceToLeft = player.x - sceneData.leftWall;
                if (distanceToLeft < 50) {
                    this.interactionPrompt = "Kantine girmek için ENTER'a bas";
                }
            }

            // 5. Atolye 1 (Airplane Search)
            if (this.currentScene === 'atolye1' && !this.radioHeadsetFound && !this.isDemo) {
                const distanceToWall = Math.abs(player.x - player.maxX);
                if (distanceToWall < 50) {
                    this.interactionPrompt = "Uçağı karıştırmak için ENTER'a bas";
                }
            }

            // 6. Atolye 2 (Computer Interaction)
            if (this.currentScene === 'atolye2') {
                // Check Demo Special Interaction
                if (this.isDemo && this.demoPhase >= 3) {
                    const computers = [
                        { x: 224, name: 'Soldaki Bilgisayar' },
                        { x: 528, name: 'Ortadaki Bilgisayar' },
                        { x: 736, name: 'Sağdaki Bilgisayar' }
                    ];

                    computers.forEach(pc => {
                        if (Math.abs(player.x - pc.x) < 50) {
                            this.interactionPrompt = `${pc.name} ile derse başlamak için ENTER'a bas`;
                        }
                    });
                } else {
                    // Normal interaction
                    const computers = [
                        { x: 224, name: 'Soldaki Bilgisayar' },
                        { x: 528, name: 'Ortadaki Bilgisayar' },
                        { x: 736, name: 'Sağdaki Bilgisayar' }
                    ];

                    computers.forEach(pc => {
                        if (Math.abs(player.x - pc.x) < 50) {
                            this.interactionPrompt = `${pc.name}ı açmak için ENTER'a bas`;
                        }
                    });
                }
            }
        }

        // Demo Logic - Tour Completion & Obj Tracking
        if (this.isDemo) {
            // Initialize tracking set if not exists
            if (!this.demoVisitedWorkshops) {
                this.demoVisitedWorkshops = new Set();
                this.demoPhase = this.demoPhase || 0;
            }

            // Phase 1: Start Task after Tour
            if (this.tourCompleted && this.demoPhase === 0) {
                this.demoPhase = 1;
                this.game.setCustomTask("Atölyeleri gez (0/2)");
                console.log('🎮 DEMO: Task added - Visit workshops');
            }

            // Phase 1: Tracking Visits
            if (this.demoPhase === 1) {
                let updated = false;
                if (this.currentScene === 'atolye1' && !this.demoVisitedWorkshops.has('atolye1')) {
                    this.demoVisitedWorkshops.add('atolye1');
                    updated = true;
                }
                if (this.currentScene === 'atolye2' && !this.demoVisitedWorkshops.has('atolye2')) {
                    this.demoVisitedWorkshops.add('atolye2');
                    updated = true;
                }

                if (updated) {
                    this.game.setCustomTask(`Atölyeleri gez (${this.demoVisitedWorkshops.size}/2)`);
                    if (this.demoVisitedWorkshops.size >= 2) {
                        this.demoPhase = 1.5; // Wait for audio

                        // Audio Sequence
                        const zilAudio = this.game.audio.sfx['zil_sesi'];
                        const ogrenciAudio = this.game.audio.sfx['ogrenci_zilsesisonu'];

                        if (this.game.currentMusic) {
                            this.game.currentMusic.volume = (Utils.loadSettings().musicVolume / 100) * 0.2;
                        }

                        // Helper to restore music and proceed
                        const finishSequence = () => {
                            if (this.game.currentMusic) {
                                this.game.currentMusic.volume = Utils.loadSettings().musicVolume / 100;
                            }
                            this.dialogue.start([['Tunahan', 'Olamaz ilk dersim Devre simulasyonu Ve Kodlamaydı Hemen bilgisiyar Dersine girmeliyim']]);
                            this.demoPhase = 2;
                        };

                        this.game.playSfx('zil_sesi');

                        if (zilAudio) {
                            const onZilEnd = () => {
                                zilAudio.removeEventListener('ended', onZilEnd);
                                this.game.playSfx('ogrenci_zilsesisonu');

                                if (ogrenciAudio) {
                                    const onOgrenciEnd = () => {
                                        ogrenciAudio.removeEventListener('ended', onOgrenciEnd);
                                        finishSequence();
                                    };
                                    ogrenciAudio.addEventListener('ended', onOgrenciEnd);
                                } else {
                                    finishSequence();
                                }
                            };
                            zilAudio.addEventListener('ended', onZilEnd);
                        } else {
                            finishSequence();
                        }
                    }
                }
            }

            // Phase 2 -> Phase 3 (Next Task)
            if (this.demoPhase === 2 && !this.dialogue.isActive()) {
                this.demoPhase = 3;
                this.game.setCustomTask("Bilgisayar Dersine git");
            }
        }

        // Bully punch prompt
        if (this.currentScene === 'kat1' && this.bullyPhase === 13) {
            this.interactionPrompt = "Sağa doğru vurmak için E'ye bas";
        }

        // Check for cinematic targets (e.g. Emre Hoca)
        if (this.cinematicTarget) {
            // Focal point logic
            let focalX;
            if (this.currentScene === 'kat1') {
                if (this.bullyPhase >= 1 && this.bullyPhase < 99 && this.cinematicTarget.x) {
                    // Bully cinematic focus
                    focalX = this.cinematicTarget.x;
                } else if (this.emreCinematicPhase === 7) {
                    focalX = player.x;
                } else if (this.emreCinematicPhase <= 4) {
                    focalX = (8200 + 7850) / 2;
                } else {
                    focalX = 8200;
                }
            } else if (this.currentScene === 'atolye_koridor') {
                focalX = this.cinematicTarget.x || player.x;
            } else {
                focalX = this.cinematicTarget.x || player.x;
            }

            const targetCamX = Utils.clamp(focalX - this.width / 2, 0, (sceneData.worldWidth || this.width) - this.width);
            this.cameraX += (targetCamX - this.cameraX) * 0.05; // Smooth ease

            const chaser = this.game.npcs.find(n => n.id === 'chaser');
            const runner = this.game.npcs.find(n => n.id === 'runner');

            // Phase 2: Chase Sequence
            if (this.emreCinematicPhase === 2 && runner && chaser) {
                runner.state = 'walk';
                runner.facingLeft = false;
                runner.speed = 8;

                chaser.state = 'walk';
                chaser.facingLeft = false;
                chaser.speed = 8.5;

                if (runner.x >= 8100) {
                    runner.speed = 0;
                    runner.state = 'idle';
                }
                if (chaser.x >= 8050) {
                    chaser.speed = 0;
                    chaser.state = 'idle';

                    this.emreCinematicPhase = 3;
                    this.dialogue.start(this.sceneDialogues.emre_school_2);
                    console.log('📢 Phase 2 -> Phase 3: Azer initiated');
                }
            }
            // Phase 4: Students turn back and walk away
            else if (this.emreCinematicPhase === 4 && runner && chaser) {
                runner.state = 'walk';
                runner.facingLeft = true;
                runner.speed = 3;

                chaser.state = 'walk';
                chaser.facingLeft = true;
                chaser.speed = 3;

                // Wait until they are far enough
                if (runner.x < 7700) {
                    runner.state = 'idle';
                    chaser.state = 'idle';
                    runner.speed = 0.8 + Math.random() * 0.8;
                    chaser.speed = 0.8 + Math.random() * 0.8;

                    this.emreCinematicPhase = 5;
                    console.log('📢 Phase 4 -> Phase 5: Students retreated, focusing on Emre');
                    // Phase 5 logic is just waiting for camera to settle or trigger next
                    setTimeout(() => {
                        this.emreCinematicPhase = 6;
                        this.dialogue.start(this.sceneDialogues.emre_school_3);
                    }, 1000);
                }
            }

            // Check if locked and start first dialogue
            if (this.emreCinematicPhase === 1 && Math.abs(this.cameraX - targetCamX) < 10) {
                if (!this.cinematicDialogueTriggered) {
                    this.cinematicDialogueTriggered = true;
                    this.dialogue.start(this.sceneDialogues.emre_school);
                }
            }
        } else if (sceneData && sceneData.worldWidth && sceneData.worldWidth > this.width) {
            // Camera follows player, centered on screen
            this.cameraX = player.x - this.width / 2;
            // Clamp camera to world bounds
            this.cameraX = Utils.clamp(this.cameraX, 0, sceneData.worldWidth - this.width);

            // Trigger check for Teacher logic in Kat1
            if (this.currentScene === 'kat1' && !this.emreHocaTriggered) {
                const emre = this.game.npcs.find(npc => npc instanceof TeacherNPC && npc.name === 'emre_hoca');
                if (emre) {
                    // Camera Right Edge vs Emre Left Edge
                    const cameraRight = this.cameraX + this.width;
                    const distance = emre.x - cameraRight;

                    if (distance < 100 && distance > -500) {
                        this.cinematicTarget = emre;
                        this.emreHocaTriggered = true;
                        this.emreCinematicPhase = 1; // Start phase 1
                        console.log('🎥 Locking camera on Emre Hoca (Phase 1)');
                    }
                }
            }
        } else {
            this.cameraX = 0;
        }

        // Intro cinematic
        if (this.introCinematicActive) {
            this.updateIntroCinematic(dt);
            return;
        }

        // Dialogue update
        if (this.dialogue.isActive()) {
            const wasActive = true;
            this.dialogue.update(keys);

            // Check for dialogue completion (after update)
            if (wasActive && !this.dialogue.isActive()) {
                console.log('🎬 Dialogue completed! Scene:', this.currentScene);

                // Handle Anne dialogue chaining
                if (this.waitingForAnneToFinish) {
                    this.waitingForAnneToFinish = false;
                    if (this.onAnneFinished) this.onAnneFinished();
                    return;
                }

                // INTRO1 completed -> go to INTRO2
                if (this.currentScene === 'intro1') {
                    console.log('✅ INTRO1 -> INTRO2');
                    this.changeScene('intro2', player);
                }

                // INTRO2 first dialogue completed -> wait 2s
                else if (this.currentScene === 'intro2' && !this.intro2SecondShown) {
                    console.log('✅ INTRO2 first -> waiting 2s');
                    this.intro2WaitingForSecond = true;
                    this.intro2SecondDialogueTimer = Date.now() + 2000; // 2 seconds
                }

                // INTRO2 second dialogue completed -> go to INTRO3
                else if (this.currentScene === 'intro2' && this.intro2SecondShown) {
                    console.log('✅ INTRO2 second -> INTRO3');
                    this.changeScene('intro3', player);
                }

                // INTRO3 first dialogue completed -> wait 3s
                else if (this.currentScene === 'intro3' && this.intro3FirstShown && !this.intro3SecondShown) {
                    console.log('✅ INTRO3 first -> waiting 3s');
                    this.intro3WaitingForSecond = true;
                    this.intro3SecondDialogueTimer = Date.now() + 3000; // 3 seconds
                }

                // INTRO3 second dialogue completed -> go to scene_phone
                else if (this.currentScene === 'intro3' && this.intro3SecondShown) {
                    console.log('✅ INTRO3 second -> SCENE_PHONE');
                    this.changeScene('scene_phone', player);
                    // Stop intro music and play Phone.wav
                    this.game.stopMusic();
                    this.game.playSfx('phone');
                }

                // SCENE_PHONE completed -> go to game
                else if (this.currentScene === 'scene_phone') {
                    console.log('✅ SCENE_PHONE -> GAME');
                    this.changeScene('game', player);
                    // Stop phone sound and switch to normal music
                    this.game.stopSfx('phone');
                    this.game.playMusic('normal');
                }

                // Emre Hoca dialogue phase 1 finished
                else if (this.currentScene === 'kat1' && this.emreCinematicPhase === 1) {
                    console.log('✅ Emre Hoca Phase 1 dialogue finished -> Starting Chase');
                    this.emreCinematicPhase = 2;
                }
                // Emre Hoca dialogue phase 3 finished (Azar)
                else if (this.currentScene === 'kat1' && this.emreCinematicPhase === 3) {
                    console.log('✅ Emre Hoca Phase 3 dialogue finished -> Students retreating');
                    this.emreCinematicPhase = 4;
                }
                // Emre Hoca dialogue phase 6 finished (Ask grade)
                else if (this.currentScene === 'kat1' && this.emreCinematicPhase === 6) {
                    this.emreCinematicPhase = 7;
                    this.dialogue.start(this.sceneDialogues.tunahan_reply);
                }
                // Tunahan reply finished
                else if (this.currentScene === 'kat1' && this.emreCinematicPhase === 7) {
                    this.emreCinematicPhase = 8;
                    this.dialogue.start(this.sceneDialogues.emre_school_4);
                }
                // Final Emre Hoca dialogue phase 8 (Grade info)
                else if (this.currentScene === 'kat1' && this.emreCinematicPhase === 8) {
                    this.emreCinematicPhase = 9;
                    this.dialogue.start(this.sceneDialogues.emre_school_5);
                }
                // Transition to Atolye Koridor (Immediately after bridge dialogue)
                else if (this.currentScene === 'kat1' && this.emreCinematicPhase === 9) {
                    console.log('✈️ Transitioning to Atolye Koridor');
                    this.emreCinematicPhase = 11;
                    this.changeScene('atolye_koridor', this.game.player, 'right');
                    this.tourPhase = 1;
                    this.cinematicTarget = { x: 4400 };
                }
                // Tour Progression in Atolye Koridor
                else if (this.currentScene === 'atolye_koridor') {
                    if (this.tourPhase === 1) {
                        this.tourPhase = 2; // Move to Electrical
                    } else if (this.tourPhase === 2) {
                        this.tourPhase = 3; // Move to Lab
                    } else if (this.tourPhase === 3) {
                        this.tourPhase = 4; // Move to End
                    } else if (this.tourPhase === 4) {
                        this.tourPhase = 5; // After "Merak eden girer..." start "Adam olur..."
                        this.dialogue.start(this.sceneDialogues.emre_tour_5);
                    } else if (this.tourPhase === 5) {
                        this.tourPhase = 6; // Emre leaves
                        this.tourCompleted = true; // Mark as completed permanently
                        console.log('🏃 Tour complete, Emre leaving');
                        const emre = this.game.npcs.find(n => n.id === 'emre_guide');
                        if (emre) {
                            emre.state = 'walk';
                            emre.facingLeft = false;
                            emre.speed = 4;
                            emre.leaving = true;
                        }
                        this.cinematicTarget = null; // Release player/camera

                        // Release students to wander freely
                        const students = this.game.npcs.filter(n => n.groupId === 'tour_group');
                        students.forEach(s => {
                            s.groupId = null; // Remove group constraint
                            s.speed = 0.8 + Math.random() * 1.2; // Wider speed range

                            // Break uniformity
                            s.facingLeft = Math.random() < 0.5;
                            s.state = Math.random() < 0.5 ? 'walk' : 'idle';

                            // Re-roll personality traits to ensure diversity even if they were created identically
                            s.laziness = 0.002 + Math.random() * 0.02; // 0.2% - 2.2% chance to stop
                            s.restlessness = 0.005 + Math.random() * 0.03; // 0.5% - 3.5% chance to start

                            // Randomize animation frame to desync legs
                            s.frameIndex = Math.random() * 4;
                        });
                        console.log('🔓 Students released to wander.');
                    }
                }

                // Headset discovery dialogue finished
                else if (this.currentScene === 'atolye1' && this.radioHeadsetFound && !this.headsetDialogueFinished) {
                    this.headsetDialogueFinished = true;
                    console.log('✅ Headset dialogue finished. Ready for bell sound on exit.');
                }

                // ===== BULLY CINEMATIC DIALOGUE COMPLETIONS =====
                // Phase 2: Bully yelled -> NPCs flee
                else if (this.currentScene === 'kat1' && this.bullyPhase === 2) {
                    this.bullyPhase = 3;
                    this.bullyTimer = 0;
                    console.log('📢 Bully yelled -> NPCs fleeing');
                    // Make bully_crowd NPCs run away
                    const crowdNpcs = this.game.npcs.filter(n => n.groupId === 'bully_crowd');
                    crowdNpcs.forEach(s => {
                        s.state = 'walk';
                        s.facingLeft = true; // Run left away from bully
                        s.speed = 6;
                        s.groupId = null;
                    });
                }
                // Phase 6: First bully dialogue done -> second dialogue + tinnitus
                else if (this.currentScene === 'kat1' && this.bullyPhase === 6) {
                    this.bullyPhase = 7;
                    this.bullyTimer = 0;
                    console.log('📢 Bully approach 1 done -> approach 2');
                    // Start tinnitus sound (procedural)
                    this.game.playTinnitus(0.05); // Start very quiet
                    this.dialogue.start(this.sceneDialogues.bully_approach_2);
                }
                // Phase 7: Second bully dialogue done -> white flash + trauma
                else if (this.currentScene === 'kat1' && this.bullyPhase === 7) {
                    this.bullyPhase = 8;
                    this.bullyTimer = 0;
                    this.bullyFlashAlpha = 1.0; // White flash
                    console.log('📢 Bully approach 2 done -> flashback sequence');
                }
                // Phase 9: Pink screen + flashback dialogues done -> return to present
                else if (this.currentScene === 'kat1' && this.bullyPhase === 9) {
                    this.bullyPhase = 10;
                    this.bullyTimer = 0;
                    this.bullyShake = 25; // Stronger screen shake
                    this.bullyFlashAlpha = 1.0; // White flash on return
                    this.bullyPinkAlpha = 0; // Remove pink
                    console.log('📢 Flashback done -> Triggering flash/shake -> Return to present');
                    this.dialogue.start(this.sceneDialogues.bully_return);
                }
                // Phase 10: Return narration done -> bully taunt
                else if (this.currentScene === 'kat1' && this.bullyPhase === 10) {
                    this.bullyPhase = 11;
                    this.bullyTimer = 0;
                    this.bullyShake = 0; // Stop shaking on taunt
                    this.bullyFlashAlpha = 0; // Clear flash on taunt
                    // Note: tinnitus NOT stopped here anymore, it continues until punch
                    console.log('📢 Return done -> bully taunt (Tinnitus persists, effects cleared)');
                    this.dialogue.start(this.sceneDialogues.bully_taunt);
                }
                // Phase 11: Bully taunt done -> punch prompt
                else if (this.currentScene === 'kat1' && this.bullyPhase === 11) {
                    this.bullyPhase = 12;
                    this.bullyTimer = 0;
                    this.cinematicTarget = null; // Release camera back to player
                    console.log('📢 Taunt done -> punch prompt');
                    this.dialogue.start(this.sceneDialogues.bully_punch_prompt);
                }
                // Phase 12: Punch prompt done -> waiting for E key
                else if (this.currentScene === 'kat1' && this.bullyPhase === 12) {
                    this.bullyPhase = 13;
                    this.bullyTimer = 0;
                    console.log('📢 Punch prompt shown -> waiting for E key');
                }
                // Phase 14: Hit reaction done -> bully leaves
                else if (this.currentScene === 'kat1' && this.bullyPhase === 14) {
                    this.bullyPhase = 15;
                    this.bullyTimer = 0;
                    console.log('📢 Hit reaction done -> bully leaving');
                    // Make bully walk away
                    const bully = this.game.enemies.find(e => e.isBully);
                    if (bully) {
                        bully.speed = 4;
                        bully.facingLeft = false; // Walk right (away)
                        bully.state = 'walk';
                        bully.bullyLeaving = true;
                        bully.invulnerable = true; // Can't be hit anymore
                    }
                }
                // Phase 16: Telsiz done -> complete
                else if (this.currentScene === 'kat1' && this.bullyPhase === 16) {
                    this.bullyPhase = 99;
                    console.log('✅ Bully cinematic complete!');
                }
            }

            return;
        }


        // ... existing cinematic logic ...
        if (this.currentScene === 'atolye_koridor' && this.tourPhase >= 1 && this.tourPhase < 6) {
            // Keep NPCs and Player moving left together
            const tourSpeed = 3;
            const emre = this.game.npcs.find(n => n.id === 'emre_guide');
            const students = this.game.npcs.filter(n => n.groupId === 'tour_group');
            const player = this.game.player;

            if (emre && !this.dialogue.isActive()) {
                emre.x -= tourSpeed;
                emre.state = 'walk';
                emre.facingLeft = true;
                emre.speed = 0;

                students.forEach(s => {
                    s.x -= tourSpeed;
                    s.state = 'walk';
                    s.facingLeft = true;
                    s.speed = 0;
                });

                // Position player BEHIND the group (mesafe olsun)
                const lastStudent = students[students.length - 1];
                if (lastStudent) {
                    player.x = lastStudent.x + 350; // Follow at 350 units distance
                } else {
                    player.x -= tourSpeed;
                }

                player.moving = true;
                player.facing_left = true;

                // Update camera target to center on the moving group
                this.cinematicTarget = { x: emre.x - 200 }; // Slightly offset to see the line better

                // Trigger dialogues based on position
                if (this.tourPhase === 1 && emre.x < 3500) {
                    this.dialogue.start(this.sceneDialogues.emre_tour_1);
                } else if (this.tourPhase === 2 && emre.x < 2500) {
                    this.dialogue.start(this.sceneDialogues.emre_tour_2);
                } else if (this.tourPhase === 3 && emre.x < 1500) {
                    this.dialogue.start(this.sceneDialogues.emre_tour_3);
                } else if (this.tourPhase === 4 && emre.x < 600) {
                    this.dialogue.start(this.sceneDialogues.emre_tour_4);
                }
            } else if (emre) {
                // Pause movement during dialogue
                emre.state = 'idle';
                students.forEach(s => s.state = 'idle');
                player.moving = false;
            }
        }

        // Emre removal logic
        if (this.currentScene === 'atolye_koridor') {
            const emre = this.game.npcs.find(n => n.id === 'emre_guide');
            if (emre && emre.leaving) {
                // Check if off screen
                if (emre.x > 4600) {
                    this.game.npcs = this.game.npcs.filter(n => n.id !== 'emre_guide');
                    console.log('👋 Emre Hoca has left the scene.');
                }
            }
        }

        // ===== BULLY CINEMATIC STATE MACHINE =====
        if (this.currentScene === 'kat1' && this.bullyPhase > 0 && this.bullyPhase < 99) {
            this.bullyTimer += dt;

            // Phase 1: Camera panning to bully at world center (~4800)
            if (this.bullyPhase === 1) {
                if (this.bullyTimer > 1500) {
                    // Start bully yell dialogue
                    this.bullyPhase = 2;
                    this.bullyTimer = 0;
                    this.dialogue.start(this.sceneDialogues.bully_yell);
                    console.log('📢 Phase 1 -> Phase 2: Bully yelling');
                }
            }

            // Phase 3: NPCs fleeing, wait a bit then return camera
            if (this.bullyPhase === 3) {
                if (this.bullyTimer > 2000) {
                    this.bullyPhase = 4;
                    this.bullyTimer = 0;
                    this.cinematicTarget = null; // Release camera
                    console.log('📢 Phase 3 -> Phase 4: Camera returning to player');
                }
            }

            // Phase 4: Camera returning, wait for it to settle
            if (this.bullyPhase === 4) {
                if (this.bullyTimer > 1000) {
                    this.bullyPhase = 5;
                    this.bullyTimer = 0;
                    console.log('📢 Phase 4 -> Phase 5: Task active - Zorbayı durdur');
                }
            }

            // Phase 5: Task active, waiting for player to approach bully
            if (this.bullyPhase === 5 && !this.dialogue.isActive()) {
                const bully = this.game.enemies.find(e => e.isBully);
                if (bully) {
                    const dist = Math.abs(player.x - bully.x);
                    if (dist < 400) {
                        this.bullyPhase = 6;
                        this.bullyTimer = 0;
                        this.cinematicTarget = { x: bully.x };
                        // Start quiet tinnitus
                        this.game.playTinnitus(0.03);
                        this.dialogue.start(this.sceneDialogues.bully_approach_1);
                        console.log('📢 Phase 5 -> Phase 6: Player approached bully');
                    }
                }
            }

            // Phase 8: Flashback sequence (white flash -> trauma -> white flash -> pink)
            if (this.bullyPhase === 8) {
                const t = this.bullyTimer;

                // Increase tinnitus volume
                if (this.game.tinnitusGain) {
                    const targetVol = Math.min(0.8, 0.05 + t / 2000);
                    this.game.tinnitusGain.gain.cancelScheduledValues(this.game.audioContext.currentTime);
                    this.game.tinnitusGain.gain.setValueAtTime(targetVol, this.game.audioContext.currentTime);
                }

                if (t < 100) {
                    // White flash 1 (0-100ms)
                    this.bullyFlashAlpha = 1.0;
                    this.bullyTraumaAlpha = 0;
                } else if (t < 400) {
                    // Trauma image (100-400ms = 300ms)
                    this.bullyFlashAlpha = 0;
                    this.bullyTraumaAlpha = 1.0;
                } else if (t < 500) {
                    // White flash 2 (400-500ms)
                    this.bullyTraumaAlpha = 0;
                    this.bullyFlashAlpha = 1.0;
                } else {
                    // Pink screen + dialogue
                    this.bullyFlashAlpha = 0;
                    this.bullyPinkAlpha = 1.0;
                    this.bullyPhase = 9;
                    this.bullyTimer = 0;
                    this.dialogue.start(this.sceneDialogues.bully_flashback);
                    console.log('📢 Phase 8 -> Phase 9: Pink screen + flashback dialogue');
                }
            }

            // Phase 13: Waiting for E key punch
            // (Handled in game.js trigger on damage)
            if (this.bullyPhase === 13 && !this.dialogue.isActive()) {
                // Just waiting for the hit registered in Game.update
            }

            // Phase 15: Bully walking away
            if (this.bullyPhase === 15) {
                const bully = this.game.enemies.find(e => e.isBully);
                if (bully) {
                    bully.x += 4; // Walk right
                    // Check if off camera
                    if (bully.x > this.cameraX + this.width + 200) {
                        // Remove bully
                        this.game.enemies = this.game.enemies.filter(e => !e.isBully);
                        this.bullyPhase = 16;
                        this.bullyTimer = 0;
                        this.dialogue.start(this.sceneDialogues.bully_telsiz);
                        console.log('📢 Bully left -> Telsiz');
                    }
                }
            }

            // Decay screen shake
            if (this.bullyShake > 0) {
                this.bullyShake *= 0.95;
                if (this.bullyShake < 0.5) this.bullyShake = 0;
            }
        }

        // Bully trigger: when entering kat1 from atolye_koridor after bell quest
        if (this.currentScene === 'kat1' && this.zilSesiPlayed && !this.bullyTriggered && this.bullyPhase === 0) {
            this.bullyTriggered = true;
            this.bullyPhase = 1;
            this.bullyTimer = 0;

            // Spawn a bully enemy at kat1 center (~4800)
            const sceneData = this.scenes['kat1'];
            const bullyY = this.height - 100 - sceneData.enemyFootOffset;
            const bully = new Enemy(4800, bullyY, sceneData.enemyScale, sceneData.worldWidth, this.height, 0);
            bully.isBully = true;
            bully.speed = 0;
            bully.state = 'idle';
            this.game.enemies.push(bully);

            // Lock camera to bully
            this.cinematicTarget = { x: 4800 };
            console.log('🎬 Bully cinematic started!');
        }

        // INTRO2: Show second dialogue after 2s
        if (this.currentScene === 'intro2' && this.intro2WaitingForSecond && !this.intro2SecondShown) {
            if (Date.now() >= this.intro2SecondDialogueTimer) {
                this.intro2WaitingForSecond = false;
                this.intro2SecondShown = true;
                this.dialogue.start(this.sceneDialogues.intro2_second);
                console.log('📢 INTRO2 second dialogue started');
            }
        }

        // INTRO3: Show first dialogue after 1s
        if (this.currentScene === 'intro3' && this.intro3WaitingForFirst && !this.intro3FirstShown) {
            if (!this.intro3StartTime) {
                this.intro3StartTime = Date.now();
            }
            if (Date.now() >= this.intro3StartTime + 1000) { // 1 second
                this.intro3WaitingForFirst = false;
                this.intro3FirstShown = true;
                this.dialogue.start(this.sceneDialogues.intro3_first);
                console.log('📢 INTRO3 first dialogue started');
            }
        }

        // INTRO3: Show second dialogue after 3s
        if (this.currentScene === 'intro3' && this.intro3WaitingForSecond && !this.intro3SecondShown) {
            if (Date.now() >= this.intro3SecondDialogueTimer) {
                this.intro3WaitingForSecond = false;
                this.intro3SecondShown = true;
                this.dialogue.start(this.sceneDialogues.intro3_second);
                console.log('📢 INTRO3 second dialogue started');
            }
        }

        // Initial dialogues
        if (this.currentScene === 'intro1' && !this.dialogueTriggered.has('intro1')) {
            this.dialogue.start(this.sceneDialogues.intro1);
            this.dialogueTriggered.add('intro1');
        }

        if (this.currentScene === 'intro2' && !this.dialogueTriggered.has('intro2')) {
            this.dialogue.start(this.sceneDialogues.intro2);
            this.dialogueTriggered.add('intro2');
        }

        // SCENE_PHONE: Wait 2s before showing dialogue
        if (this.currentScene === 'scene_phone' && this.scenePhoneWaiting && !this.scenePhoneDialogueShown) {
            if (!this.scenePhoneDelayTimer) {
                this.scenePhoneDelayTimer = Date.now();
            }
            if (Date.now() >= this.scenePhoneDelayTimer + 2000) { // 2 seconds
                this.scenePhoneWaiting = false;
                this.scenePhoneDialogueShown = true;
                this.dialogue.start(this.sceneDialogues.scene_phone);
                this.dialogueTriggered.add('scene_phone');
                console.log('📢 SCENE_PHONE dialogue started after 2s delay');
            }
        }

        if (this.currentScene === 'game' && !this.dialogueTriggered.has('game')) {
            this.dialogue.start(this.sceneDialogues.game);
            this.dialogueTriggered.add('game');
        }

        // Backpack/Wall Interaction in Game Scene
        if (this.currentScene === 'game' && !this.dialogue.isActive()) {
            this.currentPlayerRef = player; // Store reference for interaction callbacks
            const distanceToWall = Math.abs(player.x - player.maxX);

            if (distanceToWall < 50 && keys['Enter']) {
                keys['Enter'] = false;

                if (this.backpackInteractionState === 'idle') {
                    this.startBackpackInteraction();
                } else if (this.backpackInteractionState === 'completed' && !this.doorOpened) {
                    this.startDoorInteraction();
                }
            }

            // Transition from game to koridor
            if (this.doorOpened && player.x > this.width - 60) {
                console.log('🚪 Entering Corridor...');
                this.changeScene('koridor', player, 'left');
            }
        }

        // Generic Door Interaction
        const coolingDown = this.interactionCooldown && Date.now() < this.interactionCooldown;
        if (!this.dialogue.isActive() && sceneData.doors && !coolingDown && !isTourActive) {
            sceneData.doors.forEach(door => {
                if (Math.abs(player.x - door.x) < (door.width / 2) && keys['Enter']) {
                    keys['Enter'] = false;
                    console.log(`🚪 Passing through to ${door.target}...`);

                    // Special logic: Return from workshops to exact door position
                    let spawnPos = 'left';
                    if (door.target === 'atolye_koridor') {
                        if (this.currentScene === 'atolye1') spawnPos = 420;
                        else if (this.currentScene === 'atolye2') spawnPos = 2740;
                    }

                    this.changeScene(door.target, player, spawnPos);
                }
            });
        }

        // Workshops Return Logic
        if (this.currentScene === 'atolye1' && player.x < 60) {
            console.log('🚪 Returning to Koridor from Atolye 1...');

            // Bell sound logic after headset discovery
            if (this.headsetDialogueFinished && !this.zilSesiPlayed) {
                this.zilSesiPlayed = true;

                // Lower music volume (Duck)
                if (this.game.currentMusic) {
                    this.game.currentMusic.volume = (Utils.loadSettings().musicVolume / 100) * 0.2; // 20%
                }

                this.game.playSfx('zil_sesi');
                const zilAudio = this.game.audio.sfx['zil_sesi'];

                if (zilAudio) {
                    const playEndSound = () => {
                        this.game.playSfx('ogrenci_zilsesisonu');
                        zilAudio.removeEventListener('ended', playEndSound);

                        // Restore music volume after second sound
                        const endAudio = this.game.audio.sfx['ogrenci_zilsesisonu'];
                        if (endAudio) {
                            const restoreMusic = () => {
                                if (this.game.currentMusic) {
                                    this.game.currentMusic.volume = Utils.loadSettings().musicVolume / 100;
                                }
                                endAudio.removeEventListener('ended', restoreMusic);

                                // Trigger Tunahan's realization dialogue
                                this.dialogue.start(this.sceneDialogues.bell_aftermath);
                            };
                            endAudio.addEventListener('ended', restoreMusic);
                        }
                    };
                    zilAudio.addEventListener('ended', playEndSound);
                }
            }

            this.changeScene('atolye_koridor', player, 420);
        }

        // Atolye 2 Auto-Exit (Walking Left)
        if (this.currentScene === 'atolye2' && player.x < 60) {
            console.log('🚪 Returning to Koridor from Atolye 2...');
            this.changeScene('atolye_koridor', player, 2740);
        }

        // Atolye 2 Computer Interaction
        if (this.currentScene === 'atolye2' && !this.dialogue.isActive() && !coolingDown) {
            const computers = [224, 528, 736];
            computers.forEach(pcX => {
                if (Math.abs(player.x - pcX) < 50 && keys['Enter']) {
                    keys['Enter'] = false;

                    if (this.isDemo && this.demoPhase === 3) {
                        console.log('💻 Demo: Starting first lecture...');
                        this.game.showSubtitle("Merhaba öğrenciler, bugün ilk dersimiz led yakmak", 5000);
                        this.demoPhase = 4;
                        this.game.clearCustomTask();

                        if (this.game.computer) {
                            this.game.computer.open();
                            setTimeout(() => {
                                this.game.computer.openApp('voltsim');
                                setTimeout(() => {
                                    this.game.computer.startTutorial();
                                }, 1000); // Wait for VoltSim to visually load
                            }, 800);
                        }
                    } else {
                        console.log('💻 Opening computer...');
                        if (this.game.computer) {
                            this.game.computer.open();
                        }
                    }
                }
            });
        }

        // Atolye 1 Airplane Search Interaction
        if (this.currentScene === 'atolye1' && !this.radioHeadsetFound && !this.isDemo && !this.dialogue.isActive()) {
            const distanceToWall = Math.abs(player.x - player.maxX);
            if (distanceToWall < 50 && keys['Enter']) {
                keys['Enter'] = false;
                this.radioHeadsetFound = true;
                console.log('🎧 Radio Headset found!');
                this.dialogue.start(this.sceneDialogues.headset_discovery);
            }
        }

        // Key Interaction in Corridor Scene
        if (this.currentScene === 'koridor' && !this.dialogue.isActive()) {
            this.currentPlayerRef = player;
            const distanceToWall = Math.abs(player.x - player.maxX);

            if (distanceToWall < 50 && keys['Enter']) {
                keys['Enter'] = false;
                if (!this.keyTaken) {
                    this.startKeyInteraction();
                } else if (!this.moneyTaken) {
                    this.startMoneyInteraction();
                } else if (!this.corridorDoorOpened) {
                    this.startCorridorDoorInteraction();
                }
            }

            // Transition from koridor to outside
            if (this.corridorDoorOpened && player.x > 2720) {
                console.log('🌳 Entering Outside...');
                // Reverted: Walk Right in Koridor -> Start Right in Outside -> Walk Left
                this.changeScene('outside', player, 'right');
            }
        }

        // Outside Scene Transition
        if (this.currentScene === 'outside' && !this.dialogue.isActive()) {
            if (player.x < 60) {
                console.log('🛣️ Entering School...');
                this.changeScene('school', player, 'right');
            }
        }

        // School Scene Interaction
        if (this.currentScene === 'school' && !this.dialogue.isActive()) {
            const sceneData = this.scenes['school'];

            // Canteen interaction (existing)
            const distanceToLeft = player.x - sceneData.leftWall;
            if (distanceToLeft < 50 && keys['Enter']) {
                keys['Enter'] = false;
                this.startCanteenInteraction();
            }

            // Transition: School -> Outside (Walking Right)
            // If player walks all the way to the right end of the school grounds
            if (player.x > sceneData.worldWidth - 100) {
                console.log('🛣️ Returning to Outside...');
                this.changeScene('outside', player, 'left');
            }

            // Transition: School -> Kantin (Walking Left)
            if (player.x < 60) {
                console.log('🍔 Entering Kantin...');
                this.changeScene('kantin', player, 'center');
            }
        }


        // Kantin Scene Interaction
        if (this.currentScene === 'kantin' && !this.dialogue.isActive()) {
            // Check right wall interaction for exit options
            const distanceToRight = Math.abs(player.x - 1400); // Check strictly against the limit user just set (1400)

            // Using a slightly wider range for interaction detection or reusing Enter key approach
            // Since user asked for "gidince", I will trigger it when walking into the wall (like normal transitions) 
            // BUT since it's a menu, maybe better to check if x > 1350

            if (player.x > 1350) {
                // Push player back slightly to avoid re-triggering immediately after dialogue loop if they stay there
                player.x = 1340;
                this.startKantinExitInteraction();
            }
        }

        // Atolye Koridor Right Exit
        if (this.currentScene === 'atolye_koridor' && !this.dialogue.isActive() && !this.cinematicTarget) {
            if (player.x > 4480) {
                player.x = 4470;
                this.startAtolyeKoridorExitInteraction();
            }
        }
    }

    startKantinExitInteraction() {
        this.dialogue.ask('System', 'Nereye gideceksin?', (answer) => {
            if (answer === 'kat 1') {
                console.log('🏢 Going to Kat 1...');
                this.changeScene('kat1', this.game.player, 'left');
            } else if (answer === 'atolye katı') { // Lowercase check
                console.log('🔨 Going to Atolye...');
                this.changeScene('atolye_koridor', this.game.player, 'left');
            } else if (answer === 'giriş katı') {
                console.log('🚫 Giriş katı dysfunctional');
                // Optional: Show a message that it's closed?
                this.dialogue.start([['System', 'Giriş katı şu an kilitli.']]);
            }
        }, ['Kat 1', 'Giriş katı', 'Atolye katı']);
    }

    startAtolyeKoridorExitInteraction() {
        this.dialogue.ask('System', 'Nereye gideceksin?', (answer) => {
            if (answer === 'kat 1') {
                console.log('🏢 Transitioning to Kat 1...');
                this.changeScene('kat1', this.game.player, 'left');
            } else if (answer === 'kantin') {
                console.log('🍔 Transitioning to Kantin...');
                this.changeScene('kantin', this.game.player, 'center');
            } else if (answer === 'giriş kat') {
                console.log('🚫 Giriş Kat kilitli.');
                this.dialogue.start([['System', 'Giriş kat şu an kilitli.']]);
            }
        }, ['Kat 1', 'Kantin', 'Giriş kat']);
    }

    startCanteenInteraction() {
        this.dialogue.ask('System', 'Kantine girecek misin?', (answer) => {
            if (answer === 'evet') {
                console.log('🍔 Entering Canteen...');
                // Manually trigger transition
                this.changeScene('kantin', this.game.player, 'right');
            }
        });
    }

    startCorridorDoorInteraction() {
        this.dialogue.ask('System', 'Kapıyı açıcak mısın?', (answer) => {
            if (answer === 'evet') {
                this.handleCorridorDoorYes();
            }
        });
    }

    handleCorridorDoorYes() {
        this.corridorDoorOpened = true;
        const koridorScene = this.scenes['koridor'];
        koridorScene.rightWall = 2800; // Allow walking out
        if (this.currentPlayerRef) {
            this.currentPlayerRef.maxX = 2800;
        }
        console.log('🚪 Corridor transition door opened!');
    }

    startKeyInteraction() {
        this.dialogue.ask('System', 'Anahtarı alıcak mısın?', (answer) => {
            if (answer === 'evet') {
                this.handleKeyYes();
            }
        });
    }

    handleKeyYes() {
        this.keyTaken = true;
        // Boundary stays at 2500 until money is taken (or according to User's previous manual edit)
        if (this.currentPlayerRef) {
            this.currentPlayerRef.maxX = 2500;
        }
        console.log('🔑 Key taken!');
    }

    startMoneyInteraction() {
        this.dialogue.ask('System', '15 TL alıcak mısın?', (answer) => {
            if (answer === 'evet') {
                this.handleMoneyYes();
            }
        });
    }

    handleMoneyYes() {
        this.moneyTaken = true;
        const koridorScene = this.scenes['koridor'];
        koridorScene.rightWall = 2720;
        if (this.currentPlayerRef) {
            this.currentPlayerRef.maxX = 2720;
        }
        console.log(' Money taken! Wall moved to 2720.');
    }

    startDoorInteraction() {
        this.dialogue.ask('System', 'Kapıyı açıcak mısın?', (answer) => {
            if (answer === 'evet') {
                this.handleDoorYes();
            }
        });
    }

    handleDoorYes() {
        this.doorOpened = true;
        const gameScene = this.scenes['game'];
        gameScene.rightWall = this.width + 100; // Totally removed
        if (this.currentPlayerRef) {
            this.currentPlayerRef.maxX = this.width + 100;
        }
        console.log('🚪 Door opened! Wall removed.');
    }

    startBackpackInteraction() {
        this.backpackInteractionState = 'waiting_backpack';
        this.dialogue.ask('System', 'Çantayı alıcak mısın?', (answer) => {
            if (answer === 'evet') {
                this.handleBackpackYes();
            } else {
                this.resetBackpackQuest();
            }
        });
    }

    handleBackpackYes() {
        this.backpackTaken = true;
        // The user says "çantayı alırsa water_layer gelsin"
        console.log('🎒 Backpack taken!');

        const nextStep = () => {
            this.backpackInteractionState = 'waiting_water';
            this.dialogue.ask('System', 'Ve Suyu alıcak mısın?', (answer) => {
                if (answer === 'evet') {
                    this.handleWaterYes();
                } else {
                    this.resetBackpackQuest();
                }
            });
        };

        if (!this.backpackDialoguesSeen) {
            // Show Anne dialogue only once
            this.backpackDialoguesSeen = true;
            this.dialogue.start([
                ['Tunahan', 'Anne, suyu niye koydun?'],
                ['Anne', '##### yanında içersin diye koydum!']
            ]);
            // Chain to water question after Anne's dialogue finishes
            // We need a way to detect when THIS specific dialogue finished.
            // A simple way is to use a temporary flag.
            this.waitingForAnneToFinish = true;
            this.onAnneFinished = nextStep;
        } else {
            nextStep();
        }
    }

    handleWaterYes() {
        this.waterTaken = true;
        this.backpackInteractionState = 'completed';
        const gameScene = this.scenes['game'];
        gameScene.rightWall = 1436;
        if (this.currentPlayerRef) {
            this.currentPlayerRef.maxX = 1436;
        }
        console.log('🚰 Water taken! Wall moved to 1436.');
    }

    resetBackpackQuest() {
        console.log('🔄 Quest reset/refused.');
        this.backpackInteractionState = 'idle';
        this.backpackTaken = false;
        this.waterTaken = false;
        // "her şey geriye alınsın" - reset any visual/wall changes if they occurred
        const gameScene = this.scenes['game'];
        gameScene.rightWall = 1000;
        if (this.currentPlayerRef) {
            this.currentPlayerRef.maxX = 1000;
        }
    }

    updateIntroCinematic(dt) {
        this.introCinematicTimer += dt;

        if (this.introCinematicPhase === 0) {
            // Phase 0: Black screen for 3 seconds
            this.dateTextAlpha = 0;
            if (this.introCinematicTimer >= 3000) {
                this.introCinematicPhase = 1;
                this.introCinematicTimer = 0;
                console.log('🎬 Intro: Phase 0 complete -> Fading in text');
            }
        } else if (this.introCinematicPhase === 1) {
            // Phase 1: Fade in text (0.5s)
            this.dateTextAlpha = Math.min(1.0, this.introCinematicTimer / 500);
            if (this.introCinematicTimer >= 500) {
                this.introCinematicPhase = 2;
                this.introCinematicTimer = 0;
                this.dateTextAlpha = 1.0;
                console.log('🎬 Intro: Phase 1 complete -> Showing text');
            }
        } else if (this.introCinematicPhase === 2) {
            // Phase 2: Show date text for 2 seconds
            this.dateTextAlpha = 1.0;
            if (this.introCinematicTimer >= 2000) {
                this.introCinematicPhase = 3;
                this.introCinematicTimer = 0;
                console.log('🎬 Intro: Phase 2 complete -> Fading out text');
            }
        } else if (this.introCinematicPhase === 3) {
            // Phase 3: Fade out text (0.5s)
            this.dateTextAlpha = Math.max(0, 1.0 - (this.introCinematicTimer / 500));
            if (this.introCinematicTimer >= 500) {
                this.introCinematicPhase = 4;
                this.introCinematicTimer = 0;
                this.dateTextAlpha = 0;
                console.log('🎬 Intro: Phase 3 complete -> Final black screen');
            }
        } else if (this.introCinematicPhase === 4) {
            // Phase 4: Final black screen for 1 second
            this.dateTextAlpha = 0;
            if (this.introCinematicTimer >= 1000) {
                this.introCinematicActive = false;
                console.log('🎬 Intro cinematic complete! Starting game dialogues.');
            }
        }
    }

    changeScene(sceneName, player, spawnSide = null) {
        if (!this.scenes[sceneName]) return;

        // Clear inputs to prevent sticky keys triggering immediate interactions
        if (this.game) {
            this.game.keys['Enter'] = false;
            this.game.keys['e'] = false;
            this.game.keys['E'] = false;
        }

        // Set interaction cooldown
        this.interactionCooldown = Date.now() + 500;

        this.currentScene = sceneName;
        const sceneData = this.scenes[sceneName];

        // Update player position
        if (player) {
            const worldW = sceneData.worldWidth || this.width;

            if (spawnSide === 'left') {
                player.x = 100; // Increased to avoid immediate re-trigger of left-side exits
            } else if (spawnSide === 'center') {
                player.x = worldW / 2;
            } else if (spawnSide === 'right') {
                player.x = worldW - 100; // Spawn near the end of the world
                if (player.startRightInputReversal) {
                    player.startRightInputReversal();
                }
            } else if (typeof spawnSide === 'number') {
                player.x = spawnSide;
            } else {
                player.x = 100; // Default: spawn on left
            }

            // Update player Y based on foot offset
            player.y = this.height - 100 - sceneData.footOffset;

            // Update player scale
            player.scale = sceneData.charScale;

            // Update player boundaries (Invisible walls)
            player.minX = sceneData.leftWall !== undefined ? sceneData.leftWall : 0;
            player.maxX = sceneData.rightWall !== undefined ? sceneData.rightWall : worldW;
        }

        // Reset intro3 timer when entering intro3
        if (sceneName === 'intro3') {
            this.intro3StartTime = 0;
        }

        // Handle specific music transitions
        if (sceneName === 'outside') {
            console.log('🎵 Fading out for outside scene...');
            this.game.fadeMusic('wind', 1000); // 1 second fade
        }

        console.log(`🎬 Changed to ${sceneName}`);

        // Spawn NPCs for the scene
        this.game.npcs = [];
        if (sceneData.npcs) {
            const worldW = sceneData.worldWidth || this.width;
            const npcY = this.height - 100 - (sceneData.npcFootOffset ?? sceneData.footOffset);
            const groups = {};

            // Filter out tour members if tour is completed
            const npcsToSpawn = sceneData.npcs.filter(npcData => {
                if (this.tourCompleted && (npcData.id === 'emre_guide' || npcData.groupId === 'tour_group')) {
                    return false;
                }
                return true;
            });

            npcsToSpawn.forEach(npcData => {
                let npc;
                if (npcData.type === 'teacher') {
                    // Special spawn for Teacher
                    npc = new TeacherNPC(
                        npcData.x,
                        npcY,
                        npcData.name, // 'emre_hoca'
                        sceneData.charScale,
                        worldW,
                        this.height,
                        npcData.yOffset || 0
                    );
                } else {
                    npc = new NPC(
                        npcData.x,
                        npcY,
                        npcData.index,
                        sceneData.charScale,
                        worldW,
                        this.height,
                        npcData.yOffset || 0
                    );
                }

                if (npcData.id) {
                    npc.id = npcData.id;
                    // Cinematic NPCs should wait idling and face right (down the corridor)
                    if (npc.id === 'runner' || npc.id === 'chaser') {
                        npc.state = 'idle';
                        npc.facingLeft = false;
                    }
                }

                // Group behavior: link follower to leader
                if (npcData.groupId) {
                    npc.groupId = npcData.groupId;
                    if (!groups[npcData.groupId]) {
                        groups[npcData.groupId] = npc; // First one in list becomes group leader
                    } else {
                        npc.leader = groups[npcData.groupId];
                    }
                }

                // Conveyor behavior (Always move left, wrap around)
                if (sceneData.moveLeft || npcData.moveLeft) {
                    npc.moveOnlyLeft = true;
                    npc.facingLeft = true;
                }
                if (sceneData.wrap || npcData.wrap) {
                    npc.wrapAround = true;
                }

                this.game.npcs.push(npc);
            });
            console.log(`🧍 Spawned ${this.game.npcs.length} NPCs in ${sceneName}`);
        }
    }

    getCharScale() {
        return this.scenes[this.currentScene]?.charScale || 4;
    }

    getFootOffset() {
        return this.scenes[this.currentScene]?.footOffset || -130;
    }

    getEnemyScale() {
        return this.scenes[this.currentScene]?.enemyScale || 3;
    }

    getEnemyFootOffset() {
        return this.scenes[this.currentScene]?.enemyFootOffset || -115;
    }

    draw() {
        const sceneData = this.scenes[this.currentScene];
        const scale = 8; // Pixel art scaling factor (1024 / 128)

        // Source width/height in image pixels (e.g. 192 for a 1536 screen)
        const sWidth = this.width / scale;
        const sHeight = this.height / scale;
        const sx = this.cameraX / scale;
        let sy = 0;

        // Draw background
        const bg = this.backgrounds[this.currentScene];
        if (bg) {
            // Special handling for intro scenes: Stretch full image to fit screen
            // User requested 192x128 resize (which corresponds to full screen / 8)
            if (this.currentScene.startsWith('intro') || this.currentScene === 'kantin') {
                this.ctx.drawImage(bg, 0, 0, bg.width, bg.height, 0, 0, this.width, this.height);
            } else {
                // If background is taller than screen height (in source pixels), align to bottom to show ground
                // This fixes key issues with taller backgrounds like 'street'
                if (bg.height > sHeight) {
                    sy = bg.height - sHeight;
                }

                // Draw background with camera offset (source pixels)
                this.ctx.drawImage(bg, sx, sy, sWidth, sHeight, 0, 0, this.width, this.height);
            }
        }

        // Draw floor overlays (backpack or water) - these go behind the player
        let overlay = this.overlays[this.currentScene];

        if (this.currentScene === 'game') {
            if (this.backpackTaken && !this.waterTaken && this.waterLayerImg) {
                overlay = this.waterLayerImg;
            } else if (this.backpackTaken && this.waterTaken) {
                overlay = null;
            }
        } else if (this.currentScene === 'koridor') {
            if (this.keyTaken && !this.moneyTaken && this.moneyLayerImg) {
                overlay = this.moneyLayerImg;
            } else if (this.moneyTaken) {
                overlay = null;
            }
        }

        if (overlay) {
            this.ctx.drawImage(overlay, sx, 0, sWidth, sHeight, 0, 0, this.width, this.height);
        }
    }

    drawForeground() {
        const scale = 8;
        const sx = this.cameraX / scale;
        const sWidth = this.width / scale;
        const sHeight = this.height / scale;

        // Draw foreground layers (e.g. door) - these go on top of the player
        if (this.currentScene === 'game' && this.doorOpened && this.doorLayerImg) {
            this.ctx.drawImage(this.doorLayerImg, sx, 0, sWidth, sHeight, 0, 0, this.width, this.height);
        }

        // Corridor door layer
        if (this.currentScene === 'koridor' && this.corridorDoorOpened && this.corridorDoorLayerImg) {
            this.ctx.drawImage(this.corridorDoorLayerImg, sx, 0, sWidth, sHeight, 0, 0, this.width, this.height);
        }

        // Draw intro cinematic overlay
        if (this.introCinematicActive) {
            // Black screen
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.width, this.height);

            // Date text
            if (this.dateTextAlpha > 0) {
                this.ctx.save();
                this.ctx.globalAlpha = this.dateTextAlpha;
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = 'bold 80px PixelFont, Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('22.09.2018', this.width / 2, this.height / 2);
                this.ctx.restore();
            }
        }

        // Draw interaction prompt if one exists
        if (this.interactionPrompt && !this.dialogue.isActive()) {
            this.ctx.save();
            const text = this.interactionPrompt;
            this.ctx.font = 'bold 28px PixelFont, Arial';
            const textWidth = this.ctx.measureText(text).width;
            const x = this.width / 2;
            const y = this.height - 100;

            // Draw background box
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(x - textWidth / 2 - 20, y - 35, textWidth + 40, 50);

            // Draw text
            this.ctx.fillStyle = '#ffffff';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(text, x, y - 10);
            this.ctx.restore();
        }

        // ===== BULLY CINEMATIC OVERLAYS =====
        if (this.bullyPhase > 0 && this.bullyPhase < 99) {
            this.ctx.save();

            // Screen shake offset
            if (this.bullyShake > 0) {
                const shakeX = (Math.random() - 0.5) * this.bullyShake * 2;
                const shakeY = (Math.random() - 0.5) * this.bullyShake * 2;
                this.ctx.translate(shakeX, shakeY);
            }

            // Pink screen (fullscreen - covers everything)
            if (this.bullyPinkAlpha > 0 && this.pinkImg) {
                this.ctx.globalAlpha = this.bullyPinkAlpha;
                this.ctx.drawImage(this.pinkImg, 0, 0, this.width, this.height);
                this.ctx.globalAlpha = 1.0;
            }

            // Trauma image overlay (replaces/overlays bully)
            if (this.bullyTraumaAlpha > 0 && this.traumaImg) {
                const bully = this.game.enemies.find(e => e.isBully);
                if (bully) {
                    this.ctx.globalAlpha = this.bullyTraumaAlpha;

                    // Calculate screen position
                    const screenX = bully.x - this.cameraX;
                    const screenY = bully.y;

                    // Draw trauma image matching bully size
                    const drawW = bully.width || 300;
                    const drawH = bully.height || 400; // Fallback defaults

                    this.ctx.drawImage(this.traumaImg, screenX, screenY, drawW, drawH);

                    this.ctx.globalAlpha = 1.0;
                }
            }

            // White flash overlay
            if (this.bullyFlashAlpha > 0) {
                this.ctx.globalAlpha = this.bullyFlashAlpha;
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(0, 0, this.width, this.height);
                this.ctx.globalAlpha = 1.0;
            }

            this.ctx.restore();
        }
    }
}
