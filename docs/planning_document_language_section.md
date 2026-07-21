# 기획 문서 — 언어 학습 전용 섹션

> 작성 주체: 기획자(Planner) 에이전트
> CEO 지시: "언어 학습만을 위한 섹션을 구분해서 만들어 놓고 싶어. 정형화 되어 있는 학습들은 미리 데이터 다 만들어 놓고 track 만들어 놓고, 그게 아닌 것들은 모두 AI로 만들어서 학습할 수 있게 하는거야." + 확정 사항: (1) 홈 화면 상단 새 아이콘 → 별도 화면, 그 화면 안에서 "정형화 트랙 목록"과 "AI로 직접 만들기"를 한 화면에서 고름(하단 탭 없음) (2) 1단계 콘텐츠 범위는 기존 영어문법 트랙 완성도 확인이 먼저
> 확인한 소스: `src/data/templates.ts`, `src/data/curriculum.ts`, `src/screens/HomeScreen.tsx`, `src/screens/LearningScreen.tsx`, `src/screens/GoalCreateScreen.tsx`, `src/services/questionBank.ts`, `src/services/contentPool.ts`, `src/services/gemini.ts`, `src/App.tsx`, `supabase/migrations/001_question_bank.sql`, `supabase/seed/002~003_english_grammar_day*.sql`, 그리고 **운영 중인 Supabase 프로젝트에 anon key로 직접 REST 조회**(추측 아님, 실측)

---

## 0. 사실관계 재확인 결과 (기존 요약과 다르거나 새로 확정된 부분만)

- `src/data/templates.ts`의 어학(語學) 카테고리는 3개: `toeic_900`(examScoped, curriculumId 없음), `english_vocab`(curriculumId 없음), `english_grammar`(curriculumId: `'english_grammar'`, 30일, examScoped 아님). **진짜 "정형화 트랙"(사전 저술된 day별 콘텐츠 보유)은 `english_grammar` 하나뿐**이고, 나머지 둘은 topic만 프리필된 AI 생성 목표다.
- `src/data/curriculum.ts`의 `ENGLISH_GRAMMAR_CURRICULUM`은 **Day 1~30 전부 저술 완료**(요약 저작물 자체는 완성 상태). 미완성인 건 커리큘럼 텍스트가 아니라 `question_bank`(사전 제작 문제)다.
- `src/screens/HomeScreen.tsx` 298~315행: 상단 우측에 아이콘 2개(캘린더 `/calendar`, 목표 목록 `/goals`)가 이미 있는 자리. 새 아이콘을 이 그룹에 추가하면 된다.
- `src/screens/LearningScreen.tsx`의 실제 폴백 순서(코드로 재확인):
  1. `fetchFromBank(curriculumId, dayNum, level)` — `curriculumId`가 있고 `curricDay`가 있고 개인화(`practicalMode`/커스텀 말투/`examScoped`)가 아닐 때만 시도.
  2. `fetchFromPool(cacheKey)` — `cacheKey = buildCacheKey(templateId, dayNum)`. **이 캐시 키는 `curriculumId`와 무관하게 `templateId`만 있으면 성립**한다. 즉 english_grammar Day 11~30도 뱅크가 비어도 커뮤니티 풀 캐시를 탄다.
  3. Gemini 실시간 생성(`generateDailyContent`). 이때 `effectiveRawContent`는 **`curriculumId`가 있으면 `dayNum`에 관계없이 항상 `getCurriculumDay(curriculumId, dayNum).content`로 치환**된다(126~130행). 즉 Day 11~30도 이미 Gemini 프롬프트의 "참고 자료"로 curriculum.ts의 요약 텍스트를 통째로 받고 있다 — **이건 옵션이 아니라 이미 배포되어 있는 현재 동작이다.**
  4. Gemini 생성이 성공하면 `cacheKey`가 있을 때 `saveToPool`로 결과를 커뮤니티 풀에 저장(fire-and-forget). 다음 사용자부터는 2번(풀)에서 즉시 히트 — **뱅크가 없어도 사용량이 쌓이면 저절로 캐시가 채워지는 구조**다.
- `src/screens/GoalCreateScreen.tsx`: 이미 `?templateId=` 쿼리 파라미터로 topic/deadline/curriculumId/examScoped를 프리필하는 로직이 있고(33~62행), 화면 안에 템플릿 피커 스트립도 있다. **새 폼을 만들 필요 없이 그대로 재사용 가능한 진입점**이 이미 존재한다. 단 `topic` 쿼리 파라미터로 자유 입력을 프리필하는 기능은 없다(새로 추가 필요, 작은 작업).
- `src/App.tsx`: 라우트 목록에 언어 허브용 경로 없음 — 신규 라우트 추가 필요.

### 미확인 사실 → 실측으로 확정함 (중요)

기존 요약은 "SQL 파일이 실제 Supabase에 실행됐는지 코드만으로는 알 수 없다"고 했다. `.env.local`의 `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`로 `question_bank` 테이블은 RLS상 공개 읽기이므로 **직접 REST API로 실측 조회**했다.

```
curriculum_id=eq.english_grammar 전체 count(exact) = 240
day_num gte.11 필터 결과 = [] (0건)
```

즉:
- **Day 1~10 × 3난이도 × 8문제 = 240건이 실제로 운영 Supabase에 정확히 들어가 있다.** SQL 파일은 "실행 대기 원고"가 아니라 **이미 실행된 배포본**이다.
- **Day 11~30은 정말로 0건**이다. 확대 해석의 여지 없이 확정.

이 사실은 아래 콘텐츠 전략 판단의 전제가 된다: "혹시 이미 다 채워져 있는데 몰랐던 것"이 아니라, 실제로 20일치가 비어 있고, 동시에 그 공백을 이미 코드가 (커리큘럼 grounding + Gemini + 풀 캐싱으로) 메우고 있는 상태다.

---

## 1. 정보구조 설계

### 1.1 진입점
`HomeScreen.tsx`의 기존 아이콘 그룹(캘린더/목표목록, 298~315행)에 세 번째 아이콘 추가. 위치는 캘린더 아이콘 왼쪽(가장 먼저 눈에 띄는 자리) 추천 — CEO가 "새 섹션"을 신규 기능으로 강조하고 싶어 하므로 기존 2개보다 앞에 둔다. 아이콘은 지구본(🌐) 또는 책(📖) 계열, 클릭 시 `navigate('/language')`.

### 1.2 화면: `LanguageHubScreen` (신규, 라우트 `/language`)
하단 탭 없이 한 화면에서 세로로 두 섹션을 스크롤로 보여준다.

**섹션 A — 정형화 트랙 (사전 제작)**
- 카드 리스트. 지금은 `english_grammar` 1장뿐(→ `templates.ts`에서 `curriculumId`가 있는 템플릿만 이 섹션에 노출하는 필터링 규칙을 코드 규칙으로 정한다 — 하드코딩 나열이 아니라 "curriculumId 보유 여부"를 기준으로 삼아야 나중에 트랙이 늘어도 화면 로직을 안 건드림).
- 카드에 표시할 것:
  - 아이콘/이름/총 일수(템플릿 메타데이터 그대로)
  - **완성도 라벨**: 퍼센트바 대신 텍스트 라벨을 추천한다. 예: `"Day 1~10 사전 제작 문제 · Day 11~30 AI 즉석 생성"`. 이유: 진행바(%)는 "전체 중 33%만 완성"처럼 결핍을 강조해 신뢰를 깎지만, 실제로는 Day 11~30도 완결된 커리큘럼 텍스트 + Gemini 생성으로 정상 작동하는 콘텐츠이므로 "미완성"이 아니라 "제작 방식이 구간별로 다름"이 정확한 사실이다. 정직하되 불안을 주지 않는 문구.
  - CTA 버튼 "시작하기" → `navigate('/goals/create?templateId=english_grammar')` (기존 폼 재사용, 새 폼 없음)
- `toeic_900`, `english_vocab`처럼 curriculumId 없는 어학 템플릿은 이 섹션에 넣지 않는다(사전 제작 트랙이 아니므로 "정형화"라고 라벨을 붙이면 과장). 대신 섹션 B의 빠른 시작 칩으로 내려보낸다.

**섹션 B — AI로 직접 만들기**
- 안내 문구 + 예시 칩(일본어 기초, 중국어 회화, 스페인어 문법, JLPT N3, TOEIC 900 등) — 칩 클릭 시 `navigate('/goals/create?topic=...')`.
- 자유 입력 진입 버튼 "새로운 언어 학습 만들기" → `navigate('/goals/create')`(topic 프리필 없이 진입, 사용자가 직접 입력).

### 1.3 기존 `GoalCreateScreen`과의 관계
**완전히 새로운 폼을 만들지 않는다.** 언어 허브는 진입 파라미터만 다르게 넘기는 "전처리 필터" 역할만 하고, 실제 목표 생성 로직(난이도/말투/실무모드/참고자료/자동 문제 수 계산 등)은 기존 화면·로직을 그대로 재사용한다.
- 정형화 트랙: 이미 지원되는 `?templateId=` 방식 그대로.
- AI 커스텀: `?topic=` 쿼리 파라미터를 새로 지원해야 한다(현재 `GoalCreateScreen`은 `templateId`만 읽음, 33행 `useState(() => {...searchParams.get('templateId')...})` 로직에 `topic` 파라미터 케이스를 나란히 추가하는 수준의 작은 변경).

이렇게 하면 폼 검증, 5개 활성 목표 제한, 자동 문제 수 계산 같은 기존 규칙을 중복 구현할 필요가 없어 유지보수 부담이 늘지 않는다(1인 무료 유지보수 원칙과 합치).

---

## 2. 콘텐츠 저술 전략 비교

전제: Day 11~30(20일 × 3난이도 × 8문제 = 480문제)를 손으로 다 채우려면, 이미 저술된 Day 1~10(240문제, seed SQL 2개 파일)과 비슷하거나 그 이상의 저술·검수 시간이 다시 든다. 1인 무료 유지보수 프로젝트에서 이건 결코 작은 투자가 아니다.

| 대안 | 내용 | 장점 | 단점 | 판단 |
|---|---|---|---|---|
| (a) 20일 전부 손으로 계속 저술 | 기존 방식대로 Day 11~30 seed SQL을 계속 작성 | 뱅크 히트 시 Gemini 호출 없이 즉시 로드, 품질이 사람 손으로 균일 | 저술 시간이 Day1~10과 동급으로 재발생. 1인 무료 유지보수에 부담. 이미 (아래 b처럼) 대체 경로가 정상 동작 중이라 한계효용이 낮음 | 비추천 |
| **(b) curriculum.ts 텍스트를 근거자료로 강하게 활용해 실시간 생성 품질을 높이고, 뱅크는 Day 1~10만으로 충분하다고 보고 추가 저술 중단** | Day 11~30은 뱅크 미스 → 커리큘럼 요약을 rawContent로 넘긴 Gemini 생성 → 성공 시 공유 풀에 저장(다음 사용자부터 즉시 캐시 히트) | **이미 코드가 이렇게 동작 중**(0장에서 확인) — 추가 개발 없이 오늘부터 유효. 커뮤니티 풀이 인기 있는 day부터 자연히 "사실상의 뱅크"로 채워짐(사용자가 늘수록 Gemini 호출 빈도는 줄어듦). 저술 시간을 화면/UX 개선에 재투자 가능 | Day 11~30은 사용자별로 문구가 조금씩 다를 수 있음(뱅크처럼 100% 고정 문항은 아님). 완전 무료 Gemini 프록시 한도(IP당 일 20회) 내에서의 호출 비용 존재 | **추천** |
| (c) 완전히 새로운 더 작은 트랙(5~10일) 추가 | 새 curriculum.ts 항목 + 관련 뱅크 저술 | "트랙이 여러 개"라는 인상을 빠르게 줌 | 결국 신규 저술 노동이 또 발생(대상만 바뀜). CEO의 "기존 트랙 완성도 먼저 확인"이라는 확정 우선순위와 순서가 맞지 않음 | 지금은 보류, 아래 (d)로 대체 |
| (d, 제안) 저비용 트랙 확장 — curriculum.ts 텍스트만 추가, question_bank는 처음부터 안 만듦 | 신규 언어/주제 트랙도 "day별 요약 텍스트"만 저술하고, 문제는 처음부터 (b)와 동일하게 Gemini+풀 캐시에 맡김 | (c)의 "트랙 다양성" 효과를 유지하면서 저술량을 텍스트 요약 수준으로 대폭 축소(문제 저술 480문항 분량이 아예 발생하지 않음) | 뱅크가 없는 트랙은 초기 히트율이 낮아 신규 사용자 체감 로딩이 (b)보다 약간 더 잦게 Gemini를 탐 | 시간이 남을 때의 다음 단계 후보로 백로그 등재 |

**최종 추천: (b).** 근거는 다음 세 가지다.
1. 실측으로 확인했듯 (b)의 메커니즘은 "새로 설계할 아이디어"가 아니라 **오늘 이미 프로덕션에서 동작 중인 코드**다. 리스크 없이 채택 가능.
2. 240문항을 다시 만드는 노동을 이번 배치에서 요구하지 않아도, 사용자 경험상 Day 11~30이 "빈 화면"이나 "에러"가 되는 게 아니라 정상적으로 콘텐츠가 나온다.
3. 1인 무료 유지보수/비목표(소셜 랭킹·마켓플레이스·심층 대시보드 금지)와 같은 원칙과 정합적 — 저술 노동을 화면 설계·UX 쪽 자동 실행 작업에 돌릴 수 있다.

---

## 3. 1차 자동 실행 범위 (지금 바로) vs 배치로 이어갈 작업

### 지금 바로 자동 실행 (개발 소요, 오늘 배포 가능)
1. `src/App.tsx`에 라우트 `/language` 추가.
2. 신규 `src/screens/LanguageHubScreen.tsx` — §1.2 정보구조대로 구현(정형화 트랙 섹션 + AI 커스텀 섹션, 하단 탭 없음).
3. `src/screens/HomeScreen.tsx` 상단 아이콘 그룹에 언어 허브 진입 아이콘 추가.
4. `src/screens/GoalCreateScreen.tsx`에 `?topic=` 쿼리 파라미터 프리필 지원 추가(새 폼 아님, 기존 `useState` 초기화 로직에 분기 추가).
5. `templates.ts`를 건드리지 않고 `curriculumId` 보유 여부로 "정형화 트랙" 판정 — 데이터 변경 없이 화면 로직만 추가.
6. 콘텐츠 저술 관련 코드 변경 없음(§2 (b) 채택 — 이미 동작 중이므로 손댈 부분이 없음). Day 11~30 seed SQL 신규 작성은 **하지 않는다**(의도적 보류, 방치 아님).
7. `npm run build && npx wrangler deploy`로 배포(CLAUDE.md 규칙).

### 별도 배치로 이어갈 작업 (시간 소요, 선택적 백로그 — 지금 실행하지 않음)
- (선택, 우선순위 낮음) §2 (d): 신규 소형 언어 트랙의 curriculum.ts 텍스트만 저술(문제 뱅크 없이). 사용자 반응을 보고 착수 여부 결정.
- (선택, 비추천이나 완전 배제는 아님) Day 11~30 question_bank SQL 저술. 풀 캐시 히트율이 낮게 나오는 특정 day가 관찰되면 그 day만 선별적으로 저술하는 "데이터 기반 보강"으로 전환 — 처음부터 20일 전부를 미리 채우지 않는다.

---

## 4. 자기검증표

| 항목 | 확인 방법 | 결과 |
|---|---|---|
| CEO 원문·확정 사항을 임의로 재해석하지 않았는가 | 하단 탭 미사용, 한 화면에 두 섹션, 기존 트랙 완성도 우선 확인 — 문서 전체에 그대로 반영 | 충족 |
| 코드 사실을 추측 없이 직접 Read했는가 | `templates.ts`, `curriculum.ts`, `HomeScreen.tsx`, `LearningScreen.tsx`, `GoalCreateScreen.tsx`, `questionBank.ts`, `contentPool.ts`, `gemini.ts`, `App.tsx` 전부 직접 Read | 충족 |
| "실행 여부 확인 필요"로 남겨뒀던 사실을 확정했는가 | anon key로 운영 Supabase `question_bank`를 REST 직접 조회 → english_grammar 총 240건, day_num≥11은 0건 실측 확인 | 충족 (기존 문서 대비 진전) |
| 콘텐츠 저술 전략이 최소 3개 대안 비교 + 추천안 근거를 갖췄는가 | (a)(b)(c)(d) 4개 비교, (b) 추천 및 근거 3가지 명시 | 충족 |
| 1인 무료 유지보수 원칙과 충돌하지 않는가 | 480문항 신규 저술을 강제하지 않음, 기존 코드 메커니즘 재활용으로 결론 | 충족 |
| 기존 비목표(하단 탭/소셜 랭킹/마켓플레이스/심층 대시보드/오프라인퍼스트/긴 세션) 위반 없는가 | 하단 탭 없음 명시, 나머지 비목표는 이번 기능과 무관해 침범하지 않음 | 충족 |
| 새 폼을 중복 설계하지 않았는가 | `GoalCreateScreen` 재사용 + 쿼리 파라미터 확장만 제안 | 충족 |
| "1차 실행"과 "배치 작업"을 명확히 분리했는가 | §3에 두 목록으로 분리, 배치 항목은 선택·비추천 사유까지 명시 | 충족 |

---

## 부록 — 실측 쿼리 근거

```
GET {SUPABASE_URL}/rest/v1/question_bank?select=curriculum_id&curriculum_id=eq.english_grammar
Prefer: count=exact  →  Content-Range: 0-0/240

GET {SUPABASE_URL}/rest/v1/question_bank?select=day_num&curriculum_id=eq.english_grammar&day_num=gte.11
→ []
```
