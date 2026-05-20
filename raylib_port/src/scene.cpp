#include "scene.h"
#include <algorithm>

SceneManager::SceneManager(int screenW, int screenH)
    : screenWidth(screenW), screenHeight(screenH)
{
    cameraX = 0; targetCameraX = 0; cameraSpeed = 0.06f;
    backpackTaken = false; waterTaken = false;
    keyTaken = false; moneyTaken = false;
    doorOpened = false; corridorDoorOpened = false;
    backpackDialoguesSeen = false; tourCompleted = false;
    bullyPhase = 0; bullyTriggered = false;
    zilSesiPlayed = false; tourPhase = 0;
    backpackInteractionState = "";
    cinematicTimer = 0; cinematicActive = false;
    cinematicTargetX = 0; hasCinematicTarget = false;
    bullyTimer = 0;
    emreCinematicPhase = 0; emreHocaTriggered = false;
    cinematicDialogueTriggered = false; emrePhaseTimer = 0;
    isDemo = false; demoPhase = 0;
    radioHeadsetFound = false; headsetDialogueFinished = false;
    pixelFont = GetFontDefault();

    DefineScenes();
    DefineDialogues();
    LoadBackgrounds();
}

SceneManager::~SceneManager() {
    for (auto& [k, t] : backgrounds) if (t.id > 0) UnloadTexture(t);
    for (auto& [k, t] : overlays) if (t.id > 0) UnloadTexture(t);
    for (auto& [k, t] : foregrounds) if (t.id > 0) UnloadTexture(t);
}

void SceneManager::SetFont(Font f) {
    pixelFont = f;
    dialogue.SetFont(f);
}

void SceneManager::DefineScenes() {
    // ===== Intro scenes =====
    SceneData intro1;
    intro1.name = "intro1";
    intro1.bgFiles = {"backgrounds/INTRO1.png"};
    intro1.charScale = 4.0f;
    intro1.leftWall = 300; intro1.rightWall = 1536;
    intro1.worldWidth = 1536; intro1.footOffset = 0;
    intro1.noPlayer = true;
    scenes["intro1"] = intro1;

    SceneData intro2;
    intro2.name = "intro2";
    intro2.bgFiles = {"backgrounds/INTRO2.png"};
    intro2.charScale = 4.0f;
    intro2.leftWall = 0; intro2.rightWall = 1536;
    intro2.worldWidth = 1536; intro2.footOffset = 0;
    intro2.noPlayer = true;
    scenes["intro2"] = intro2;

    SceneData intro3;
    intro3.name = "intro3";
    intro3.bgFiles = {"backgrounds/INTRO3.png"};
    intro3.charScale = 4.0f;
    intro3.leftWall = 0; intro3.rightWall = 1536;
    intro3.worldWidth = 1536; intro3.footOffset = 0;
    intro3.noPlayer = true;
    scenes["intro3"] = intro3;

    // ===== Scene Phone =====
    SceneData scene_phone;
    scene_phone.name = "scene_phone";
    scene_phone.bgFiles = {"backgrounds/background10.png"};
    scene_phone.charScale = 4.0f;
    scene_phone.leftWall = 0; scene_phone.rightWall = 1536;
    scene_phone.worldWidth = 1536; scene_phone.footOffset = 0;
    scene_phone.noPlayer = true;
    scene_phone.overlayFile = "backgrounds/backpack_layer.png";
    scenes["scene_phone"] = scene_phone;

    // ===== Room (game) =====
    SceneData game;
    game.name = "game";
    game.bgFiles = {"backgrounds/background6.png"};
    game.charScale = 11.0f;
    game.leftWall = 300; game.rightWall = 1000;
    game.worldWidth = 1536;
    game.footOffset = -230;
    game.enemyScale = 11.0f;
    game.enemyFootOffset = -330;
    game.overlayFile = "backgrounds/backpack_layer.png";
    scenes["game"] = game;

    // ===== Corridor =====
    SceneData koridor;
    koridor.name = "koridor";
    koridor.bgFiles = {"backgrounds/koridor.png"};
    koridor.charScale = 11.0f;
    koridor.leftWall = 40; koridor.rightWall = 2500;
    koridor.worldWidth = 2760;
    koridor.footOffset = -230;
    koridor.enemyScale = 11.0f;
    koridor.enemyFootOffset = -330;
    koridor.overlayFile = "backgrounds/key_layer.png";
    scenes["koridor"] = koridor;

    // ===== Outside =====
    SceneData outside;
    outside.name = "outside";
    outside.bgFiles = {"backgrounds/background5.png"};
    outside.charScale = 4.0f;
    outside.leftWall = 40; outside.rightWall = 1200;
    outside.worldWidth = 1536;
    outside.footOffset = 1;
    outside.enemyScale = 4.0f;
    outside.enemyFootOffset = 1;
    // NPCs
    for (int i = 0; i < 8; i++) {
        outside.npcPlacements.push_back({300.0f + i * 200.0f, i, 0, false, ""});
    }
    scenes["outside"] = outside;

    // ===== School =====
    SceneData school;
    school.name = "school";
    school.bgFiles = {"backgrounds/background.png"};
    school.charScale = 4.0f;
    school.leftWall = 40; school.rightWall = 1536 * 2;
    school.worldWidth = 3216;
    school.footOffset = -150;
    school.enemyScale = 4.0f;
    school.enemyFootOffset = -150;
    // Many NPCs
    int schoolNpcIndices[] = {0,1,2,3,4,5,6,7,0,2,3,4,5,6,7,0,1,2,3,4,5,6,7};
    float schoolNpcX[] = {200,250,500,550,600,800,900,1000,1200,1250,1400,1460,1700,1750,1900,2100,2300,2500,2550,2800,2860,2920,3100};
    for (int i = 0; i < 23; i++) {
        school.npcPlacements.push_back({schoolNpcX[i], schoolNpcIndices[i], 0, false, ""});
    }
    scenes["school"] = school;

    // ===== Canteen =====
    SceneData kantin;
    kantin.name = "kantin";
    kantin.bgFiles = {"backgrounds/kantin.png"};
    kantin.charScale = 5.0f;
    kantin.leftWall = 150; kantin.rightWall = 1400;
    kantin.worldWidth = 1536;
    kantin.footOffset = 130;
    kantin.enemyScale = 5.0f;
    kantin.enemyFootOffset = 130;
    int kantinIndices[] = {0,1,2,3,4,5,2,6,7,0,1,4};
    float kantinX[] = {300,380,450,520,650,750,900,980,1100,1180,1260,1350};
    for (int i = 0; i < 12; i++) {
        kantin.npcPlacements.push_back({kantinX[i], kantinIndices[i], 10, false, ""});
    }
    scenes["kantin"] = kantin;

    // ===== Floor 1 (kat1) =====
    SceneData kat1;
    kat1.name = "kat1";
    kat1.bgFiles = {"backgrounds/kat1.png"};
    kat1.charScale = 9.0f;
    kat1.leftWall = 0; kat1.rightWall = 16424;
    kat1.worldWidth = 16424;
    kat1.footOffset = -210;
    kat1.enemyScale = 9.0f;
    kat1.enemyFootOffset = -310;
    // Emre Hoca teacher
    kat1.npcPlacements.push_back({8200, 0, 0, true, "emre_hoca"});
    // Student NPCs
    int kat1Indices[] = {0,1,2,3,4,5,6,7,0,1,2,3,4,5,6,7,1,2,0,5,2,3,1,4,6,7,5,6,7,0,1,2,3,4,5,6,7,3,5,1};
    float kat1X[] = {500,600,1500,2000,3000,3100,3200,4500,5000,6000,6100,7500,8000,7950,7850,8050,8100,8140,8180,8225,8260,8300,8350,9000,9100,10500,11000,12000,12100,12200,13500,14000,15000,15100,4700,4800,4900};
    int kat1Count = 37;
    for (int i = 0; i < kat1Count; i++) {
        kat1.npcPlacements.push_back({kat1X[i], kat1Indices[i], 0, false, ""});
    }
    scenes["kat1"] = kat1;

    // ===== Workshop corridor =====
    SceneData atolye_koridor;
    atolye_koridor.name = "atolye_koridor";
    atolye_koridor.bgFiles = {"backgrounds/Atolye_koridor.png"};
    atolye_koridor.charScale = 8.0f;
    atolye_koridor.leftWall = 0; atolye_koridor.rightWall = 4544;
    atolye_koridor.worldWidth = 4544;
    atolye_koridor.footOffset = -200;
    atolye_koridor.enemyScale = 8.0f;
    atolye_koridor.enemyFootOffset = -300;
    // Emre Hoca + tour group NPCs
    atolye_koridor.npcPlacements.push_back({3700, 0, 0, true, "emre_hoca"});
    int tourIndices[] = {5,6,7,0,1,2,3};
    float tourX[] = {3750,3804,3830,3880,3930,3980,4030};
    for (int i = 0; i < 7; i++) {
        atolye_koridor.npcPlacements.push_back({tourX[i], tourIndices[i], 0, false, ""});
    }
    scenes["atolye_koridor"] = atolye_koridor;
    // Add doors to atolye_koridor
    scenes["atolye_koridor"].doors.push_back({420, 250, "atolye1", "Ucak Atolyesi"});
    scenes["atolye_koridor"].doors.push_back({2740, 250, "atolye2", "Elektrik Atolyesi"});

    // ===== Workshop 1 =====
    SceneData atolye1;
    atolye1.name = "atolye1";
    atolye1.bgFiles = {"backgrounds/Atolye1.png"};
    atolye1.charScale = 8.0f;
    atolye1.leftWall = 0; atolye1.rightWall = 1536;
    atolye1.worldWidth = 1536;
    atolye1.footOffset = -200;
    atolye1.enemyScale = 8.0f;
    atolye1.enemyFootOffset = -300;
    scenes["atolye1"] = atolye1;

    // ===== Workshop 2 =====
    SceneData atolye2;
    atolye2.name = "atolye2";
    atolye2.bgFiles = {"backgrounds/Atolye2.png"};
    atolye2.charScale = 8.0f;
    atolye2.leftWall = 0; atolye2.rightWall = 1536;
    atolye2.worldWidth = 1536;
    atolye2.footOffset = -200;
    atolye2.enemyScale = 8.0f;
    atolye2.enemyFootOffset = -300;
    scenes["atolye2"] = atolye2;
    // Add door back to atolye_koridor from atolye2
    scenes["atolye2"].doors.push_back({1056, 200, "atolye_koridor", "Atolye Koridoru"});
}

void SceneManager::DefineDialogues() {
    // === INTRO Dialogues (from JS defineSceneDialogues) ===
    sceneDialogues["intro1"] = {
        {"????", "Bunlarda ne buluyorsunuz anlamiyorum", ""},
    };
    sceneDialogues["intro2"] = {
        {"????", "Evet yani internet kafelerde bayagi oynardik Ama...", ""},
    };
    sceneDialogues["intro2_second"] = {
        {"????", "Parka gelincede parkta vakit gecirirdik", ""},
    };
    sceneDialogues["intro3_first"] = {
        {"Tunahan", "Baba bi oyun oynuyorum cok abartin ya", ""},
    };
    sceneDialogues["intro3_second"] = {
        {"baba", "Kalk hadi gidiyoruz Aksam oldu Annen merak etmesin", ""},
    };

    // === Scene Phone ===
    sceneDialogues["scene_phone"] = {
        {"tunahan", "Alo?", ""},
        {"bilinmeyen", "Merhaba Tunahan Kuzu ile mi konusuyorum?", ""},
        {"tunahan", "E-evet...", ""},
        {"data koleji", "Merhaba Tunahan Kuzu. Data Kolejine yazildigin icin gercekten tesekkur ederiz. Biz bir soru icin aradik.", ""},
        {"tunahan", "Okulda diyebilirdiniz ama...", ""},
        {"data koleji", "Evet, ancak telefondan konusmak daha rahat. Ayrica sizin guvenliginiz icin daha iyi.", ""},
        {"tunahan", "Ne guvenligi?", ""},
        {"data koleji", "Size bir gorev vermek istiyoruz. Tabii kabul ederseniz.", ""},
        {"tunahan", "Neymis o?", ""},
        {"data koleji", "Data Agents olmak istiyorsaniz Ucak atolyesini incelemenizi tavsiye ederiz.", ""},
        {"telefon", "Din Din Din", ""},
    };

    // === Room (game) - Morning Wake up ===
    sceneDialogues["game"] = {
        {"tunahan", "Allah Allah... cattik ya sabah sabah.", ""},
        {"Anne", "Oglum, uyandin mi?", ""},
        {"tunahan", "Uyandim anne!", ""},
        {"Anne", "Kapinin yaninda anahtar var, biraz da para biraktim. Cikarken alirsin.", ""},
    };

    // === Emre Hoca at School ===
    sceneDialogues["emre_school"] = {
        {"Emre Hoca", "Hadi bakalim gencler, yerlesivoruz. Ayakta dikilmek yok.", ""},
    };
    sceneDialogues["emre_school_2"] = {
        {"Emre Hoca", "Saf Saf hareket yapma, gec yerine.", ""},
    };
    sceneDialogues["emre_school_3"] = {
        {"Emre Hoca", "Sen 9lardansin degilmi?", ""},
    };
    sceneDialogues["tunahan_reply"] = {
        {"tunahan", "E-E-Evet", ""},
    };
    sceneDialogues["emre_school_4"] = {
        {"Emre Hoca", "9/E burasi. Alisirsin bu okulun ortamina merak etme.", ""},
    };
    sceneDialogues["emre_school_5"] = {
        {"Emre Hoca", "Okulumuzda sadece ders yok.", ""},
    };

    // === Emre Tour dialogues ===
    sceneDialogues["emre_tour_1"] = {
        {"Emre Hoca", "Bilgisayar atolyesi var...", ""},
    };
    sceneDialogues["emre_tour_2"] = {
        {"Emre Hoca", "Elektrik atolyesi var...", ""},
    };
    sceneDialogues["emre_tour_3"] = {
        {"Emre Hoca", "Laboratuvar var...", ""},
    };
    sceneDialogues["emre_tour_4"] = {
        {"Emre Hoca", "Merak eden girer, calisan ogrenir.", ""},
    };
    sceneDialogues["emre_tour_5"] = {
        {"Emre Hoca", "Sonra...", ""},
        {"Emre Hoca", "Adam olur iyi maasli yere girer.", ""},
        {"Emre Hoca", "Basit yani anlayacaginiz sikinti cikarmazsaniz iyi yerlere gelirsiniz.", ""},
        {"Emre Hoca", "Hadi dersinizi dinleyin iyi dersler.", ""},
    };

    // === Headset Discovery ===
    sceneDialogues["headset_discovery"] = {
        {"BASARIM", "Telsiz Kulaklik buldun!", "assets/Telsiz_kulaklik.png"},
        {"Tunahan", "Calisiyordur umarim...", ""},
        {"Telsiz", "-- Sinyal alindi.", ""},
        {"Tunahan", "...", ""},
        {"Bilinmeyen Ses", "Merhaba. Tunahan Kuzu ile mi gorusuyorum?", ""},
        {"Tunahan", "Evet... Benim.", ""},
        {"Data Agents", "Merhaba Tunahan. Biz Data Agents. 9. siniflar arasinda yaptigimiz arsiv kayitlarini inceledik ve seni uygun gorduk.", ""},
        {"Tunahan", "Uygun... neye?", ""},
        {"Data Agents", "Data Agents ekibi icin. Okul icinde bizimle calismani istiyoruz.", ""},
        {"Tunahan", "Ne isi yapacagim ki?", ""},
        {"Data Agents", "Isin basit. Okulda taskinlik cikaran, kurallari ihlal eden ogrencileri tespit edip ogretmenlere bildirmen.", ""},
        {"Tunahan", "Gammazlik yani. Yapmam ben bunu.", ""},
        {"Data Agents", "Her hakli bildirim basina 15 TL odeme yapilir. Ancak diger Data Agents tarafindan izleneceksin. Asilsiz bildirim yaparsan, bu bize raporlanir ve programdan cikarilirsin.", ""},
        {"Tunahan", "Bundan cikarim ne ki zaten...", ""},
        {"Data Agents", "Programi reddetmen durumunda, Data Koleji ile olan ilisigin kesilecektir.", ""},
        {"Tunahan", "Yani... okuldan atilacagim?", ""},
        {"Data Agents", "Evet.", ""},
        {"Tunahan", "...T-tamam. Kabul ediyorum.", ""},
        {"Data Agents", "Dogru karar.", ""},
        {"Data Agents", "Eger bir zorbayla karsilasirsan ve ogretmeni cagirmak istersen, telsizin uzerindeki C tusuna basman yeterli.", ""},
        {"Tunahan", "Bu is sandigimdan cok daha buyuk...", ""},
    };

    // === Bell Aftermath ===
    sceneDialogues["bell_aftermath"] = {
        {"Tunahan", "S-sinifa Gitmeliyim Ilk gunden i-ilk derse gec kalamam", ""},
    };

    // === Bully Cinematic ===
    sceneDialogues["bully_yell"] = {
        {"Bagiran Ogrenci", "Cekilin lan!", ""},
    };
    sceneDialogues["bully_approach_1"] = {
        {"Zorba", "-- Oglum suna bak, surati niye bu kadar pembe bunun?", ""},
    };
    sceneDialogues["bully_approach_2"] = {
        {"Zorba", "-- Hey pembe surat, yuzun kaynar suya mi dustu?", ""},
    };
    sceneDialogues["bully_flashback"] = {
        {"Baba (uzaktan)", "-- Takma kafana oglum onlari.", ""},
        {"Serseri (alayci)", "-- Ne bakiyon la pembe suratli?", ""},
    };
    sceneDialogues["bully_return"] = {
        {"...", "...", ""},
    };
    sceneDialogues["bully_taunt"] = {
        {"Bagiran Ogrenci", "-- Ne oldu lan, donup kaldin?", ""},
    };
    sceneDialogues["bully_punch_prompt"] = {
        {"System", "Saga dogru vurmak icin E ye bas", ""},
    };
    sceneDialogues["bully_hit_reaction"] = {
        {"Bagiran Ogrenci", "-- Lan ne yapiyorsun sen?!", ""},
    };
    sceneDialogues["bully_telsiz"] = {
        {"Telsiz", "-- Davranis kaydedildi.", ""},
    };
}

void SceneManager::LoadBackgrounds() {
    for (auto& [sceneName, sceneData] : scenes) {
        if (!sceneData.bgFiles.empty()) {
            const std::string& bgFile = sceneData.bgFiles[0];
            if (FileExists(bgFile.c_str())) {
                backgrounds[sceneName] = LoadTexture(bgFile.c_str());
                TraceLog(LOG_INFO, "Loaded background: %s for scene: %s", bgFile.c_str(), sceneName.c_str());
            } else {
                TraceLog(LOG_WARNING, "Background not found: %s, creating fallback", bgFile.c_str());
                // Create fallback gradient
                Image img = GenImageGradientLinear(
                    (int)sceneData.worldWidth, screenHeight,
                    0, {40, 40, 70, 255}, {20, 20, 40, 255}
                );
                backgrounds[sceneName] = LoadTextureFromImage(img);
                UnloadImage(img);
            }
        }

        if (!sceneData.overlayFile.empty() && FileExists(sceneData.overlayFile.c_str())) {
            overlays[sceneName] = LoadTexture(sceneData.overlayFile.c_str());
            TraceLog(LOG_INFO, "Loaded overlay: %s", sceneData.overlayFile.c_str());
        }
        if (!sceneData.foregroundFile.empty() && FileExists(sceneData.foregroundFile.c_str())) {
            foregrounds[sceneName] = LoadTexture(sceneData.foregroundFile.c_str());
        }
    }

    // Load extra overlay layers manually for specific states
    if (FileExists("backgrounds/water_layer.png")) {
        overlays["water_layer"] = LoadTexture("backgrounds/water_layer.png");
    }
    if (FileExists("backgrounds/money_layer.png")) {
        overlays["money_layer"] = LoadTexture("backgrounds/money_layer.png");
    }
    if (FileExists("backgrounds/koridor_door_layer.png")) {
        foregrounds["koridor_door"] = LoadTexture("backgrounds/koridor_door_layer.png");
    }
    if (FileExists("backgrounds/door_layer.png")) {
        foregrounds["game_door"] = LoadTexture("backgrounds/door_layer.png");
    }
}

void SceneManager::ChangeScene(const std::string& scene, float& playerX, float& playerY, const std::string& side) {
    if (scenes.find(scene) == scenes.end()) return;

    currentScene = scene;
    const SceneData& data = scenes[scene];

    if (side == "left") {
        playerX = (float)(data.leftWall + 100);
    } else if (side == "right") {
        playerX = (float)(data.rightWall - 100);
    } else if (side == "center") {
        playerX = data.worldWidth / 2;
    } else {
        try {
            playerX = std::stof(side);
        } catch(...) {
            playerX = data.worldWidth / 2;
        }
    }
    playerY = (float)screenHeight - 100 - data.footOffset;

    cameraX = std::max(0.0f, playerX - screenWidth / 2.0f);
    float maxCam = std::max(0.0f, data.worldWidth - screenWidth);
    cameraX = std::min(cameraX, maxCam);
    targetCameraX = cameraX;

    TraceLog(LOG_INFO, "Changed scene to: %s, player at (%.0f, %.0f), footOffset: %.0f",
             scene.c_str(), playerX, playerY, data.footOffset);

    // Spawn scene NPCs
    SpawnSceneNPCs();
}

void SceneManager::SpawnSceneNPCs() {
    sceneNPCs.clear();
    if (scenes.find(currentScene) == scenes.end()) return;

    const SceneData& data = scenes[currentScene];
    float npcY = (float)screenHeight - 100 - data.footOffset;

    for (auto& np : data.npcPlacements) {
        if (np.isTeacher) {
            sceneNPCs.push_back(std::make_unique<TeacherNPC>(
                np.x, npcY, np.teacherName, data.charScale, data.worldWidth, (float)screenHeight, np.yOffset
            ));
        } else {
            sceneNPCs.push_back(std::make_unique<NPC>(
                np.x, npcY, np.npcIndex, data.charScale, data.worldWidth, (float)screenHeight, np.yOffset
            ));
        }
    }
    TraceLog(LOG_INFO, "Spawned %d NPCs for scene: %s", (int)sceneNPCs.size(), currentScene.c_str());
}

void SceneManager::Update(float playerX, float playerY, float dt, bool dialogueActive,
                           float& outPlayerX, float& outPlayerY, float& outPlayerMaxX) {
    if (scenes.find(currentScene) == scenes.end()) return;
    const SceneData& data = scenes[currentScene];

    // === Camera logic ===
    if (hasCinematicTarget) {
        // Cinematic camera: ease toward cinematicTargetX
        float target = Utils::Clamp(cinematicTargetX - screenWidth / 2.0f, 0.0f, std::max(0.0f, data.worldWidth - screenWidth));
        cameraX += (target - cameraX) * 0.05f;
    } else if (data.worldWidth > screenWidth) {
        // Normal camera follow
        targetCameraX = playerX - screenWidth / 2.0f;
        targetCameraX = Utils::Clamp(targetCameraX, 0.0f, std::max(0.0f, data.worldWidth - screenWidth));
        cameraX = Utils::Lerp(cameraX, targetCameraX, cameraSpeed * (dt / 16.67f));
    } else {
        cameraX = 0;
    }

    // === Emre Hoca trigger in Kat1 ===
    if (currentScene == "kat1" && !emreHocaTriggered) {
        // Find emre_hoca NPC
        for (auto& npc : sceneNPCs) {
            TeacherNPC* teacher = dynamic_cast<TeacherNPC*>(npc.get());
            if (teacher && teacher->name == "emre_hoca") {
                float cameraRight = cameraX + screenWidth;
                float distance = teacher->x - cameraRight;
                if (distance < 100 && distance > -500) {
                    hasCinematicTarget = true;
                    cinematicTargetX = (8200 + 7850) / 2.0f; // Focus between Emre and students
                    emreHocaTriggered = true;
                    emreCinematicPhase = 1;
                    cinematicDialogueTriggered = false;
                    TraceLog(LOG_INFO, "Emre Hoca cinematic triggered!");
                }
                break;
            }
        }
    }

    // === Emre cinematic phase 1: wait for camera lock then start dialogue ===
    if (currentScene == "kat1" && emreCinematicPhase == 1) {
        float target = Utils::Clamp(cinematicTargetX - screenWidth / 2.0f, 0.0f, std::max(0.0f, data.worldWidth - screenWidth));
        if (!cinematicDialogueTriggered && fabsf(cameraX - target) < 10) {
            cinematicDialogueTriggered = true;
            dialogue.Start(sceneDialogues["emre_school"]);
        }
    }

    // === Emre cinematic phase 4: students retreated, wait then ask grade ===
    if (currentScene == "kat1" && emreCinematicPhase == 5) {
        emrePhaseTimer += dt;
        if (emrePhaseTimer > 1000) {
            emreCinematicPhase = 6;
            dialogue.Start(sceneDialogues["emre_school_3"]);
        }
    }

    // === Atolye Koridor tour logic ===
    if (currentScene == "atolye_koridor" && tourPhase >= 1 && tourPhase < 6) {
        float tourSpeed = 3.0f * (dt / 16.67f);
        NPC* emre = nullptr;
        for (auto& npc : sceneNPCs) {
            TeacherNPC* t = dynamic_cast<TeacherNPC*>(npc.get());
            if (t && t->name == "emre_hoca") { emre = npc.get(); break; }
        }

        if (emre && !dialogue.IsActive()) {
            emre->x -= tourSpeed;
            emre->state = "walk";
            emre->facingLeft = true;
            emre->speed = 0;

            float lastStudentX = emre->x;
            // Move other NPCs (students)
            for (auto& npc : sceneNPCs) {
                if (!dynamic_cast<TeacherNPC*>(npc.get())) {
                    npc->x -= tourSpeed;
                    npc->state = "walk";
                    npc->facingLeft = true;
                    npc->speed = 0;
                    if (npc->x > lastStudentX) lastStudentX = npc->x;
                }
            }

            // Move player behind
            outPlayerX = lastStudentX + 350;
            cinematicTargetX = emre->x - 200;

            // Trigger dialogues at positions
            if (tourPhase == 1 && emre->x < 3500) {
                dialogue.Start(sceneDialogues["emre_tour_1"]);
            } else if (tourPhase == 2 && emre->x < 2500) {
                dialogue.Start(sceneDialogues["emre_tour_2"]);
            } else if (tourPhase == 3 && emre->x < 1500) {
                dialogue.Start(sceneDialogues["emre_tour_3"]);
            } else if (tourPhase == 4 && emre->x < 600) {
                dialogue.Start(sceneDialogues["emre_tour_4"]);
            }
        } else if (emre) {
            emre->state = "idle";
        }
    }

    // === Emre leaving in atolye_koridor ===
    if (currentScene == "atolye_koridor") {
        for (int i = (int)sceneNPCs.size() - 1; i >= 0; i--) {
            if (sceneNPCs[i]->leaving && sceneNPCs[i]->x > 4600) {
                sceneNPCs.erase(sceneNPCs.begin() + i);
                TraceLog(LOG_INFO, "Emre Hoca has left the scene.");
            }
        }
    }

    // Update scene NPCs
    for (auto& npc : sceneNPCs) {
        npc->Update(dt, playerX, playerY);
    }

    // Dialogue update
    dialogue.Update(dt);

    // === Handle dialogue completion events ===
    static bool wasDlgActive = false;
    bool dlgActive = dialogue.IsActive();
    if (wasDlgActive && !dlgActive) {
        // Emre Phase 1 -> Phase 2 (chase)
        if (currentScene == "kat1" && emreCinematicPhase == 1) {
            emreCinematicPhase = 2;
            TraceLog(LOG_INFO, "Emre Phase 1 -> 2 (chase)");
            // Find runner and chaser NPCs (first two non-teacher NPCs near emre)
            int found = 0;
            for (auto& npc : sceneNPCs) {
                TeacherNPC* t = dynamic_cast<TeacherNPC*>(npc.get());
                if (!t && npc->x > 7800 && npc->x < 8400) {
                    if (found == 0) npc->id = "runner";
                    else if (found == 1) npc->id = "chaser";
                    found++;
                    if (found >= 2) break;
                }
            }
        }
        // Emre Phase 3 -> Phase 4 (students retreating done -> start retreat)
        else if (currentScene == "kat1" && emreCinematicPhase == 3) {
            emreCinematicPhase = 4;
            // Make runner/chaser retreat
            for (auto& npc : sceneNPCs) {
                if (npc->id == "runner" || npc->id == "chaser") {
                    npc->state = "walk";
                    npc->facingLeft = true;
                    npc->speed = 6;
                }
            }
            TraceLog(LOG_INFO, "Emre Phase 3 -> 4 (students retreating)");
        }
        // Emre Phase 6 -> Phase 7 (grade question answered)
        else if (currentScene == "kat1" && emreCinematicPhase == 6) {
            emreCinematicPhase = 7;
            dialogue.Start(sceneDialogues["tunahan_reply"]);
        }
        // Emre Phase 7 -> Phase 8
        else if (currentScene == "kat1" && emreCinematicPhase == 7) {
            emreCinematicPhase = 8;
            dialogue.Start(sceneDialogues["emre_school_4"]);
        }
        // Emre Phase 8 -> Phase 9
        else if (currentScene == "kat1" && emreCinematicPhase == 8) {
            emreCinematicPhase = 9;
            dialogue.Start(sceneDialogues["emre_school_5"]);
        }
        // Emre Phase 9 -> Transition to atolye_koridor
        else if (currentScene == "kat1" && emreCinematicPhase == 9) {
            emreCinematicPhase = 11;
            tourPhase = 1;
            hasCinematicTarget = true;
            cinematicTargetX = 4400;
            sceneTransitionRequested = true;
            sceneTransitionTarget = "atolye_koridor";
            sceneTransitionSide = "right";
            TraceLog(LOG_INFO, "Emre Phase 9 -> Atolye Koridor!");
        }
        // Atolye koridor tour progression
        else if (currentScene == "atolye_koridor") {
            if (tourPhase == 1) tourPhase = 2;
            else if (tourPhase == 2) tourPhase = 3;
            else if (tourPhase == 3) tourPhase = 4;
            else if (tourPhase == 4) {
                tourPhase = 5;
                dialogue.Start(sceneDialogues["emre_tour_5"]);
            }
            else if (tourPhase == 5) {
                tourPhase = 6;
                tourCompleted = true;
                hasCinematicTarget = false;
                // Make emre leave
                for (auto& npc : sceneNPCs) {
                    TeacherNPC* t = dynamic_cast<TeacherNPC*>(npc.get());
                    if (t && t->name == "emre_hoca") {
                        npc->state = "walk";
                        npc->facingLeft = false;
                        npc->speed = 4;
                        npc->leaving = true;
                    }
                }
                TraceLog(LOG_INFO, "Tour complete! Emre leaving.");
            }
        }
    }
    wasDlgActive = dlgActive;

    // === Emre Phase 2: Chase sequence ===
    if (currentScene == "kat1" && emreCinematicPhase == 2) {
        NPC* runner = nullptr;
        NPC* chaser = nullptr;
        for (auto& npc : sceneNPCs) {
            if (npc->id == "runner") runner = npc.get();
            if (npc->id == "chaser") chaser = npc.get();
        }
        if (runner && chaser) {
            runner->state = "walk"; runner->facingLeft = true; runner->speed = 8;
            chaser->state = "walk"; chaser->facingLeft = true; chaser->speed = 8;
        }

        // Find emre and start azar dialogue
        NPC* emre = nullptr;
        for (auto& npc : sceneNPCs) {
            TeacherNPC* t = dynamic_cast<TeacherNPC*>(npc.get());
            if (t && t->name == "emre_hoca") { emre = npc.get(); break; }
        }
        if (emre) {
            cinematicTargetX = emre->x;
        }

        // After 1.5 seconds, Emre yells
        emrePhaseTimer += dt;
        if (emrePhaseTimer > 1500) {
            emreCinematicPhase = 3;
            emrePhaseTimer = 0;
            dialogue.Start(sceneDialogues["emre_school_2"]);
            // Stop runner/chaser
            if (runner) { runner->state = "idle"; runner->speed = 0.8f; }
            if (chaser) { chaser->state = "idle"; chaser->speed = 0.8f; }
        }
    }

    // === Emre Phase 4: Students retreating, check if far enough ===
    if (currentScene == "kat1" && emreCinematicPhase == 4) {
        bool retreated = true;
        for (auto& npc : sceneNPCs) {
            if (npc->id == "runner" || npc->id == "chaser") {
                if (npc->x > 7700) retreated = false;
            }
        }
        if (retreated) {
            emreCinematicPhase = 5;
            emrePhaseTimer = 0;
            // Focus camera on Emre
            for (auto& npc : sceneNPCs) {
                TeacherNPC* t = dynamic_cast<TeacherNPC*>(npc.get());
                if (t && t->name == "emre_hoca") {
                    cinematicTargetX = t->x;
                    break;
                }
            }
        }
    }

    // Clear interaction prompt
    interactionPrompt = "";

    // === GAME (Room) Scene Interactions ===
    if (currentScene == "game" && !dialogue.IsActive()) {
        float distanceToWall = fabsf(playerX - (float)scenes["game"].rightWall);

        if (distanceToWall < 80) {
            // Show prompt
            if (backpackInteractionState == "idle" || backpackInteractionState.empty()) {
                interactionPrompt = "[Enter] Etkilesim";
            } else if (backpackInteractionState == "completed" && !doorOpened) {
                interactionPrompt = "[Enter] Kapiyi ac";
            }

            if (IsKeyPressed(KEY_ENTER)) {
                if (backpackInteractionState == "idle" || backpackInteractionState.empty()) {
                    StartBackpackInteraction();
                } else if (backpackInteractionState == "completed" && !doorOpened) {
                    StartDoorInteraction(outPlayerMaxX);
                }
            }
        }

        // Transition from game to koridor
        if (doorOpened && playerX > scenes["game"].worldWidth - 60) {
            sceneTransitionRequested = true;
            sceneTransitionTarget = "koridor";
            sceneTransitionSide = "left";
        }
    }

    // === Handle dialogue choices for backpack/water/door ===
    if (dialogue.IsActive() && dialogue.HasChoices() && dialogue.IsChoiceSelected()) {
        int choice = dialogue.GetSelectedChoice();
        std::string choiceContext = dialogue.choiceContext;

        if (choiceContext == "backpack") {
            if (choice == 0) { // Evet
                HandleBackpackYes(outPlayerMaxX);
            } else {
                ResetBackpackQuest(outPlayerMaxX);
            }
        } else if (choiceContext == "water") {
            if (choice == 0) { // Evet
                HandleWaterYes(outPlayerMaxX);
            } else {
                ResetBackpackQuest(outPlayerMaxX);
            }
        } else if (choiceContext == "door") {
            if (choice == 0) { // Evet
                HandleDoorYes(outPlayerMaxX);
            }
        } else if (choiceContext == "key") {
            if (choice == 0) HandleKeyYes(outPlayerMaxX);
        } else if (choiceContext == "money") {
            if (choice == 0) HandleMoneyYes(outPlayerMaxX);
        } else if (choiceContext == "corridor_door") {
            if (choice == 0) HandleCorridorDoorYes(outPlayerMaxX);
        } else if (choiceContext == "kantin_exit") {
            if (choice == 0) { // Kat 1
                sceneTransitionRequested = true;
                sceneTransitionTarget = "kat1";
                sceneTransitionSide = "left";
            } else if (choice == 1) { // Giriş katı
                dialogue.Start({{"System", "Giris kati su an kilitli.", ""}});
            } else if (choice == 2) { // Atolye katı
                sceneTransitionRequested = true;
                sceneTransitionTarget = "atolye_koridor";
                sceneTransitionSide = "left";
            }
        } else if (choiceContext == "canteen_enter") {
            if (choice == 0) { // Evet
                sceneTransitionRequested = true;
                sceneTransitionTarget = "kantin";
                sceneTransitionSide = "right";
            }
        } else if (choiceContext == "atolye_exit") {
            if (choice == 0) { // Kat 1
                sceneTransitionRequested = true;
                sceneTransitionTarget = "kat1";
                sceneTransitionSide = "left";
            } else if (choice == 1) { // Kantin
                sceneTransitionRequested = true;
                sceneTransitionTarget = "kantin";
                sceneTransitionSide = "center";
            } else if (choice == 2) { // Giriş kat
                dialogue.Start({{"System", "Giris kat su an kilitli.", ""}});
            }
        }
        dialogue.ClearChoice();
    }

    // === Handle post-Anne dialogue → water question ===
    if (backpackTaken && !waterTaken && backpackInteractionState == "waiting_water_after_anne"
        && !dialogue.IsActive()) {
        backpackInteractionState = "waiting_water";
        dialogue.Ask("System", "Ve Suyu alacak misin?", {"Evet", "Hayir"}, "water");
    }

    // === KORIDOR Scene ===
    if (currentScene == "koridor" && !dialogue.IsActive()) {
        CheckCorridorInteractions(playerX, outPlayerMaxX);
        // Transition from koridor to outside (JS: player.x > 2720)
        if (corridorDoorOpened && playerX > 2720) {
            sceneTransitionRequested = true;
            sceneTransitionTarget = "outside";
            sceneTransitionSide = "right"; // You spawn on the right side of outside coming from corridor (like JS reverted patch)
        }
        // Go back to game
        if (playerX < scenes["koridor"].leftWall + 30) {
            sceneTransitionRequested = true;
            sceneTransitionTarget = "game";
            sceneTransitionSide = "right";
        }
    }

    // === OUTSIDE Scene ===
    if (currentScene == "outside" && !dialogue.IsActive()) {
        // Entering school by walking left in outside (JS: player.x < 60)
        if (playerX < 60) {
            sceneTransitionRequested = true;
            sceneTransitionTarget = "school";
            sceneTransitionSide = "right";
        }
    }

    // === KANTIN Scene ===
    if (currentScene == "kantin" && !dialogue.IsActive()) {
        // JS: player.x > 1350 -> push back to 1340, show exit menu
        if (playerX > 1350) {
            outPlayerX = 1340;
            dialogue.Ask("System", "Nereye gideceksin?", {"Kat 1", "Giris kati", "Atolye kati"}, "kantin_exit");
        }
    }

    // === SCHOOL Scene ===
    if (currentScene == "school" && !dialogue.IsActive()) {
        // School -> Outside (Walking Right) (JS: player.x > worldWidth - 100)
        if (playerX > scenes["school"].worldWidth - 100) {
            sceneTransitionRequested = true;
            sceneTransitionTarget = "outside";
            sceneTransitionSide = "left";
        }
        
        // School -> Canteen interaction (Walking Left, JS: distanceToLeft < 50 && Enter)
        float distanceToLeft = playerX - (float)scenes["school"].leftWall;
        if (distanceToLeft < 50 && IsKeyPressed(KEY_ENTER)) {
            dialogue.Ask("System", "Kantine girecek misin?", {"Evet", "Hayir"}, "canteen_enter");
        }
    }

    // === KAT1 Scene ===
    if (currentScene == "kat1" && !dialogue.IsActive()) {
        if (playerX < 60) {
            sceneTransitionRequested = true;
            sceneTransitionTarget = "school";
            sceneTransitionSide = "right";
        }
    }

    // === ATOLYE KORIDOR Scene ===
    if (currentScene == "atolye_koridor" && !dialogue.IsActive()) {
        // JS: player.x > 4480 -> push back to 4470, show exit menu
        if (playerX > 4480) {
            outPlayerX = 4470;
            dialogue.Ask("System", "Nereye gideceksin?", {"Kat 1", "Kantin", "Giris kat"}, "atolye_exit");
        }
    }

    // === Generic Door Interaction (for atolye_koridor, atolye2 etc.) ===
    bool tourActive = (currentScene == "atolye_koridor" && tourPhase >= 1 && tourPhase < 6);
    if (!tourActive && !dialogue.IsActive() && scenes.count(currentScene) && !scenes[currentScene].doors.empty()) {
        for (auto& door : scenes[currentScene].doors) {
            if (fabsf(playerX - door.x) < (door.width / 2.0f)) {
                interactionPrompt = "[Enter] " + door.name;
                if (IsKeyPressed(KEY_ENTER)) {
                    // Special spawn position when returning from workshops
                    std::string spawnPos = "left";
                    if (door.target == "atolye_koridor") {
                        if (currentScene == "atolye1") {
                            sceneTransitionRequested = true;
                            sceneTransitionTarget = "atolye_koridor";
                            sceneTransitionSide = "420";
                            break;
                        } else if (currentScene == "atolye2") {
                            sceneTransitionRequested = true;
                            sceneTransitionTarget = "atolye_koridor";
                            sceneTransitionSide = "2740";
                            break;
                        }
                    }
                    sceneTransitionRequested = true;
                    sceneTransitionTarget = door.target;
                    sceneTransitionSide = "left";
                    break;
                }
            }
        }
    }

    // === Atolye 1 Auto-Exit (Walking Left) ===
    if (currentScene == "atolye1" && !dialogue.IsActive() && playerX < 60) {
        // Bell sound logic after headset discovery (simplified for C++ port)
        if (headsetDialogueFinished && !zilSesiPlayed) {
            zilSesiPlayed = true;
            playZilFlag = true;
            dialogue.Start(sceneDialogues["bell_aftermath"]);
        }
        sceneTransitionRequested = true;
        sceneTransitionTarget = "atolye_koridor";
        sceneTransitionSide = "420";
    }

    // === Atolye 2 Auto-Exit (Walking Left) ===
    if (currentScene == "atolye2" && !dialogue.IsActive() && playerX < 60) {
        sceneTransitionRequested = true;
        sceneTransitionTarget = "atolye_koridor";
        sceneTransitionSide = "2740";
    }

    // === Atolye 1 Airplane Search (Headset Quest - Non-Demo only) ===
    if (currentScene == "atolye1" && !radioHeadsetFound && !isDemo && !dialogue.IsActive()) {
        float distToRight = fabsf(playerX - (float)scenes["atolye1"].rightWall);
        if (distToRight < 50) {
            interactionPrompt = "[Enter] Ucagi karistir";
            if (IsKeyPressed(KEY_ENTER)) {
                radioHeadsetFound = true;
                dialogue.Start(sceneDialogues["headset_discovery"]);
                TraceLog(LOG_INFO, "Radio Headset found!");
            }
        }
    }

    // === Atolye 2 Computer Interaction ===
    if (currentScene == "atolye2" && !dialogue.IsActive()) {
        float computers[] = {224.0f, 528.0f, 736.0f};
        for (float pcX : computers) {
            if (fabsf(playerX - pcX) < 50) {
                interactionPrompt = "[Enter] Bilgisayari kullan";
                if (IsKeyPressed(KEY_ENTER)) {
                    openComputerContext = true;
                }
                break; // only interact with one at a time
            }
        }
    }

    // === Demo Mode Logic ===
    if (isDemo) {
        // Phase 0 -> 1: Start task after tour
        if (tourCompleted && demoPhase == 0) {
            demoPhase = 1;
            customTask = "Atolyeleri gez (0/2)";
            TraceLog(LOG_INFO, "DEMO: Task added - Visit workshops");
        }

        // Phase 1: Track workshop visits
        if (demoPhase == 1) {
            bool updated = false;
            if (currentScene == "atolye1" && demoVisitedWorkshops.find("atolye1") == demoVisitedWorkshops.end()) {
                demoVisitedWorkshops.insert("atolye1");
                updated = true;
            }
            if (currentScene == "atolye2" && demoVisitedWorkshops.find("atolye2") == demoVisitedWorkshops.end()) {
                demoVisitedWorkshops.insert("atolye2");
                updated = true;
            }

            if (updated) {
                customTask = "Atolyeleri gez (" + std::to_string(demoVisitedWorkshops.size()) + "/2)";
                if ((int)demoVisitedWorkshops.size() >= 2) {
                    demoPhase = 2;
                    playZilFlag = true;
                    dialogue.Start({{"Tunahan", "Olamaz ilk dersim Devre simulasyonu ve Kodlamaydi Hemen bilgisiyar Dersine girmeliyim", ""}});
                }
            }
        }

        // Phase 2 -> Phase 3
        if (demoPhase == 2 && !dialogue.IsActive()) {
            demoPhase = 3;
            customTask = "Bilgisayar Dersine git";
        }
    }

    // Process scene transition
    if (sceneTransitionRequested) {
        sceneTransitionRequested = false;
        ChangeScene(sceneTransitionTarget, outPlayerX, outPlayerY, sceneTransitionSide);
    }
}

void SceneManager::StartBackpackInteraction() {
    backpackInteractionState = "waiting_backpack";
    dialogue.Ask("System", "Cantayi alacak misin?", {"Evet", "Hayir"}, "backpack");
}

void SceneManager::HandleBackpackYes(float& playerMaxX) {
    backpackTaken = true;
    TraceLog(LOG_INFO, "Backpack taken!");

    if (!backpackDialoguesSeen) {
        backpackDialoguesSeen = true;
        dialogue.Start({
            {"Tunahan", "Anne, suyu niye koydun?", ""},
            {"Anne", "Yaninda icersin diye koydum!", ""},
        });
        backpackInteractionState = "waiting_water_after_anne";
    } else {
        backpackInteractionState = "waiting_water";
        dialogue.Ask("System", "Ve Suyu alacak misin?", {"Evet", "Hayir"}, "water");
    }
}

void SceneManager::HandleWaterYes(float& playerMaxX) {
    waterTaken = true;
    backpackInteractionState = "completed";
    scenes["game"].rightWall = 1436;
    playerMaxX = 1436;
    TraceLog(LOG_INFO, "Water taken! Wall moved to 1436.");
}

void SceneManager::ResetBackpackQuest(float& playerMaxX) {
    TraceLog(LOG_INFO, "Quest reset/refused.");
    backpackInteractionState = "idle";
    backpackTaken = false;
    waterTaken = false;
    scenes["game"].rightWall = 1000;
    playerMaxX = 1000;
}

void SceneManager::StartDoorInteraction(float& playerMaxX) {
    dialogue.Ask("System", "Kapiyi acacak misin?", {"Evet", "Hayir"}, "door");
}

void SceneManager::HandleDoorYes(float& playerMaxX) {
    doorOpened = true;
    scenes["game"].rightWall = (int)scenes["game"].worldWidth + 100;
    playerMaxX = scenes["game"].worldWidth + 100;
    TraceLog(LOG_INFO, "Door opened! Wall removed.");
}

void SceneManager::CheckCorridorInteractions(float playerX, float& playerMaxX) {
    if (currentScene != "koridor" || dialogue.IsActive()) return;

    float distanceToWall = fabsf(playerX - (float)scenes["koridor"].rightWall);
    if (distanceToWall < 80) {
        if (!keyTaken) {
            interactionPrompt = "[Enter] Etkilesim";
            if (IsKeyPressed(KEY_ENTER)) StartKeyInteraction();
        } else if (!moneyTaken) {
            interactionPrompt = "[Enter] Etkilesim";
            if (IsKeyPressed(KEY_ENTER)) StartMoneyInteraction();
        } else if (!corridorDoorOpened) {
            interactionPrompt = "[Enter] Kapiyi ac";
            if (IsKeyPressed(KEY_ENTER)) StartCorridorDoorInteraction();
        }
    }
}

void SceneManager::StartKeyInteraction() {
    dialogue.Ask("System", "Anahtari alacak misin?", {"Evet", "Hayir"}, "key");
}

void SceneManager::HandleKeyYes(float& playerMaxX) {
    keyTaken = true;
    playerMaxX = 2500;
    TraceLog(LOG_INFO, "Key taken!");
}

void SceneManager::StartMoneyInteraction() {
    dialogue.Ask("System", "15 TL alacak misin?", {"Evet", "Hayir"}, "money");
}

void SceneManager::HandleMoneyYes(float& playerMaxX) {
    moneyTaken = true;
    scenes["koridor"].rightWall = 2720;
    playerMaxX = 2720;
    TraceLog(LOG_INFO, "Money taken! Wall moved to 2720.");
}

void SceneManager::StartCorridorDoorInteraction() {
    dialogue.Ask("System", "Kapiyi acacak misin?", {"Evet", "Hayir"}, "corridor_door");
}

void SceneManager::HandleCorridorDoorYes(float& playerMaxX) {
    corridorDoorOpened = true;
    scenes["koridor"].rightWall = 2800;
    playerMaxX = 2800;
    TraceLog(LOG_INFO, "Corridor door opened! Wall moved to 2800.");
}

void SceneManager::CheckSceneTransitions(float playerX, float playerY, float& outPlayerX, float& outPlayerY) {
    // Handled in Update now
}

void SceneManager::Draw() {
    if (scenes.find(currentScene) == scenes.end()) return;

    // Draw background using exact JS scale=8 logic
    if (backgrounds.count(currentScene)) {
        Texture2D& bg = backgrounds[currentScene];
        
        if (currentScene.find("intro") == 0 || currentScene == "kantin") {
            // Stretch full image to fit screen
            DrawTexturePro(bg, 
                {0, 0, (float)bg.width, (float)bg.height}, 
                {0, 0, (float)screenWidth, (float)screenHeight}, 
                {0,0}, 0, WHITE);
        } else {
            float scale = 8.0f;
            float srcX = cameraX / scale;
            float srcW = (float)screenWidth / scale;
            float srcH = (float)screenHeight / scale;
            float srcY = 0;
            
            // If background is taller than screen height (in source pixels), align to bottom to show ground
            // This fixes key issues with taller backgrounds like 'street' and 'koridor'
            if ((float)bg.height > srcH) {
                srcY = (float)bg.height - srcH;
            }

            Rectangle src = {srcX, srcY, srcW, srcH};
            Rectangle dest = {0, 0, (float)screenWidth, (float)screenHeight};
            DrawTexturePro(bg, src, dest, {0,0}, 0, WHITE);
        }
    }

    // Select overlay
    Texture2D* activeOverlay = nullptr;
    if (currentScene == "game") {
        if (!backpackTaken && overlays.count("game")) activeOverlay = &overlays["game"];
        else if (backpackTaken && !waterTaken && overlays.count("water_layer")) activeOverlay = &overlays["water_layer"];
        // if waterTaken, activeOverlay stays null
    } else if (currentScene == "koridor") {
        if (!keyTaken && overlays.count("koridor")) activeOverlay = &overlays["koridor"];
        else if (keyTaken && !moneyTaken && overlays.count("money_layer")) activeOverlay = &overlays["money_layer"];
        // if moneyTaken, activeOverlay stays null
    } else {
        if (overlays.count(currentScene)) activeOverlay = &overlays[currentScene];
    }

    // Draw overlay (with JS 8x scale logic to match backgrounds perfectly)
    if (activeOverlay) {
        Texture2D& ov = *activeOverlay;
        float scale = 8.0f;
        float srcX = cameraX / scale;
        float srcW = (float)screenWidth / scale;
        float srcH = (float)screenHeight / scale;
        float srcY = 0;
        
        if ((float)ov.height > srcH) {
            srcY = (float)ov.height - srcH;
        }

        Rectangle src = {srcX, srcY, srcW, srcH};
        Rectangle dest = {0, 0, (float)screenWidth, (float)screenHeight};
        DrawTexturePro(ov, src, dest, {0,0}, 0, WHITE);
    }

}

void SceneManager::DrawNPCs() {
    // Draw scene NPCs (with camera offset already applied via their draw coords)
    // NPCs store world coords, we need to offset by camera
    for (auto& npc : sceneNPCs) {
        float origX = npc->x;
        npc->x -= cameraX;
        npc->Draw(GetFrameTime() * 1000.0f);
        npc->x = origX;
    }
}

void SceneManager::DrawForeground() {
    if (foregrounds.count(currentScene)) {
        Texture2D& fg = foregrounds[currentScene];
        
        float scale = 8.0f;
        float srcX = cameraX / scale;
        float srcW = (float)screenWidth / scale;
        float srcH = (float)screenHeight / scale;
        float srcY = 0;
        
        if ((float)fg.height > srcH) {
            srcY = (float)fg.height - srcH;
        }

        Rectangle src = {srcX, srcY, srcW, srcH};
        Rectangle dest = {0, 0, (float)screenWidth, (float)screenHeight};
        DrawTexturePro(fg, src, dest, {0,0}, 0, WHITE);
    }

    // Explicitly draw door layers if opened
    Texture2D* activeDoorLayer = nullptr;
    if (currentScene == "game" && doorOpened && foregrounds.count("game_door")) {
        activeDoorLayer = &foregrounds["game_door"];
    } else if (currentScene == "koridor" && corridorDoorOpened && foregrounds.count("koridor_door")) {
        activeDoorLayer = &foregrounds["koridor_door"];
    }

    if (activeDoorLayer) {
        Texture2D& doorLayer = *activeDoorLayer;
        float scale = 8.0f;
        float srcX = cameraX / scale;
        float srcW = (float)screenWidth / scale;
        float srcH = (float)screenHeight / scale;
        float srcY = 0;
        
        if ((float)doorLayer.height > srcH) {
            srcY = (float)doorLayer.height - srcH;
        }

        Rectangle src = {srcX, srcY, srcW, srcH};
        Rectangle dest = {0, 0, (float)screenWidth, (float)screenHeight};
        DrawTexturePro(doorLayer, src, dest, {0,0}, 0, WHITE);
    }

    // Draw dialogue
    dialogue.Draw();
}

float SceneManager::GetCharScale() const {
    if (scenes.count(currentScene)) return scenes.at(currentScene).charScale;
    return 4.0f;
}
float SceneManager::GetFootOffset() const {
    if (scenes.count(currentScene)) return scenes.at(currentScene).footOffset;
    return 0;
}
float SceneManager::GetEnemyScale() const {
    if (scenes.count(currentScene)) return scenes.at(currentScene).enemyScale;
    return 4.0f;
}
float SceneManager::GetEnemyFootOffset() const {
    if (scenes.count(currentScene)) return scenes.at(currentScene).enemyFootOffset;
    return 0;
}
