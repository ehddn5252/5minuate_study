# 5분 학습 (5minuate_study)

하루 5분, AI가 만들어주는 맞춤 학습 콘텐츠로 자격증·어학·개발 공부를 꾸준히 이어가는 PWA입니다.

**바로 써보기:** https://5minuatestudy.ehddn5252.workers.dev (Google 로그인 필요)

---

## 사용 방법

### 1. 로그인
서비스 이용에는 Google 로그인이 필수입니다. 로그인하면 학습 데이터가 클라우드에 자동 동기화되어 다른 기기에서도 이어서 학습할 수 있습니다.

### 2. 학습 목표 만들기
- 홈 화면 → **목표 만들기**
- 자격증 템플릿 중 하나를 선택하거나(주제·기한 자동 입력), 원하는 주제를 직접 입력
- **난이도**(초급/중급/고급) 선택
- 참고 자료(선택)를 붙여넣으면 그 내용을 기반으로 콘텐츠 생성
- AI가 학습 요약과 퀴즈 15문제를 자동 생성 (약 10~20초)

**제공 템플릿**: 정보처리기사 실기 · TOEIC 900 · 운전면허 필기 · 한국사능력검정 1급 · 공인중개사 · 전기기사 · 컴활 1급 · 영어단어 매일 · 리액트 입문 · 파이썬 기초 · 영어 문법 완전 정복(30일 커리큘럼)

### 3. 매일 5분 학습
- 홈에서 **오늘 학습 시작** → 오늘의 핵심 요약을 읽고 **테스트 시작**
- 객관식은 즉시 채점, 단답형은 정답을 확인한 뒤 스스로 맞았는지 표시(자가 채점)
- 완료 후에도 **다음 학습 계속하기**로 바로 다음 날 분량을 이어갈 수 있음 (스트릭은 실제 날짜 기준으로 하루 1회만 증가)
- 오답은 자동으로 오답노트에 쌓이고, 다음 테스트에 우선 출제됨

### 4. 학습 자료 / 오답 / 업적
- **학습 자료**: 커리큘럼 목록, 지금까지의 학습 노트(날짜별 요약), 자유 메모
- **오답 목록**: 아직 못 맞힌 문제만 모아보기
- **업적**: 첫걸음 · 불꽃(7일 연속) · 근성(30일 연속) · 만점자(만점 5회) · 오답 제로 뱃지
- 학습 완료/목표 달성 시 결과 카드를 이미지로 공유 가능

### 5. 쇼츠 체험
- 목표를 만들기 전, 홈 화면 하단의 "⚡ 쇼츠"로 템플릿 맛보기 콘텐츠를 짧은 카드 형식으로 먼저 체험 가능

### 6. 설정
- 학습 알림 시간 설정
- 계정 로그아웃 / 지금 동기화
- 개인 Gemini API 키 입력 기능은 제공하지 않음 — 모든 사용자는 서버 프록시(무료, 1일 20회 제한)를 통해 생성

---

## 개발 환경

```bash
npm install
npm run dev       # 로컬 개발 서버 (Vite)
npm run build     # tsc -b && vite build → dist/
npm run lint
```

### 환경 변수 (`.env.local`)
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Cloudflare Worker 시크릿
```
npx wrangler secret put GEMINI_API_KEY       # Gemini 프록시용 서버 키
npx wrangler secret put TELEGRAM_BOT_TOKEN   # 원격 개발 봇 (선택)
npx wrangler secret put TELEGRAM_CHAT_ID
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put GITHUB_REPO
```

### 배포
```bash
npm run build
npx wrangler deploy
```

### Supabase 스키마
`supabase/migrations/`, `supabase/seed/` 폴더의 SQL을 Supabase SQL Editor에서 순서대로 실행 (service_role 권한 필요, 이 저장소의 anon key로는 실행 불가).

- `shared_content` — 템플릿+날짜별 커뮤니티 공유 콘텐츠 캐시 (앱이 자동 채움)
- `question_bank` — 커리큘럼 템플릿의 난이도별 사전 제작 문제 데이터셋 (수동 저술 후 SQL로 삽입, 읽기 전용 공개)
- `user_data` — 로그인 사용자별 학습 데이터 클라우드 백업

자세한 아키텍처는 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) 참고.
