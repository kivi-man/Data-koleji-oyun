#include "game.h"

int main() {
    // Initialize Raylib - windowed mode, user's monitor resolution
    int monitorW = 1280;
    int monitorH = 720;

    // Do NOT set FLAG_WINDOW_RESIZABLE initially to prevent auto-fullscreen
    SetConfigFlags(FLAG_VSYNC_HINT);
    InitWindow(monitorW, monitorH, "Data Agents - The Truth Behind the System");
    SetTargetFPS(60);
    SetExitKey(0); // Disable ESC closing window (we handle ESC for pause)

    // After init, get actual monitor size for better default
    int monitor = GetCurrentMonitor();
    monitorW = GetMonitorWidth(monitor);
    monitorH = GetMonitorHeight(monitor);

    // Set window to 80% of monitor in windowed mode
    int winW = (int)(monitorW * 0.8f);
    int winH = (int)(monitorH * 0.8f);
    SetWindowSize(winW, winH);
    SetWindowPosition((monitorW - winW) / 2, (monitorH - winH) / 2);

    // Now enable resizing
    SetWindowState(FLAG_WINDOW_RESIZABLE);

    // Create game instance
    Game game;
    game.Init();

    // Main game loop
    while (!WindowShouldClose()) {
        float dt = GetFrameTime() * 1000.0f; // Convert to ms like JS version
        if (dt > 100) dt = 100; // Clamp like JS version

        game.Update(dt);
        game.Draw();
    }

    CloseAudioDevice();
    CloseWindow();

    return 0;
}
