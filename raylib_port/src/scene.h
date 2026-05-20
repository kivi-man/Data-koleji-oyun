#pragma once
#include "utils.h"
#include "dialogue.h"
#include "npc.h"
#include <string>
#include <vector>
#include <map>
#include <set>
#include <memory>
#include <functional>

struct SceneData {
    std::string name;
    std::vector<std::string> bgFiles;
    float charScale = 4.0f;
    int leftWall = 0;
    int rightWall = 1536;
    float worldWidth = 1536;
    float footOffset = 0;
    float enemyScale = 4.0f;
    float enemyFootOffset = 0;
    bool noPlayer = false;
    std::string overlayFile;
    std::string foregroundFile;

    // NPC placements
    struct NPCPlacement {
        float x;
        int npcIndex;
        float yOffset;
        bool isTeacher;
        std::string teacherName;
    };
    std::vector<NPCPlacement> npcPlacements;

    // Door definitions
    struct DoorDef {
        float x;
        float width;
        std::string target;
        std::string name;
    };
    std::vector<DoorDef> doors;
};

class SceneManager {
public:
    std::map<std::string, SceneData> scenes;
    std::string currentScene;
    float cameraX;
    float targetCameraX;
    float cameraSpeed;

    // Backgrounds
    std::map<std::string, Texture2D> backgrounds;
    std::map<std::string, Texture2D> overlays;
    std::map<std::string, Texture2D> foregrounds;

    // Dialogue
    DialogueSystem dialogue;
    std::map<std::string, std::vector<DialogueLine>> sceneDialogues;

    // Interaction states
    bool backpackTaken, waterTaken, keyTaken, moneyTaken;
    bool doorOpened, corridorDoorOpened;
    bool backpackDialoguesSeen, tourCompleted;
    int bullyPhase;
    bool bullyTriggered;
    bool zilSesiPlayed;
    bool playZilFlag; // Used to request Game to play zil sound
    bool openComputerContext; // Used to request Game to open computer OS
    int tourPhase;

    // Demo mode
    bool isDemo;
    int demoPhase;
    std::set<std::string> demoVisitedWorkshops;
    std::string customTask;

    // Workshop interactions
    bool radioHeadsetFound;
    bool headsetDialogueFinished;

    // Interaction state
    std::string backpackInteractionState;

    // Cinematic
    float cinematicTimer;
    bool cinematicActive;
    std::string cinematicTarget;
    float cinematicTargetX; // For locking camera to a position
    bool hasCinematicTarget;
    float bullyTimer;

    // Emre Hoca cinematic
    int emreCinematicPhase;
    bool emreHocaTriggered;
    bool cinematicDialogueTriggered;
    float emrePhaseTimer;

    // NPCs
    std::vector<std::unique_ptr<NPC>> sceneNPCs;

    // Screen dimensions
    int screenWidth, screenHeight;

    Font pixelFont;

    SceneManager(int screenW, int screenH);
    ~SceneManager();
    void SetFont(Font f);

    void DefineScenes();
    void DefineDialogues();
    void LoadBackgrounds();
    void Update(float playerX, float playerY, float dt, bool dialogueActive,
                float& outPlayerX, float& outPlayerY, float& outPlayerMaxX);
    void Draw();
    void DrawNPCs();
    void DrawForeground();
    void ChangeScene(const std::string& scene, float& playerX, float& playerY, const std::string& side = "left");

    float GetCharScale() const;
    float GetFootOffset() const;
    float GetEnemyScale() const;
    float GetEnemyFootOffset() const;

    void SpawnSceneNPCs();

    // Interaction system
    std::string interactionPrompt; // Text shown to player
    bool sceneTransitionRequested;
    std::string sceneTransitionTarget;
    std::string sceneTransitionSide;

    void StartBackpackInteraction();
    void HandleBackpackYes(float& playerMaxX);
    void HandleWaterYes(float& playerMaxX);
    void ResetBackpackQuest(float& playerMaxX);
    void StartDoorInteraction(float& playerMaxX);
    void HandleDoorYes(float& playerMaxX);

    // Corridor interactions
    void CheckCorridorInteractions(float playerX, float& playerMaxX);
    void StartKeyInteraction();
    void HandleKeyYes(float& playerMaxX);
    void StartMoneyInteraction();
    void HandleMoneyYes(float& playerMaxX);
    void StartCorridorDoorInteraction();
    void HandleCorridorDoorYes(float& playerMaxX);

    // Scene transitions  
    void CheckSceneTransitions(float playerX, float playerY, float& outPlayerX, float& outPlayerY);
};
