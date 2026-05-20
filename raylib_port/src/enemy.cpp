                                                                    #include "enemy.h"
#include <cmath>
#include <algorithm>

// ============ Projectile ============
Projectile::Projectile(float x, float y, float targetX, float targetY, int dmg)
    : x(x), y(y), damage(dmg)
{
    float dx = targetX - x;
    float dy = targetY - y - 50;
    float dist = sqrtf(dx * dx + dy * dy);
    float initialSpeed = 15.0f;
    if (dist > 0) {
        vx = (dx / dist) * initialSpeed;
        vy = (dy / dist) * initialSpeed - 8;
    } else {
        vx = initialSpeed;
        vy = -8;
    }
    rotationSpeed = (float)Utils::RandomInt(10, 20);
}

void Projectile::Update(float dt, float groundY) {
    if (!active) return;
    float dtScale = dt / 16.67f;
    vy += gravity * dtScale;
    x += vx * dtScale;
    y += vy * dtScale;
    rotation += rotationSpeed * dtScale;
    lifetime--;
    if (y > groundY) { y = groundY; active = false; hitGround = true; }
    if (lifetime <= 0) active = false;
}

Rect Projectile::GetRect() const { return {x - 10, y - 10, 20, 20}; }

void Projectile::Draw() {
    if (!active) return;
    DrawCircle((int)x, (int)y, 9, DARKGRAY);
    DrawCircleLines((int)x, (int)y, 9, {70, 70, 70, 255});
    // Shadow
    DrawEllipse((int)x, (int)(y + 15), 7, 4, {0, 0, 0, 76});
}

// ============ AdrenalineInjector ============
Rect AdrenalineInjector::GetRect() const { return {x - 15, y - 15, 30, 30}; }

void AdrenalineInjector::Draw(float dt) {
    if (!active) return;
    float dtScale = dt / 16.67f;
    pulse += pulseSpeed * dtScale;
    if (pulse > 1 || pulse < 0) pulseSpeed *= -1;
    float sc = 1.0f + pulse * 0.3f;
    float size = 12 * sc;

    // Glow
    DrawCircleGradient((int)x, (int)y, 25 * sc, {255, 50, 50, 100}, {255, 50, 50, 0});
    // Body
    DrawCircle((int)x, (int)y, (int)size, {255, 50, 50, 255});
    DrawCircleLines((int)x, (int)y, (int)size, {200, 0, 0, 255});
    // Needle
    DrawRectangle((int)(x - 3), (int)(y - size - 5), 6, 10, GRAY);
}

// ============ Enemy ============
Enemy::Enemy(float x, float y, float scale, float screenW, float screenH, int type)
    : x(x), y(y), scale(scale), screenWidth(screenW), screenHeight(screenH), type(type)
{
    baseWidth = 386.0f / 7.0f;
    baseHeight = 128.0f;
    width = baseWidth * scale;
    height = baseHeight * scale;

    baseSpeed = 3.8f; speed = baseSpeed;
    retreatSpeed = 3.2f; escapeSpeed = 4.5f;

    state = "idle"; facingLeft = false;
    aggressionRange = 800; attackRange = 90;
    attackCooldown = 0; attackDelay = 800;
    attackActive = false; attackFrameCount = 0;

    maxHealth = 100; health = 100; alive = true;
    invulnerable = false; invulnTimer = 0;

    damage = 12; blocking = false;
    blockChance = 0.25f; blockCooldown = 0;

    stunTimer = 0; retreatTimer = 0; retreatDuration = 200;
    comboCount = 0; lastHitTime = 0; comboDecayMs = 2000;
    baseKnockback = 25; comboKnockbackAdd = 10; maxKnockback = 80;

    escapeThreshold = 0.3f; escaping = false;
    injecting = false; injectTimer = 0; injectDuration = 2000;
    adrenalineBoost = false; boostTimer = 0; boostDuration = 5000;
    hasAdrenaline = false;

    throwCooldown = 0; throwDelay = 3000;
    canThrow = true; isThrowing = false; throwAnimationTimer = 0;

    searchingInjector = false; targetInjectorIdx = -1;
    frameIndex = 0; animationSpeed = 0.18f;
    currentAnimation = "idle"; flashAlpha = 0;
    isBully = false; loaded = false;

    LoadAnimations();
}

Enemy::~Enemy() {
    for (auto& t : idleFrames) if (t.id > 0) UnloadTexture(t);
    for (auto& t : walkFrames) if (t.id > 0) UnloadTexture(t);
    for (auto& t : attackFrames) if (t.id > 0) UnloadTexture(t);
    for (auto& t : injectFrames) if (t.id > 0) UnloadTexture(t);
}

void Enemy::LoadAnimations() {
    const char* animTypes[] = {"idle", "walk", "attack", "inject"};
    std::vector<Texture2D>* targets[] = {&idleFrames, &walkFrames, &attackFrames, &injectFrames};

    for (int i = 0; i < 4; i++) {
        std::string path = TextFormat("Enemy_textures/enemy_%s/0.png", animTypes[i]);
        if (FileExists(path.c_str())) {
            Texture2D sheet = LoadTexture(path.c_str());
            if (sheet.id > 0) {
                int startX = (int)(type * baseWidth);
                int frameW = (int)ceilf(baseWidth);
                Texture2D frame = Utils::ExtractFrame(sheet, startX, 0, frameW, (int)baseHeight);
                targets[i]->push_back(frame);
                UnloadTexture(sheet);
            }
        }
    }

    if (idleFrames.empty()) {
        Image img = GenImageColor((int)baseWidth, (int)baseHeight, RED);
        Texture2D tex = LoadTextureFromImage(img);
        UnloadImage(img);
        idleFrames.push_back(tex);
    }
    if (walkFrames.empty()) walkFrames = idleFrames;
    if (attackFrames.empty()) attackFrames = idleFrames;
    if (injectFrames.empty()) injectFrames = idleFrames;
    loaded = true;
}

std::vector<Texture2D>& Enemy::GetCurrentFrames() {
    if (state == "walk") return walkFrames;
    if (state == "attack" || state == "throw") return attackFrames;
    if (state == "inject") return injectFrames;
    return idleFrames;
}

std::string Enemy::Update(const Rect& playerRect, float dt,
                           std::vector<AdrenalineInjector>& injectors,
                           float groundY, bool combatPaused)
{
    if (!alive) return "";

    double now = GetTime() * 1000.0;

    attackCooldown = std::max(0.0f, attackCooldown - dt);
    stunTimer = std::max(0.0f, stunTimer - dt);
    retreatTimer = std::max(0.0f, retreatTimer - dt);
    throwCooldown = std::max(0.0f, throwCooldown - dt);
    blockCooldown = std::max(0.0f, blockCooldown - dt);
    invulnTimer = std::max(0.0f, invulnTimer - dt);
    if (invulnTimer <= 0) invulnerable = false;
    if (now - lastHitTime > comboDecayMs) comboCount = 0;

    // Update projectiles
    for (int i = (int)projectiles.size() - 1; i >= 0; i--) {
        projectiles[i].Update(dt, groundY);
        if (!projectiles[i].active) projectiles.erase(projectiles.begin() + i);
    }

    if (combatPaused) return "";
    if (flashAlpha > 0) flashAlpha = std::max(0.0f, flashAlpha - 20.0f);
    if (stunTimer > 0) { state = "retreat"; return ""; }
    if (isThrowing) {
        throwAnimationTimer -= dt;
        if (throwAnimationTimer <= 0) { isThrowing = false; state = "idle"; }
        return "";
    }
    if (adrenalineBoost) {
        boostTimer -= dt;
        if (boostTimer <= 0) { adrenalineBoost = false; speed = baseSpeed; hasAdrenaline = false; }
        return AggressiveBehavior(playerRect, dt);
    }
    if (injecting) {
        state = "inject";
        injectTimer -= dt;
        if (injectTimer <= 0) {
            injecting = false; escaping = false; searchingInjector = false;
            health = std::min(maxHealth, health + Utils::RandomInt(30, 50));
            StartAdrenalineBoost();
        }
        return "";
    }

    if (health <= maxHealth * escapeThreshold && !hasAdrenaline) escaping = true;
    if (escaping) { EscapeFromPlayer(playerRect, dt); return ""; }

    return AggressiveBehavior(playerRect, dt);
}

std::string Enemy::AggressiveBehavior(const Rect& playerRect, float dt) {
    float playerCX = playerRect.x + playerRect.width / 2;
    float distance = fabsf(playerCX - x);
    facingLeft = playerCX < x;

    if (attackActive) {
        attackFrameCount++;
        int dur = (int)((float)attackFrames.size() / std::max(0.01f, animationSpeed));
        if (attackFrameCount >= dur) { attackActive = false; attackFrameCount = 0; state = "idle"; }
        return "";
    }

    if (distance > aggressionRange) { state = "idle"; }
    else if (distance > 250 && distance < 600 && throwCooldown <= 0 && canThrow) {
        ThrowProjectile(playerRect);
    }
    else if (distance > attackRange) {
        state = "walk";
        x += facingLeft ? -speed : speed;
    }
    else if (attackCooldown <= 0) {
        state = "attack"; attackActive = true; attackFrameCount = 0;
        attackCooldown = attackDelay; frameIndex = 0;
        Rect atkRect = GetAttackRect();
        if (Utils::RectCollision(atkRect, playerRect)) return "attack";
    }
    else { state = "idle"; }

    KeepInsideScreen();
    return "";
}

void Enemy::EscapeFromPlayer(const Rect& playerRect, float dt) {
    state = "walk";
    float playerCX = playerRect.x + playerRect.width / 2;
    if (playerCX < x) { x += escapeSpeed; facingLeft = false; }
    else { x -= escapeSpeed; facingLeft = true; }
    if (x < 50 || x > screenWidth - 50) {
        x = Utils::Clamp(x, 50, screenWidth - 50);
        StartInjection();
    }
    KeepInsideScreen();
}

void Enemy::ThrowProjectile(const Rect& playerRect) {
    throwCooldown = throwDelay;
    isThrowing = true; throwAnimationTimer = 400;
    state = "throw"; frameIndex = 0;
    float sx = x + (facingLeft ? -40 : 40);
    float sy = y - height / 2;
    projectiles.emplace_back(sx, sy, playerRect.x + playerRect.width/2, playerRect.y + playerRect.height/2 - 40, 15);
}

void Enemy::StartInjection() {
    if (!injecting) {
        injecting = true; injectTimer = injectDuration;
        state = "inject"; frameIndex = 0;
    }
}

void Enemy::StartAdrenalineBoost() {
    adrenalineBoost = true; hasAdrenaline = true;
    boostTimer = boostDuration; speed = baseSpeed * 1.7f;
}

bool Enemy::TakeDamage(int dmg) {
    if (!alive || invulnerable) return false;
    if (blocking) { dmg = (int)(dmg * 0.3f); blocking = false; }
    double now = GetTime() * 1000.0;
    if (now - lastHitTime <= comboDecayMs) comboCount++; else comboCount = 1;
    lastHitTime = now;
    health -= dmg;
    flashAlpha = 200; invulnerable = true; invulnTimer = 100;
    if (health <= 0) { alive = false; health = 0; return true; }
    float kb = std::min(baseKnockback + comboKnockbackAdd * (comboCount - 1), maxKnockback);
    x += facingLeft ? kb : -kb;
    stunTimer = 200; retreatTimer = retreatDuration;
    state = "retreat"; frameIndex = 0; attackActive = false; isThrowing = false;
    KeepInsideScreen();
    return false;
}

void Enemy::KeepInsideScreen() {
    x = Utils::Clamp(x, 20, screenWidth - 20);
}

Rect Enemy::GetRect() const { return {x - width/2, y - height, width, height}; }
Rect Enemy::GetAttackRect() const {
    Rect r = {x, y - height, 50, height};
    if (facingLeft) r.x -= 50;
    return r;
}

void Enemy::Draw(float dt) {
    if (!alive) return;
    // Animate
    if (currentAnimation != state) { currentAnimation = state; frameIndex = 0; }
    auto& frames = GetCurrentFrames();
    if (frames.empty()) return;
    frameIndex += animationSpeed * (dt / 16.67f);
    if (frameIndex >= frames.size()) frameIndex = 0;

    int idx = (int)frameIndex;
    if (idx >= (int)frames.size()) idx = 0;
    Texture2D& frame = frames[idx];

    Rectangle srcRect = {0, 0, (float)frame.width, (float)frame.height};
    if (facingLeft) srcRect.width = -(float)frame.width;
    Rectangle destRect = {x - width/2, y - height, width, height};

    Color tint = WHITE;
    if (adrenalineBoost) tint = {255, 80, 80, 255};
    if (flashAlpha > 0) tint = {255, 255, 255, (unsigned char)std::min(flashAlpha, 255.0f)};
    if (stunTimer > 0) tint = {255, 255, 0, 200};
    if (blocking) tint = {50, 50, 255, 200};

    DrawTexturePro(frame, srcRect, destRect, {0,0}, 0, tint);
    DrawHealthBar();
    for (auto& p : projectiles) p.Draw();
}

void Enemy::DrawHealthBar() {
    float barW = 100, barH = 10;
    float bx = x - barW/2, by = y - height - 18;
    float ratio = (float)health / maxHealth;
    DrawRectangle((int)bx, (int)by, (int)barW, (int)barH, RED);
    DrawRectangle((int)bx, (int)by, (int)(barW * ratio), (int)barH, GREEN);
    DrawRectangleLines((int)bx, (int)by, (int)barW, (int)barH, BLACK);
}
