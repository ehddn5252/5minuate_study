// D-1: 망각곡선(Ebbinghaus) 기반 간격 반복 스케줄링 — 라이트너 상자(Leitner box) 경량 구현.
// 정답을 맞힐 때마다 복습 간격을 늘리고(1→3→7→16→35일), 오답이면 즉시 처음 단계로 리셋한다.
export const LEITNER_INTERVALS_DAYS = [1, 3, 7, 16, 35] as const;

export function nextReviewSchedule(
  currentIntervalIndex: number | undefined,
  correct: boolean,
  from: Date = new Date()
): { intervalIndex: number; nextReviewAt: string } {
  const current = currentIntervalIndex ?? 0;
  const nextIndex = correct ? Math.min(current + 1, LEITNER_INTERVALS_DAYS.length - 1) : 0;
  const days = LEITNER_INTERVALS_DAYS[nextIndex];
  const due = new Date(from);
  due.setDate(due.getDate() + days);
  return { intervalIndex: nextIndex, nextReviewAt: due.toISOString().split('T')[0] };
}

export type ReviewBucket = 'due' | 'new' | 'scheduled';

// 신규(한 번도 안 풀어봄) > 오늘 복습 예정(레거시 데이터 포함) > 아직 예정일 안 됨 순으로 분류
export function categorizeForReview(
  quiz: { lastAttemptedAt?: string; nextReviewAt?: string },
  todayStr: string
): ReviewBucket {
  if (quiz.lastAttemptedAt === undefined) return 'new';
  if (quiz.nextReviewAt === undefined) return 'due';
  return quiz.nextReviewAt <= todayStr ? 'due' : 'scheduled';
}
