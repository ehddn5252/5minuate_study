# 5분 학습 (5minuate_study) — 전체 개발 내용 정리

> 최종 업데이트: 2026-07-03
> 배포 URL: https://5minuatestudy.ehddn5252.workers.dev

---

## 프로젝트 개요

**플랫폼:** PWA (Progressive Web App)
**스택:** React + TypeScript + Vite + Tailwind CSS + Zustand + React Router v6
**배포:** Cloudflare Workers (`wrangler deploy`)

---

## 아키텍처

```
┌─────────────────────────────────────────────┐
│              클라이언트 (PWA)                 │
│  React + Zustand + localStorage              │
└──────────────┬──────────────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────────────┐
│       Cloudflare Worker (서버리스)            │
│  - 정적 파일 서빙 (dist/)                    │
│  - POST /api/generate → Gemini 프록시        │
│  - RATE_LIMIT KV: IP당 20회/일              │
│  - Telegram → GitHub Actions 브릿지          │
└──────┬───────────────────────┬───────────────┘
       │                       │
┌──────▼──────┐       ┌────────▼───────────────┐
│ Gemini API  │       │   Supabase              │
│ 2.5-flash   │       │   - PostgreSQL           │
│             │       │     (user_data,          │
└─────────────┘       │      shared_content)     │
                      │   - Google OAuth         │
                      └────────────────────────┘
```

---

## 화면 구성 (라우트)

| 경로 | 화면 | 역할 |
|------|------|------|
| `/` | HomeScreen | 오늘의 학습 목표 목록, 긴급 배너 |
| `/goals` | GoalListScreen | 전체 목표 관리 |
| `/goals/create` | GoalCreateScreen | 목표 생성 (템플릿 + 직접입력) |
| `/goals/edit/:goalId` | GoalEditScreen | 목표 수정 |
| `/learn/:goalId` | LearningScreen | AI 요약 + 퀴즈 준비 |
| `/test/:goalId` | TestScreen | 퀴즈 풀기 |
| `/complete/:sessionId` | SessionCompleteScreen | 세션 완료 결과 |
| `/goal-complete/:goalId` | GoalCompleteScreen | 목표 달성 |
| `/wrong-pool` | WrongPoolScreen | 오답 노트 |
| `/achievements` | AchievementsScreen | 뱃지 시스템 |
| `/materials/:goalId` | StudyMaterialsScreen | 학습 자료 (Ch5) |
| `/shorts/:templateId` | ShortsScreen | 쇼츠형 학습 (Ch8) |
| `/settings` | SettingsScreen | 설정, API 키 |

---

## 구현 챕터별 내용

### Ch1 — 뱃지 시스템

- `src/utils/badges.ts`: 5가지 뱃지 조건 체크
  - `first_step`: 첫 학습 완료
  - `flame_7`: 7일 연속 학습
  - `persistence_30`: 30일 연속 학습
  - `perfect_5`: 퀴즈 5회 만점
  - `zero_wrong`: 오답 없이 완료
- `AchievementsScreen.tsx`: 뱃지 목록 + 잠금 해제 시각화

---

### Ch2 — 공유 카드 (Canvas API)

- `src/utils/shareCard.ts`: Canvas로 학습 완료 카드 이미지 생성
- Web Share API / 클립보드 복사 fallback

---

### Ch3 — 자격증 템플릿 + 빠른 목표 생성

- `src/data/templates.ts`: 11개 템플릿

| id | 이름 | 추천 일수 |
|----|------|----------|
| `iip_practical` | 정보처리기사 실기 | 60일 |
| `toeic_900` | TOEIC 900 | 90일 |
| `driving_written` | 운전면허 필기 | 14일 |
| `korean_history` | 한국사능력검정 1급 | 45일 |
| `realtor` | 공인중개사 | 90일 |
| `electrical` | 전기기사 | 60일 |
| `computer_app` | 컴활 1급 | 30일 |
| `english_vocab` | 영어단어 매일 | 30일 |
| `react_basics` | 리액트 입문 | 21일 |
| `python_basics` | 파이썬 기초 | 21일 |
| `english_grammar` | 영어 문법 완전 정복 | 30일 |

- 템플릿 선택 시 topic / deadline 자동 입력
- `curriculumId?: string` 필드로 커리큘럼 연결 (현재 `english_grammar`만 연결됨)

---

### Ch4 — 영어 문법 커리큘럼 (30일)

- `src/data/curriculum.ts`: 30일 영어 문법 커리큘럼
- 각 day: `{ day, topic, content }` — 불릿 포인트 형식
- 커버 내용: 문장5형식 → 8품사 → 명사 → 관사 → 대명사 → 동사 → 시제 → 조동사 → 수동태 → 부정사 → 동명사 → 분사 → 관계사 → 접속사 → 가정법 → 비교 → 일치 → 특수구문 → 총복습
- 헬퍼 함수: `getCurriculum(id)`, `getCurriculumDay(id, dayNum)`
- LearningScreen에서 해당 날짜 content를 `effectiveRawContent`로 Gemini에 전달

---

### Ch5 — 학습 자료 화면

- `src/screens/StudyMaterialsScreen.tsx` (`/materials/:goalId`)
- **탭 1: 커리큘럼** — 전체 30일 목록, 완료일 ✓ 표시, 클릭 시 내용 확장
- **탭 2: 학습 노트** — 모든 세션의 AI 요약 열람
- **탭 3: 내 메모** — 자유 메모 textarea → `goal.notes`에 저장

---

### Ch6 — API 키 불필요 (CF Worker 프록시)

- `cloudflare_worker.js`에 `handleGenerate()` 추가
  - `POST /api/generate` → `env.GEMINI_API_KEY`로 Gemini 대리 호출
  - `env.RATE_LIMIT` KV — IP당 20회/일 제한, TTL 86400s
  - 초과 시 429 + 한국어 안내 메시지
- `src/services/gemini.ts` `callGemini()`: apiKey 있으면 직접 호출, 없으면 `/api/generate` 경유
- `wrangler.toml`: RATE_LIMIT KV 바인딩 (id: `a0963576a5514b2bb9b8910be372ce4b`)
- `wrangler secret put GEMINI_API_KEY` 완료 (배포 서버에 설정됨)

---

### Ch7 — 공유 콘텐츠 풀

콘텐츠를 유저 수가 아닌 고유 주제 수 기준으로 생성 — O(unique topics)

- `src/services/contentPool.ts`
  - `buildCacheKey(templateId, dayNum)` → `"t:{templateId}:d{dayNum}"`
  - `fetchFromPool()`: Supabase `shared_content` 조회, 히트 시 `use_count` 증가 (fire & forget)
  - `saveToPool()`: Gemini 생성 후 Supabase에 저장, 중복 무시 (unique 제약 활용)
- LearningScreen 흐름:
  1. 세션 캐시 확인
  2. `fetchFromPool()` → 히트 시 즉시 사용 ("⚡ N명이 함께 공부 중" 배지)
  3. 미스 시 Gemini 생성 → `saveToPool()` (fire & forget)

**Supabase `shared_content` 테이블 생성 SQL:**
```sql
CREATE TABLE shared_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  template_id TEXT,
  topic TEXT NOT NULL,
  day_num INT NOT NULL,
  summary TEXT NOT NULL,
  quizzes JSONB NOT NULL,
  use_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE shared_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_can_read" ON shared_content FOR SELECT USING (true);
CREATE POLICY "anyone_can_insert" ON shared_content FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone_can_update" ON shared_content FOR UPDATE USING (true);
```

---

### Ch8 — 쇼츠형 학습 (유저 획득)

- `src/screens/ShortsScreen.tsx` (`/shorts/:templateId`)
- 로그인 없이 접근 가능한 공개 URL — 공유 링크 마케팅 용도
- **카드 타입:**
  - `ConceptCard` — 인디고 그라디언트, Day 번호 + 주제 + 불릿 4개
  - `QuizCard` — 슬레이트 다크, 4지선다, 정답 즉시 피드백 + 해설
  - `CompleteCard` — 에메랄드, 점수 표시 + "목표 만들기" CTA
- **네비게이션:** 터치 스와이프 (50px 임계값) + "다음 ↑" 버튼
- **상단:** 진행 도트 (현재/완료/미완료 구분)
- **콘텐츠 로직:**
  - 커리큘럼 있는 템플릿: 1~5일 개념 카드 + 공유 풀 퀴즈 교차
  - 커리큘럼 없는 템플릿: 공유 풀 퀴즈만
- **전환 퍼널:** CompleteCard → `navigate('/goals/create?templateId=xxx')`
- **공유 링크:**
  - 영어 문법: `/shorts/english_grammar`
  - 정보처리기사: `/shorts/iip_practical`
  - 운전면허: `/shorts/driving_written`

---

## Supabase 구성

| 테이블 | 용도 |
|--------|------|
| `user_data` | 로그인 유저 전체 데이터 동기화 (goals, sessions, quizzes, badges) |
| `shared_content` | 공유 콘텐츠 풀 (cache_key unique, quizzes JSONB) |

- **Auth:** Google OAuth (`supabase.auth.signInWithOAuth`)
- **보안:** `geminiApiKey`는 클라우드에 저장하지 않음 (로컬 전용)
- **동기화:** 로그인 시 `migrateLocalToCloud` → `loadFromCloud` / 데이터 변경 시 2초 디바운스 후 `syncToCloud`

---

## 상태 관리 (Zustand + localStorage)

| Store | localStorage 키 | 내용 |
|-------|-----------------|------|
| `useGoalStore` | `goals` | 목표 배열 |
| `useSessionStore` | `sessions` | 세션 배열 |
| `useQuizStore` | `quizzes` | 퀴즈 배열 |
| `useAppStore` | `appState` | geminiApiKey, 알림 설정 등 |

---

## 퀴즈 시스템

| 시점 | 함수 | 퀴즈 수 |
|------|------|---------|
| 목표 생성 | `generateGoalContent` | 15개 (MC 10 + SA 5) |
| 매일 학습 | `generateDailyContent` | 8개 (MC 6 + SA 2) |

- 공유 풀 히트 시 Gemini 호출 없이 즉시 제공
- 오답 → `wrongPool` 저장 → `WrongPoolScreen`에서 재시도

---

## Cloudflare Worker 환경 변수

| 키 | 용도 | 설정 방법 |
|----|------|----------|
| `GEMINI_API_KEY` | Gemini API 프록시 | `wrangler secret put` |
| `TELEGRAM_BOT_TOKEN` | 텔레그램 봇 | `wrangler secret put` |
| `TELEGRAM_CHAT_ID` | 허용 채팅 ID | `wrangler secret put` |
| `GITHUB_TOKEN` | Actions 트리거 | `wrangler secret put` |
| `GITHUB_REPO` | 대상 레포 | `wrangler secret put` |

---

## 배포 명령

```bash
npm run build          # Vite 빌드 → dist/
npx wrangler deploy    # CF Worker + 정적 파일 배포
```

---

## 남은 작업

- [ ] Supabase `shared_content` 테이블 생성 (위 SQL 실행)
- [ ] Google Cloud Console에 OAuth 리다이렉트 URI 등록
  - `https://opclndjjhdkflwjrmyfg.supabase.co/auth/v1/callback`
