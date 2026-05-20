#include "combat.h"

int CombatSystem::CalculateDamage(int baseDamage, int combo, float damageMultiplier) {
    float comboMult = 1.0f + (combo - 1) * COMBO_MULTIPLIER;
    return (int)(baseDamage * comboMult * damageMultiplier);
}

float CombatSystem::CalculateKnockback(int combo, float baseKB, float addKB, float maxKB) {
    float kb = baseKB + addKB * (combo - 1);
    return std::min(kb, maxKB);
}

bool CombatSystem::CheckPunchHit(const Rect& punchRect, const Rect& enemyRect) {
    return Utils::RectCollision(punchRect, enemyRect);
}

void CombatSystem::DrawDamageNumber(int damage, float x, float y, float alpha) {
    const char* text = TextFormat("-%d", damage);
    DrawText(text, (int)x, (int)y, 32, {255, 68, 68, (unsigned char)(alpha * 255)});
}

void CombatSystem::DrawComboText(int combo, float x, float y) {
    if (combo <= 1) return;
    const char* text = TextFormat("COMBO x%d", combo);
    DrawText(text, (int)(x + 2), (int)(y + 2), 60, {255, 100, 0, 128});
    DrawText(text, (int)x, (int)y, 60, {255, 200, 0, 255});
}
