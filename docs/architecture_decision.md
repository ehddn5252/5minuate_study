# 5분 공부 앱 — 아키텍처 결정 문서 (ADR) v1.0

> 작성 주체: Developer 에이전트  
> 작성일: 2026-06-27  
> 기반 문서: feature_definition.md v1.0  
> 다음 단계: CEO 승인 후 코드 작성 시작

---

## 목차

1. [플랫폼 선택](#1-플랫폼-선택)
2. [프론트엔드 기술 스택](#2-프론트엔드-기술-스택)
3. [백엔드 및 데이터 저장 방식](#3-백엔드-및-데이터-저장-방식)
4. [AI/LLM 통합 방식](#4-aillm-통합-방식)
5. [핵심 데이터 모델](#5-핵심-데이터-모델)
6. [시스템 흐름도](#6-시스템-흐름도)
7. [리스크 및 트레이드오프](#7-리스크-및-트레이드오프)
8. [자기검증 결과](#8-자기검증-결과)

---

## 1. 플랫폼 선택

### 결정: PWA (Progressive Web App)

### 이유

| 고려 사항 | PWA | 네이티브 앱 (React Native 등) | 순수 웹앱 |
|-----------|-----|-------------------------------|-----------|
| 무료 배포 가능 여부 | GitHub Pages / Vercel Free로 즉시 배포 | 스토어 등록비 ($25~$99) 발생 | 동일 |
| 알림 지원 (F-14, F-17) | Web Push Notification API 지원 | 가능하나 플랫폼 빌드 필요 | 불가 |
| 설치 마찰 | 브라우저에서 직접 설치 가능 | 앱스토어 방문 필요 | 없음 (설치 불필요) |
| 개발 비용 | 단일 코드베이스 | iOS/Android 빌드 분리 | 낮음 |
| 5분 완결 원칙 | 즉시 접근 가능 | 앱 실행 딜레이 있음 | 동일 |

**PWA를 선택한 핵심 근거:**
- F-14의 "이탈 감지 재참여 알림"은 Push Notification이 필수다. 순수 웹앱은 이를 지원하지 못한다.
- 네이티브 앱 개발은 앱스토어 등록비와 별도 빌드 환경이 필요해 free 제약에 위배된다.
- PWA는 GitHub Pages(무료)에 배포 가능하고, 모바일/데스크톱 모두 동일하게 동작한다.
- Service Worker를 통해 오프라인 캐싱도 부분 지원 가능하다(Non-goal인 완전 오프라인 지원과는 다름).

---

## 2. 프론트엔드 기술 스택

### 결정

| 구성 요소 | 선택 | 버전 기준 | 이유 |
|-----------|------|-----------|------|
| UI 프레임워크 | React | 18.x | 컴포넌트 기반 구조로 학습 카드/퀴즈 UI에 적합 |
| 빌드 도구 | Vite | 5.x | CRA보다 빠른 빌드, 무료, 설정 최소화 |
| 상태 관리 | Zustand | 4.x | Redux보다 보일러플레이트 적음, 소규모 앱에 적합 |
| 스타일링 | Tailwind CSS | 3.x | 유틸리티 클래스로 빠른 UI 구성, 디자인 시스템 없이도 일관성 유지 |
| 라우팅 | React Router | 6.x | SPA 내 화면 전환 (홈→학습→테스트→결과) |
| 언어 | TypeScript | 5.x | 데이터 모델 타입 안전성, 팀 확장 시 유지보수성 |

### 이유

- **React:** 퀴즈 문항(F-11), 요약 카드(F-08), 달성률 바(F-16) 등 상태 변화가 잦은 UI에 React의 선언적 렌더링이 적합하다.
- **Zustand:** 진행 중 목표(최대 3개), 오답 풀, 스트릭 등 전역 상태가 여러 화면에 걸쳐 공유된다. Redux보다 코드량이 적고 무료다.
- **Tailwind CSS:** 별도 디자인 라이브러리(MUI, Ant Design 등) 없이 모바일 친화적 UI를 빠르게 구성할 수 있다.
- **TypeScript:** 데이터 모델(Goal, Session, Quiz 등)을 타입으로 정의하면 AI API 응답 파싱 오류를 사전에 방지할 수 있다.

---

## 3. 백엔드 및 데이터 저장 방식

### 결정: 백엔드 없음 (Serverless + 로컬 스토리지)

### 아키텍처 구성

```
[브라우저 로컬 스토리지]  ←→  [React 앱]  ←→  [AI API (외부)]
         ↑
  [IndexedDB (대용량 자료)]
```

### 상세 결정

| 저장 대상 | 저장소 | 이유 |
|-----------|--------|------|
| 목표, 세션, 스트릭, 오답 풀 | localStorage | 구조가 단순하고 무료, 서버 불필요 |
| 학습 자료 원문 (대용량 텍스트) | IndexedDB | localStorage 5MB 한계 회피 |
| AI 생성 요약/퀴즈 캐시 | localStorage | 동일 세션 내 재생성 방지, 비용 절감 |

### 이유

- **서버 없이 운영:** free 제약에서 서버 운영 비용이 발생하는 클라우드 DB(Firebase, Supabase Free Tier 등)는 장기적으로 한도 초과 위험이 있다. 로컬 스토리지는 비용이 0이다.
- **사용자 데이터 범위:** 17개 기능 중 다중 사용자 간 데이터 공유 기능은 없다. 모든 데이터는 해당 사용자의 디바이스에만 필요하다.
- **5분 완결:** 네트워크 왕복 없이 로컬에서 즉시 로딩 가능하므로 시작 마찰이 없다.

### 제약 및 보완

- 디바이스 변경 시 데이터 이전 불가 → MVP 범위 외(Non-goal)로 처리
- 브라우저 캐시 삭제 시 데이터 손실 위험 → 향후 JSON 내보내기로 보완 가능 (이번 범위 외)

### 배포

- **GitHub Pages** (무료): 정적 파일 호스팅으로 React PWA 배포 가능
- 대안: **Vercel Free Tier** (월 100GB 대역폭, 무료)

---

## 4. AI/LLM 통합 방식

### 결정: Google Gemini API (Free Tier)

### AI가 필요한 기능

| 기능 ID | 기능명 | AI 역할 | 호출 시점 |
|---------|--------|---------|-----------|
| F-02 | 일일 학습 단위 제안 | 주제 + 기한 → 하루 학습 단위 계획 생성 | 목표 생성 시 1회 |
| F-08 | 핵심 요약 제공 | 원문 또는 주제 → 불릿 포인트 3~7개 요약 | 목표 생성 시 1회, 영구 저장 |
| F-11 | 퀴즈 풀 생성 | 요약 내용 → 객관식/단답형 10~20문항 풀 일괄 생성 | 목표 생성 시 1회, 영구 저장 |

### 모델 및 Free Tier 조건

| 항목 | 내용 |
|------|------|
| 사용 모델 | `gemini-1.5-flash` |
| 무료 한도 | 분당 15회 요청, 일 1,500회 요청, 입력 1M 토큰/분 |
| 비용 | 무료 한도 내 $0 |
| API 키 발급 | Google AI Studio (무료 가입) |

### Gemini 선택 이유

- **OpenAI GPT:** Free Tier 없음, 사용량 기반 과금으로 free 제약 위배
- **Claude API (Anthropic):** Free Tier 없음, 과금 필요
- **Gemini 1.5 Flash:** 무료 한도가 일 1,500회로 소규모 앱에 충분하고, 한국어 성능이 양호하다
- **Ollama (로컬 LLM):** 무료이나 사용자 PC에 GPU/고사양이 필요해 일반 사용자에게 부적합

### API 호출 전략 (퀴즈 풀 백업 방식 — v1.1 수정)

```
[목표 생성 시 — AI 호출 3회로 전부 완결]
1. F-02: 주제 + 기한 → 일일 학습 단위 계획 생성 → Goal.dailyPlan 저장
2. F-08: 원문/주제 → 핵심 요약 3~7개 생성 → Goal.summaryContent 저장 (백업 파일)
3. F-11: 요약 기반 퀴즈 10~20문항 풀 일괄 생성 → Goal.quizPool 저장 (백업 파일)

[이후 매일 세션 시작 시 — AI 호출 0회]
- summaryContent: Goal에서 즉시 로딩 (이미 저장됨)
- 퀴즈 문항: quizPool에서 오답 우선 + 랜덤 2~5개 선택 (AI 재호출 없음)

[풀 소진 시 — 선택적 추가 호출]
- quizPool의 모든 문항을 마스터(정답 처리)한 경우에만 AI 추가 호출로 새 문항 생성
```

- **목표당 AI 호출 횟수: 최대 3회** (기존 세션당 2~3회에서 대폭 감소)
- 일 1,500회 한도 기준: 기존 500명 일 활성 사용자 → **5,000명 이상**까지 무료 운영 가능
- F-13(오답 반복 출제)과 자연스럽게 통합: 고정 quizPool이 있어야 오답 추적이 일관성 있음

### 프롬프트 설계 원칙

- F-08 요약 프롬프트: "다음 학습 자료(또는 주제)를 5분 내 읽을 수 있는 핵심 포인트 3~7개로 요약해 주세요. 각 항목은 1~2문장 이내로 작성하세요."
- F-11 퀴즈 풀 프롬프트: "위 요약 내용을 기반으로 객관식(4지선다) 또는 단답형 문항을 15개 생성해 주세요. 다양한 난이도로 구성하고 JSON 배열로 반환하세요: [{question, type, options, answer, explanation, difficulty}]"
- F-02 계획 프롬프트: "주제: {topic}, 기한: {days}일, 자료 유무: {hasContent}. 하루 5분 이내 완료 가능한 일일 학습 단위를 제안해 주세요."

---

## 5. 핵심 데이터 모델

### 엔티티 1: Goal (목표)

```typescript
interface Goal {
  id: string;                    // UUID
  topic: string;                 // 공부 주제 (최대 100자)
  deadline: string;              // 기한 (ISO 8601 날짜, YYYY-MM-DD)
  status: 'active' | 'completed' | 'inactive';
  createdAt: string;             // 생성 일시
  completedAt?: string;          // 완료 일시 (완료 시에만)
  totalSessions: number;         // 전체 세션 수 (기한까지 일수)
  completedSessions: number;     // 완료된 세션 수
  streak: number;                // 현재 연속 달성 일수
  bestStreak: number;            // 역대 최고 스트릭
  notificationTime: string;      // 알림 시각 (기본 "20:00")
  notificationEnabled: boolean;  // 알림 활성화 여부
  rawContent?: string;           // 학습 자료 원문 (IndexedDB 참조 key)
  dailyPlan: string;             // AI가 생성한 하루 학습 단위 설명
  summaryContent: string;        // AI 생성 핵심 요약 (목표 생성 시 1회 생성, 영구 재사용)
  quizPoolIds: string[];         // 연결된 Quiz ID 목록 (목표 생성 시 10~20개 일괄 생성)
}
```

### 엔티티 2: Session (학습 세션)

```typescript
interface Session {
  id: string;                    // UUID
  goalId: string;                // 연결된 Goal ID
  date: string;                  // 해당 날짜 (YYYY-MM-DD)
  status: 'pending' | 'in_progress' | 'completed';
  summaryViewedAt?: string;      // 요약 열람 일시 (요약은 Goal에서 가져옴)
  completedAt?: string;          // 세션 완료 일시
  selectedQuizIds: string[];     // 이 세션에서 출제된 Quiz ID 목록 (풀에서 선택)
  quizScore?: number;            // 퀴즈 점수 (맞힌 수)
  quizTotal?: number;            // 퀴즈 전체 문항 수
}
```

### 엔티티 3: Quiz (퀴즈 문항)

```typescript
interface Quiz {
  id: string;                    // UUID
  goalId: string;                // 연결된 Goal ID
  sessionId: string;             // 생성된 Session ID
  question: string;              // 문항 내용
  type: 'multiple_choice' | 'short_answer';
  options?: string[];            // 객관식 선택지 (4개)
  answer: string;                // 정답
  explanation: string;           // 해설 (1~2줄)
  isWrong: boolean;              // 오답 여부 (오답 풀 포함 여부)
  wrongCount: number;            // 누적 오답 횟수
  lastAttemptedAt?: string;      // 마지막 시도 일시
}
```

### 엔티티 4: WrongPool (오답 풀)

```typescript
interface WrongPool {
  goalId: string;                // 연결된 Goal ID
  quizId: string;                // 오답 Quiz ID
  addedAt: string;               // 오답 풀 추가 일시
  retryCount: number;            // 재출제 횟수
  resolvedAt?: string;           // 정답 처리 일시 (제거 시각)
}
```

### 엔티티 5: AppState (앱 전역 상태)

```typescript
interface AppState {
  activeGoalIds: string[];       // 진행 중 목표 ID 목록 (최대 3개)
  lastOpenedDate: string;        // 마지막 앱 진입 날짜 (이탈 감지용)
  urgentGoalIds: string[];       // 긴급 독려 대상 Goal ID 목록
}
```

---

## 6. 시스템 흐름도

### 6-1. 전체 사용자 흐름

```
[앱 실행]
    │
    ├─ 진행 중 목표 없음 ──→ [목표 생성 화면 (F-01)]
    │                              │
    │                         주제 + 기한 입력
    │                              │
    │                         [AI: 학습 단위 계획 생성 (F-02)]
    │                              │
    │                         [목표 확정 저장]
    │                              │
    └─ 진행 중 목표 있음 ──→ [홈 화면: 오늘의 학습 카드 (F-07)]
                                   │
                              "학습 시작" 탭
                                   │
                         [AI 요약 로딩 (F-08)]
                         캐시 있으면 즉시 표시
                                   │
                         [요약 화면: 3~7 불릿]
                                   │
                         "테스트 시작" 탭
                                   │
                         [퀴즈 화면 (F-11)]
                         문항 1개씩 표시
                                   │
                    ┌──────────────┴───────────────┐
                정답                              오답
                    │                              │
           [정답 피드백]              [오답 피드백 + 오답 풀 저장 (F-13)]
                    │                              │
                    └──────────────┬───────────────┘
                                   │
                         다음 문항 또는 완료
                                   │
                         [세션 완료 화면 (F-10)]
                         스트릭 + 달성률 갱신
                                   │
                         3초 후 홈으로 자동 전환
```

### 6-2. 독려 루프 흐름

```
[매일 저녁 8시 (Service Worker 스케줄)]
    │
    ├─ 당일 세션 완료 ──→ 알림 없음
    │
    └─ 당일 세션 미완료
            │
            ├─ 1일 미완료 ──→ [일반 독려 알림 (F-14)]
            │
            └─ 2일 이상 연속 미완료
                    │
                    ├─ [긴급 독려 알림 (F-17)]
                    └─ 앱 진입 시 긴급 독려 배너 표시
```

### 6-3. AI 호출 흐름

```
[목표 생성 시]
    주제 + 기한 + 자료
        │
        └→ Gemini API: 학습 단위 계획 생성
               │
               └→ dailyPlan 저장

[학습 세션 시작 시]
    오늘 sessionId 조회
        │
        ├─ summaryContent 캐시 있음 ──→ 즉시 표시
        │
        └─ 캐시 없음
                │
                └→ Gemini API: 핵심 요약 생성
                        │
                        └→ Gemini API: 퀴즈 2~5문항 생성
                                │
                                └→ Session + Quiz 저장 후 표시
```

### 6-4. 복습 우선순위 조정 흐름 (F-09)

```
[세션 시작 시 분량 결정]
    │
    오답 풀 조회 (F-13)
        │
        ├─ 오답 없음 ──→ 신규 학습 100%
        │
        └─ 오답 있음
                │
                오답 비율 계산
                        │
                        ├─ 50% 이하 ──→ 오답 포함 + 나머지 신규
                        └─ 50% 초과 ──→ 오답 50% + 신규 50% 강제 조정
```

---

## 7. 리스크 및 트레이드오프

### 리스크 1: Gemini API 무료 한도 초과

- **발생 조건:** 일 활성 사용자 500명 이상 또는 동시 접속 급증
- **영향:** AI 요약/퀴즈 생성 실패 (F-08, F-11)
- **대응:**
  - 요약/퀴즈를 세션당 1회 생성 후 localStorage에 캐시해 재호출 방지
  - API 실패 시 fallback: 주제 기반 기본 문항("오늘 학습한 주제는 무엇인가요?")으로 대체 (F-11 명세에 이미 정의됨)
  - 장기적으로 Gemini API 키를 사용자가 직접 입력하는 방식으로 전환 가능

### 리스크 2: 로컬 스토리지 데이터 손실

- **발생 조건:** 브라우저 캐시 삭제, 시크릿 모드 사용, 디바이스 변경
- **영향:** 목표, 세션 기록, 오답 풀 전체 손실
- **대응:**
  - 사용자에게 앱 최초 실행 시 데이터 저장 방식 안내
  - 기능 범위 외이지만 JSON 내보내기 버튼을 추가해 수동 백업 지원 가능
  - MVP에서는 이 리스크를 수용하고 진행

### 리스크 3: Web Push Notification 브라우저 지원 한계

- **발생 조건:** iOS Safari (16.4 미만), 일부 구형 브라우저
- **영향:** F-14(이탈 감지 알림), F-17(긴급 독려) 알림 미작동
- **대응:**
  - iOS 16.4+ / PWA 설치 시에는 Web Push 지원됨 (2023년 이후 iOS 지원)
  - 알림 미지원 환경에서는 앱 재진입 시 인앱 배너로 대체
  - 알림이 핵심 기능이지만 없어도 핵심 학습 흐름(F-07~F-13)은 동작함

### 리스크 4: AI 응답 품질 일관성

- **발생 조건:** 주제가 모호하거나 매우 전문적인 경우
- **영향:** F-08 요약이 부정확하거나 F-11 퀴즈 문항이 학습 내용과 무관하게 생성될 수 있음
- **대응:**
  - 프롬프트에 출력 형식(JSON 스키마)을 명시해 파싱 오류 방지
  - AI 응답 유효성 검증 로직 추가 (문항 수 범위 확인, 필드 존재 여부 확인)
  - 원문이 있는 경우 주제보다 원문 기반 요약이 더 정확하므로 원문 첨부를 권장 안내

### 트레이드오프 요약

| 결정 | 포기한 것 | 얻은 것 |
|------|-----------|---------|
| 백엔드 없음 (로컬 스토리지) | 다기기 동기화, 데이터 안전성 | 서버 비용 $0, 즉각 로딩 |
| Gemini Free Tier | GPT-4급 품질 보장 | 운영 비용 $0 |
| PWA (네이티브 앱 아님) | 네이티브 앱 수준의 UX | 개발 단일화, 무료 배포 |
| TypeScript | 빠른 프로토타이핑 속도 | 타입 안전성, 유지보수성 |

---

## 8. 자기검증 결과

| 점검 항목 | 결과 |
|-----------|------|
| 선택한 스택이 free 플랫폼 제약을 지키는가? | React + Vite + Tailwind 모두 오픈소스 무료. GitHub Pages 배포 무료. Gemini Free Tier 활용으로 AI 비용 $0. 유료 인프라 없음. **통과** |
| 17개 기능을 모두 구현 가능한가? | F-01~F-06(목표 관리): localStorage 모델로 구현 가능. F-07~F-10(학습): AI 캐시 + 세션 모델로 구현 가능. F-11~F-13(테스트): Gemini API + WrongPool 모델로 구현 가능. F-14~F-17(독려): Service Worker Push + 인앱 배너로 구현 가능. **17개 전원 구현 가능** |
| 과도한 복잡도는 없는가? | 백엔드 서버 없음. 외부 의존성은 Gemini API 1개뿐. 데이터 모델 5개(Goal, Session, Quiz, WrongPool, AppState)로 최소화. 상태 관리는 Zustand 단일 라이브러리. **적정 수준** |
| 5분 완결 원칙과 아키텍처가 상충하지 않는가? | AI 응답을 localStorage에 캐시해 세션 시작 시 네트워크 지연 최소화. 로컬 데이터 기반으로 즉각 로딩. **상충 없음** |

---

## 9. Google Play 스토어 배포 방식 (2026-09-06 추가)

### 결정: TWA(Trusted Web Activity) — Bubblewrap 으로 PWA 래핑

### 이유

| 고려 사항 | TWA (Bubblewrap) | Capacitor | React Native 재작성 |
|-----------|------------------|-----------|---------------------|
| 코드베이스 | 기존 PWA 그대로, 껍데기만 추가 | 기존 웹 + 네이티브 셸 동기화 | 전면 재작성 |
| 웹 변경 반영 | 재배포만으로 즉시 (앱 재제출 불필요) | 앱 자산 재동기화·재빌드 필요 | 무관 |
| 네이티브 기능 | Custom Tabs 수준으로 제한 | 플러그인으로 확장 | 완전 자유 |
| 유지비 | 서명 키 관리만 | 빌드 파이프라인 유지 | 별도 팀 수준 |

**TWA 선택 근거:**
- 현재 요구는 "스토어에 존재 + 자동 반영"이고, 네이티브 플러그인 요구가 없다.
- PWA manifest·아이콘·스크린샷·바로가기·share_target 이 이미 갖춰져 있어 그대로 재사용된다.
- 웹 배포(`wrangler deploy`)가 곧 앱 업데이트라 릴리스 흐름이 단일화된다.

### 구현

- `twa-manifest.json` (repo 루트, 커밋) — 설정 단일 원본.
- `public/.well-known/assetlinks.json` 정적 파일로 배포 (Digital Asset Links). Vite 가
  `dist/.well-known/` 로 복사하고 Cloudflare 가 정적 자산으로 서빙한다. (Worker 라우트로
  처리하려다 `run_worker_first` 가 `POST /api/generate` 를 assets 레이어의 405 로 막는
  회귀를 유발해 철회 — 정적 파일이 가장 단순하고 안전하다.)
- SHA-256 지문 2개(로컬 서명 키 + Play 앱 서명 키)를 Worker 상수 배열에 넣는다.
- 빌드 산출물: `.aab`(스토어) + `.apk`(로컬 테스트). `android/` 전체는 gitignore.
- 상세 절차: `docs/PLAY_STORE.md`.

### 리스크

| 리스크 | 대응 |
|--------|------|
| 서명 키 분실 시 앱 업데이트 불가 | 키스토어·비밀번호 오프라인 백업. Play 앱 서명 사용으로 업로드 키는 재설정 가능 |
| asset links 지문 누락 → 앱에 URL 바 노출 | 로컬+Play 지문 모두 등록, 배포 후 `curl` 로 검증 (PLAY_STORE.md §6) |
| Bubblewrap manifest 스키마 변동 | `bubblewrap init --manifest ./twa-manifest.json` 로 재생성 가능 |
| 패키지명 영구 고정 | 등록 전 `packageId` 와 `ANDROID_PACKAGE_NAME` 일치 확인 |

---

> **휴먼 게이트:** 이 아키텍처 결정 문서는 CEO 승인 후 코드 작성이 시작된다.
