#pragma once
#include "utils.h"

class PaperPlane {
public:
    float x, y, vx, vy;
    float worldWidth, screenHeight;
    float gravity;
    float rotation;
    bool alive, onGround;
    float landingOffset;
    float scale, targetScale, scaleSpeed;
    float baseWidth, baseHeight, width, height;
    Texture2D image;
    bool loaded;

    PaperPlane(float x, float y, float vx, float vy, float worldW, float screenH);
    ~PaperPlane();
    void Update(float dt, float groundY = -1);
    void Draw();
    Rect GetRect() const;

    static Texture2D cachedTexture;
    static bool cacheLoaded;
};
