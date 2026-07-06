import { getSessions } from './storage';

// F-31: "지난 나" 대비 성장 피드백 — 타인·랭킹이 아닌 같은 목표의 자기 이력 대비로만 비교한다.
const RECENT_N = 5;
const MIN_HISTORY = 3;

export interface GrowthFeedback {
  hasEnoughHistory: boolean;
  message: string;
  // F-41: 정답률 역대 최고치 경신 또는 스트릭 역대 기록 경신 — 자기 이력 비교 원칙(F-31)을 그대로 유지
  isPersonalBest?: boolean;
}

// currentSessionId: 방금 완료 처리된 세션(이미 저장됐을 수 있음)은 비교 대상에서 제외한다.
// isNewBestStreak: 이번 세션으로 goal.bestStreak을 새로 경신했는지(TestScreen에서 계산해 전달)
export function getGrowthFeedback(
  goalId: string,
  currentScore: number,
  currentTotal: number,
  currentSessionId: string,
  isNewBestStreak: boolean = false
): GrowthFeedback {
  if (currentTotal <= 0) {
    return { hasEnoughHistory: false, message: '기록을 쌓는 중이에요', isPersonalBest: isNewBestStreak };
  }

  const allPriorSessions = getSessions().filter(
    (s) =>
      s.goalId === goalId &&
      s.status === 'completed' &&
      s.id !== currentSessionId &&
      s.quizScore !== undefined &&
      s.quizTotal !== undefined &&
      s.quizTotal > 0
  );

  const currentPercent = (currentScore / currentTotal) * 100;
  // 비교할 과거 기록이 충분히 쌓이기 전(첫 세션 등)에는 "기록 경신"이라 부르지 않는다
  const priorBestPercent =
    allPriorSessions.length > 0 ? Math.max(...allPriorSessions.map((s) => (s.quizScore! / s.quizTotal!) * 100)) : -1;
  const isNewBestPercent = allPriorSessions.length >= MIN_HISTORY && currentPercent > priorBestPercent;
  const isPersonalBest = isNewBestStreak || isNewBestPercent;

  const priorSessions = allPriorSessions.slice(-RECENT_N);

  if (priorSessions.length < MIN_HISTORY) {
    return { hasEnoughHistory: false, message: '기록을 쌓는 중이에요', isPersonalBest };
  }

  const avgPercent =
    (priorSessions.reduce((sum, s) => sum + s.quizScore! / s.quizTotal!, 0) / priorSessions.length) * 100;
  const diff = Math.round(currentPercent - avgPercent);

  if (diff > 3) {
    return { hasEnoughHistory: true, message: `지난 ${priorSessions.length}회 평균보다 +${diff}%p`, isPersonalBest };
  }
  if (diff < -3) {
    return { hasEnoughHistory: true, message: '오늘은 조금 쉬어가는 날이었어요', isPersonalBest };
  }
  return { hasEnoughHistory: true, message: '꾸준히 유지 중이에요', isPersonalBest };
}
