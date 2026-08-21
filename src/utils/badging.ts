// F-72: PWA 앱 아이콘 배지(Badging API) — 앱을 열어보지 않아도 홈 화면/작업표시줄 아이콘에
// 숫자로 "확인할 게 있다"는 신호를 준다. Android Chrome은 이 API를 지원하지 않고 데스크톱
// Chrome/Edge·iOS 16.4+ 설치형 PWA에서만 동작하므로, 지원 여부를 항상 먼저 확인하고
// 미지원 환경에서는 조용히 아무 일도 하지 않는다(에러를 던지지 않음).
export function setAppBadgeCount(count: number): void {
  if (!('setAppBadge' in navigator)) return;
  if (count > 0) {
    navigator.setAppBadge(count).catch(() => {});
  } else {
    navigator.clearAppBadge?.().catch(() => {});
  }
}

export function clearAppBadge(): void {
  if (!('clearAppBadge' in navigator)) return;
  navigator.clearAppBadge().catch(() => {});
}
