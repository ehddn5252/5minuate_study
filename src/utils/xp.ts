// F-37: XP/레벨업 — 개인 누적치만 저장·표시(타 사용자 비교 UI 없음, 소셜 랭킹 비목표와 무관)
const BASE_XP = 10;
const PERFECT_BONUS_XP = 5;
const XP_PER_LEVEL = 50;

export function computeXpGain(score: number, total: number): number {
  const perfect = total > 0 && score === total;
  return BASE_XP + (perfect ? PERFECT_BONUS_XP : 0);
}

export function levelForXp(xp: number): number {
  return Math.floor(Math.max(xp, 0) / XP_PER_LEVEL) + 1;
}

export function xpIntoCurrentLevel(xp: number): { current: number; needed: number } {
  return { current: Math.max(xp, 0) % XP_PER_LEVEL, needed: XP_PER_LEVEL };
}
