import type { MateTone, MascotSkin } from '../types';

export type MascotMood = 'correct' | 'wrong' | 'celebrate' | 'concerned' | 'neutral';

// F-38: 이모지 기반 마스코트 — 신규 SVG 에셋 없이, 기존 mateTone(F-27/F-30) 3톤 뱅크를
// 그대로 재사용해 같은 상황에도 다른 표정을 보여준다.
const MASCOT_FACES: Record<MateTone, Record<MascotMood, string>> = {
  plain: { correct: '🙂', wrong: '😕', celebrate: '🎉', concerned: '😌', neutral: '🙂' },
  friendly: { correct: '😄', wrong: '🥲', celebrate: '🥳', concerned: '🤗', neutral: '😊' },
  hype: { correct: '🔥', wrong: '😮', celebrate: '🤩', concerned: '💪', neutral: '😎' },
};

// F-41: 마스코트 스킨 — cat은 유니코드 고양이 표정 이모지(😺😿😻🙀😸)가 마침 5가지 무드에
// 맞게 다 있어서 실제로 캐릭터가 달라 보인다. tone별로 안 나누고 스킨 하나당 표정 세트 하나만
// 쓴다(무드마다 다른 캐릭터 이모지를 지원하는 유니코드 세트가 흔치 않아서, 억지로 tone까지
// 곱하면 의미 없는 이모지 끼워맞추기가 됨).
const MASCOT_SKIN_FACES: Partial<Record<MascotSkin, Record<MascotMood, string>>> = {
  cat: { correct: '😺', wrong: '😿', celebrate: '😻', concerned: '🙀', neutral: '😸' },
};

export function getMascotFace(mood: MascotMood, tone: MateTone = 'plain', skin: MascotSkin = 'classic'): string {
  const skinBank = MASCOT_SKIN_FACES[skin];
  if (skinBank) return skinBank[mood];
  const bank = MASCOT_FACES[tone] ?? MASCOT_FACES.plain;
  return bank[mood];
}

// 완료 화면 상단 이모지 — 기존 percent 4단계 구간(100/80/60/그 외)은 그대로 유지하면서 톤별로 표정만 다르게 한다
export function getCompletionFace(percent: number, tone: MateTone = 'plain', skin: MascotSkin = 'classic'): string {
  if (percent === 100) return getMascotFace('celebrate', tone, skin);
  if (percent >= 80) return getMascotFace('correct', tone, skin);
  if (percent >= 60) return getMascotFace('neutral', tone, skin);
  return getMascotFace('concerned', tone, skin);
}
