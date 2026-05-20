#pragma once
#include "utils.h"
#include <vector>

struct Projectile {
    float x, y;
    float vx, vy;
    float gravity = 0.5f;
    float rotation = 0;
    float rotationSpeed;
    int lifetime = 180;
    int damage = 15;
    float width = 20, height = 20;
    bool active = true;
    bool hitGround = false;

    Projectile(float x, float y, float targetX, float targetY, int dmg = 15);
    void Update(float dt, float groundY = 900);
    Rect GetRect() const;
    void Draw();
};

struct AdrenalineInjector {
    float x, y;
    bool active = true;
    float pulse = 0;
    float pulseSpeed = 0.1f;
    float width = 30, height = 30;

    AdrenalineInjector(float x, float y) : x(x), y(y) {}
    Rect GetRect() const;
    void Draw(float dt);
};

class Enemy {
public:
    float x, y;
    float scale;
    float screenWidth, screenHeight;
    int type;

    float baseWidth, baseHeight;
    float width, height;

    float baseSpeed, speed, retreatSpeed, escapeSpeed;

    std::string state;
    bool facingLeft;
    float aggressionRange, attackRange;
    float attackCooldown, attackDelay;
    bool attackActive;
    int attackFrameCount;

    int maxHealth, health;
    bool alive;
    bool invulnerable;
    float invulnTimer;

    int damage;
    bool blocking;
    float blockChance, blockCooldown;

    float stunTimer, retreatTimer, retreatDuration;
    int comboCount;
    double lastHitTime;
    float comboDecayMs;
    float baseKnockback, comboKnockbackAdd, maxKnockback;

    float escapeThreshold;
    bool escaping, injecting;
    float injectTimer, injectDuration;
    bool adrenalineBoost;
    float boostTimer, boostDuration;
    bool hasAdrenaline;

    std::vector<Projectile> projectiles;
    float throwCooldown, throwDelay;
    bool canThrow, isThrowing;
    float throwAnimationTimer;

    bool searchingInjector;
    int targetInjectorIdx;

    float frameIndex, animationSpeed;
    std::string currentAnimation;
    std::vector<Texture2D> idleFrames;
    std::vector<Texture2D> walkFrames;
    std::vector<Texture2D> attackFrames;
    std::vector<Texture2D> injectFrames;

    float flashAlpha;
    bool isBully;
    bool loaded;

    Enemy(float x, float y, float scale, float screenW, float screenH, int type = 0);
    ~Enemy();

    void LoadAnimations();
    std::string Update(const Rect& playerRect, float dt,
                       std::vector<AdrenalineInjector>& injectors,
                       float groundY, bool combatPaused);
    void Draw(float dt);
    bool TakeDamage(int damage);
    Rect GetRect() const;
    Rect GetAttackRect() const;
    void DrawHealthBar();

private:
    void KeepInsideScreen();
    std::string AggressiveBehavior(const Rect& playerRect, float dt);
    void EscapeFromPlayer(const Rect& playerRect, float dt);
    void ThrowProjectile(const Rect& playerRect);
    void StartInjection();
    void StartAdrenalineBoost();
    std::vector<Texture2D>& GetCurrentFrames();
};
