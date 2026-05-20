#include "game.h"
#include <cmath>
#include <algorithm>
#include "webview_wrapper.h"

Game::Game() {
    state = "menu";
    audioLoaded = false;
    autoSaveTimer = 0;
    autoSaveInterval = 30000;
    stoneSpawnTimer = 0;
    planeSpawnTimer = 0;
    mouse = {0, 0};
    aimStartPos = {0, 0};
    debugMenuVisible = false;
    isDemo = false;
    fontLoaded = false;
    renderTargetReady = false;
    normalMusic = {0};
    battleMusic = {0};
    currentMusic = {0};
    punchSfx = {0};
    blipSfx = {0};
    injectorSfx = {0};
    zilSfx = {0};
    ogrenciZilSfx = {0};
    zilAudioState = 0;
}

Game::~Game() {
    if (audioLoaded) {
        if (IsMusicValid(normalMusic)) UnloadMusicStream(normalMusic);
        if (IsMusicValid(battleMusic)) UnloadMusicStream(battleMusic);
        if (IsSoundValid(punchSfx)) UnloadSound(punchSfx);
        if (IsSoundValid(blipSfx)) UnloadSound(blipSfx);
        if (IsSoundValid(injectorSfx)) UnloadSound(injectorSfx);
        if (IsSoundValid(zilSfx)) UnloadSound(zilSfx);
        if (IsSoundValid(ogrenciZilSfx)) UnloadSound(ogrenciZilSfx);
    }
    if (fontLoaded) UnloadFont(pixelFont);
    if (renderTargetReady) UnloadRenderTexture(renderTarget);
}

void Game::Init() {
    // Create render target at fixed game resolution
    renderTarget = LoadRenderTexture(RENDER_WIDTH, RENDER_HEIGHT);
    SetTextureFilter(renderTarget.texture, TEXTURE_FILTER_POINT); // Pixel-perfect
    renderTargetReady = true;

    LoadFont();
    LoadAudio();
    settings = Utils::LoadSettings();

    menu = std::make_unique<MenuSystem>(RENDER_WIDTH, RENDER_HEIGHT);
    if (fontLoaded) menu->SetFont(pixelFont);

    PlayMusic("battle"); // Menu music
}

void Game::LoadFont() {
    const char* fontPaths[] = {
        "assets/pixel_font.ttf",
        "assets/PixelFont.ttf",
        "assets/font.ttf"
    };
    for (auto& path : fontPaths) {
        if (FileExists(path)) {
            int codepoints[512];
            int count = 0;
            for (int i = 32; i < 127; i++) codepoints[count++] = i;
            int turkishChars[] = {199, 214, 220, 231, 246, 252, 286, 287, 304, 305, 350, 351};
            for (int c : turkishChars) codepoints[count++] = c;
            pixelFont = LoadFontEx(path, 32, codepoints, count);
            fontLoaded = true;
            return;
        }
    }
    pixelFont = GetFontDefault();
    fontLoaded = false;
}

void Game::LoadAudio() {
    InitAudioDevice();

    if (FileExists("audio/bgm_normal.mp3")) {
        normalMusic = LoadMusicStream("audio/bgm_normal.mp3");
        TraceLog(LOG_INFO, "Loaded bgm_normal.mp3");
    }
    if (FileExists("audio/bgm_battle.mp3")) {
        battleMusic = LoadMusicStream("audio/bgm_battle.mp3");
        TraceLog(LOG_INFO, "Loaded bgm_battle.mp3");
    }
    if (FileExists("audio/punch.wav")) punchSfx = LoadSound("audio/punch.wav");
    if (FileExists("audio/blip.wav")) blipSfx = LoadSound("audio/blip.wav");
    if (FileExists("audio/zil_sesi.wav")) zilSfx = LoadSound("audio/zil_sesi.wav");
    if (FileExists("audio/ogrenci_zilsesisonu.wav")) ogrenciZilSfx = LoadSound("audio/ogrenci_zilsesisonu.wav");

    audioLoaded = true;
}

void Game::PlayMusic(const std::string& type) {
    if (type == "normal" && IsMusicValid(normalMusic)) {
        if (IsMusicValid(currentMusic)) StopMusicStream(currentMusic);
        currentMusic = normalMusic;
        PlayMusicStream(currentMusic);
        SetMusicVolume(currentMusic, settings.musicVolume / 100.0f);
    } else if (type == "battle" && IsMusicValid(battleMusic)) {
        if (IsMusicValid(currentMusic)) StopMusicStream(currentMusic);
        currentMusic = battleMusic;
        PlayMusicStream(currentMusic);
        SetMusicVolume(currentMusic, settings.musicVolume / 100.0f);
    }
}

void Game::PlaySfx(const std::string& name) {
    float vol = settings.sfxVolume / 100.0f;
    if (name == "punch" && IsSoundValid(punchSfx)) { SetSoundVolume(punchSfx, vol); PlaySound(punchSfx); }
    else if (name == "blip" && IsSoundValid(blipSfx)) { SetSoundVolume(blipSfx, vol); PlaySound(blipSfx); }
    else if (name == "injector" && IsSoundValid(injectorSfx)) { SetSoundVolume(injectorSfx, vol); PlaySound(injectorSfx); }
}

void Game::StartNewGame() {
    state = "playing";

    sceneManager = std::make_unique<SceneManager>(RENDER_WIDTH, RENDER_HEIGHT);
    if (fontLoaded) sceneManager->SetFont(pixelFont);

    float px = RENDER_WIDTH / 2.0f;
    float py = (float)RENDER_HEIGHT - 100;
    player = std::make_unique<Player>(px, py, sceneManager->GetCharScale());
    sceneManager->ChangeScene("game", player->x, player->y, "center");
    // Update player scale after scene change
    player->scale = sceneManager->GetCharScale();

    enemies.clear();
    paperPlanes.clear();
    stones.clear();
    injectors.clear();
    feedbackMessages.clear();
    autoSaveTimer = 0;
    stoneSpawnTimer = 0;
    planeSpawnTimer = 0;

    sceneManager->sceneTransitionRequested = false;

    zilAudioState = 0;

    PlayMusic("normal");

    // Start room dialogue (from JS: defineSceneDialogues -> game)
    sceneManager->dialogue.Start(sceneManager->sceneDialogues["game"]);
}

void Game::ContinueGame() {
    json saveData = Utils::LoadGame();
    if (saveData.empty()) { StartNewGame(); return; }

    state = "playing";
    sceneManager = std::make_unique<SceneManager>(RENDER_WIDTH, RENDER_HEIGHT);
    if (fontLoaded) sceneManager->SetFont(pixelFont);

    float px = saveData.value("x", RENDER_WIDTH / 2.0f);
    float py = saveData.value("y", (float)(RENDER_HEIGHT - 100));
    std::string savedScene = saveData.value("scene", "game");

    player = std::make_unique<Player>(px, py, sceneManager->GetCharScale());
    sceneManager->ChangeScene(savedScene, player->x, player->y, "center");
    player->scale = sceneManager->GetCharScale();

    if (saveData.contains("x")) player->x = saveData["x"].get<float>();
    if (saveData.contains("y")) player->y = saveData["y"].get<float>();
    player->health = saveData.value("health", 100);
    player->combo = saveData.value("combo", 0);
    player->hasAdrenaline = saveData.value("hasAdrenaline", false);

    sceneManager->backpackTaken = saveData.value("backpackTaken", false);
    sceneManager->waterTaken = saveData.value("waterTaken", false);
    sceneManager->keyTaken = saveData.value("keyTaken", false);
    sceneManager->moneyTaken = saveData.value("moneyTaken", false);
    sceneManager->doorOpened = saveData.value("doorOpened", false);
    sceneManager->corridorDoorOpened = saveData.value("corridorDoorOpened", false);
    sceneManager->tourCompleted = saveData.value("tourCompleted", false);
    sceneManager->bullyPhase = saveData.value("bullyPhase", 0);
    sceneManager->bullyTriggered = saveData.value("bullyTriggered", false);

    enemies.clear(); paperPlanes.clear(); stones.clear();
    injectors.clear(); feedbackMessages.clear();
    PlayMusic("normal");
}

void Game::StartDemoGame() {
    StartNewGame();
    isDemo = true;
    if (sceneManager) sceneManager->isDemo = true;
}

void Game::SaveGame() {
    if (!player || !sceneManager) return;
    json data;
    data["x"] = player->x; data["y"] = player->y;
    data["health"] = player->health;
    data["scene"] = sceneManager->currentScene;
    data["combo"] = player->combo;
    data["hasAdrenaline"] = player->hasAdrenaline;
    data["backpackTaken"] = sceneManager->backpackTaken;
    data["waterTaken"] = sceneManager->waterTaken;
    data["keyTaken"] = sceneManager->keyTaken;
    data["moneyTaken"] = sceneManager->moneyTaken;
    data["doorOpened"] = sceneManager->doorOpened;
    data["corridorDoorOpened"] = sceneManager->corridorDoorOpened;
    data["tourCompleted"] = sceneManager->tourCompleted;
    data["bullyPhase"] = sceneManager->bullyPhase;
    data["bullyTriggered"] = sceneManager->bullyTriggered;
    Utils::SaveGame(data);
    feedbackMessages.push_back({"KAYDEDILDI!", RENDER_WIDTH / 2.0f, 80, 2000, GREEN});
}

void Game::HandleInput(float dt) {
    if (state != "playing" || !player) return;

    if (IsKeyPressed(KEY_ESCAPE)) {
        state = "paused";
        menu = std::make_unique<MenuSystem>(RENDER_WIDTH, RENDER_HEIGHT);
        if (fontLoaded) menu->SetFont(pixelFont);
        menu->ShowPauseMenu();
        return;
    }

    if (IsKeyPressed(KEY_F5)) SaveGame();

    // F11 for fullscreen toggle
    if (IsKeyPressed(KEY_F11)) ToggleFullscreen();

    // F3 for Debug Menu
    if (IsKeyPressed(KEY_F3)) debugMenuVisible = !debugMenuVisible;

    if (debugMenuVisible) {
        UpdateDebugMenu();
        return; // Block other inputs while debug is open
    }

    bool dialogueActive = sceneManager && sceneManager->dialogue.IsActive();

    if (IsKeyPressed(KEY_E) && !dialogueActive) { player->StartPunch(false); PlaySfx("punch"); }
    if (IsKeyPressed(KEY_Q) && !dialogueActive) { player->StartPunch(true); PlaySfx("punch"); }
    if (IsKeyPressed(KEY_F) && !dialogueActive) { if (!TryCollectPaperPlane()) TryCollectStone(); }
    if (IsKeyPressed(KEY_X) && !dialogueActive) { player->UseAdrenaline(); PlaySfx("injector"); }

    if (IsKeyPressed(KEY_ONE)) {
        if (player->isAiming) player->StopAim(); else player->StartAim();
    }
    if (IsKeyPressed(KEY_TWO)) {
        if (player->isAimingStone) player->StopAimStone(); else player->StartAimStone();
    }

    if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT) && (player->isAiming || player->isAimingStone)) {
        aimStartPos = GetWorldMousePos();
    }
    if (IsMouseButtonReleased(MOUSE_BUTTON_LEFT) && (player->isAiming || player->isAimingStone)) {
        HandleMouseUp();
    }
}

void Game::HandleMouseUp() {
    if (!player || !sceneManager) return;
    Vector2 worldMouse = GetWorldMousePos();
    float dx = player->x - worldMouse.x;
    float dy = (player->y - GetAimHeightOffset()) - worldMouse.y;
    player->facingLeft = dx < 0;

    const SceneData& sceneData = sceneManager->scenes[sceneManager->currentScene];

    if (player->isAimingStone && player->stoneCount > 0) {
        float svx = dx * 0.12f, svy = dy * 0.12f;
        float vel = sqrtf(svx * svx + svy * svy);
        if (vel > 18.0f) { float s = 18.0f / vel; svx *= s; svy *= s; }
        if (svy < -12) svy = -12;
        stones.emplace_back(player->x, player->y - GetAimHeightOffset(), svx, svy, sceneData.worldWidth, (float)RENDER_HEIGHT);
        player->stoneCount--; player->StopAimStone();
    } else if (player->isAiming && player->paperPlaneCount > 0) {
        float pvx = dx * 0.15f, pvy = dy * 0.15f;
        paperPlanes.emplace_back(player->x, player->y - GetAimHeightOffset(), pvx, pvy, sceneData.worldWidth, (float)RENDER_HEIGHT);
        player->paperPlaneCount--; player->StopAim();
    }
}

float Game::GetAimHeightOffset() {
    if (!sceneManager) return 180;
    return 45 * sceneManager->GetCharScale();
}

Vector2 Game::GetWorldMousePos() {
    Vector2 mp = GetMousePosition();
    // Map mouse from window coordinates to render target coordinates
    float scaleX = (float)RENDER_WIDTH / GetScreenWidth();
    float scaleY = (float)RENDER_HEIGHT / GetScreenHeight();
    float camX = sceneManager ? sceneManager->cameraX : 0;
    return {mp.x * scaleX + camX, mp.y * scaleY};
}

bool Game::TryCollectPaperPlane() {
    if (!player || player->isCollecting) return false;
    Rect collRect = {player->x - 100, player->y - 400, 200, 400};
    for (int i = (int)paperPlanes.size() - 1; i >= 0; i--) {
        if (paperPlanes[i].onGround && Utils::RectCollision(collRect, paperPlanes[i].GetRect())) {
            paperPlanes.erase(paperPlanes.begin() + i);
            player->StartCollect("plane"); PlaySfx("blip");
            feedbackMessages.push_back({"+1 Kagit Ucak", player->x, player->y - 150, 1000, WHITE});
            return true;
        }
    }
    return false;
}

bool Game::TryCollectStone() {
    if (!player || player->isCollecting) return false;
    Rect collRect = {player->x - 100, player->y - 400, 200, 400};
    for (int i = (int)stones.size() - 1; i >= 0; i--) {
        if (stones[i].onGround && Utils::RectCollision(collRect, stones[i].GetRect())) {
            stones.erase(stones.begin() + i);
            player->StartCollect("stone"); PlaySfx("blip");
            feedbackMessages.push_back({"+1 Tas", player->x, player->y - 150, 1000, GRAY});
            return true;
        }
    }
    return false;
}

void Game::SpawnRandomStone() {
    if (!sceneManager) return;
    const SceneData& data = sceneManager->scenes[sceneManager->currentScene];
    float sx = Utils::RandomFloat(50, data.worldWidth - 100);
    float groundY = RENDER_HEIGHT - 100 - sceneManager->GetFootOffset();
    stones.emplace_back(sx, groundY - 200, 0, 0, data.worldWidth, (float)RENDER_HEIGHT);
}

void Game::SpawnPaperPlane() {
    if (!sceneManager) return;
    const SceneData& data = sceneManager->scenes[sceneManager->currentScene];
    float camX = sceneManager->cameraX;
    bool fromRight = Utils::RandomFloat(0, 1) < 0.8f;
    float startX = fromRight ? camX + RENDER_WIDTH + 150 : camX - 150;
    float startY = 50 + Utils::RandomFloat(0, 200);
    float pvx = (fromRight ? -1 : 1) * (15 + Utils::RandomFloat(0, 8));
    float pvy = -1.5f - Utils::RandomFloat(0, 2);
    paperPlanes.emplace_back(startX, startY, pvx, pvy, data.worldWidth, (float)RENDER_HEIGHT);
}

void Game::SpawnTestEnemy() {
    if (!sceneManager) return;
    int type = Utils::RandomInt(0, 6);
    float ey = (float)RENDER_HEIGHT - 100 - sceneManager->GetEnemyFootOffset();
    enemies.emplace_back(RENDER_WIDTH / 2.0f + 250, ey,
                         sceneManager->GetEnemyScale(),
                         sceneManager->scenes[sceneManager->currentScene].worldWidth,
                         (float)RENDER_HEIGHT, type);
}

void Game::Update(float dt) {
    if (IsMusicValid(currentMusic)) UpdateMusicStream(currentMusic);

    if (state == "menu") {
        std::string result = menu->Update(dt);
        if (result == "new_game") StartNewGame();
        else if (result == "continue") ContinueGame();
        else if (result == "demo") StartDemoGame();
        else if (result == "exit") { CloseWindow(); }
    }
    else if (state == "playing") {
        // Handle Zil sound sequencing
        if (sceneManager && sceneManager->playZilFlag) {
            sceneManager->playZilFlag = false;
            if (IsSoundValid(zilSfx)) {
                SetSoundVolume(zilSfx, settings.sfxVolume / 100.0f);
                PlaySound(zilSfx);
                zilAudioState = 1;
                SetMusicVolume(currentMusic, (settings.musicVolume / 100.0f) * 0.2f);
            }
        }

        if (zilAudioState == 1 && !IsSoundPlaying(zilSfx)) {
            if (IsSoundValid(ogrenciZilSfx)) {
                SetSoundVolume(ogrenciZilSfx, settings.sfxVolume / 100.0f);
                PlaySound(ogrenciZilSfx);
                zilAudioState = 2;
            } else {
                zilAudioState = 0;
                SetMusicVolume(currentMusic, settings.musicVolume / 100.0f);
            }
        } else if (zilAudioState == 2 && !IsSoundPlaying(ogrenciZilSfx)) {
            zilAudioState = 0;
            SetMusicVolume(currentMusic, settings.musicVolume / 100.0f);
        }

        // Handle PC open request via WebView
        if (sceneManager && sceneManager->openComputerContext) {
            sceneManager->openComputerContext = false;
            
            std::string osUrl = "os.html";

            // Demo mode override logic
            if (sceneManager->isDemo && sceneManager->demoPhase == 3) {
                sceneManager->demoPhase = 4;
                sceneManager->customTask = "Serbest calisma";
                osUrl += "#demo=true";
            }
            
            std::string cwd = GetWorkingDirectory();
            std::string urlPath = cwd + "/" + osUrl;
            std::string finalUrl = "file:///";
            for (char c : urlPath) {
                if (c == ' ') finalUrl += "%20";
                else if (c == '\\') finalUrl += '/';
                else finalUrl += c;
            }
            WebViewOS::Initialize(GetWindowHandle(), finalUrl);
            state = "webview_active";
            return;
        }

        HandleInput(dt);

        bool dialogueActive = sceneManager && sceneManager->dialogue.IsActive();
        float groundY = (float)RENDER_HEIGHT - 100 - sceneManager->GetFootOffset();

        player->minX = (float)sceneManager->scenes[sceneManager->currentScene].leftWall;
        player->maxX = (float)sceneManager->scenes[sceneManager->currentScene].rightWall;
        player->scale = sceneManager->GetCharScale(); // Keep scale in sync

        player->Update(dt, groundY, dialogueActive, sceneManager->backpackTaken);

        float pMaxX = player->maxX;
        sceneManager->Update(player->x, player->y, dt, dialogueActive,
                             player->x, player->y, pMaxX);
        player->maxX = pMaxX;
        // Re-sync walls/scale after potential scene change
        player->minX = (float)sceneManager->scenes[sceneManager->currentScene].leftWall;
        player->maxX = (float)sceneManager->scenes[sceneManager->currentScene].rightWall;
        player->scale = sceneManager->GetCharScale();

        float enemyGroundY = (float)RENDER_HEIGHT - 100 - sceneManager->GetEnemyFootOffset();
        Rect playerRect = player->GetRect();

        for (int i = (int)enemies.size() - 1; i >= 0; i--) {
            std::string result = enemies[i].Update(playerRect, dt, injectors, enemyGroundY, dialogueActive);
            if (!enemies[i].alive) {
                if (Utils::RandomFloat(0, 1) < 0.3f) injectors.emplace_back(enemies[i].x, enemies[i].y - 20);
                enemies.erase(enemies.begin() + i); continue;
            }
            if (result == "attack" && !player->invulnerable && !dialogueActive) player->TakeDamage(enemies[i].damage);
            for (auto& proj : enemies[i].projectiles) {
                if (proj.active && Utils::RectCollision(proj.GetRect(), playerRect)) {
                    proj.active = false;
                    if (!player->invulnerable && !dialogueActive) player->TakeDamage(proj.damage);
                }
            }
        }

        for (int i = (int)paperPlanes.size() - 1; i >= 0; i--) {
            paperPlanes[i].Update(dt, groundY);
            if (!paperPlanes[i].alive) paperPlanes.erase(paperPlanes.begin() + i);
        }

        float stoneGroundY = (float)RENDER_HEIGHT - 100 - sceneManager->GetFootOffset();
        float stoneOffset = fabsf(sceneManager->GetFootOffset()) * 0.3f;
        for (int i = (int)stones.size() - 1; i >= 0; i--) {
            stones[i].Update(dt, stoneGroundY, stoneOffset);
            if (!stones[i].alive) stones.erase(stones.begin() + i);
        }

        // Punch hit
        if (player->punching && player->currentAnimation == "punch" &&
            player->frameIndex >= 0.5f && player->frameIndex < 4 && !player->punchHitRegistered)
        {
            Rect punchRect = player->GetPunchRect();
            double now = GetTime() * 1000.0;
            for (auto& enemy : enemies) {
                if (enemy.alive && Utils::RectCollision(punchRect, enemy.GetRect())) {
                    player->punchHitRegistered = true;
                    if (now - player->lastHitTime <= player->comboDecay) player->combo++; else player->combo = 1;
                    player->lastHitTime = now;
                    int dmg = combat.CalculateDamage(CombatSystem::PUNCH_DAMAGE, player->combo, player->damageMultiplier);
                    enemy.TakeDamage(dmg); break;
                }
            }
        }

        for (int i = (int)injectors.size() - 1; i >= 0; i--) {
            if (injectors[i].active && Utils::RectCollision(injectors[i].GetRect(), playerRect)) {
                injectors[i].active = false; injectors.erase(injectors.begin() + i);
                player->hasAdrenaline = true; PlaySfx("injector");
            }
        }

        for (int i = (int)feedbackMessages.size() - 1; i >= 0; i--) {
            feedbackMessages[i].y -= 1; feedbackMessages[i].timer -= dt;
            if (feedbackMessages[i].timer <= 0) feedbackMessages.erase(feedbackMessages.begin() + i);
        }

        std::string sceneName = sceneManager->currentScene;
        if (sceneName == "outside" || sceneName == "school") {
            stoneSpawnTimer += dt;
            if (stoneSpawnTimer >= 1000 + Utils::RandomFloat(0, 2000)) { stoneSpawnTimer = 0; SpawnRandomStone(); }
        }
        if (sceneName == "kat1" || sceneName == "atolye_koridor") {
            planeSpawnTimer += dt;
            if (planeSpawnTimer >= 10000 + Utils::RandomFloat(0, 5000)) {
                planeSpawnTimer = 0;
                if (Utils::RandomFloat(0, 1) < 0.55f) SpawnPaperPlane();
            }
        }

        autoSaveTimer += dt;
        if (autoSaveTimer >= autoSaveInterval) { autoSaveTimer = 0; SaveGame(); }

        if (player->health <= 0) {
            state = "menu";
            menu = std::make_unique<MenuSystem>(RENDER_WIDTH, RENDER_HEIGHT);
            if (fontLoaded) menu->SetFont(pixelFont);
            PlayMusic("battle");
        }
    }
    else if (state == "paused") {
        // F11 fullscreen in pause too
        if (IsKeyPressed(KEY_F11)) ToggleFullscreen();

        std::string result = menu->Update(dt);
        if (result == "resume") state = "playing";
        else if (result == "save") SaveGame();
        else if (result == "main_menu") {
            state = "menu";
            menu = std::make_unique<MenuSystem>(RENDER_WIDTH, RENDER_HEIGHT);
            if (fontLoaded) menu->SetFont(pixelFont); PlayMusic("battle");
        }
    }
    else if (state == "computer") {
        UpdateComputerScreen(dt);
    }
    else if (state == "webview_active") {
        // If the webview requested close via JS callback
        if (WebViewOS::IsCloseRequested()) {
            WebViewOS::Hide();
            WebViewOS::ClearCloseRequested();
            state = "playing";
        }
    }
}

void Game::Draw() {
    // Render everything to the fixed-size render target
    BeginTextureMode(renderTarget);
    ClearBackground(BLACK);

    if (state == "menu") {
        menu->Draw();
    }
    else if (state == "playing" || state == "paused") {
        if (sceneManager) sceneManager->Draw();

        float camX = sceneManager ? sceneManager->cameraX : 0;

        // Draw Layer Order (Matches JS): PaperPlanes -> Stones -> Player -> Enemies -> Scene NPCs -> Foreground
        for (auto& p : paperPlanes) { float ox = p.x; p.x -= camX; p.Draw(); p.x = ox; }
        for (auto& s : stones) { float ox = s.x; s.x -= camX; s.Draw(); s.x = ox; }
        
        // 1. Player (Tunahan) - En alt katman (after background/objects)
        if (player) { float ox = player->x; player->x -= camX; player->Draw(); player->x = ox; }
        
        // 2. Zorbalar (Enemies)
        for (auto& e : enemies) { float ox = e.x; e.x -= camX; e.Draw(GetFrameTime() * 1000); e.x = ox; }
        
        // 3. Scene NPCs (Teachers and Students - drawn on top of player/enemies in JS)
        if (sceneManager) sceneManager->DrawNPCs();
        
        // 4. Items / Injectors
        for (auto& inj : injectors) { float ox = inj.x; inj.x -= camX; inj.Draw(GetFrameTime() * 1000); inj.x = ox; }

        if (sceneManager) sceneManager->DrawForeground();
        DrawUI();

        // Aim line
        if (player && (player->isAiming || player->isAimingStone)) {
            Vector2 worldMouse = GetWorldMousePos();
            float startX = player->x - camX;
            float startY = player->y - GetAimHeightOffset();
            float endX = worldMouse.x - camX;
            float endY = worldMouse.y;
            Color lineColor = player->isAimingStone ? YELLOW : SKYBLUE;
            DrawLineEx({startX, startY}, {endX, endY}, 5, lineColor);
            DrawCircle((int)endX, (int)endY, 10, lineColor);
        }

        if (state == "paused" && menu) menu->Draw();

        if (debugMenuVisible) DrawDebugMenu();
    }
    else if (state == "computer") {
        DrawComputerScreen();
    }
    else if (state == "webview_active") {
        // Just draw the paused game underneath
        if (sceneManager) sceneManager->Draw();
        float camX = sceneManager ? sceneManager->cameraX : 0;
        if (player) { float ox = player->x; player->x -= camX; player->Draw(); player->x = ox; }
        DrawText("Web Tarayici Acik (Kapatmak icin JS API kullanin)", 10, 10, 20, GREEN);
    }

    EndTextureMode();

    // Now draw the render target scaled to the window, maintaining aspect ratio
    BeginDrawing();
    ClearBackground(BLACK);

    float screenW = (float)GetScreenWidth();
    float screenH = (float)GetScreenHeight();
    float scaleRatio = std::min(screenW / RENDER_WIDTH, screenH / RENDER_HEIGHT);
    float destW = RENDER_WIDTH * scaleRatio;
    float destH = RENDER_HEIGHT * scaleRatio;
    float offsetX = (screenW - destW) / 2.0f;
    float offsetY = (screenH - destH) / 2.0f;

    // RenderTexture is flipped vertically in OpenGL
    Rectangle src = {0, 0, (float)renderTarget.texture.width, -(float)renderTarget.texture.height};
    Rectangle dest = {offsetX, offsetY, destW, destH};
    DrawTexturePro(renderTarget.texture, src, dest, {0, 0}, 0, WHITE);

    EndDrawing();
}

void Game::DrawUI() {
    if (!player) return;

    int barW = 200, barH = 25;
    int barX = RENDER_WIDTH - barW - 10, barY = 20;

    DrawRectangle(barX, barY, barW, barH, {255, 0, 0, 204});
    float hpR = (float)player->health / player->maxHealth;
    DrawRectangle(barX, barY, (int)(barW * hpR), barH, {0, 255, 0, 204});
    DrawRectangleLines(barX, barY, barW, barH, BLACK);
    DrawText(TextFormat("%d/%d", player->health, player->maxHealth), barX + 5, barY + 3, 20, WHITE);

    if (player->combo > 1) combat.DrawComboText(player->combo, RENDER_WIDTH / 2 - 150, 80);

    if (player->hasAdrenaline) {
        DrawCircle(40, 75, 16, {255, 50, 50, 255});
        DrawCircleLines(40, 75, 16, WHITE);
        DrawText("Adrenalin (X)", 65, 68, 24, WHITE);
    }
    if (player->adrenalineActive) {
        DrawText(TextFormat("BOOST: %.1fs", player->adrenalineTimer / 1000), 20, 105, 30, {255, 100, 100, 255});
    }
    if (player->paperPlaneCount > 0) DrawText(TextFormat("Ucak x %d", player->paperPlaneCount), 25, 120, 26, WHITE);
    if (player->stoneCount > 0) DrawText(TextFormat("Tas x %d", player->stoneCount), 25, 150, 26, LIGHTGRAY);

    DrawText(TextFormat("FPS: %d", GetFPS()), 10, 5, 20, GRAY);

    DrawText("GOREVLER:", 10, 50, 24, GOLD);
    auto tasks = GetCurrentTasks();
    int taskY = 78;
    for (auto& task : tasks) {
        DrawText(TextFormat("- %s", task.c_str()), 15, taskY, 20, WHITE);
        taskY += 25;
    }

    float camX = sceneManager ? sceneManager->cameraX : 0;
    for (auto& msg : feedbackMessages) {
        float alpha = msg.timer / 1000.0f;
        Color c = msg.color; c.a = (unsigned char)(alpha * 255);
        DrawText(msg.text.c_str(), (int)(msg.x - camX - MeasureText(msg.text.c_str(), 24) / 2), (int)msg.y, 24, c);
    }

    // Interaction prompt
    if (sceneManager && !sceneManager->interactionPrompt.empty()) {
        const char* prompt = sceneManager->interactionPrompt.c_str();
        int promptW = MeasureText(prompt, 28);
        int promptX = RENDER_WIDTH / 2 - promptW / 2;
        int promptY = RENDER_HEIGHT - 250;
        DrawRectangle(promptX - 10, promptY - 5, promptW + 20, 38, {0, 0, 0, 180});
        DrawText(prompt, promptX, promptY, 28, GOLD);
    }
}

std::vector<std::string> Game::GetCurrentTasks() {
    if (!customTask.empty()) return {customTask};
    std::vector<std::string> tasks;
    if (!sceneManager) return tasks;

    auto& sm = *sceneManager;

    // Demo custom task takes priority
    if (!sm.customTask.empty()) {
        tasks.push_back(sm.customTask);
        return tasks;
    }

    if (sm.currentScene == "game") {
        if (!sm.backpackTaken) tasks.push_back("Cantani al");
        else tasks.push_back("Odandan cik");
    } else if (sm.currentScene == "koridor") {
        tasks.push_back("Koridorun sonuna ulas");
        if (!sm.keyTaken) tasks.push_back("Anahtari al");
        if (!sm.moneyTaken) tasks.push_back("Parayi al");
    } else if (sm.currentScene == "outside") {
        tasks.push_back("Okula git");
    } else if (sm.currentScene == "school") {
        tasks.push_back("Okula gir");
    } else if (sm.currentScene == "kat1") {
        if (sm.bullyPhase >= 1 && sm.bullyPhase <= 4) tasks.push_back("Sinemayigi izle");
        else if (sm.bullyPhase == 5) tasks.push_back("Zorbayi durdur");
        else if (sm.bullyPhase == 13) tasks.push_back("Saga vurmak icin E'ye bas");
        else tasks.push_back("Emre Hoca'yi bul");
    } else if (sm.currentScene == "atolye_koridor") {
        if (sm.tourPhase < 6) tasks.push_back("Emre Hoca'yi takip et");
        else if (sm.isDemo && sm.demoPhase == 1) tasks.push_back("Atolyeleri gez");
        else if (!sm.isDemo) tasks.push_back("Ucak atolyesine git");
        else tasks.push_back("Etrafi kesfet");
    } else if (sm.currentScene == "atolye1") {
        if (!sm.radioHeadsetFound && !sm.isDemo) tasks.push_back("Ucagi karistir");
        else tasks.push_back("Atolyeyi kesfet");
    } else if (sm.currentScene == "atolye2") {
        if (sm.isDemo && sm.demoPhase == 3) tasks.push_back("Bilgisayari ac");
        else tasks.push_back("Atolyeyi kesfet");
    } else { tasks.push_back("Etrafi kesfet"); }
    return tasks;
}

void Game::UpdateComputerScreen(float dt) {
    if (IsKeyPressed(KEY_ESCAPE)) {
        state = "playing"; // Exit computer
    }

    Vector2 m = GetMousePosition();
    float scaleX = (float)GetScreenWidth() / RENDER_WIDTH;
    float scaleY = (float)GetScreenHeight() / RENDER_HEIGHT;
    Vector2 virtualMouse = { m.x / scaleX, m.y / scaleY };

    if (activeApp == "none") {
        // Desktop icons interaction
        Rect notepadRect = {50, 50, 80, 80};
        Rect paintRect = {50, 150, 80, 80};
        Rect voltsimRect = {50, 250, 80, 80};

        if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
            if (Utils::RectCollision({virtualMouse.x, virtualMouse.y, 1, 1}, notepadRect)) activeApp = "notepad";
            if (Utils::RectCollision({virtualMouse.x, virtualMouse.y, 1, 1}, paintRect)) activeApp = "paint";
            if (Utils::RectCollision({virtualMouse.x, virtualMouse.y, 1, 1}, voltsimRect)) activeApp = "voltsim";
        }
    } else {
        // App open logic (Window Close Button)
        Rect closeBtn = {RENDER_WIDTH - 50, 20, 30, 30};
        if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT) && Utils::RectCollision({virtualMouse.x, virtualMouse.y, 1, 1}, closeBtn)) {
            activeApp = "none";
        }
        
        // VoltSim tutorial progression via button
        if (activeApp == "voltsim" && tutorialStep > 0 && tutorialStep <= 4) {
            Rect nextBtn = {RENDER_WIDTH - 250 + 10, 200, 230, 40}; // approximate rect in tutorial overlay
            if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT) && Utils::RectCollision({virtualMouse.x, virtualMouse.y, 1, 1}, nextBtn)) {
                tutorialStep++;
                if (tutorialStep > 4) {
                    sceneManager->dialogue.Start({{"Ogretmen", "Aferin! Basit bir devreyi kurdunuz. Simulasyon tamamlandi.", ""}});
                    state = "playing";
                    activeApp = "none";
                }
            }
        }
    }
}

void Game::DrawComputerScreen() {
    // Desktop background
    ClearBackground({0, 128, 128, 255}); // Win98 teal

    // Taskbar
    DrawRectangle(0, RENDER_HEIGHT - 40, RENDER_WIDTH, 40, {192, 192, 192, 255});
    DrawRectangle(2, RENDER_HEIGHT - 38, 100, 36, {220, 220, 220, 255}); // Start button
    if (fontLoaded) DrawTextEx(pixelFont, "Baslat", {15, RENDER_HEIGHT - 30}, 20, 1, BLACK);

    // Desktop Icons
    if (fontLoaded) {
        DrawTextEx(pixelFont, "[Notepad]", {50, 100}, 20, 1, WHITE);
        DrawTextEx(pixelFont, "[Paint]", {50, 200}, 20, 1, WHITE);
        DrawTextEx(pixelFont, "[VoltSim]", {50, 300}, 20, 1, WHITE);
    }

    if (activeApp != "none") {
        // App Window
        DrawRectangle(100, 10, RENDER_WIDTH - 120, RENDER_HEIGHT - 60, {220, 220, 220, 255});
        DrawRectangle(100, 10, RENDER_WIDTH - 120, 30, {0, 0, 128, 255}); // Window title bar
        DrawRectangle(RENDER_WIDTH - 50, 15, 20, 20, {192, 192, 192, 255}); // Close button
        
        if (fontLoaded) {
            DrawTextEx(pixelFont, activeApp.c_str(), {110, 15}, 20, 1, WHITE);
            DrawTextEx(pixelFont, "X", {RENDER_WIDTH - 45, 16}, 20, 1, BLACK);
            
            std::string content = "C++ Portunda bu uygulama (UI) henuz entegre edilmedi.\nCikmak icin carpiya veya ESC tusuna basabilirsiniz.";
            DrawTextEx(pixelFont, content.c_str(), {120, 100}, 22, 1, BLACK);
            
            // Draw dummy VoltSim Tutorial Overlay
            if (activeApp == "voltsim" && tutorialStep > 0 && tutorialStep <= 4) {
                Rect tutOverlay = {RENDER_WIDTH - 250, 50, 240, 200};
                DrawRectangleRec({tutOverlay.x, tutOverlay.y, tutOverlay.width, tutOverlay.height}, {0, 0, 0, 200});
                DrawRectangleLinesEx({tutOverlay.x, tutOverlay.y, tutOverlay.width, tutOverlay.height}, 2, GREEN);
                DrawTextEx(pixelFont, "DERS 1: LED YAKMA", {RENDER_WIDTH - 240, 60}, 20, 1, GREEN);
                
                std::string tutMsg;
                if (tutorialStep == 1) tutMsg = "1. Guc Kaynagi ekle";
                else if (tutorialStep == 2) tutMsg = "2. Anahtar ekle";
                else if (tutorialStep == 3) tutMsg = "3. LED ekle";
                else if (tutorialStep == 4) tutMsg = "4. Bagla ve yak!";
                
                DrawTextEx(pixelFont, tutMsg.c_str(), {RENDER_WIDTH - 240, 100}, 18, 1, WHITE);
                
                // Next Button
                DrawRectangle(RENDER_WIDTH - 240, 200, 220, 30, GREEN);
                DrawTextEx(pixelFont, tutorialStep == 4 ? "TAMAMLADIM" : "ONAYLIYORUM", {RENDER_WIDTH - 230, 205}, 18, 1, BLACK);
            }
        }
    }
}

void Game::UpdateDebugMenu() {
    Vector2 m = GetMousePosition();
    float scaleX = (float)GetScreenWidth() / RENDER_WIDTH;
    float scaleY = (float)GetScreenHeight() / RENDER_HEIGHT;
    Vector2 virtualMouse = { m.x / scaleX, m.y / scaleY };

    if (!IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) return;

    // Healing
    if (Utils::RectCollision({virtualMouse.x, virtualMouse.y, 1, 1}, {50, 100, 200, 30})) {
        if (player) player->health = player->maxHealth;
        feedbackMessages.push_back({"Can Fullendi!", RENDER_WIDTH/2.0f, 200, 2000, GREEN});
    }

    // Teleports
    const char* scenes[] = {"game", "koridor", "outside", "school", "kat1", "atolye_koridor", "atolye1", "atolye2"};
    for (int i = 0; i < 8; i++) {
        if (Utils::RectCollision({virtualMouse.x, virtualMouse.y, 1, 1}, {50.0f, 150.0f + i*40, 200.0f, 30.0f})) {
            if (sceneManager) {
                sceneManager->ChangeScene(scenes[i], player->x, player->y, "center");
                player->x = RENDER_WIDTH/2.0f;
                // Force sync
                player->scale = sceneManager->GetCharScale();
                player->minX = (float)sceneManager->scenes[sceneManager->currentScene].leftWall;
                player->maxX = (float)sceneManager->scenes[sceneManager->currentScene].rightWall;
            }
            debugMenuVisible = false;
        }
    }

    // Items
    if (Utils::RectCollision({virtualMouse.x, virtualMouse.y, 1, 1}, {300, 100, 200, 30})) {
        if (player) player->paperPlaneCount += 10;
        feedbackMessages.push_back({"+10 Ucak", RENDER_WIDTH/2.0f, 200, 2000, WHITE});
    }
    if (Utils::RectCollision({virtualMouse.x, virtualMouse.y, 1, 1}, {300, 140, 200, 30})) {
        if (player) player->stoneCount += 10;
        feedbackMessages.push_back({"+10 Tas", RENDER_WIDTH/2.0f, 200, 2000, GRAY});
    }
    if (Utils::RectCollision({virtualMouse.x, virtualMouse.y, 1, 1}, {300, 180, 200, 30})) {
        if (sceneManager) sceneManager->backpackTaken = true;
        feedbackMessages.push_back({"Canta Alindi", RENDER_WIDTH/2.0f, 200, 2000, ORANGE});
    }
    if (Utils::RectCollision({virtualMouse.x, virtualMouse.y, 1, 1}, {300, 220, 200, 30})) {
        if (player) injectors.emplace_back(player->x, player->y);
        feedbackMessages.push_back({"Adrenalin Eklendi", RENDER_WIDTH/2.0f, 200, 2000, RED});
    }
}

void Game::DrawDebugMenu() {
    DrawRectangle(0, 0, RENDER_WIDTH, RENDER_HEIGHT, {0, 0, 0, 200});
    
    DrawTextEx(pixelFont, "DEBUG MENU (Cikmak icin F3)", {50, 50}, 30, 1, GOLD);

    // General
    DrawRectangle(50, 100, 200, 30, RED);
    DrawTextEx(pixelFont, "Cani Fullle", {60, 105}, 20, 1, WHITE);

    // Scenes
    const char* scenes[] = {"Oda (game)", "Koridor", "Disari (outside)", "Okul (school)", "Kat 1", "Atolye Koridor", "Atolye 1", "Atolye 2"};
    DrawTextEx(pixelFont, "Sahneler:", {50, 150}, 20, 1, SKYBLUE);
    for (int i = 0; i < 8; i++) {
        DrawRectangle(50, 180 + i*40, 200, 30, DARKBLUE);
        DrawTextEx(pixelFont, scenes[i], {60, 185 + (float)i*40}, 20, 1, WHITE);
    }

    // Items
    DrawTextEx(pixelFont, "Miktar / İtemler:", {300, 50}, 20, 1, SKYBLUE);
    DrawRectangle(300, 100, 200, 30, DARKGRAY); DrawTextEx(pixelFont, "+10 Kagit Ucak", {310, 105}, 20, 1, WHITE);
    DrawRectangle(300, 140, 200, 30, DARKGRAY); DrawTextEx(pixelFont, "+10 Tas", {310, 145}, 20, 1, WHITE);
    DrawRectangle(300, 180, 200, 30, DARKGRAY); DrawTextEx(pixelFont, "Canta Ver", {310, 185}, 20, 1, WHITE);
    DrawRectangle(300, 220, 200, 30, DARKGRAY); DrawTextEx(pixelFont, "Adrenalin Ekle", {310, 225}, 20, 1, RED);
}
