import type { Goal, Quiz } from '../types';
import { LEITNER_INTERVALS_DAYS } from './spacedRepetition';

// "풀었던 문제가 너무 방대할 때" 필요 없는 문제를 기준별로 골라 지우기 위한 분석.
// 북마크("내 문제집")한 문제는 어떤 기준에도 걸리지 않는다 — 항상 보존.

export type CleanupCategoryId = 'orphanGoal' | 'stale' | 'graduated';

export interface CleanupCategory {
  id: CleanupCategoryId;
  label: string;
  description: string;
  quizIds: string[];
}

export const STALE_MONTHS_DEFAULT = 3;

function monthsAgoIso(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
}

export function analyzeCleanup(
  quizzes: Quiz[],
  goals: Goal[],
  staleMonths: number = STALE_MONTHS_DEFAULT,
): CleanupCategory[] {
  const goalById = new Map(goals.map((g) => [g.id, g]));
  const staleCutoff = monthsAgoIso(staleMonths);
  const maxIntervalIndex = LEITNER_INTERVALS_DAYS.length - 1;

  // 북마크한 문제는 정리 대상에서 완전히 제외
  const eligible = quizzes.filter((q) => !q.bookmarked);

  const orphanGoal = eligible.filter((q) => {
    const goal = goalById.get(q.goalId);
    return !goal || goal.status === 'completed' || goal.status === 'inactive';
  });

  const stale = eligible.filter(
    (q) => typeof q.lastAttemptedAt === 'string' && q.lastAttemptedAt < staleCutoff,
  );

  const graduated = eligible.filter(
    (q) => (q.intervalIndex ?? 0) >= maxIntervalIndex && !q.isWrong,
  );

  return [
    {
      id: 'orphanGoal',
      label: '완료·보관된 목표의 문제',
      description: '더 이상 진행하지 않는 목표에 딸린 문제 (북마크 제외)',
      quizIds: orphanGoal.map((q) => q.id),
    },
    {
      id: 'stale',
      label: `${staleMonths}개월 이상 안 만진 문제`,
      description: '마지막으로 푼 지 오래된 문제',
      quizIds: stale.map((q) => q.id),
    },
    {
      id: 'graduated',
      label: '간격반복 졸업 문제',
      description: '복습 간격이 최대(35일)까지 늘어나 충분히 익힌 문제',
      quizIds: graduated.map((q) => q.id),
    },
  ];
}

// 선택된 카테고리들의 quizId 합집합
export function unionQuizIds(categories: CleanupCategory[], selected: Set<CleanupCategoryId>): string[] {
  const ids = new Set<string>();
  for (const category of categories) {
    if (!selected.has(category.id)) continue;
    for (const id of category.quizIds) ids.add(id);
  }
  return Array.from(ids);
}
