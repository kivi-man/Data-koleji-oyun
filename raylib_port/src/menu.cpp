#include "menu.h"

MenuSystem::MenuSystem(int width, int height)
    : width(width), height(height)
{
    active = true;
    currentMenu = "main";
    selectedIndex = 0;

    mainMenuOptions = {"Devam Et", "Yeni Oyun", "Demo Oyun", "Ayarlar", "Cikis"};
    settingsOptions = {"Muzik Seviyesi", "Ses Efektleri", "Tam Ekran", "Geri Don"};
    pauseMenuOptions = {"Devam Et", "Kaydet", "Ana Menu", "Cikis"};

    settings = Utils::LoadSettings();
    pulseTime = 0;
    navCooldown = 0;
    navCooldownTime = 100;
    hasSave = Utils::HasSave();
    fontLoaded = false;
    pixelFont = GetFontDefault();

    if (!hasSave && selectedIndex == 0) selectedIndex = 1;
}

std::string MenuSystem::Update(float dt) {
    pulseTime += dt / 1000.0f;
    if (navCooldown > 0) navCooldown -= dt;

    if (IsKeyPressed(KEY_UP) && navCooldown <= 0) {
        NavigateUp();
        navCooldown = navCooldownTime;
    }
    if (IsKeyPressed(KEY_DOWN) && navCooldown <= 0) {
        NavigateDown();
        navCooldown = navCooldownTime;
    }
    if (IsKeyPressed(KEY_LEFT) && currentMenu == "settings" && navCooldown <= 0) {
        AdjustSetting(-1);
        navCooldown = navCooldownTime;
    }
    if (IsKeyPressed(KEY_RIGHT) && currentMenu == "settings" && navCooldown <= 0) {
        AdjustSetting(1);
        navCooldown = navCooldownTime;
    }
    if (IsKeyPressed(KEY_ENTER)) {
        return Select();
    }
    if (IsKeyPressed(KEY_ESCAPE) && currentMenu == "pause") {
        return "resume";
    }
    return "";
}

void MenuSystem::NavigateUp() {
    auto& opts = GetCurrentOptions();
    selectedIndex = (selectedIndex - 1 + (int)opts.size()) % (int)opts.size();
    if (currentMenu == "main" && selectedIndex == 0 && !hasSave)
        selectedIndex = (int)opts.size() - 1;
}

void MenuSystem::NavigateDown() {
    auto& opts = GetCurrentOptions();
    selectedIndex = (selectedIndex + 1) % (int)opts.size();
    if (currentMenu == "main" && selectedIndex == 0 && !hasSave)
        selectedIndex = 1;
}

void MenuSystem::AdjustSetting(int dir) {
    auto& opt = settingsOptions[selectedIndex];
    if (opt == "Muzik Seviyesi") {
        settings.musicVolume = (int)Utils::Clamp((float)(settings.musicVolume + dir * 10), 0, 100);
        Utils::SaveSettings(settings);
    } else if (opt == "Ses Efektleri") {
        settings.sfxVolume = (int)Utils::Clamp((float)(settings.sfxVolume + dir * 10), 0, 100);
        Utils::SaveSettings(settings);
    } else if (opt == "Tam Ekran") {
        settings.fullscreen = !settings.fullscreen;
        Utils::SaveSettings(settings);
        if (settings.fullscreen) ToggleFullscreen();
    }
}

std::string MenuSystem::Select() {
    if (currentMenu == "main") {
        auto& opt = mainMenuOptions[selectedIndex];
        if (opt == "Devam Et" && hasSave) return "continue";
        if (opt == "Yeni Oyun") return "new_game";
        if (opt == "Demo Oyun") return "demo";
        if (opt == "Ayarlar") { currentMenu = "settings"; selectedIndex = 0; }
        if (opt == "Cikis") return "exit";
    } else if (currentMenu == "settings") {
        auto& opt = settingsOptions[selectedIndex];
        if (opt == "Geri Don") {
            currentMenu = "main";
            selectedIndex = hasSave ? 0 : 1;
        }
    } else if (currentMenu == "pause") {
        auto& opt = pauseMenuOptions[selectedIndex];
        if (opt == "Devam Et") return "resume";
        if (opt == "Kaydet") return "save";
        if (opt == "Ana Menu") return "main_menu";
        if (opt == "Cikis") return "exit";
    }
    return "";
}

const std::vector<std::string>& MenuSystem::GetCurrentOptions() const {
    if (currentMenu == "settings") return settingsOptions;
    if (currentMenu == "pause") return pauseMenuOptions;
    return mainMenuOptions;
}

void MenuSystem::Draw() {
    if (currentMenu == "main") DrawMainMenu();
    else if (currentMenu == "settings") DrawSettingsMenu();
    else if (currentMenu == "pause") DrawPauseMenu();
}

void MenuSystem::DrawMainMenu() {
    // Background gradient
    DrawRectangleGradientV(0, 0, width, height, {20, 20, 46, 255}, {10, 10, 30, 255});

    // Title
    const char* title = "DATA AGENTS";
    int titleSize = 80;
    int tw = MeasureText(title, titleSize);
    DrawText(title, width/2 - tw/2, 80, titleSize, GOLD);

    const char* subtitle = "The Truth Behind the System";
    int sw = MeasureText(subtitle, 28);
    DrawText(subtitle, width/2 - sw/2, 180, 28, {180, 180, 180, 255});

    // Options
    int startY = 300;
    int spacing = 70;
    for (int i = 0; i < (int)mainMenuOptions.size(); i++) {
        int y = startY + i * spacing;
        bool selected = (i == selectedIndex);
        bool disabled = (mainMenuOptions[i] == "Devam Et" && !hasSave);

        Color color = selected ? GOLD : LIGHTGRAY;
        if (disabled) color = DARKGRAY;
        int fs = selected ? 42 : 38;

        std::string display = mainMenuOptions[i];
        if (disabled) display += " (Kayit Yok)";
        if (selected) display = "> " + display + " <";

        int textW = MeasureText(display.c_str(), fs);

        if (selected && !disabled) {
            DrawRectangle(width/2 - textW/2 - 20, y - 10, textW + 40, fs + 15,
                         {80, 80, 100, 128});
            DrawRectangleLines(width/2 - textW/2 - 20, y - 10, textW + 40, fs + 15,
                              {255, 200, 50, 255});
        }

        DrawText(display.c_str(), width/2 - textW/2, y, fs, color);
    }

    // Controls
    const char* ctrl = "Yukari/Asagi: Sec  |  Enter: Onayla  |  ESC: Cik";
    int cw = MeasureText(ctrl, 28);
    DrawText(ctrl, width/2 - cw/2, height - 60, 28, GRAY);
}

void MenuSystem::DrawSettingsMenu() {
    DrawRectangleGradientV(0, 0, width, height, {20, 20, 46, 255}, {10, 10, 30, 255});

    const char* title = "AYARLAR";
    int tw = MeasureText(title, 70);
    DrawText(title, width/2 - tw/2, 60, 70, GOLD);

    int startY = 250;
    int spacing = 80;
    for (int i = 0; i < (int)settingsOptions.size(); i++) {
        int y = startY + i * spacing;
        bool selected = (i == selectedIndex);
        Color color = selected ? GOLD : LIGHTGRAY;
        int fs = selected ? 42 : 38;

        std::string display = settingsOptions[i];
        if (display == "Muzik Seviyesi") display += ": " + std::to_string(settings.musicVolume);
        else if (display == "Ses Efektleri") display += ": " + std::to_string(settings.sfxVolume);
        else if (display == "Tam Ekran") display += settings.fullscreen ? ": Acik" : ": Kapali";

        if (selected) display = "> " + display + " <";
        int textW = MeasureText(display.c_str(), fs);
        DrawText(display.c_str(), width/2 - textW/2, y, fs, color);
    }
}

void MenuSystem::DrawPauseMenu() {
    DrawRectangle(0, 0, width, height, {0, 0, 0, 180});

    const char* title = "DURAKLAT";
    int tw = MeasureText(title, 70);
    DrawText(title, width/2 - tw/2, 120, 70, GOLD);

    int startY = 320;
    int spacing = 70;
    for (int i = 0; i < (int)pauseMenuOptions.size(); i++) {
        int y = startY + i * spacing;
        bool selected = (i == selectedIndex);
        Color color = selected ? GOLD : LIGHTGRAY;
        int fs = selected ? 50 : 44;
        std::string display = pauseMenuOptions[i];
        if (selected) display = "> " + display + " <";
        int textW = MeasureText(display.c_str(), fs);
        DrawText(display.c_str(), width/2 - textW/2, y, fs, color);
    }
}

void MenuSystem::ShowPauseMenu() {
    currentMenu = "pause";
    selectedIndex = 0;
    active = true;
}

void MenuSystem::HidePauseMenu() {
    active = false;
}
