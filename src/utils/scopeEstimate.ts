// F-01 동작 규칙: "학습 자료의 분량이 지나치게 많을 경우… 사용자에게 분할 여부를 묻는다"를
// 구현한다. 주제 텍스트에 "1000개 완성", "단어 500개", "다섯 챕터"처럼 구체적인 수량이
// 들어있으면, 그 분량을 무리 없이 나눠 담을 수 있는 최소 세션(일) 수를 추정한다.
// 마감(daysLeft)이 이보다 짧으면 총 세션 수를 daysLeft가 아니라 이 최소값으로 잡아,
// "1000개 완성" 같은 목표가 하루 만에 "100% 달성"으로 끝나버리는 것을 막는다.
//
// 수량 표현이 없거나 인식 못 하는 표현(예: "정보처리기사 실기")은 분량을 추정할 근거가
// 없으므로 영향을 주지 않는다(반환값 1 → Math.max(daysLeft, 1)은 항상 daysLeft가 이김).

// 하루 세션에 여러 개를 몰아 담을 수 있는 잘게 쪼개지는 단위(단어/문제 등)의 세션당 개수.
const ITEMS_PER_SESSION = 30;

// 억지로 몇백 년짜리 계획이 되는 것을 막기 위한 상한(일). 이 값을 넘는 극단적인 경우엔
// F-01의 "상한선은 구현 시 결정" 문구대로 일단 상한을 씌워 사용자가 직접 기한을 조정하게 한다.
const MAX_ESTIMATED_SESSIONS = 90;

// "개/단어/문항/문제/페이지/쪽/words/questions/pages"처럼 하루 세션에 여러 개를 몰아
// 담을 수 있는 잘게 쪼개지는 단위 — ITEMS_PER_SESSION으로 나눠 세션 수를 추정한다.
const FINE_UNIT = '개|단어|문항|문제|페이지|쪽|words?|questions?|pages?';
// "장/권/과/챕터/단원/강/회차/chapters"처럼 보통 하루에 1개씩 진행하는 굵은 단위 —
// 개수를 나누지 않고 그대로 최소 세션 수로 쓴다(예: "5장 완성"은 최소 5세션 필요).
const COARSE_UNIT = '장|권|과|챕터|단원|강|회차|chapters?';

const FINE_PATTERN = new RegExp(`(\\d{2,6})\\s*(?:${FINE_UNIT})`, 'i');
const COARSE_PATTERN = new RegExp(`(\\d{1,3})\\s*(?:${COARSE_UNIT})`, 'i');

// 한글 고유어 숫자 — "다섯 챕터", "챕터 다섯 개", "스무 개"처럼 아라비아 숫자 없이 쓰는
// 경우를 지원한다. 실사용 범위(1~99)만 다루고, 그 이상은 보통 아라비아 숫자로 쓰므로
// 위 두 패턴이 이미 커버한다.
const KOREAN_ONES: Record<string, number> = {
  한: 1, 하나: 1, 두: 2, 둘: 2, 세: 3, 셋: 3, 네: 4, 넷: 4,
  다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9,
};
const KOREAN_TENS: Record<string, number> = {
  열: 10, 스물: 20, 스무: 20, 서른: 30, 마흔: 40, 쉰: 50,
  예순: 60, 일흔: 70, 여든: 80, 아흔: 90,
};
const KOREAN_NUMBER_WORD = `(?:${Object.keys(KOREAN_TENS).join('|')})?(?:${Object.keys(KOREAN_ONES).join('|')})?`;
const KOREAN_PATTERN = new RegExp(`(${KOREAN_NUMBER_WORD})\\s*(${FINE_UNIT}|${COARSE_UNIT})`, 'i');

function parseKoreanNumber(word: string): number {
  for (const [tensWord, tensVal] of Object.entries(KOREAN_TENS)) {
    if (word.startsWith(tensWord)) {
      const onesWord = word.slice(tensWord.length);
      return tensVal + (onesWord ? (KOREAN_ONES[onesWord] ?? 0) : 0);
    }
  }
  return KOREAN_ONES[word] ?? 0;
}

function clampSessions(estimated: number): number {
  return Math.min(MAX_ESTIMATED_SESSIONS, Math.max(1, estimated));
}

/**
 * 주제 텍스트에서 분량을 나타내는 표현(예: "1000개", "단어 500개", "다섯 챕터")을 찾아
 * 최소 세션 수를 반환한다. 인식하지 못하면 1을 반환한다(즉, daysLeft를 절대 줄이지 않고
 * 늘리기만 한다).
 */
export function estimateMinSessionsFromTopic(topic: string): number {
  const fine = topic.match(FINE_PATTERN);
  if (fine) {
    const quantity = parseInt(fine[1], 10);
    if (Number.isFinite(quantity) && quantity > 0) {
      return clampSessions(Math.ceil(quantity / ITEMS_PER_SESSION));
    }
  }

  const coarse = topic.match(COARSE_PATTERN);
  if (coarse) {
    const quantity = parseInt(coarse[1], 10);
    if (Number.isFinite(quantity) && quantity > 0) {
      return clampSessions(quantity);
    }
  }

  const korean = topic.match(KOREAN_PATTERN);
  if (korean && korean[1]) {
    const quantity = parseKoreanNumber(korean[1]);
    if (quantity > 0) {
      const isCoarse = new RegExp(`^(?:${COARSE_UNIT})$`, 'i').test(korean[2]);
      return clampSessions(isCoarse ? quantity : Math.ceil(quantity / ITEMS_PER_SESSION));
    }
  }

  return 1;
}
