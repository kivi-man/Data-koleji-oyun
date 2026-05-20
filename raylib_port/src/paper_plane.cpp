#include "paper_plane.h"
#include <cmath>

Texture2D PaperPlane::cachedTexture = {0};
bool PaperPlane::cacheLoaded = false;

PaperPlane::PaperPlane(float x, float y, float vx, float vy, float worldW, float screenH)
    : x(x), y(y), vx(vx), vy(vy), worldWidth(worldW), screenHeight(screenH)
{
    gravity = 0.15f;
    rotation = 0;
    alive = true;
    onGround = false;
    landingOffset = 270;
    scale = 1.0f; targetScale = 1.0f; scaleSpeed = 0.005f;
    baseWidth = 240; baseHeight = 240;
    width = baseWidth; height = baseHeight;
    loaded = false;

    if (!cacheLoaded) {
        const char* path = "assets/kagit_ucak.png";
        if (FileExists(path)) {
            cachedTexture = LoadTexture(path);
            cacheLoaded = true;
        } else {
            // Fallback: white triangle
            Image img = GenImageColor(240, 240, BLANK);
            ImageDrawTriangle(&img, {220, 120}, {40, 60}, {40, 180}, WHITE);
            cachedTexture = LoadTextureFromImage(img);
            UnloadImage(img);
            cacheLoaded = true;
        }
    }
    image = cachedTexture;
    loaded = true;
}

PaperPlane::~PaperPlane() {
    // Don't unload cached texture
}

void PaperPlane::Update(float dt, float currentGroundY) {
    if (!loaded || !alive) return;
    float df = dt / 16.67f;

    // Scale interpolation (depth effect)
    if (scale < targetScale) { scale += scaleSpeed * df; if (scale > targetScale) scale = targetScale; }
    else if (scale > targetScale) { scale -= scaleSpeed * df; if (scale < targetScale) scale = targetScale; }
    width = baseWidth * scale;
    height = baseHeight * scale;

    if (!onGround) {
        vy += gravity * df;
        x += vx * df;
        y += vy * df;
    } else {
        x += vx * df;
        vx *= powf(0.95f, df);
        if (fabsf(vx) < 0.1f) vx = 0;
    }

    float gY = (currentGroundY >= 0) ? currentGroundY : (screenHeight - 100);
    if (y > gY - landingOffset) {
        y = gY - landingOffset;
        vy = 0; onGround = true;
    }

    if (!onGround && (x < -1000 || x > worldWidth + 1000)) alive = false;
}

void PaperPlane::Draw() {
    if (!loaded || !alive) return;

    float angle = onGround ? 0 : atan2f(vy, vx) * RAD2DEG;

    Rectangle srcRect = {0, 0, (float)image.width, (float)image.height};
    // Flip horizontally if going left
    if (vx < 0) srcRect.width = -(float)image.width;
    // Flip vertically if angle > 90 (upside down)
    if (fabsf(angle) > 90) srcRect.height = -(float)image.height;

    Rectangle destRect = {x, y, width, height};
    Vector2 origin = {width / 2, height / 2};

    DrawTexturePro(image, srcRect, destRect, origin, angle, WHITE);
}

Rect PaperPlane::GetRect() const {
    return {x - width/2, y - height/2, width, height};
}
