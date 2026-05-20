#pragma once

#include "raylib.h"
#include <string>
#include <vector>
#include <cmath>
#include <algorithm>
#include <fstream>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

// ============================================================
// Constants
// ============================================================
constexpr int RENDER_WIDTH = 1536;
constexpr int RENDER_HEIGHT = 1024;
constexpr float TARGET_FPS_VAL = 60.0f;

// ============================================================
// Rectangle with float members (game collision)
// ============================================================
struct Rect {
    float x, y, width, height;
};

// ============================================================
// Settings
// ============================================================
struct GameSettings {
    int musicVolume = 50;
    int sfxVolume = 50;
    bool fullscreen = false;
};

// ============================================================
// Utility functions
// ============================================================
namespace Utils {

inline float Clamp(float value, float minVal, float maxVal) {
    return std::min(std::max(value, minVal), maxVal);
}

inline float Lerp(float start, float end, float t) {
    return start + (end - start) * t;
}

inline float Distance(float x1, float y1, float x2, float y2) {
    float dx = x2 - x1;
    float dy = y2 - y1;
    return sqrtf(dx * dx + dy * dy);
}

inline bool RectCollision(const Rect& a, const Rect& b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

inline int RandomInt(int minVal, int maxVal) {
    return GetRandomValue(minVal, maxVal);
}

inline float RandomFloat(float minVal, float maxVal) {
    return minVal + (float)GetRandomValue(0, 10000) / 10000.0f * (maxVal - minVal);
}

// Save/Load game data using JSON
inline bool SaveGame(const json& data) {
    try {
        std::ofstream file("game_save.json");
        if (file.is_open()) {
            file << data.dump(2);
            file.close();
            return true;
        }
    } catch (...) {}
    return false;
}

inline json LoadGame() {
    try {
        std::ifstream file("game_save.json");
        if (file.is_open()) {
            json data;
            file >> data;
            return data;
        }
    } catch (...) {}
    return json();
}

inline bool HasSave() {
    std::ifstream file("game_save.json");
    return file.good();
}

inline void ClearSave() {
    std::remove("game_save.json");
}

inline GameSettings LoadSettings() {
    GameSettings settings;
    try {
        std::ifstream file("settings.json");
        if (file.is_open()) {
            json data;
            file >> data;
            if (data.contains("musicVolume")) settings.musicVolume = data["musicVolume"];
            if (data.contains("sfxVolume")) settings.sfxVolume = data["sfxVolume"];
            if (data.contains("fullscreen")) settings.fullscreen = data["fullscreen"];
        }
    } catch (...) {}
    return settings;
}

inline void SaveSettings(const GameSettings& settings) {
    try {
        json data;
        data["musicVolume"] = settings.musicVolume;
        data["sfxVolume"] = settings.sfxVolume;
        data["fullscreen"] = settings.fullscreen;
        std::ofstream file("settings.json");
        if (file.is_open()) {
            file << data.dump(2);
        }
    } catch (...) {}
}

// Texture loading helper with fallback
inline Texture2D LoadTextureOrFallback(const char* path, Color fallbackColor = RED) {
    if (FileExists(path)) {
        Texture2D tex = LoadTexture(path);
        if (tex.id > 0) return tex;
    }
    // Create a small fallback texture
    Image img = GenImageColor(16, 16, fallbackColor);
    Texture2D tex = LoadTextureFromImage(img);
    UnloadImage(img);
    return tex;
}

// Spritesheet frame extraction
inline Texture2D ExtractFrame(Texture2D sheet, int x, int y, int width, int height) {
    Image sheetImg = LoadImageFromTexture(sheet);
    Image frameImg = ImageFromImage(sheetImg, {(float)x, (float)y, (float)width, (float)height});
    Texture2D frameTex = LoadTextureFromImage(frameImg);
    UnloadImage(frameImg);
    UnloadImage(sheetImg);
    return frameTex;
}

// Opens a borderless Edge/Chrome app window (WebView-like) for the given URL
inline void OpenWebView(const std::string& relativePath) {
    std::string cwd = GetWorkingDirectory();
    // Replace spaces with %20 and \ with /
    std::string urlPath = cwd + "/" + relativePath;
    std::string finalUrl = "file:///";
    for (char c : urlPath) {
        if (c == ' ') finalUrl += "%20";
        else if (c == '\\') finalUrl += '/';
        else finalUrl += c;
    }

    std::string cmd = "start msedge --app=\"" + finalUrl + "\"";
    system(cmd.c_str());
}

} // namespace Utils
