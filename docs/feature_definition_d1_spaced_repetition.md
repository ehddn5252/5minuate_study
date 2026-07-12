# 기능 정의서 — D-1. 망각곡선 기반 간격 반복(Spaced Repetition) 스케줄링

> 작성 주체: FO(Feature Owner) 에이전트
> 기반 기획: `docs/planning_document_ideation2.md` §0, D-1
> 확인한 소스: `src/types/index.ts`, `src/screens/TestScreen.tsx`, `src/screens/RetryWrongScreen.tsx`,
> `src/services/gemini.ts`, `src/services/contentPool.ts`, `src/services/questionBank.ts`,
> `src/screens/LearningScreen.tsx`, `src/utils/quizValidation.ts`, `src/utils/storage.ts`, `src/store/index.ts`

---

## 1. 데이터 모델 변경

### 1.1 `Quiz` 인터페이스 (`src/types/index.ts:52-67`)

`lastAttemptedAt` 바로 다음, `bookmarked` 앞에 필드 2개를 추가한다.

| 필드 | 타입 | 의미 | 기존 필드와의 관계 |
|---|---|---|---|
| `intervalIndex?: number` | 옵셔널 | 라이트너 상자 인덱스(0~4). 몇 번째 간격 단계인지 | 신규. `wrongCount`(누적 오답 횟수, 평생 카운터)와 달리 "현재 상자 위치"만 나타내며 정답 시 전진, 오답 시 0으로 리셋 |
| `nextReviewAt?: string` | 옵셔널, `'YYYY-MM-DD'` | 다음 복습 예정일(날짜 단위, 시각 없음) | 신규. `lastAttemptedAt`(마지막 시도 시각, ISO datetime, ★변경 없음★ 그대로 유지)과 별개 축 — "언제 풀었는가"가 아니라 "언제 다시 풀어야 하는가" |

```ts
export interface Quiz {
  id: string;
  goalId: string;
  question: string;
  type: QuizType;
  options?: string[];
  answer: string;
  explanation: string;
  isWrong: boolean;
  wrongCount: number;
  lastAttemptedAt?: string;
  intervalIndex?: number;   // NEW
  nextReviewAt?: string;    // NEW ('YYYY-MM-DD')
  bookmarked?: boolean;
  orphanedGoalTopic?: string;
}
```

날짜 단위(`YYYY-MM-DD`)로 저장하는 이유: 코드베이스 전반이 세션 판정을 이미 날짜 단위 문자열로 하고 있음(`storage.ts:82-86`의 `getTodaySession`, `TestScreen.tsx:258-261`의 `today`/`yesterdayStr`). 시분초까지 저장하면 "오늘 복습 예정" 비교에서 시간대·시각 오차로 인한 버그 여지가 생긴다.

### 1.2 기존 필드 역할 변경 없음
- `isWrong`: 그대로 "지금 오답 풀에 있는가"의 즉시 플래그로 유지.
- `wrongCount`: 그대로 평생 누적 오답 횟수로 유지.
- `lastAttemptedAt`: 그대로 마지막 시도 시각(정보 표시용)으로 유지. D-1은 이 값을 스케줄링 판단에 직접 쓰지 않는다(대신 "이 값이 `undefined`인가"만 신규/레거시 구분에 사용 — §5 참고).

---

## 2. 간격 계산 로직 (신규 순수 함수)

신규 파일 `src/utils/spacedRepetition.ts`를 만든다(다른 순수 로직 유틸인 `xp.ts`, `growthFeedback.ts`와 동일한 패턴).

```ts
// src/utils/spacedRepetition.ts
export const LEITNER_INTERVALS_DAYS = [1, 3, 7, 16, 35] as const;

// 정답: 인덱스 +1(최댓값에서는 유지) / 오답: 인덱스 0으로 리셋
// 순수 함수 — Date를 인자로 받아 테스트 가능하게 함(기본값 today)
export function nextReviewSchedule(
  currentIntervalIndex: number | undefined,
  correct: boolean,
  from: Date = new Date()
): { intervalIndex: number; nextReviewAt: string } {
  const current = currentIntervalIndex ?? 0;
  const nextIndex = correct
    ? Math.min(current + 1, LEITNER_INTERVALS_DAYS.length - 1)
    : 0;
  const days = LEITNER_INTERVALS_DAYS[nextIndex];
  const due = new Date(from);
  due.setDate(due.getDate() + days);
  return { intervalIndex: nextIndex, nextReviewAt: due.toISOString().split('T')[0] };
}

// TestScreen 출제 버킷 분류에 쓰는 헬퍼(§3)
export type ReviewBucket = 'due' | 'new' | 'scheduled';

export function categorizeForReview(quiz: { lastAttemptedAt?: string; nextReviewAt?: string }, todayStr: string): ReviewBucket {
  if (quiz.lastAttemptedAt === undefined) return 'new';                 // 한 번도 안 풀어봄
  if (quiz.nextReviewAt === undefined) return 'due';                    // 레거시 데이터(스케줄 없음) → 즉시 복습 가능 취급
  return quiz.nextReviewAt <= todayStr ? 'due' : 'scheduled';           // 오늘/과거 예정일 → 복습 대상, 미래 예정일 → 아직 때 아님
}
```

의사코드 검증:
- 정답 반복 시 인덱스 0→1→2→3→4(간격 1→3→7→16→35일)로 전진, 4에서 계속 정답이면 4에 고정(35일 간격 유지) — "최대 인덱스에서 정답이면 그대로 유지" 요구사항 충족.
- 오답이면 인덱스 항상 0, 다음 예정일은 "오늘+1일"(즉시 재도전 유도, WrongPool과 겹치되 상충하지 않음 — §4).

---

## 3. `TestScreen.tsx` 출제 우선순위 통합 규칙

### 3.1 정답/오답 처리 지점 — `handleAnswer()` (`TestScreen.tsx:171-218`)

기존 코드는 `isWrong`/`wrongCount`/`lastAttemptedAt`만 갱신한다. 여기에 `nextReviewSchedule()` 호출을 끼워 넣는다.

```ts
const handleAnswer = (correct: boolean) => {
  // ...기존 코드(콤보 배너, 세션 저장) 그대로...

  const quiz = testQuizzes[currentIndex];
  const { intervalIndex, nextReviewAt } = nextReviewSchedule(quiz.intervalIndex, correct);

  if (!correct) {
    const updated = {
      ...quiz,
      isWrong: true,
      wrongCount: quiz.wrongCount + 1,
      lastAttemptedAt: new Date().toISOString(),
      intervalIndex,      // NEW — 0으로 리셋됨
      nextReviewAt,        // NEW
    };
    updateQuiz(updated);
    addToWrongPool({ /* 기존과 동일 */ });
  } else {
    updateQuiz({
      ...quiz,
      isWrong: false,
      lastAttemptedAt: new Date().toISOString(),
      intervalIndex,      // NEW — 전진
      nextReviewAt,        // NEW
    });
    removeFromWrongPool(goal.id, quiz.id);
  }
};
```

### 3.2 출제 풀 선택 지점 (`TestScreen.tsx:97-108`, F-09)

기존 로직은 "오답 풀 최대 50% + 나머지는 플랫 랜덤" 2단 구조다. 이 "나머지" 버킷 하나를 `categorizeForReview()` 기준 3단으로 세분화하고, **오답 풀의 기존 50% 캡은 그대로 유지**한다(F-09가 이미 검증한 "오답이 출제를 독점하지 않게" 하는 안전장치를 건드리지 않기 위함).

```ts
// F-09 + D-1: 우선순위 = 오답 풀(최대 50%) > 오늘 복습 예정(레거시 포함) > 신규 미출제 > 나머지(예정일 안 됨)
const today = new Date().toISOString().split('T')[0];
const wrongPoolEntries = getActiveWrongPool(goal.id);
const wrongQuizIds = new Set(wrongPoolEntries.map((w) => w.quizId));

const wrongQuizzes = shuffleArray(pool.filter((q) => wrongQuizIds.has(q.id)));
const nonWrongPool = pool.filter((q) => !wrongQuizIds.has(q.id));

const dueQuizzes = shuffleArray(nonWrongPool.filter((q) => categorizeForReview(q, today) === 'due'));
const newQuizzes = shuffleArray(nonWrongPool.filter((q) => categorizeForReview(q, today) === 'new'));
const restQuizzes = shuffleArray(nonWrongPool.filter((q) => categorizeForReview(q, today) === 'scheduled'));

const maxWrong = Math.floor(TARGET * 0.5);
const fromWrong = wrongQuizzes.slice(0, maxWrong);
let remaining = TARGET - fromWrong.length;

const fromDue = dueQuizzes.slice(0, remaining);
remaining -= fromDue.length;

const fromNew = newQuizzes.slice(0, remaining);
remaining -= fromNew.length;

const fromRest = restQuizzes.slice(0, remaining);

const selected = [...fromWrong, ...fromDue, ...fromNew, ...fromRest].slice(0, TARGET);
```

### 3.3 병합 우선순위 표

| 순위 | 그룹 | 정의 | 상한 | 근거 |
|---|---|---|---|---|
| 1 | 오답 풀(`WrongPool`, F-13) | `getActiveWrongPool(goal.id)`에 있는 문제 | `Math.floor(TARGET * 0.5)`(기존 F-09 캡 유지) | 방금 확실히 틀렸다고 판정된 즉시 교정 대상 — 라이트너보다 시급 |
| 2 | 오늘 복습 예정(D-1, `due`) | `nextReviewAt <= today` 이거나, 이미 한 번 풀었는데(`lastAttemptedAt` 있음) `nextReviewAt`이 없는 레거시 데이터 | 나머지 슬롯 | 망각 직전 시점 — 이번 방향의 핵심 |
| 3 | 신규 미출제(`new`) | `lastAttemptedAt === undefined` | 나머지 슬롯 | 한 번도 인출 연습을 안 한 문제를 계속 방치하지 않도록 |
| 4 | 나머지(`scheduled`) | 예정일이 아직 안 된 문제 | 나머지 슬롯 | 기존과 동일하게 랜덤 채움(콘텐츠 소진 방지) |

---

## 4. F-13(`WrongPool`)과 D-1(Leitner)의 관계 — 명시적 정리

| 구분 | 목적 | 시간축 | 트리거 | 해제 조건 |
|---|---|---|---|---|
| `WrongPool`(F-13) | **단기 교정**: 방금 틀린 문제를 다음 세션에 곧바로 다시 보여줌 | 즉시(다음 세션) | 오답 즉시 `addToWrongPool` | 정답 시 `removeFromWrongPool` |
| Leitner 스케줄(D-1) | **장기 파지 유지**: 이미 아는 문제도 망각 직전에 다시 인출시킴 | 1~35일 간격 | 매 응답마다 `nextReviewSchedule` | 없음(계속 순환) |

두 메커니즘은 상호 배타적이지 않고 **오답 시 둘 다 갱신된다**(§3.1 `handleAnswer` 코드 참고 — `addToWrongPool`과 `nextReviewSchedule` 리셋이 같은 분기에서 함께 일어남). 출제 시 병합 순서는 §3.3 표대로 "오답 풀 우선, 그다음 라이트너 예정일"로 고정한다 — 오답 풀 쪽이 "지금 확실히 모르는 것", 라이트너 쪽은 "예전엔 알았는데 슬슬 잊을 시점인 것"이라 전자가 더 시급하다는 판단.

---

## 5. `RetryWrongScreen.tsx` 처리

이 화면은 **출제 풀 선택 로직이 없다**(항상 해당 목표의 `getActiveWrongPool()` 전체를 보여줌, `RetryWrongScreen.tsx:26-31`) — 그래서 §3.2 같은 우선순위 병합 변경은 불필요하다.

다만 `handleAnswer()`(`RetryWrongScreen.tsx:54-75`)는 TestScreen과 별개로 `isWrong`/`wrongCount`/`lastAttemptedAt`만 갱신하고 있어, 여기서 정답을 맞혀도 `intervalIndex`/`nextReviewAt`이 갱신되지 않는 누락이 생긴다. **같은 스케줄 갱신 로직을 여기도 적용해야 한다**(그렇지 않으면 오답 풀에서 정답으로 "졸업"한 문제가 TestScreen의 §3.2 분류에서 계속 `scheduled`/`due` 판단 없이 `new`도 아니고 `nextReviewAt`도 없는 애매한 상태로 남는다 — 실제로는 `lastAttemptedAt`은 갱신되므로 `categorizeForReview`는 `due`로 분류하겠지만, 그 다음 정답을 다시 맞혀도 인덱스가 전진하지 않아 계속 "내일 또 due" 취급되는 버그가 생긴다).

```ts
const handleAnswer = (correct: boolean) => {
  setAnswers((prev) => [...prev, correct]);
  setAnswered(true);

  const { intervalIndex, nextReviewAt } = nextReviewSchedule(currentQuiz.intervalIndex, correct); // NEW

  if (correct) {
    updateQuiz({
      ...currentQuiz,
      isWrong: false,
      lastAttemptedAt: new Date().toISOString(),
      intervalIndex, nextReviewAt, // NEW
    });
    removeFromWrongPool(goal.id, currentQuiz.id);
  } else {
    const existing = getActiveWrongPool(goal.id).find((w) => w.quizId === currentQuiz.id);
    updateQuiz({
      ...currentQuiz,
      wrongCount: currentQuiz.wrongCount + 1,
      lastAttemptedAt: new Date().toISOString(),
      intervalIndex, nextReviewAt, // NEW
    });
    addToWrongPool({ /* 기존과 동일 */ });
  }
};
```

`import { nextReviewSchedule } from '../utils/spacedRepetition';` 추가 필요.

---

## 6. 콘텐츠 생성 시 초기값

| 파일 | 함수 | 현재 Quiz 생성 코드 | D-1 조치 |
|---|---|---|---|
| `src/services/gemini.ts:158-168` | `generateGoalContent` | `{ ..., isWrong: false, wrongCount: 0 }` | **변경 불필요.** `nextReviewAt`/`intervalIndex`를 아예 안 넣으면 `undefined`가 되고, `lastAttemptedAt`도 없으므로 §2의 `categorizeForReview`가 자동으로 `'new'`(신규 미출제)로 분류함 |
| `src/services/gemini.ts:251-261` | `generateDailyContent` | 동일 | 동일(변경 불필요) |
| `src/screens/LearningScreen.tsx:159-165` | 사전 제작 뱅크(`fetchFromBank`) 결과 매핑 | `{ ..., isWrong: false, wrongCount: 0 }` | 동일(변경 불필요) |
| `src/screens/LearningScreen.tsx:176-182` | 공유 풀(`fetchFromPool`) 결과 매핑 | `{ ..., isWrong: false, wrongCount: 0 }` | 동일(변경 불필요) |
| `src/services/contentPool.ts`, `src/services/questionBank.ts` | — | `SharedQuiz` 형태(`id`/`goalId`/`isWrong`/`wrongCount` 없음)만 다룸, `Quiz` 객체를 직접 만들지 않음 | 해당 없음(수정 대상 아님) |

결론: **4곳 모두 코드 수정이 필요 없다.** 옵셔널 필드를 명시적으로 `undefined`로 채울 필요가 없고(TS/JS에서 키 생략 = `undefined` 접근과 동일), "새로 생성된 문제 = 아직 안 풀어본 문제"라는 의미가 `lastAttemptedAt === undefined` 하나만으로 이미 정확히 표현되기 때문이다.

---

## 7. `quizValidation.ts` 검증

`sanitizeQuiz`/`sanitizeQuizzes`(`src/utils/quizValidation.ts:26-64`)는 AI/DB가 반환한 **원본(raw) 문제 텍스트**(`question`/`type`/`options`/`answer`/`explanation`)만 검증하는 함수다. 입력 타입 `RawQuizLike`와 반환 타입 `SanitizedQuiz` 어디에도 `id`/`goalId`/`isWrong`/`wrongCount`/`lastAttemptedAt`/`bookmarked` 같은 필드가 없다 — 이 함수는 "Quiz 객체"가 아니라 "Quiz를 만들기 위한 재료"만 다룬다.

**확인 결과: 이 파일은 D-1과 완전히 무관하며 수정이 필요 없다.** `intervalIndex`/`nextReviewAt`은 이 함수의 입출력 어디에도 등장하지 않고, 등장할 필요도 없다(생성 시점엔 §6에서처럼 항상 비워두므로).

---

## 8. 마이그레이션 안전성

| 시나리오 | `lastAttemptedAt` | `nextReviewAt` | `intervalIndex` | `categorizeForReview` 결과 | 별도 마이그레이션 필요? |
|---|---|---|---|---|---|
| 신규 생성 문제(한 번도 안 풀어봄) | `undefined` | `undefined` | `undefined` | `'new'` | 불필요 |
| 기존 사용자의 과거 문제(D-1 배포 이전에 이미 풀어본 적 있음) | 값 있음 | `undefined`(레거시) | `undefined`(레거시) | `'due'`(즉시 복습 가능 취급) | 불필요 |
| D-1 배포 이후 처음 정답/오답 처리된 문제 | 값 있음 | 값 있음(`nextReviewSchedule` 결과) | 값 있음(0~4) | 값에 따라 `'due'` 또는 `'scheduled'` | — |

`getItem<Quiz>()`(`storage.ts:11-18`)는 `AppState`처럼 기본값과 병합하지 않고 저장된 JSON을 그대로 파싱하지만, 옵셔널 필드는 키가 없으면 자바스크립트 객체 접근 시 그냥 `undefined`가 되므로 **런타임 에러 없이 안전하다.** `nextReviewSchedule(quiz.intervalIndex, ...)` 호출 시 `quiz.intervalIndex`가 `undefined`여도 함수 내부에서 `current = currentIntervalIndex ?? 0`으로 처리하므로 첫 응답부터 정상적으로 인덱스 0부터 시작한다. **별도 마이그레이션 스크립트는 필요 없다.**

---

## 9. 검증 조건 체크리스트

- [ ] `Quiz` 타입에 `intervalIndex?: number`, `nextReviewAt?: string`(`'YYYY-MM-DD'`) 추가(`src/types/index.ts`)
- [ ] `src/utils/spacedRepetition.ts` 신규 생성: `LEITNER_INTERVALS_DAYS`, `nextReviewSchedule()`, `categorizeForReview()` export
- [ ] `TestScreen.tsx`의 `handleAnswer()`(정답/오답 분기 양쪽)에 `nextReviewSchedule()` 결과 병합
- [ ] `TestScreen.tsx`의 출제 풀 선택 로직(97~108줄 영역)을 §3.2 4단 우선순위(오답풀 캡 50% 유지 → due → new → scheduled)로 교체
- [ ] `RetryWrongScreen.tsx`의 `handleAnswer()`(정답/오답 분기 양쪽)에도 동일하게 `nextReviewSchedule()` 병합
- [ ] `gemini.ts`/`contentPool.ts`/`questionBank.ts`/`LearningScreen.tsx`의 Quiz 생성 코드는 **수정하지 않음**(의도적 — §6)
- [ ] `quizValidation.ts`는 **수정하지 않음**(의도적 — §7)
- [ ] 최대 인덱스(4, 35일)에서 정답을 계속 맞혀도 인덱스가 4에 고정되는지(무한 전진 안 함) 확인
- [ ] 오답 시 인덱스가 항상 0으로 리셋되고 `nextReviewAt`이 "오늘+1일"로 재설정되는지 확인
- [ ] `nextReviewAt`/`intervalIndex`가 없는 기존(레거시) 문제가 에러 없이 `'due'`로 분류되어 정상 출제되는지 확인(마이그레이션 스크립트 없이)
- [ ] 오답 풀 50% 캡을 초과해서 라이트너 예정 문제가 밀려나지 않는지(F-09 회귀 없음) 확인
- [ ] `RetryWrongScreen`에서 정답 처리한 문제가 이후 `TestScreen`의 `due`/`scheduled` 분류에 올바르게 반영되는지 확인
