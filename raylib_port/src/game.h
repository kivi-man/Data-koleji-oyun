#pragma once
#include "utils.h"
#include "player.h"
#include "enemy.h"
#include "npc.h"
#include "dialogue.h"
#include "combat.h"
#include "menu.h"
#include "scene.h"
#include "paper_plane.h"
#include "stone.h"
#include <vector>
#include <string>
#include <memory>

struct FeedbackMessage {
    std::string text;
    float x, y;
    float timer;
    Color color;
};

class Game {
public:
    // State
    std::string state; // loading, menu, playing, paused

    // Core systems
    std::unique_ptr<Player> player;
    std::unique_ptr<SceneManager> sceneManager;
    std::unique_ptr<MenuSystem> menu;
    CombatSystem combat;

    // Entities
    std::vector<Enemy> enemies;
    std::vector<std::unique_ptr<NPC>> npcs;
    std::vector<PaperPlane> paperPlanes;
    std::vector<Stone> stones;
    std::vector<AdrenalineInjector> injectors;
    std::vector<FeedbackMessage> feedbackMessages;

    // Audio
    Music normalMusic;
    Music battleMusic;
    Music currentMusic;
    Sound punchSfx;
    Sound blipSfx;
    Sound injectorSfx;
    Sound zilSfx;
    Sound ogrenciZilSfx;
    int zilAudioState; // 0=none, 1=playing_zil, 2=playing_ogrenci
    bool audioLoaded;

    // Settings
    GameSettings settings;

    // Timers
    float autoSaveTimer, autoSaveInterval;
    float stoneSpawnTimer, planeSpawnTimer;

    // Mouse
    Vector2 mouse;
    Vector2 aimStartPos;

    // Custom task
    std::string customTask;

    // Demo flag
    bool isDemo;

    // Debug
    bool debugMenuVisible;

    // Render target for resolution independence
    RenderTexture2D renderTarget;
    bool renderTargetReady;

    // Font
    Font pixelFont;
    bool fontLoaded;

    Game();
    ~Game();

    void Init();
    void LoadAudio();
    void LoadFont();

    void StartNewGame();
    void ContinueGame();
    void StartDemoGame();

    void Update(float dt);
    void Draw();
    void DrawUI();

    void UpdateDebugMenu();
    void DrawDebugMenu();

    void HandleInput(float dt);
    void HandleMouseDown();
    void HandleMouseUp();

    void UpdateComputerScreen(float dt);
    void DrawComputerScreen();
    std::string activeApp; // "none", "notepad", "paint", "voltsim"
    int tutorialStep;      // For demo mode

    bool TryCollectPaperPlane();
    bool TryCollectStone();
    void SpawnPaperPlane();
    void SpawnRandomStone();
    void SpawnTestEnemy();

    void SaveGame();
    Vector2 GetWorldMousePos();
    float GetAimHeightOffset();
    std::vector<std::string> GetCurrentTasks();

    void PlayMusic(const std::string& type);
    void PlaySfx(const std::string& name);
};
