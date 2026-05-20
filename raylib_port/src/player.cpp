#include "player.h"
#include <cmath>

Player::Player(float x, float y, float scale)
    : x(x), y(y), scale(scale)
{
    minX = 0;
    maxX = RENDER_WIDTH;

    vx = 0; vy = 0;
    walkSpeed = 6.0f;
    jumpForce = 25.0f;
    gravity = 1.0f;
    onGround = true;

    width = 80; height = 100;

    facingLeft = false;
    moving = false;
    punching = false;

    maxHealth = 100;
    health = 100;
    combo = 0;
    lastHitTime = 0;
    comboDecay = 1500;

    hasAdrenaline = false;
    adrenalineActive = false;
    adrenalineTimer = 0;
    adrenalineDuration = 5000;
    speedMultiplier = 1.0f;
    damageMultiplier = 1.0f;

    invulnerable = false;
    invulnTimer = 0;
    flashAlpha = 0;

    frameIndex = 0;
    animationSpeed = 0.2f;
    currentAnimation = "idle";
    hasBackpack = false;
    punchHitRegistered = false;

    reverseRightInputUntilRelease = false;

    paperPlaneCount = 0;
    isCollecting = false;
    isAiming = false;

    stoneCount = 0;
    isAimingStone = false;

    isSpeaking = false;
    speakTimer = 0;

    aimLayerImg = {0};
    backpackImg = {0};
    emoteNormal = {0};
    emoteSpeak = {0};

    loaded = false;
    LoadAnimations();
}

Player::~Player() {
    for (auto& t : idleFrames) if (t.id > 0) UnloadTexture(t);
    for (auto& t : walkFrames) if (t.id > 0) UnloadTexture(t);
    for (auto& t : punchFrames) if (t.id > 0) UnloadTexture(t);
    for (auto& t : jumpFrames) if (t.id > 0) UnloadTexture(t);
    for (auto& t : collectFrames) if (t.id > 0) UnloadTexture(t);
    for (auto& t : aimFrames) if (t.id > 0) UnloadTexture(t);
    if (aimLayerImg.id > 0) UnloadTexture(aimLayerImg);
    if (backpackImg.id > 0) UnloadTexture(backpackImg);
    if (emoteNormal.id > 0) UnloadTexture(emoteNormal);
    if (emoteSpeak.id > 0) UnloadTexture(emoteSpeak);
}

void Player::LoadAnimations() {
    // Load idle animation (4 frames)
    for (int i = 0; i < 4; i++) {
        std::string path = TextFormat("player/idle/%d.png", i);
        if (FileExists(path.c_str())) {
            idleFrames.push_back(LoadTexture(path.c_str()));
        }
    }
    if (idleFrames.empty()) {
        Image img = GenImageColor(60, 80, LIGHTGRAY);
        idleFrames.push_back(LoadTextureFromImage(img));
        UnloadImage(img);
    }

    // Load walk animation (8 frames)
    for (int i = 0; i < 8; i++) {
        std::string path = TextFormat("player/walk/%d.png", i);
        if (FileExists(path.c_str())) {
            walkFrames.push_back(LoadTexture(path.c_str()));
        }
    }

    // Load punch animation (6 frames)
    for (int i = 0; i < 6; i++) {
        std::string path = TextFormat("player/punch/%d.png", i);
        if (FileExists(path.c_str())) {
            punchFrames.push_back(LoadTexture(path.c_str()));
        }
    }

    // Load jump animation (4 frames)
    for (int i = 0; i < 4; i++) {
        std::string path = TextFormat("player/jump/%d.png", i);
        if (FileExists(path.c_str())) {
            jumpFrames.push_back(LoadTexture(path.c_str()));
        }
    }

    // Load collect animation (1 frame)
    if (FileExists("player/collect/0.png")) {
        collectFrames.push_back(LoadTexture("player/collect/0.png"));
    }

    // Load aim animation (1 frame)
    if (FileExists("player/aim/0.png")) {
        aimFrames.push_back(LoadTexture("player/aim/0.png"));
    }

    // Load aim layer
    if (FileExists("player/aim/kagit_ucak_layer.png")) {
        aimLayerImg = LoadTexture("player/aim/kagit_ucak_layer.png");
    }

    // Load emotes
    if (FileExists("player/emotes/normal.png")) {
        emoteNormal = LoadTexture("player/emotes/normal.png");
    }
    if (FileExists("player/emotes/speak.png")) {
        emoteSpeak = LoadTexture("player/emotes/speak.png");
    }

    // Load backpack
    if (FileExists("player/backpack.png")) {
        backpackImg = LoadTexture("player/backpack.png");
    }

    // Fallbacks
    if (walkFrames.empty()) walkFrames = idleFrames;
    if (punchFrames.empty()) punchFrames = idleFrames;
    if (jumpFrames.empty()) jumpFrames = idleFrames;

    loaded = true;
}

std::vector<Texture2D>& Player::GetCurrentFrames() {
    if (currentAnimation == "walk") return walkFrames;
    if (currentAnimation == "punch") return punchFrames;
    if (currentAnimation == "jump") return jumpFrames;
    if (currentAnimation == "collect") return collectFrames;
    if (currentAnimation == "aim") return aimFrames;
    return idleFrames;
}

void Player::Update(float dt, float groundY, bool dialogueActive, bool backpackTaken) {
    hasBackpack = backpackTaken;

    // Timers
    invulnTimer = std::max(0.0f, invulnTimer - dt);
    if (invulnTimer <= 0) invulnerable = false;

    // Speak timer
    if (speakTimer > 0) {
        speakTimer -= dt;
        if (speakTimer <= 0) isSpeaking = false;
    }

    // Adrenaline
    if (adrenalineActive) {
        adrenalineTimer -= dt;
        if (adrenalineTimer <= 0) {
            adrenalineActive = false;
            speedMultiplier = 1.0f;
            damageMultiplier = 1.0f;
        }
    }

    // Combo decay
    double now = GetTime() * 1000.0;
    if (now - lastHitTime > comboDecay) combo = 0;

    // Flash effect
    if (flashAlpha > 0) flashAlpha = std::max(0.0f, flashAlpha - 15.0f);

    // Movement
    moving = false;
    if (!dialogueActive && !punching && !isCollecting && !isAiming) {
        float currentSpeed = walkSpeed * speedMultiplier;

        bool moveLeft = IsKeyDown(KEY_LEFT) || IsKeyDown(KEY_A);
        bool moveRight = IsKeyDown(KEY_RIGHT) || IsKeyDown(KEY_D);

        if (reverseRightInputUntilRelease) {
            if (moveRight) {
                moveLeft = true;
                moveRight = false;
            } else {
                reverseRightInputUntilRelease = false;
            }
        }

        if (moveLeft) {
            x -= currentSpeed;
            moving = true;
            facingLeft = true;
        }
        if (moveRight) {
            x += currentSpeed;
            moving = true;
            facingLeft = false;
        }

        if ((IsKeyDown(KEY_UP) || IsKeyDown(KEY_W)) && onGround) {
            vy = -jumpForce;
            onGround = false;
        }

        x = Utils::Clamp(x, minX, maxX);
    }

    // Physics
    vy += gravity;
    y += vy;

    if (y >= groundY) {
        y = groundY;
        vy = 0;
        onGround = true;
    } else {
        onGround = false;
    }

    // Animation state
    std::string newState = "idle";
    if (punching) newState = "punch";
    else if (isCollecting) newState = "collect";
    else if (isAiming || isAimingStone) newState = "aim";
    else if (!onGround) newState = "jump";
    else if (moving) newState = "walk";

    Animate(newState, dt);
}

void Player::Animate(const std::string& newState, float dt) {
    if (currentAnimation != newState) {
        currentAnimation = newState;
        frameIndex = 0;
    }

    auto& frames = GetCurrentFrames();
    if (frames.empty()) return;

    frameIndex += animationSpeed * (dt / 16.67f);

    if (frameIndex >= frames.size()) {
        if (currentAnimation == "punch") {
            punching = false;
            frameIndex = 0;
            currentAnimation = "idle";
        } else if (currentAnimation == "collect") {
            if (frameIndex >= 6) {
                isCollecting = false;
                frameIndex = 0;
                currentAnimation = "idle";
            }
        } else if (currentAnimation == "jump") {
            frameIndex = (float)(frames.size() - 1);
        } else if (currentAnimation == "aim") {
            frameIndex = (float)(frames.size() - 1);
        } else {
            frameIndex = 0;
        }
    }
}

void Player::Draw() {
    auto& frames = GetCurrentFrames();
    if (frames.empty()) return;

    int idx = (int)frameIndex;
    if (idx >= (int)frames.size()) idx = 0;
    Texture2D& img = frames[idx];

    float scaledWidth = img.width * scale;
    float scaledHeight = img.height * scale;

    // Tint for effects
    Color tint = WHITE;
    if (adrenalineActive) tint = {255, 150, 150, 255};
    if (flashAlpha > 0) {
        unsigned char a = (unsigned char)std::min(flashAlpha, 255.0f);
        tint = {255, 255, 255, a};
    }

    Rectangle srcRect = {0, 0, (float)img.width, (float)img.height};
    Rectangle destRect;

    if (facingLeft) {
        srcRect.width = -(float)img.width; // Flip horizontally
    }

    destRect = {x - scaledWidth / 2, y - scaledHeight, scaledWidth, scaledHeight};

    // Draw backpack underneath
    if (hasBackpack && backpackImg.id > 0) {
        Rectangle bpSrc = {0, 0, (float)backpackImg.width, (float)backpackImg.height};
        if (facingLeft) bpSrc.width = -(float)backpackImg.width;
        DrawTexturePro(backpackImg, bpSrc, destRect, {0, 0}, 0, WHITE);
    }

    // Draw character
    DrawTexturePro(img, srcRect, destRect, {0, 0}, 0, tint);

    // Draw aim layer
    if (isAiming && aimLayerImg.id > 0) {
        Rectangle aimSrc = {0, 0, (float)aimLayerImg.width, (float)aimLayerImg.height};
        if (facingLeft) aimSrc.width = -(float)aimLayerImg.width;
        DrawTexturePro(aimLayerImg, aimSrc, destRect, {0, 0}, 0, WHITE);
    }

    // Draw emote
    if (!isCollecting) {
        Texture2D emote = isSpeaking ? emoteSpeak : emoteNormal;
        if (isSpeaking && emoteSpeak.id == 0) emote = emoteNormal;

        if (emote.id > 0) {
            Rectangle emoteSrc = {0, 0, (float)emote.width, (float)emote.height};
            if (facingLeft) emoteSrc.width = -(float)emote.width;
            DrawTexturePro(emote, emoteSrc, destRect, {0, 0}, 0, WHITE);
        }
    }
}

void Player::StartPunch(bool left) {
    if (punching) return;
    punching = true;
    facingLeft = left;
    frameIndex = 0;
    punchHitRegistered = false;
}

void Player::UseAdrenaline() {
    if (!hasAdrenaline || adrenalineActive) return;
    hasAdrenaline = false;
    adrenalineActive = true;
    adrenalineTimer = adrenalineDuration;
    health = std::min(maxHealth, health + 30);
    speedMultiplier = 1.5f;
    damageMultiplier = 1.5f;
}

void Player::StartAim() {
    if (paperPlaneCount <= 0 || punching) return;
    if (isCollecting) isCollecting = false;
    if (isAimingStone) StopAimStone();
    isAiming = true;
    frameIndex = 0;
}

void Player::StopAim() {
    isAiming = false;
    if (!isAimingStone && currentAnimation == "aim") {
        currentAnimation = "idle";
        frameIndex = 0;
    }
}

void Player::StartAimStone() {
    if (stoneCount <= 0 || punching) return;
    if (isCollecting) isCollecting = false;
    if (isAiming) StopAim();
    isAimingStone = true;
    frameIndex = 0;
}

void Player::StopAimStone() {
    isAimingStone = false;
    if (!isAiming && currentAnimation == "aim") {
        currentAnimation = "idle";
        frameIndex = 0;
    }
}

void Player::StartCollect(const std::string& type) {
    if (isCollecting || punching) return;
    isCollecting = true;
    frameIndex = 0;

    if (type == "plane") paperPlaneCount++;
    else if (type == "stone") stoneCount++;
}

void Player::TakeDamage(int damage) {
    if (invulnerable) return;
    health = std::max(0, health - damage);
    flashAlpha = 200;
    invulnerable = true;
    invulnTimer = 500;
}

void Player::TriggerSpeak() {
    isSpeaking = true;
    speakTimer = 65;
}

void Player::StartRightInputReversal() {
    reverseRightInputUntilRelease = true;
}

Rect Player::GetRect() const {
    return {x - 40, y - 100, 80, 100};
}

Rect Player::GetPunchRect() const {
    Rect rect = {x, y - 100, 60, 100};
    if (facingLeft) rect.x -= 60;
    return rect;
}

void Player::DrawHealth() {
    // Health bar drawn by Game class UI
}
