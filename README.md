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
- 문제 카드의 📑 아이콘으로 마음에 드는 문제를 **내 문제집**에 담아 따로 모아볼 수 있고, 🎤 아이콘으로 답을 소리 내어 녹음해둘 수 있음(녹음 모음에서 재생)

### 4. 학습 자료 / 오답 / 복습
- **학습 자료**: 커리큘럼 목록, 지금까지의 학습 노트(날짜별 요약), 자유 메모
- **오답 목록**: 아직 못 맞힌 문제만 모아 다시 풀기
- **복습 믹스**: 진행 중인 목표가 2개 이상이면 홈에 노출 — 여러 목표의 문제를 섞어 5분에 훑어봄 (스트릭에는 영향 없음)
- **캘린더**: 학습 완료일 · 시험일 · 마감일을 달력으로 확인
- **언어 학습 허브**: 사전 제작된 정형화 트랙(예: 영어 문법 30일)과, 원하는 언어를 AI로 바로 만드는 커스텀 트랙을 모아둔 화면
- 학습 완료/목표 달성 시 결과 카드를 이미지로 공유 가능

### 5. 쇼츠 체험
- 목표를 만들기 전, 홈 화면 하단의 "⚡ 쇼츠"로 템플릿 맛보기 콘텐츠를 짧은 카드 형식으로 먼저 체험 가능

### 6. 설정
- 계정 로그아웃 / 지금 동기화
- 학습 데이터(오답 목록·내 문제집·녹음 모음) 바로가기
- 개인 Gemini API 키 입력 기능은 제공하지 않음 — 모든 사용자는 서버 프록시(무료, 1일 40회 제한)를 통해 생성

### 7. 학원용 — 선생님 / 학생 모드
로그인 계정의 역할(교사/학생)에 따라 홈 화면이 자동으로 바뀝니다. 개인 학습 기능과 별개로 동작하며, 교사 계정도 **개인 학습 보기** 링크로 원래 학습 화면을 계속 쓸 수 있습니다.

- **선생님**: 설정에서 학원 초대 코드로 등록 → 반 생성(자동 발급되는 참여 코드) → 숙제 출제(AI로 문제 후보 생성 후 선택, 또는 직접 작성) → 반 상세 화면에서 학생별 완료 여부·점수·오답 문항(학생이 실제로 고른 답 vs 정답)까지 확인, 잘못 낸 숙제는 삭제 가능
- **학생**: 반 참여 코드 입력 → 홈 화면 배너/🎓 아이콘으로 오늘의 숙제 확인 → 풀이·제출(채점은 클라이언트가 아닌 서버 RPC가 실제 정답과 대조해 수행) → 이미 제출한 숙제는 재풀이 대신 내 답/정답을 복습하는 화면으로 전환
- 학원은 현재 1개만 지원(다중 학원 UI 없음), 반 개수 제한 없음
- 상세 사용법은 별도 사용 설명서(선생님용/학생용/일반 사용자용) 참고 — 문의 시 CEO에게 요청

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
npx wrangler secret put RELAY_URL            # Gemini 지역 차단 우회용 중계 서버 URL (선택)
npx wrangler secret put RELAY_SECRET         # 중계 서버 인증용 공유 비밀 (선택)
```
`RELAY_URL`/`RELAY_SECRET`을 설정하지 않으면 기존처럼 Cloudflare에서 Gemini를 직접 호출합니다(가끔 "User location is not supported" 지역 차단 발생 가능). 설정하면 `cloud-run-gemini-relay/`(지역이 고정된 Google Cloud Run 배포용 최소 Node 서버)를 우선 경유해 이 오류를 대부분 회피합니다 — 배포 방법은 해당 폴더의 `server.js` 주석 참고.

### 배포
```bash
npm run build
npx wrangler deploy
```

### Supabase 스키마
`supabase/migrations/` 폴더의 SQL을 **파일명 순서대로** Supabase SQL Editor에서 실행 (service_role 권한 필요, 이 저장소의 anon key로는 실행 불가). 모두 재실행해도 안전하게 작성되어 있음.

- `001_question_bank.sql` — `question_bank`: 커리큘럼 템플릿의 난이도별 사전 제작 문제 데이터셋 (수동 저술 후 삽입, 읽기 전용 공개)
- `002~007` — 학원용 선생님/학생 기능: `profiles`(역할) · `academies`/`academy_members`(학원, 1개만 시드) · `classes`/`class_members`(반, 초대코드) · `assignments`/`assignment_questions`/`assignment_submissions`(숙제·채점) · `submit_assignment` RPC(서버 측 채점, 오답 문항·학생 답 기록) · RLS 인가 강화 및 재귀 정책 수정

그 외 앱이 런타임에 자동으로 채우는 테이블(별도 마이그레이션 파일 없이 수기 생성됨, `docs/DEVELOPMENT_SUMMARY.md` 참고):
- `shared_content` — 템플릿+날짜별 커뮤니티 공유 콘텐츠 캐시
- `user_data` — 로그인 사용자별 학습 데이터 클라우드 백업

자세한 아키텍처는 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), 학원 기능 설계는 [`docs/planning_document_teacher_student_mode.md`](docs/planning_document_teacher_student_mode.md) 참고.
