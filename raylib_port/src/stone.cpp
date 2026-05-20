#include "stone.h"
#include <cmath>

Texture2D Stone::cachedTexture = {0};
bool Stone::cacheLoaded = false;

Stone::Stone(float x, float y, float vx, float vy, float worldW, float screenH)
    : x(x), y(y), vx(vx), vy(vy), worldWidth(worldW), screenHeight(screenH)
{
    gravity = 0.5f;
    friction = 0.8f;
    rotation = 0;
    rotationSpeed = Utils::RandomFloat(-0.25f, 0.25f);
    alive = true; onGround = false;
    width = 120; height = 120;
    loaded = false;

    if (!cacheLoaded) {
        const char* path = "assets/stone.png";
        if (FileExists(path)) {
            cachedTexture = LoadTexture(path);
            cacheLoaded = true;
        } else {
            // Fallback: orange circle
            Image img = GenImageColor(120, 120, BLANK);
            ImageDrawCircle(&img, 60, 60, 50, (Color){255, 107, 53, 255});
            cachedTexture = LoadTextureFromImage(img);
            UnloadImage(img);
            cacheLoaded = true;
        }
    }
    image = cachedTexture;
    loaded = true;
}

Stone::~Stone() {
    // Don't unload cached texture
}

void Stone::Update(float dt, float currentGroundY, float groundOffset) {
    if (!loaded || !alive) return;
    float df = dt / 16.67f;

    if (!onGround) {
        vy += gravity * df;
        rotation += rotationSpeed * df;
    } else {
        vx *= powf(friction, df);
        if (fabsf(vx) < 0.1f) vx = 0;
        rotation = 0;
    }

    x += vx * df;
    y += vy * df;

    float gY = (currentGroundY >= 0) ? currentGroundY : (screenHeight - 100);
    float offset = (groundOffset >= 0) ? groundOffset : (height / 2);
    float groundLevel = gY - offset;

    if (y + height/2 >= groundLevel - 2) {
        y = groundLevel - height/2;
        if (fabsf(vy) > 2 && !onGround) { vy = -vy * 0.3f; }
        else { vy = 0; onGround = true; }
    } else { onGround = false; }

    if (x < -1000 || x > worldWidth + 1000) alive = false;
    if (y > gY + 100) { y = gY - height/2; vy = 0; onGround = true; }
}

void Stone::Draw() {
    if (!loaded || !alive) return;

    Rectangle srcRect = {0, 0, (float)image.width, (float)image.height};
    Rectangle destRect = {x, y, width, height};
    Vector2 origin = {width/2, height/2};

    DrawTexturePro(image, srcRect, destRect, origin, rotation * RAD2DEG, WHITE);
}

Rect Stone::GetRect() const {
    return {x - width/2, y - height/2, width, height};
}
