import type { BadgeId } from '../types';
import { getBadges, hasBadge, saveBadge, getSessions, getGoals, getActiveWrongPool } from './storage';

export interface BadgeDef {
  id: BadgeId;
  icon: string;
  name: string;
  desc: string;
}

export const BADGE_DEFS: BadgeDef[] = [
  { id: 'first_step',      icon: '👣', name: '첫 걸음',  desc: '첫 번째 세션을 완료했어요' },
  { id: 'flame_7',         icon: '🔥', name: '불꽃',     desc: '7일 연속 달성' },
  { id: 'persistence_30',  icon: '💪', name: '근성',     desc: '30일 연속 달성' },
  { id: 'perfect_5',       icon: '⭐', name: '만점자',   desc: '퀴즈 100점 5회 달성' },
  { id: 'zero_wrong',      icon: '✨', name: '오답 제로', desc: '오답풀을 완전히 비웠어요' },
];

export function getBadgeDef(id: BadgeId): BadgeDef {
  return BADGE_DEFS.find((b) => b.id === id)!;
}

export function checkAndAwardBadges(
  goalId: string,
  newStreak: number
): BadgeId[] {
  const newlyUnlocked: BadgeId[] = [];

  const sessions = getSessions().filter((s) => s.status === 'completed');
  const goals = getGoals();
  const wrongPool = getActiveWrongPool(goalId);

  const perfectCount = sessions.filter(
    (s) => s.quizScore !== undefined && s.quizTotal !== undefined && s.quizTotal > 0 && s.quizScore === s.quizTotal
  ).length;

  const maxStreak = Math.max(newStreak, ...goals.map((g) => g.streak));

  const checks: { id: BadgeId; condition: boolean }[] = [
    { id: 'first_step',     condition: sessions.length >= 1 },
    { id: 'flame_7',        condition: maxStreak >= 7 },
    { id: 'persistence_30', condition: maxStreak >= 30 },
    { id: 'perfect_5',      condition: perfectCount >= 5 },
    { id: 'zero_wrong',     condition: wrongPool.length === 0 && sessions.some((s) => s.goalId === goalId) },
  ];

  for (const { id, condition } of checks) {
    if (condition && !hasBadge(id)) {
      saveBadge({ id, unlockedAt: new Date().toISOString() });
      newlyUnlocked.push(id);
    }
  }

  return newlyUnlocked;
}

export { getBadges };
