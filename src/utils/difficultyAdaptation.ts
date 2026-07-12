import type { QuizLevel } from '../types';

// D-8: 적응형 난이도 — Bandura의 자기효능감/flow 이론. 너무 쉬우면 지루하고 너무 어려우면
// 좌절해서 이탈한다는 원칙에 따라, 최근 정답률이 극단적일 때만 완료 화면에 "제안 배지" 하나로
// 조용히 물어본다(강제 변경 아님, 통계 화면 신설 아님 — 비목표의 심층 대시보드와 무관).
const LEVEL_ORDER: QuizLevel[] = ['beginner', 'intermediate', 'advanced'];
export const LEVEL_SUGGESTION_WINDOW = 3;
const WINDOW = LEVEL_SUGGESTION_WINDOW;
const HIGH_THRESHOLD = 0.9;
const LOW_THRESHOLD = 0.5;

export type LevelSuggestion = 'up' | 'down';

// recentPercents: 최근 WINDOW세션(이번 세션 포함) 정답률(0~1). WINDOW 미만이면 판단 보류(null).
export function suggestLevelChange(recentPercents: number[], currentLevel: QuizLevel): LevelSuggestion | null {
  if (recentPercents.length < WINDOW) return null;
  const avg = recentPercents.reduce((a, b) => a + b, 0) / recentPercents.length;
  const idx = LEVEL_ORDER.indexOf(currentLevel);
  if (avg >= HIGH_THRESHOLD && idx < LEVEL_ORDER.length - 1) return 'up';
  if (avg <= LOW_THRESHOLD && idx > 0) return 'down';
  return null;
}

export function nextLevel(current: QuizLevel, direction: LevelSuggestion): QuizLevel {
  const idx = LEVEL_ORDER.indexOf(current);
  const nextIdx = direction === 'up' ? Math.min(idx + 1, LEVEL_ORDER.length - 1) : Math.max(idx - 1, 0);
  return LEVEL_ORDER[nextIdx];
}

export const LEVEL_LABEL: Record<QuizLevel, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
};
