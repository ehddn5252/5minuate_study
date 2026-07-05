import { getSessions } from './storage';

// F-31: "지난 나" 대비 성장 피드백 — 타인·랭킹이 아닌 같은 목표의 자기 이력 대비로만 비교한다.
const RECENT_N = 5;
const MIN_HISTORY = 3;

export interface GrowthFeedback {
  hasEnoughHistory: boolean;
  message: string;
}

// currentSessionId: 방금 완료 처리된 세션(이미 저장됐을 수 있음)은 비교 대상에서 제외한다.
export function getGrowthFeedback(
  goalId: string,
  currentScore: number,
  currentTotal: number,
  currentSessionId: string
): GrowthFeedback {
  if (currentTotal <= 0) {
    return { hasEnoughHistory: false, message: '기록을 쌓는 중이에요' };
  }

  const priorSessions = getSessions()
    .filter(
      (s) =>
        s.goalId === goalId &&
        s.status === 'completed' &&
        s.id !== currentSessionId &&
        s.quizScore !== undefined &&
        s.quizTotal !== undefined &&
        s.quizTotal > 0
    )
    .slice(-RECENT_N);

  if (priorSessions.length < MIN_HISTORY) {
    return { hasEnoughHistory: false, message: '기록을 쌓는 중이에요' };
  }

  const avgPercent =
    (priorSessions.reduce((sum, s) => sum + s.quizScore! / s.quizTotal!, 0) / priorSessions.length) * 100;
  const currentPercent = (currentScore / currentTotal) * 100;
  const diff = Math.round(currentPercent - avgPercent);

  if (diff > 3) {
    return { hasEnoughHistory: true, message: `지난 ${priorSessions.length}회 평균보다 +${diff}%p` };
  }
  if (diff < -3) {
    return { hasEnoughHistory: true, message: '오늘은 조금 쉬어가는 날이었어요' };
  }
  return { hasEnoughHistory: true, message: '꾸준히 유지 중이에요' };
}
