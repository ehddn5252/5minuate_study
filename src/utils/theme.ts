import type { BackgroundTheme } from '../types';

// 어두운 배경 스킨 목록 — index.css의 text-gray-* 반전 규칙이 이 목록 전체가 아니라
// html[data-bg-dark='true'] 하나만 보고 적용되므로, 새 어두운 배경을 추가할 때 여기
// 한 곳에만 등록하면 된다(CSS 여러 곳에 selector를 추가할 필요 없음).
const DARK_BACKGROUND_THEMES = new Set<BackgroundTheme>(['charcoal', 'navy', 'forest', 'plum', 'wine']);

export function isDarkBackground(theme: BackgroundTheme): boolean {
  return DARK_BACKGROUND_THEMES.has(theme);
}
