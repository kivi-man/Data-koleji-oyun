#pragma once
#include "utils.h"
#include <string>
#include <vector>

class NPC {
public:
    float x, y;
    int npcIndex;
    float scale;
    float worldWidth, screenHeight;
    float yOffset;

    float baseWidth, baseHeight;
    float width, height;

    std::string state;
    bool facingLeft;
    float speed;
    bool alive;
    bool moveOnlyLeft;
    bool wrapAround;

    float frameIndex;
    float animationSpeed;
    std::vector<Texture2D> idleFrames;
    std::vector<Texture2D> walkFrames;

    float laziness, restlessness;
    bool loaded;

    std::string id;
    std::string groupId;
    bool leaving;

    NPC(float x, float y, int npcIndex = 0, float scale = 4, float worldW = 1536, float screenH = 1024, float yOffset = 0);
    virtual ~NPC();

    virtual void LoadTextures();
    virtual void Update(float dt, float playerX = 0, float playerY = 0);
    virtual void Draw(float dt);
    Rect GetRect() const;
};

class TeacherNPC : public NPC {
public:
    std::string name;

    TeacherNPC(float x, float y, const std::string& name, float scale = 4, float worldW = 1536, float screenH = 1024, float yOffset = 0);

    void LoadTextures() override;
    void Update(float dt, float playerX = 0, float playerY = 0) override;
};
