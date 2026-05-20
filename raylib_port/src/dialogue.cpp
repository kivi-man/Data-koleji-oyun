#include "dialogue.h"
#include <algorithm>

DialogueSystem::DialogueSystem() {
    active = false;
    currentIndex = 0;
    charIndex = 0;
    typewriterSpeed = 0.5f;
    finished = false;
    boxHeight = 180;
    boxPadding = 30;
    fontSize = 28;
    lineHeight = 36;
    boxAlpha = 0;
    fadeSpeed = 0.1f;
    lastBlipTime = 0;
    hasChoices = false;
    selectedChoice = 0;
    choiceWasSelected = false;
    choiceContext = "";
    fontLoaded = false;
    pixelFont = GetFontDefault();
}

void DialogueSystem::Start(const std::vector<DialogueLine>& lines) {
    dialogues = lines;
    currentIndex = 0;
    active = true;
    finished = false;
    boxAlpha = 0;
    hasChoices = false;
    choiceWasSelected = false;
    choiceContext = "";
    LoadCurrentDialogue();
}

void DialogueSystem::LoadCurrentDialogue() {
    if (currentIndex >= (int)dialogues.size()) {
        active = false;
        return;
    }
    currentSpeaker = dialogues[currentIndex].speaker;
    fullText = dialogues[currentIndex].text;
    currentText = "";
    charIndex = 0;
    finished = false;
}

void DialogueSystem::Update(float dt) {
    if (!active) return;

    // Fade in
    if (boxAlpha < 1.0f) {
        boxAlpha = std::min(1.0f, boxAlpha + fadeSpeed * (dt / 16.67f));
    }

    // Typewriter
    if (!finished && charIndex < fullText.length()) {
        int oldIdx = (int)charIndex;
        charIndex += typewriterSpeed * (dt / 16.67f);
        int newIdx = (int)charIndex;
        currentText = fullText.substr(0, newIdx);

        if (charIndex >= fullText.length()) {
            currentText = fullText;
            finished = true;
        }
    }

    // Skip on X
    if (IsKeyPressed(KEY_X) && !finished) {
        Skip();
    }

    // Progress on Enter
    if (IsKeyPressed(KEY_ENTER) && finished) {
        if (hasChoices) {
            if (!choiceContext.empty()) {
                // Context-based choice: set flag, let scene handle it
                choiceWasSelected = true;
            } else {
                // Callback-based choice
                std::string choice = choices[selectedChoice];
                active = false;
                boxAlpha = 0;
                if (onChoice) onChoice(choice);
                hasChoices = false;
            }
        } else {
            Next();
        }
    }

    // Choice navigation
    if (hasChoices && finished) {
        if (IsKeyPressed(KEY_UP) || IsKeyPressed(KEY_W)) {
            selectedChoice = (selectedChoice - 1 + (int)choices.size()) % (int)choices.size();
        }
        if (IsKeyPressed(KEY_DOWN) || IsKeyPressed(KEY_S)) {
            selectedChoice = (selectedChoice + 1) % (int)choices.size();
        }
    }
}

void DialogueSystem::Next() {
    currentIndex++;
    if (currentIndex >= (int)dialogues.size()) {
        active = false;
        boxAlpha = 0;
    } else {
        LoadCurrentDialogue();
    }
}

void DialogueSystem::Skip() {
    if (!finished) {
        currentText = fullText;
        charIndex = (float)fullText.length();
        finished = true;
    }
}

void DialogueSystem::Ask(const std::string& speaker, const std::string& text,
                         std::function<void(const std::string&)> callback,
                         const std::vector<std::string>& choiceList)
{
    Start({{speaker, text, ""}});
    hasChoices = true;
    choices = choiceList;
    selectedChoice = 0;
    onChoice = callback;
}

void DialogueSystem::Ask(const std::string& speaker, const std::string& text,
                         const std::vector<std::string>& choiceList,
                         const std::string& context)
{
    Start({{speaker, text, ""}});
    hasChoices = true;
    choices = choiceList;
    selectedChoice = 0;
    choiceContext = context;
    choiceWasSelected = false;
    onChoice = nullptr;
}

void DialogueSystem::Draw() {
    if (!active || boxAlpha <= 0) return;

    int boxY = RENDER_HEIGHT - boxHeight - 20;

    // Shadow
    DrawRectangle(25, boxY + 5, RENDER_WIDTH - 50, boxHeight, {0, 0, 0, (unsigned char)(128 * boxAlpha)});

    // Main box with gradient
    DrawRectangle(20, boxY, RENDER_WIDTH - 40, boxHeight, {20, 20, 40, (unsigned char)(242 * boxAlpha)});

    // Border
    DrawRectangleLinesEx({20, (float)boxY, (float)(RENDER_WIDTH - 40), (float)boxHeight}, 3,
                         {255, 215, 0, (unsigned char)(153 * boxAlpha)});

    // Speaker name
    int speakerFontSize = fontSize + 4;
    DrawTextEx(pixelFont, currentSpeaker.c_str(), {(float)(boxPadding + 20), (float)(boxY + boxPadding - 5)},
               (float)speakerFontSize, 1, GOLD);

    // Dialogue text
    int textY = boxY + boxPadding + 35;
    int textX = boxPadding + 20;
    int maxWidth = RENDER_WIDTH - (boxPadding + 20) * 2;

    // Simple word-wrapped text drawing
    DrawTextEx(pixelFont, currentText.c_str(), {(float)textX, (float)textY},
               (float)fontSize, 1, WHITE);

    // Continue indicator
    if (finished && !hasChoices) {
        bool blink = sinf((float)GetTime() * 6.28f) > 0;
        if (blink) {
            DrawTextEx(pixelFont, "v", {(float)(RENDER_WIDTH - 60), (float)(boxY + boxHeight - 30)},
                       24, 1, GOLD);
        }
    }

    // Draw choices
    if (hasChoices && finished) {
        DrawChoices(boxY);
    }
}

void DialogueSystem::DrawChoices(int boxY) {
    int choiceX = RENDER_WIDTH - 300;
    int totalH = (int)choices.size() * 40;
    int choiceYStart = boxY + (boxHeight - totalH) / 2 + 20;

    for (int i = 0; i < (int)choices.size(); i++) {
        bool selected = (i == selectedChoice);
        Color color = selected ? GOLD : WHITE;
        int fs = selected ? 26 : 24;
        std::string prefix = selected ? "> " : "  ";
        std::string text = prefix + choices[i];
        DrawTextEx(pixelFont, text.c_str(), {(float)choiceX, (float)(choiceYStart + i * 40)},
                   (float)fs, 1, color);
    }
}
