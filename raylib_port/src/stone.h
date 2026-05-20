#pragma once
#include "utils.h"

class Stone {
public:
    float x, y, vx, vy;
    float worldWidth, screenHeight;
    float gravity, friction;
    float rotation, rotationSpeed;
    bool alive, onGround;
    float width, height;
    Texture2D image;
    bool loaded;

    Stone(float x, float y, float vx, float vy, float worldW, float screenH);
    ~Stone();
    void Update(float dt, float groundY = -1, float groundOffset = -1);
    void Draw();
    Rect GetRect() const;

    static Texture2D cachedTexture;
    static bool cacheLoaded;
};
