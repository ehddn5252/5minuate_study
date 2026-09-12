// F-01: 진행 중 목표는 동시에 최대 5개까지만 허용한다(감사 P-2 후속 — 기획엔 있었지만
// 코드로 구현된 적 없던 규칙을 반영, 원래 문서의 3개 대신 5개로 상향).
// GoalCreateScreen과 SharedStudyScreen(F-81)이 같은 제약을 공유하므로 여기 한 곳에 둔다.
export const MAX_ACTIVE_GOALS = 5;
