#include "npc.h"
#include <unordered_map>

static std::vector<Texture2D> cachedStudentIdleFrames[8];
static std::vector<Texture2D> cachedStudentWalkFrames[8];
static bool studentTexturesLoaded[8] = {false};

static std::unordered_map<std::string, std::vector<Texture2D>> cachedTeacherIdleFrames;
static std::unordered_map<std::string, std::vector<Texture2D>> cachedTeacherWalkFrames;
static std::unordered_map<std::string, bool> teacherTexturesLoaded;

NPC::NPC(float x, float y, int npcIndex, float scale, float worldW, float screenH, float yOffset)
    : x(x), y(y), npcIndex(npcIndex), scale(scale), worldWidth(worldW), screenHeight(screenH), yOffset(yOffset)
{
    baseWidth = 371.0f / 8.0f;
    baseHeight = 74.0f;
    width = 46.0f * scale;
    height = baseHeight * scale;
    state = "walk";
    facingLeft = GetRandomValue(0, 1) == 0;
    speed = 0.8f + Utils::RandomFloat(0, 0.8f);
    alive = true;
    moveOnlyLeft = false;
    wrapAround = false;
    frameIndex = Utils::RandomFloat(0, 4);
    animationSpeed = 0.12f;
    laziness = 0.002f + Utils::RandomFloat(0, 0.01f);
    restlessness = 0.005f + Utils::RandomFloat(0, 0.02f);
    loaded = false;
    leaving = false;
    LoadTextures();
}

NPC::~NPC() {
    // Textures are now managed globally and shared. Do not unload them here.
}

void NPC::LoadTextures() {
    int idx = npcIndex % 8;
    if (studentTexturesLoaded[idx]) {
        idleFrames = cachedStudentIdleFrames[idx];
        walkFrames = cachedStudentWalkFrames[idx];
        loaded = true;
        return;
    }

    if (FileExists("npc_textures/npc_idle.png") &&
        FileExists("npc_textures/npc_walk0.png") &&
        FileExists("npc_textures/npc_walk1.png") &&
        FileExists("npc_textures/npc_walk2.png"))
    {
        Texture2D idleSheet = LoadTexture("npc_textures/npc_idle.png");
        Texture2D w0 = LoadTexture("npc_textures/npc_walk0.png");
        Texture2D w1 = LoadTexture("npc_textures/npc_walk1.png");
        Texture2D w2 = LoadTexture("npc_textures/npc_walk2.png");

        int startX = (int)(idx * baseWidth);
        int frameW = (int)ceilf(baseWidth);

        if (idleSheet.id > 0) {
            idleFrames.push_back(Utils::ExtractFrame(idleSheet, startX, 0, frameW, (int)baseHeight));
            UnloadTexture(idleSheet);
        }
        if (w0.id > 0) {
            walkFrames.push_back(Utils::ExtractFrame(w0, startX, 0, frameW, (int)baseHeight));
            UnloadTexture(w0);
        }
        if (w1.id > 0) {
            walkFrames.push_back(Utils::ExtractFrame(w1, startX, 0, frameW, (int)baseHeight));
            UnloadTexture(w1);
        }
        if (w2.id > 0) {
            walkFrames.push_back(Utils::ExtractFrame(w2, startX, 0, frameW, (int)baseHeight));
            UnloadTexture(w2);
        }
        // Loop back
        if (walkFrames.size() >= 2) walkFrames.push_back(walkFrames[1]);
        
        cachedStudentIdleFrames[idx] = idleFrames;
        cachedStudentWalkFrames[idx] = walkFrames;
        studentTexturesLoaded[idx] = true;
        loaded = true;
    } else {
        // Fallback
        Color colors[] = {GREEN, BLUE, YELLOW, PURPLE, {50, 200, 200, 255}};
        Color c = colors[idx % 5];
        Image img = GenImageColor((int)baseWidth, (int)baseHeight, c);
        Texture2D tex = LoadTextureFromImage(img);
        UnloadImage(img);
        idleFrames.push_back(tex);
        walkFrames.push_back(tex);
        
        cachedStudentIdleFrames[idx] = idleFrames;
        cachedStudentWalkFrames[idx] = walkFrames;
        studentTexturesLoaded[idx] = true;
        loaded = true;
    }
}

void NPC::Update(float dt, float playerX, float playerY) {
    if (!loaded) return;

    if (state == "walk") {
        float dtScale = dt / 16.67f;
        x += (facingLeft ? -speed : speed) * dtScale;

        if (wrapAround) {
            if (x < -150) x = worldWidth + 150;
            else if (x > worldWidth + 150) x = -150;
        } else {
            if (x < 10) { x = 11; facingLeft = false; }
            else if (x > worldWidth - 10) { x = worldWidth - 11; facingLeft = true; }
        }

        if (!moveOnlyLeft && Utils::RandomFloat(0, 1) < laziness) state = "idle";
    } else {
        if (id.empty() && groupId.empty() && Utils::RandomFloat(0, 1) < restlessness) {
            state = "walk";
            if (!moveOnlyLeft && Utils::RandomFloat(0, 1) < 0.3f) facingLeft = !facingLeft;
        }
    }

    // Animate
    auto& frames = (state == "walk") ? walkFrames : idleFrames;
    frameIndex += animationSpeed * (dt / 16.67f);
    if (frameIndex >= frames.size()) frameIndex = 0;
}

void NPC::Draw(float dt) {
    if (!loaded || !alive) return;

    auto& frames = (state == "walk") ? walkFrames : idleFrames;
    if (frames.empty()) return;
    int idx = (int)frameIndex;
    if (idx >= (int)frames.size()) idx = 0;
    Texture2D& frame = frames[idx];

    float drawY = y + yOffset;
    Rectangle srcRect = {0, 0, (float)frame.width, (float)frame.height};
    if (facingLeft) srcRect.width = -(float)frame.width;
    Rectangle destRect = {x - width/2, drawY - height, width, height};
    DrawTexturePro(frame, srcRect, destRect, {0,0}, 0, WHITE);
}

Rect NPC::GetRect() const {
    return {x - width/2, y - height, width, height};
}

// ============ TeacherNPC ============
TeacherNPC::TeacherNPC(float x, float y, const std::string& name, float scale, float worldW, float screenH, float yOffset)
    : NPC(x, y, 0, scale, worldW, screenH, yOffset), name(name)
{
    facingLeft = true;
    state = "idle";
    idleFrames.clear();
    walkFrames.clear();
    LoadTextures();
}

void TeacherNPC::LoadTextures() {
    if (teacherTexturesLoaded[name]) {
        idleFrames = cachedTeacherIdleFrames[name];
        walkFrames = cachedTeacherWalkFrames[name];
        loaded = true;
        // set dimensions from cached frames
        if (!idleFrames.empty()) {
            baseWidth = (float)idleFrames[0].width;
            baseHeight = (float)idleFrames[0].height;
            width = baseWidth * scale;
            height = baseHeight * scale;
        }
        return;
    }

    std::string idlePath = TextFormat("teachers/%s/idle/idle.png", name.c_str());
    if (FileExists(idlePath.c_str())) {
        Texture2D tex = LoadTexture(idlePath.c_str());
        if (tex.id > 0) {
            baseWidth = (float)tex.width;
            baseHeight = (float)tex.height;
            width = baseWidth * scale;
            height = baseHeight * scale;
            idleFrames.push_back(tex);

            // Load walk frames
            for (int i = 0; i < 4; i++) {
                std::string wp = TextFormat("teachers/%s/walk/%d.png", name.c_str(), i);
                if (FileExists(wp.c_str())) {
                    walkFrames.push_back(LoadTexture(wp.c_str()));
                }
            }
            if (walkFrames.empty()) walkFrames = idleFrames;
            
            cachedTeacherIdleFrames[name] = idleFrames;
            cachedTeacherWalkFrames[name] = walkFrames;
            teacherTexturesLoaded[name] = true;
            
            loaded = true;
            return;
        }
    }
    // Fallback
    Image img = GenImageColor(46, 74, ORANGE);
    Texture2D tex = LoadTextureFromImage(img);
    UnloadImage(img);
    idleFrames.push_back(tex);
    walkFrames.push_back(tex);
    
    cachedTeacherIdleFrames[name] = idleFrames;
    cachedTeacherWalkFrames[name] = walkFrames;
    teacherTexturesLoaded[name] = true;
    
    loaded = true;
}

void TeacherNPC::Update(float dt, float playerX, float playerY) {
    if (state == "walk") {
        x += facingLeft ? -speed : speed;
    } else {
        state = "idle";
    }
    auto& frames = (state == "walk" && walkFrames.size() > 1) ? walkFrames : idleFrames;
    if (frames.size() > 1) {
        frameIndex = fmodf(frameIndex + 0.1f, (float)frames.size());
    }
}
