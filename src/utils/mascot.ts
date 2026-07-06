import type { MateTone } from '../types';

export type MascotMood = 'correct' | 'wrong' | 'celebrate' | 'concerned' | 'neutral';

// F-38: 이모지 기반 마스코트 — 신규 SVG 에셋 없이, 기존 mateTone(F-27/F-30) 3톤 뱅크를
// 그대로 재사용해 같은 상황에도 다른 표정을 보여준다.
const MASCOT_FACES: Record<MateTone, Record<MascotMood, string>> = {
  plain: { correct: '🙂', wrong: '😕', celebrate: '🎉', concerned: '😌', neutral: '🙂' },
  friendly: { correct: '😄', wrong: '🥲', celebrate: '🥳', concerned: '🤗', neutral: '😊' },
  hype: { correct: '🔥', wrong: '😮', celebrate: '🤩', concerned: '💪', neutral: '😎' },
};

export function getMascotFace(mood: MascotMood, tone: MateTone = 'plain'): string {
  const bank = MASCOT_FACES[tone] ?? MASCOT_FACES.plain;
  return bank[mood];
}

// 완료 화면 상단 이모지 — 기존 percent 4단계 구간(100/80/60/그 외)은 그대로 유지하면서 톤별로 표정만 다르게 한다
export function getCompletionFace(percent: number, tone: MateTone = 'plain'): string {
  if (percent === 100) return getMascotFace('celebrate', tone);
  if (percent >= 80) return getMascotFace('correct', tone);
  if (percent >= 60) return getMascotFace('neutral', tone);
  return getMascotFace('concerned', tone);
}
