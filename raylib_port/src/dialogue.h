#pragma once
#include "utils.h"
#include <string>
#include <vector>
#include <functional>

struct DialogueLine {
    std::string speaker;
    std::string text;
    std::string iconPath;
};

class DialogueSystem {
public:
    bool active;
    std::vector<DialogueLine> dialogues;
    int currentIndex;
    std::string currentText;
    std::string fullText;
    float charIndex;
    float typewriterSpeed;
    bool finished;

    std::string currentSpeaker;
    int boxHeight, boxPadding, fontSize, lineHeight;
    float boxAlpha, fadeSpeed;
    double lastBlipTime;

    // Choice system
    bool hasChoices;
    std::vector<std::string> choices;
    int selectedChoice;
    std::function<void(const std::string&)> onChoice;
    std::string choiceContext; // Context for what the choice is about
    bool choiceWasSelected; // True when user confirmed a choice

    Font pixelFont;
    bool fontLoaded;

    DialogueSystem();
    void SetFont(Font f) { pixelFont = f; fontLoaded = true; }

    void Start(const std::vector<DialogueLine>& lines);
    void Update(float dt);
    void Draw();
    void Next();
    void Skip();
    bool IsActive() const { return active; }
    bool HasChoices() const { return hasChoices; }
    bool IsChoiceSelected() const { return choiceWasSelected; }
    int GetSelectedChoice() const { return selectedChoice; }
    void ClearChoice() { choiceWasSelected = false; hasChoices = false; choiceContext = ""; active = false; }

    // Original callback-based Ask
    void Ask(const std::string& speaker, const std::string& text,
             std::function<void(const std::string&)> callback,
             const std::vector<std::string>& choiceList = {"Evet", "Hayir"});

    // Context-based Ask (for scene interactions)
    void Ask(const std::string& speaker, const std::string& text,
             const std::vector<std::string>& choiceList,
             const std::string& context);

private:
    void LoadCurrentDialogue();
    void DrawChoices(int boxY);
};
