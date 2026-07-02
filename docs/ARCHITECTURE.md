# 5분 학습 — 시스템 아키텍처

> PWA 기반 AI 학습 앱의 전체 아키텍처 개요

---

## 전체 구조도

```
┌─────────────────────────────────────────────────────────────────────┐
│                         🌐 External Services                        │
│                                                                     │
│  ┌─────────────────────┐    ┌────────────────────────────────────┐  │
│  │  🤖 Google Gemini   │    │           🗄️ Supabase              │  │
│  │    2.5 Flash API    │    │                                    │  │
│  │                     │    │  ┌──────────────┐ ┌────────────┐  │  │
│  │  • 날짜별 학습 요약  │    │  │  PostgreSQL  │ │    Auth    │  │  │
│  │  • 퀴즈 8문제 생성  │    │  │  (user_data) │ │  (Google   │  │  │
│  │  • 커리큘럼 기반    │    │  │              │ │   OAuth)   │  │  │
│  │    맞춤 콘텐츠      │    │  └──────────────┘ └─────┬──────┘  │  │
│  └──────────┬──────────┘    └───────────────────────┬─┴──────────┘  │
│             │                                        │               │
│             │                           ┌────────────▼────────────┐ │
│             │                           │   🔑 Google Cloud       │ │
│             │                           │   OAuth 2.0 Client      │ │
│             │                           │   (소셜 로그인 제공자)   │ │
│             │                           └─────────────────────────┘ │
└─────────────┼────────────────────────────────┼───────────────────────┘
              │ API 호출 (HTTPS)                │ OAuth 리다이렉트
              │                                │
┌─────────────▼────────────────────────────────▼───────────────────────┐
│                        📱 Client — PWA (브라우저)                     │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                     ⚛️ React + TypeScript                     │    │
│  │                                                              │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │                  📱 Screens (12)                     │    │    │
│  │  │                                                     │    │    │
│  │  │  Home · GoalCreate · GoalList · GoalEdit            │    │    │
│  │  │  Learning · Test · SessionComplete · GoalComplete   │    │    │
│  │  │  StudyMaterials · Achievements · WrongPool          │    │    │
│  │  │  Settings                                           │    │    │
│  │  └───────────────────────┬─────────────────────────────┘    │    │
│  │                          │                                   │    │
│  │  ┌───────────────────────▼─────────────────────────────┐    │    │
│  │  │              🗃️ Zustand Store (전역 상태)            │    │    │
│  │  │                                                     │    │    │
│  │  │   GoalStore · SessionStore · QuizStore · AppStore   │    │    │
│  │  └────────┬──────────────────────────┬─────────────────┘    │    │
│  │           │                          │                       │    │
│  │  ┌────────▼──────────┐   ┌───────────▼────────────────┐    │    │
│  │  │   ⚙️ Services      │   │        🔧 Utils             │    │    │
│  │  │                   │   │                            │    │    │
│  │  │  gemini.ts        │   │  storage.ts  (localStorage) │    │    │
│  │  │  supabase.ts      │   │  badges.ts   (업적 계산)    │    │    │
│  │  │  notification.ts  │   │  shareCard.ts(캔버스 생성)  │    │    │
│  │  └────────┬──────────┘   │  id.ts       (UUID 생성)   │    │    │
│  │           │              └───────────────────────────┘    │    │
│  │  ┌────────▼──────────┐                                     │    │
│  │  │    📦 Data (정적)  │                                     │    │
│  │  │                   │                                     │    │
│  │  │  templates.ts     │  (11개 목표 템플릿)                  │    │
│  │  │  curriculum.ts    │  (영어 문법 30일 커리큘럼)            │    │
│  │  └───────────────────┘                                     │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌──────────────────────┐    ┌────────────────────────────────────┐  │
│  │  💾 localStorage      │    │      🔔 Service Worker (PWA)       │  │
│  │                      │    │                                    │  │
│  │  goals               │    │  • 오프라인 캐싱 (Workbox)          │  │
│  │  sessions            │    │  • 학습 알림 (Web Notifications)    │  │
│  │  quizzes             │    │  • 백그라운드 동작                  │  │
│  │  wrongPool           │    │  • 홈 화면 설치 (PWA Manifest)     │  │
│  │  badges              │    └────────────────────────────────────┘  │
│  │  appState            │                                            │
│  └──────────────────────┘                                            │
└───────────────────────────────┬───────────────────────────────────────┘
                                │ 빌드 결과물 요청 (HTTPS)
┌───────────────────────────────▼───────────────────────────────────────┐
│                       🚀 Deployment Layer                             │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │              ☁️ Cloudflare Workers (Static Assets)             │  │
│  │                                                                │  │
│  │  • dist/ 정적 파일 서빙 (HTML, JS, CSS, SW)                    │  │
│  │  • 전 세계 엣지 네트워크 (CDN)                                  │  │
│  │  • wrangler.toml [assets] 설정                                 │  │
│  │  • URL: https://5minuatestudy.ehddn5252.workers.dev            │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                   🔁 CI/CD (GitHub Actions)                    │  │
│  │                                                                │  │
│  │  .github/workflows/claude-task.yml                            │  │
│  └────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 레이어별 요약

### 1. Frontend (Client)

| 항목 | 기술 |
|------|------|
| 프레임워크 | React 18 + TypeScript |
| 번들러 | Vite 6 |
| 스타일 | Tailwind CSS |
| 라우팅 | React Router DOM v6 |
| 상태 관리 | Zustand |
| PWA | vite-plugin-pwa (Workbox) |

### 2. 데이터 저장

| 저장소 | 역할 | 특이사항 |
|--------|------|----------|
| localStorage | 오프라인 기본 스토리지 | 모든 goals/sessions/quizzes 저장 |
| Supabase PostgreSQL | 클라우드 동기화 | 로그인 시 2초 디바운스 자동 동기화 |

> **동기화 전략:** localStorage가 단일 진실의 원천(SSoT). 로그인 시 클라우드 데이터로 덮어씀.
> API 키는 보안상 클라우드에 저장하지 않고 로컬에만 보관.

### 3. 인증

```
사용자 클릭 → signInWithGoogle()
    → Supabase Auth (OAuth 시작)
    → Google Cloud Console (동의 화면)
    → Supabase /auth/v1/callback
    → 앱으로 리다이렉트 (SIGNED_IN 이벤트)
    → migrateLocalToCloud() → loadFromCloud()
```

### 4. AI 콘텐츠 생성 흐름

```
학습 시작 버튼 클릭
    → getTodaySession() 확인
    → summaryContent 없으면 Gemini 호출
        → curriculumId 있으면 해당 날짜 내용을 rawContent로 전달
        → generateDailyContent(topic, dayN, totalDays, rawContent)
        → 응답: { summary, quizzes[8] }  ← 6 MC + 2 SA
    → session에 summaryContent + dailyQuizIds 캐싱
    → 재접속 시 재생성 없이 캐시 반환
```

### 5. 배포

```
git push main
    → npm run build  (tsc -b && vite build)
    → npx wrangler deploy
    → Cloudflare Workers 엣지에 dist/ 업로드
```

---

## 데이터 모델

```
Goal
├── id, topic, deadline, status
├── totalSessions, completedSessions
├── streak, bestStreak
├── rawContent?      ← 사용자 참고 자료
├── curriculumId?    ← 사전 정의된 커리큘럼 연결
├── notes?           ← 사용자 자유 메모
└── quizPoolIds[]    ← 연결된 퀴즈 ID

Session (하루 1개)
├── id, goalId, date, status
├── summaryContent?  ← AI 생성 당일 요약 (캐싱)
├── dailyQuizIds?    ← 당일 퀴즈 8개 ID (캐싱)
└── quizScore?, quizTotal?

Quiz
├── id, goalId, type (MC / SA)
├── question, options?, answer, explanation
└── isWrong, wrongCount

Badge (5종)
├── 👣 first_step    — 첫 세션 완료
├── 🔥 flame_7       — 7일 연속
├── 💪 persistence_30 — 30일 연속
├── ⭐ perfect_5     — 만점 5회
└── ✨ zero_wrong    — 오답 없이 완료
```

---

## 폴더 구조

```
5minuate_study/
├── src/
│   ├── screens/        # 12개 화면 컴포넌트
│   ├── components/     # 공유 UI (BottomNav)
│   ├── services/       # 외부 API 통신
│   │   ├── gemini.ts   # AI 콘텐츠 생성
│   │   ├── supabase.ts # 인증 + 클라우드 동기화
│   │   └── notification.ts
│   ├── store/          # Zustand 전역 상태
│   ├── utils/          # storage, badges, shareCard, id
│   ├── data/           # 정적 데이터 (templates, curriculum)
│   └── types/          # TypeScript 타입 정의
├── docs/               # 프로젝트 문서
│   ├── ARCHITECTURE.md ← 이 파일
│   ├── feature_definition.md
│   ├── planning_document.md
│   ├── architecture_decision.md
│   ├── ceo_prompt.md
│   └── rule.md
├── public/             # PWA 아이콘
├── wrangler.toml       # Cloudflare 배포 설정
└── vite.config.ts      # PWA 플러그인 포함
```
