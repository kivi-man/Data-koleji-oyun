#pragma once
#include "utils.h"
#include <string>
#include <vector>

class MenuSystem {
public:
    int width, height;
    bool active;
    std::string currentMenu; // main, settings, pause
    int selectedIndex;

    std::vector<std::string> mainMenuOptions;
    std::vector<std::string> settingsOptions;
    std::vector<std::string> pauseMenuOptions;

    GameSettings settings;
    float pulseTime;
    float navCooldown, navCooldownTime;
    bool hasSave;

    Font pixelFont;
    bool fontLoaded;

    MenuSystem(int width, int height);
    void SetFont(Font f) { pixelFont = f; fontLoaded = true; }

    std::string Update(float dt);
    void Draw();

    void ShowPauseMenu();
    void HidePauseMenu();

private:
    void NavigateUp();
    void NavigateDown();
    void AdjustSetting(int direction);
    std::string Select();
    const std::vector<std::string>& GetCurrentOptions() const;
    void DrawMainMenu();
    void DrawSettingsMenu();
    void DrawPauseMenu();
};
