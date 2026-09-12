// F-01 동작 규칙: "학습 자료의 분량이 지나치게 많을 경우… 사용자에게 분할 여부를 묻는다"를
// 구현한다. 주제 텍스트에 "1000개 완성", "단어 500개"처럼 구체적인 수량이 들어있으면,
// 그 분량을 하루 5분 세션에 무리 없이 나눠 담을 수 있는 최소 세션(일) 수를 추정한다.
// 마감(daysLeft)이 이보다 짧으면 총 세션 수를 daysLeft가 아니라 이 최소값으로 잡아,
// "1000개 완성" 같은 목표가 하루 만에 "100% 달성"으로 끝나버리는 것을 막는다.
//
// 수량 표현이 없는 일반 주제(예: "정보처리기사 실기")는 분량을 추정할 근거가 없으므로
// 영향을 주지 않는다(반환값 1 → Math.max(daysLeft, 1)은 항상 daysLeft가 이김).

// 5분 학습 세션 하나에 무리 없이 담을 수 있는 항목(단어/문제 등) 수. F-02의 "5분 완결 원칙"에
// 맞춰 보수적으로 잡은 값 — 실제 하루 분량은 AI가 정하지만, 총 일수를 추정하는 데만 쓰인다.
const ITEMS_PER_SESSION = 30;

// 억지로 몇백 년짜리 계획이 되는 것을 막기 위한 상한(일). 이 값을 넘는 극단적인 경우엔
// F-01의 "상한선은 구현 시 결정" 문구대로 일단 상한을 씌워 사용자가 직접 기한을 조정하게 한다.
const MAX_ESTIMATED_SESSIONS = 90;

const QUANTITY_PATTERN = /(\d{2,6})\s*(개|단어|문항|문제|페이지|쪽|장|words?|questions?|pages?|chapters?)/i;

/**
 * 주제 텍스트에서 분량을 나타내는 숫자(예: "1000개", "단어 500개")를 찾아,
 * 그걸 하루 세션 분량으로 나눈 최소 세션 수를 반환한다. 수량 표현이 없으면 1을 반환한다
 * (즉, 이 값이 daysLeft를 절대 줄이지 않는다 — 늘리기만 한다).
 */
export function estimateMinSessionsFromTopic(topic: string): number {
  const match = topic.match(QUANTITY_PATTERN);
  if (!match) return 1;

  const quantity = parseInt(match[1], 10);
  if (!Number.isFinite(quantity) || quantity <= 0) return 1;

  const estimated = Math.ceil(quantity / ITEMS_PER_SESSION);
  return Math.min(MAX_ESTIMATED_SESSIONS, Math.max(1, estimated));
}
