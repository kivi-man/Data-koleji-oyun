#pragma once
#include "utils.h"

class CombatSystem {
public:
    static constexpr int PUNCH_DAMAGE = 20;
    static constexpr float COMBO_MULTIPLIER = 0.3f;
    static constexpr float COMBO_DECAY_TIME = 1500.0f;
    static constexpr float INVULN_TIME = 500.0f;

    int CalculateDamage(int baseDamage, int combo, float damageMultiplier = 1.0f);
    float CalculateKnockback(int combo, float baseKB = 25, float addKB = 10, float maxKB = 80);
    bool CheckPunchHit(const Rect& punchRect, const Rect& enemyRect);
    void DrawDamageNumber(int damage, float x, float y, float alpha = 1.0f);
    void DrawComboText(int combo, float x, float y);
};
