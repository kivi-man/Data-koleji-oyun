#pragma once
#include "utils.h"
#include <vector>
#include <string>

class Player {
public:
    float x, y;
    float scale;
    float minX, maxX;

    // Physics
    float vx, vy;
    float walkSpeed;
    float jumpForce;
    float gravity;
    bool onGround;

    // Dimensions
    float width, height;

    // State
    bool facingLeft;
    bool moving;
    bool punching;

    // Health & combat
    int maxHealth;
    int health;
    int combo;
    double lastHitTime;
    float comboDecay;

    // Adrenaline
    bool hasAdrenaline;
    bool adrenalineActive;
    float adrenalineTimer;
    float adrenalineDuration;
    float speedMultiplier;
    float damageMultiplier;

    // Invulnerability
    bool invulnerable;
    float invulnTimer;
    float flashAlpha;

    // Animation
    float frameIndex;
    float animationSpeed;
    std::string currentAnimation;
    std::vector<Texture2D> idleFrames;
    std::vector<Texture2D> walkFrames;
    std::vector<Texture2D> punchFrames;
    std::vector<Texture2D> jumpFrames;
    std::vector<Texture2D> collectFrames;
    std::vector<Texture2D> aimFrames;
    Texture2D aimLayerImg;
    Texture2D backpackImg;
    Texture2D emoteNormal;
    Texture2D emoteSpeak;
    bool hasBackpack;
    bool punchHitRegistered;

    // Input reversal
    bool reverseRightInputUntilRelease;

    // Paper plane
    int paperPlaneCount;
    bool isCollecting;
    bool isAiming;

    // Stone
    int stoneCount;
    bool isAimingStone;

    // Emote
    bool isSpeaking;
    float speakTimer;

    bool loaded;

    Player(float x, float y, float scale = 4.0f);
    ~Player();

    void LoadAnimations();
    void Update(float dt, float groundY, bool dialogueActive, bool backpackTaken = false);
    void Animate(const std::string& newState, float dt);
    void Draw();

    void StartPunch(bool left);
    void UseAdrenaline();
    void StartAim();
    void StopAim();
    void StartAimStone();
    void StopAimStone();
    void StartCollect(const std::string& type = "plane");
    void TakeDamage(int damage);
    void TriggerSpeak();
    void StartRightInputReversal();

    Rect GetRect() const;
    Rect GetPunchRect() const;
    void DrawHealth();

    std::vector<Texture2D>& GetCurrentFrames();
};
