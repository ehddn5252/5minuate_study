# 5분 학습 — 개발자(Dev) 감사 v1.0

> 작성 주체: Developer 에이전트
> 관점: 제품/기획이 아니라 **코드 유지보수성·엔지니어링 건강도**. 1인 무보수 유지보수, CF Workers 정적 배포 + PWA 전제.
> 방법: `npm run build` 실측, `src/screens`(18개) 전량 + `src/utils`/`src/services` Grep/Read 기반 실사. 추측 없음.
> 선행 문서: `docs/planning_document_audit.md`(Planner), `docs/feature_definition_audit.md`(FO) — 두 문서를 읽고 그 판단과 겹치지 않는 엔지니어링 관점만 다룸.

---

## 1. 번들 크기 (실측)

`npm run build` (`tsc -b && vite build`, vite v6.4.3) 결과:

| 산출물 | 크기 | gzip |
|---|---|---|
| `dist/assets/index-C21CkU2L.js` | **545.40 kB** | 159.46 kB |
| `dist/assets/index-D4LihJKL.css` | 28.45 kB | 5.63 kB |
| PWA precache 총합 | 575.24 KiB (9 entries) | - |

Vite 경고: `Some chunks are larger than 500 kB after minification`. **단일 JS 청크 1개**만 존재 — code splitting 0건.

**원인 분석 (코드 근거)**:
- `src/App.tsx:4-21` — 18개 화면(`HomeScreen`~`SettingsScreen`)을 **전부 정적 import**. `React.lazy`/`Suspense` 사용 0건(전체 grep 결과). 즉 `RecordingsScreen`(방금 추가돼 실사용 이력 없음), `ShortsScreen`(396줄, 캔버스 기반), `CalendarScreen` 등 2차 내비게이션 화면까지 첫 로드에 전부 포함됨.
- `@supabase/supabase-js` (`node_modules` 기준 8.3M, realtime/postgrest/auth 클라이언트 풀 포함)를 `App.tsx:3`에서 `User` 타입만 쓰는데도 라이브러리 전체가 번들에 들어감(타입 전용 import가 아니라 값 import 경로와 같은 모듈이라 트리셰이킹 여지가 제한적). 로그인 여부와 무관하게 항상 로드.
- `ShortsScreen.tsx`(396줄)는 canvas 직접 구현(F-40과 동일 기조, 신규 의존성 없음)이라 라이브러리 무게는 아니고 자체 코드량 문제.

**code splitting 적용 가능성 판단**:
- 이 앱은 React Router 기반 SPA로 라우트 경계가 명확(`App.tsx`의 `<Routes>`)해서 **route-based `React.lazy`가 구조적으로 잘 맞는다**. 특히 `RecordingsScreen`/`ShortsScreen`/`CalendarScreen`/`StudyMaterialsScreen`/`AchievementsScreen`처럼 핵심 루프(홈→학습→테스트→완료) 밖에 있는 2차 화면은 lazy 전환 시 초기 번들에서 바로 빠질 후보.
- **리스크**: (1) PWA(`vite-plugin-pwa`, `generateSW`)와 lazy chunk가 만나면 신규 청크 파일명이 배포마다 바뀌므로 `workbox` precache 목록도 매번 재생성돼야 함 — `vite.config.ts`의 `globPatterns: ['**/*.{js,css,html,ico,png,svg}']`가 이미 와일드카드라 이 부분은 자동 대응됨(추가 설정 불필요, 실사 확인). (2) `autoUpdate` registerType이라 신규 청크 배포 후 오프라인 캐시 갱신 타이밍 이슈 가능성은 기존에도 있던 문제라 lazy 전환이 새로 만드는 리스크는 아님. (3) 핵심 루프 화면(`LearningScreen`→`TestScreen`→`SessionCompleteScreen`)까지 lazy로 쪼개면 화면 전환마다 로딩 스피너가 끼어들어 "5분 완결" 체감을 해칠 수 있음 — **핵심 루프는 정적 import 유지, 2차 화면만 lazy 전환이 안전한 절충안**.
- 결론: **적용 가능, 리스크 낮음(2차 화면 한정)**. 545kB → 핵심 루프(6~7개 화면 + 공통 유틸)만 남기면 대략 40~50% 절감 추정(정확한 수치는 실측 필요, 코드량 비례 추정치).

---

## 2. 코드 중복 (실측 근거)

| 패턴 | 실측 근거 | 평가 |
|---|---|---|
| **뒤로가기 버튼 SVG** | `M15 19l-7-7 7-7` path가 **13개 파일에 14회** 그대로 복붙(`AchievementsScreen`, `CalendarScreen`×2, `GoalCreateScreen`, `GoalEditScreen`, `GoalListScreen`, `LearningScreen`, `MyQuestionBookScreen`, `RecordingsScreen`, `TestScreen`, `WrongPoolScreen`, `SettingsScreen`, `RetryWrongScreen`, `StudyMaterialsScreen`) | **높음** — `<BackButton />` 공통 컴포넌트 1개로 추출하면 14곳 중복 제거, 위험도 최저(순수 UI, 로직 없음) |
| **세션/목표 완료 화면 구조** | `SessionCompleteScreen.tsx`(224줄) vs `GoalCompleteScreen.tsx`(189줄) 실사: 통계 3분할 카드(점수/스트릭/퍼센트), XP 카운트업 블록, `growthFeedback` 블록, 뱃지 목록 블록, 공유 버튼 2개(`shareOrDownload` 호출부 async try/finally 패턴까지 동일), `celebrate()` 캔버스+오디오+진동 트리거 `useEffect`, `setTimeout` 자동 이동 + `clearTimeout` cleanup 패턴이 **거의 1:1로 반복**. 색상 테마(indigo vs yellow)와 지연시간(4/6초 vs 6/8초)만 다름 | **매우 높음** — 두 파일 합쳐 413줄 중 체감상 60% 이상이 동일 JSX 골격. `<CompletionStatsCard>`, `<ShareButtonRow>`, `useAutoNavigateTimer(delay)` 같은 공통 조각으로 뽑으면 두 파일 각각 절반 이하로 줄어들 여지 |
| **오답 목록류 화면 골격** | FO 문서(§2 P-3)에서 이미 실사 확인: `WrongPoolScreen`(83줄)과 `MyQuestionBookScreen`(86줄)이 "목표별 섹션 → 카드 리스트(질문/정답/해설)" 골격 100% 동일 | FO가 이미 코드로 검증함 — 본 감사에서 재확인 불필요. 엔지니어링 관점에서도 통합 시 83+86줄 중 카드 렌더링 부분(추정 40줄 안팎)을 공통 컴포넌트로 뽑을 수 있어 P-3 통합안에 엔지니어링 근거를 추가로 보탬 |
| **톤별 메시지 뱅크(`mateTone`)** | `mascot.ts`(25줄)/`surpriseReward.ts`(28줄)/`streakCrisisMessage.ts`(25줄) 각각 `Record<MateTone, ...>` 형태로 이미 파일 단위로 잘 분리돼 있음 | **낮음 — 이미 좋은 패턴.** 톤 뱅크가 "흩어져 있다"기보다 오히려 일관된 컨벤션(파일당 하나의 관심사)으로 잘 격리돼 있어 추가 리팩터링 불필요 |

---

## 3. 죽은 코드 / 항상 참·거짓 분기

- `noUnusedLocals`/`noUnusedParameters`가 `tsconfig.app.json`에 켜져 있고 `npm run build`가 **에러 없이 통과**했으므로 완전 미사용 지역 변수·함수는 없음(컴파일러가 이미 막고 있음).
- "export됐지만 아무도 import 안 하는" 함수: 이번 감사 범위에서 발견되지 않음(주요 후보였던 `deleteGoalCascade`, `sanitizeQuiz` 계열 등은 모두 사용처 확인됨).
- **`geminiApiKey` 필드 — 사실상 죽은 경로(§4-1 참고)**: TS가 잡지 못하는 이유는 값이 계속 "전달"만 되고 있어서(항상 빈 문자열 `''`)지, 실제로 이 값을 채우는 UI가 없어 `gemini.ts:41-44`의 `apiKey ? 직접호출 : CF Worker 프록시` 분기가 **항상 false로만 평가되는 사실상 죽은 분기**임. 컴파일러 관점에서는 "사용 중"이라 안 잡히지만, 런타임 관점에서는 `apiKey` 매개변수가 배포된 앱에서 참이 되는 경로가 없음.
- `WrongPoolScreen.tsx`의 `g.status === 'active'` 필터(A-5)는 FO 문서에서 이미 다뤄짐 — 죽은 코드는 아니고 범위가 좁은 필터.

---

## 4. 엔지니어링 관점 제거/정리 후보 (Planner/FO가 다루지 않은 것)

### 4-1. `geminiApiKey` — CF Worker 프록시 전환 후 남은 마이그레이션 잔재
`git log`로 확인: 커밋 `596b5af`("API 키 없이 사용 가능 — CF Worker Gemini 프록시")가 BYO-키 방식에서 프록시 방식으로 전환한 지점. 그런데:
- `types/index.ts:101` `AppState.geminiApiKey: string`, `storage.ts:204` 기본값 `''`
- `GoalCreateScreen.tsx:99`, `LearningScreen.tsx:195`에서 여전히 `appState.geminiApiKey`를 `generateGoalContent`/`generateDailyContent`에 전달
- `gemini.ts:41-44` `callGemini`이 `apiKey ? 직접 호출 : /api/generate 프록시` 분기를 여전히 유지
- **그런데 이 값을 사용자가 입력할 UI가 어디에도 없다**(`SettingsScreen.tsx` 전문 확인, `apiKey`/`API 키` 문자열 매치 0건). `supabase.ts:29,61`은 클라우드 동기화 시 이 필드를 명시적으로 제거/병합하는 로직까지 갖고 있어(`_removed` 변수명 자체가 "빼야 하는 걸 안다"는 신호) 오히려 **이미 죽었다는 걸 알면서 완전히 걷어내지 않은 상태**로 보인다.
- **권고**: `AppState.geminiApiKey`, `gemini.ts`의 `apiKey` 매개변수, `callGemini`의 분기, `GoalCreateScreen`/`LearningScreen`의 전달 코드를 함께 제거. UI가 원래 없었으므로 사용자 영향 0, 5개 파일 수정 수준의 안전한 정리. **"지금 바로 해도 안전"으로 분류 가능**(기존 사용자 데이터에 `geminiApiKey: ''`가 남아있어도 무해 — 필드를 안 읽으면 그만).

### 4-2. `npm run lint`가 처음부터 동작하지 않음
`npx eslint .` 실행 결과: `ESLint couldn't find an eslint.config.(js|mjs|cjs) file.` `package.json`에 `eslint ^9.17.0`이 있어 flat config(`eslint.config.js`)가 필요한데, `git log --all -- eslint.config.js .eslintrc.*` 결과 **이 저장소 히스토리에 eslint 설정 파일이 존재한 적이 단 한 번도 없음**. 즉 `npm run lint` 스크립트는 최초 커밋부터 지금까지 실행할 때마다 항상 에러로 죽는 스크립트였다.
**권고**: `eslint.config.js`를 새로 만들거나(React+TS 기본 flat config, `typescript-eslint`/`eslint-plugin-react-hooks`/`eslint-plugin-react-refresh`는 이미 devDependency로 설치돼 있어 설정 파일만 있으면 즉시 동작), 그럴 여력이 없다면 `package.json`의 `lint` 스크립트를 지워 "있는데 안 되는 것"이라는 착시를 없애는 것만이라도 권장.

### 4-3. `A-2(PWA 설치 유도)`는 이미 대부분 구현돼 있음 — Planner/FO 감사가 놓친 사실
Planner 문서(A-2)와 FO 문서(§1 A-2, "manifest.json/PWA 플러그인 여부는 미확인")는 PWA를 "추가해야 할 신규 기능"으로 다뤘으나, `vite.config.ts:8-46` 확인 결과 **`vite-plugin-pwa`가 이미 `registerType: 'autoUpdate'`, 정식 `manifest`(이름/아이콘 192·512/`display: 'standalone'`), `sw.js`/`workbox` 프리캐시까지 전부 구성 완료된 상태**(빌드 로그에 `PWA v0.21.2 ... precache 9 entries` 출력 확인). 즉 "홈 화면에 추가" 자체의 기술 기반(manifest, 설치 가능 조건)은 이미 갖춰져 있고, 남은 건 설치 **유도 UI(배너)** 뿐이다. A-2 스코프를 "PWA 도입"이 아니라 "이미 있는 PWA 위에 설치 유도 배너 1개 추가"로 좁혀야 정확한 작업량 산정이 된다.

---

## 5. 복잡도 핫스팟

| 파일 | 줄 수 | 핵심 문제 |
|---|---|---|
| `TestScreen.tsx` | 420 | `handleNext()` 단일 함수(216~335행, **약 120줄**)가 세션 저장, 스트릭 계산(+프리즈 로직), XP/레벨업 계산, 뱃지 판정, 성장피드백 계산, 확률적 깜짝보상 계산, 목표완료 판정, 네비게이션 분기까지 **8개 관심사**를 순차 처리. `handleAnswer`(오답풀 추가/제거)까지 포함하면 9개 |
| `GoalCreateScreen.tsx` | 407 | `handleSubmit`이 템플릿/직접입력 통합 폼 검증 + AI 생성 호출 + 에러 처리를 담당. 입력 필드 자체가 7개(주제/기한/난이도/문제수/톤/실무연계/참고자료) — 이는 P-1(옵션 과잉)과 동일 근거지만 엔지니어링 관점에서도 "폼 상태 7개를 한 컴포넌트가 관리"라는 형태로 나타남 |
| `LearningScreen.tsx` | 399 | 오디오 모드(TTS 재생/속도 조절/재생상태), 스크롤 진행률, AI 생성 트리거, 오늘의 요약 표시까지 **4개 축**이 한 컴포넌트에 공존. `useEffect` 3개가 각각 다른 관심사(오디오모드 동기화, 콘텐츠 로드, 기타)를 담당해 하나씩은 이해 가능하나 합쳐보면 화면당 책임이 많음 |

**분리 시 위험도/이득 평가 (리팩터링 실행은 범위 밖, 평가만)**:
- **`TestScreen.tsx` `handleNext`**: 이득 큼(테스트 없는 프로젝트에서 이 함수가 버그의 최대 진원지가 될 가능성이 가장 높음 — 스트릭/XP/뱃지 등 사용자에게 직접 보이는 핵심 지표를 전부 여기서 계산), 위험도 **중간** — 순수 계산 로직(`newStreak`, `xpGained`, `newBadges` 등)은 `useTestSessionCompletion` 같은 커스텀 훅이나 순수 함수로 뽑아내기 좋은 형태(이미 지역 변수 단위로 잘 나뉘어 있어 함수 추출이 기계적). 다만 테스트가 0건이라 **추출 후 회귀 검증 수단이 없다는 게 진짜 위험**(§6 참고).
- **`GoalCreateScreen.tsx` 폼**: 이득은 P-1 방향 결정(옵션 축소/숨김)과 맞물려 있어, 제품 판단이 먼저 나야 리팩터링 범위가 정해짐 — 지금 구조 분리를 먼저 하면 P-1 결정 후 다시 손대야 할 수 있어 **선행 리팩터링은 비권장**.
- **`LearningScreen.tsx`**: 오디오 모드 관련 상태(3개 useState + 2개 handler)만 `useAudioPlayback` 훅으로 뽑아도 파일이 눈에 띄게 가벼워짐. 위험도 낮음(오디오 모드는 다른 화면과 상태 공유 없음, 독립적).

---

## 6. 테스트 커버리지 현황과 리스크

- `package.json`에 `test` 스크립트 없음. 테스트 러너(vitest/jest 등) devDependency 0건. `**/*.{test,spec}.{ts,tsx}` glob 검색 결과 **테스트 파일 0개**.
- CI: `.github/workflows/claude-task.yml` 1개만 존재하며 이는 텔레그램 봇으로 받은 임의 명령을 실행하는 워크플로(`repository_dispatch` 트리거)일 뿐, **PR/push 시 build·lint·test를 검증하는 CI 파이프라인이 아예 없음**. `npm run lint`는 §4-2에서 확인했듯 애초에 실행 불가 상태이기까지 함.
- **리스크 평가**: 유일한 자동 안전망은 `tsc -b`(타입 체크)뿐이다. 이것만으로 잡을 수 있는 버그는 타입 불일치뿐이고, `TestScreen.tsx`의 스트릭/XP/뱃지 계산 같은 **런타임 로직 오류(예: 프리즈 조건 판정, 레벨업 임계값)는 타입 체커를 통과한 채 배포될 수 있음**. 코드 변경 후 검증 수단이 사실상 "개발자가 직접 앱을 켜서 눌러보는 것"뿐이다.
- P-1~P-8, A-1~A-5 같은 변경(특히 상태 전이 로직 A-1, 필터 로직 A-5, 우선순위 로직 P-2)은 전부 **직접 조작 가능한 순수 함수 형태**(스트릭/XP 계산, 필터 조건)라 유닛 테스트 도입 비용 자체는 낮은 편(`utils/*.ts`가 이미 부수효과 없는 순수 함수 위주로 잘 분리돼 있음 — `badges.ts`, `xp.ts`, `growthFeedback.ts`, `quizValidation.ts` 등). **최소 투자로 최대 안전망을 얻을 수 있는 지점**이라는 뜻이기도 함.

---

## 7. 종합 권고 (우선순위 3개)

| 순위 | 항목 | 이유 |
|---|---|---|
| **1** | **`utils/*.ts` 순수 함수(스트릭·XP·뱃지·필터 로직)에 최소한의 유닛 테스트 도입** (vitest 추가, `xp.ts`/`badges.ts`/`quizValidation.ts`/A-1·A-5 변경 예정 로직부터) | 테스트 0건 + `lint`도 죽어 있는 상태에서 P-1~P-8, A-1~A-5 같은 변경을 안전하게 진행할 방법이 현재 "수동 클릭 확인"뿐임. 순수 함수 위주라 도입 비용이 낮고, 앞으로 나올 모든 변경의 회귀 위험을 가장 크게 낮춘다 |
| **2** | **route-based code splitting**: 핵심 루프(홈/목표/학습/테스트/완료) 6~7개 화면은 정적 import 유지, `RecordingsScreen`/`ShortsScreen`/`CalendarScreen`/`StudyMaterialsScreen`/`AchievementsScreen`/`SettingsScreen` 등 2차 화면만 `React.lazy`로 전환 | 545kB 단일 청크 경고를 실질적으로 해소. PWA(`vite-plugin-pwa` `globPatterns` 와일드카드)와 충돌 없음을 확인했고, 핵심 루프를 건드리지 않아 "5분 완결" 체감에도 영향 없음 |
| **3** | **`SessionCompleteScreen`/`GoalCompleteScreen` 공통 블록 추출** (`CompletionStatsCard`, `ShareButtonRow`, `useAutoNavigateTimer`) + `<BackButton>` 공통 컴포넌트(14개 파일 중복 제거) | 순수 표시 로직 정리라 데이터/사용자 영향 0, 되돌리기 쉬움. P-2(완료 화면 과밀) 제품 판단이 어느 쪽으로 나든(우선순위 로직 도입/유지) 공통 컴포넌트가 먼저 있으면 그 다음 변경이 훨씬 쉬워짐 — **선행 투자 성격** |

부가로 `geminiApiKey` 제거(§4-1)와 `eslint.config.js` 추가(§4-2)는 각각 5개 파일 미만 수정으로 끝나는 저위험 항목이라, 위 3개와 함께 묶어 처리해도 부담이 적다.
