# 5분 학습 — 학원용 선생모드/학생모드 확장 기획 문서 v1.2

> 작성 주체: Planner(기획자) 에이전트
> 작성일: 2026-07-21 (v1.2: 열린 의사결정 전부 해소, 구현 착수 가능 상태)
> 기반: CEO 요청 원문(학원용 숙제 관리 확장) + 기존 코드베이스 조사
> 다음 단계: FO(기능 정의) → 개발자 에이전트로 전달, Phase 1(2-8절) 구현 시작. **이 문서는 계획까지만, 구현 없음.**

## v1.2 변경 요약 — 열린 의사결정 전부 해소

| 질문 | 결정 |
|---|---|
| 앱 분리 여부 | **기존 앱 내 역할 전환** (별도 앱 안 만듦) — 2-1절 설계 그대로 확정 |
| 학생 계정 발급 | **학생도 기존 Google 로그인 그대로 사용** — 2-3절 설계 그대로 확정, 이메일/비번 인증 추가 불필요 |
| 채점 결과 공개 범위 | **학생 본인에게도 즉시 공개** — 2-7절 반영 |
| 필기 공유 범위 | **같은 학원(조직) 내 모든 교사와 공유** — 원래 설계(반 단위 소유)에 없던 요구라 **`academies` 개념을 새로 추가**함 (2-2·2-4·2-5절) |
| 반/학원 규모 상한 | **학원은 당장 1개만 지원, 반 개수는 상한 없음** — 3절, 2-8절(Phase 1) 반영 |
| `user_data` 실제 RLS | **Supabase anon key로 실측 확인 완료** (인증 없이 조회 시 `[]`/200 — `auth.uid()=user_id` 패턴으로 잠겨 있음 확인) — 3절 |

이제 CEO 판단이 필요한 열린 항목은 없다. 구현 착수 가능.

---

## 0. CEO 요청 원문 (그대로 보존)

> "선생이 학생들의 진행 상황을 확인 및 숙제 검사를 할 수 있는 학원용 어플로 발전할 수 있게, 선생모드 학생모드로 만들어줘. 숙제 검사라는 것은 학생이 그날 해야할 숙제를 다 했는 지 확인할 수 있으면 좋을 것 같아. 첫번째는 학생들이, 선생님들 필기를 바탕으로 숙제를 하는 것이고 둘째로는 선생이 직접 낸 문제를 학생들이 풀게도 하고 싶어."

요구사항 3가지:
1. 선생모드/학생모드 구분 (역할 기반)
2. 숙제 검사: 오늘 학생이 숙제를 다 했는지 확인
3. 숙제 소스 (a) 선생님 필기 기반 AI 생성 숙제, (b) 선생님 직접 출제 문제

---

## 1. 코드 조사 결과 (실제 인용)

### 1-1. 인증 구조 — 역할(role) 개념 없음

`src/App.tsx`와 `src/services/supabase.ts`를 확인한 결과, 현재 구조는 **"Google OAuth 1계정 = 1인 개인 데이터셋"** 이 전제이며 역할 개념이 전혀 없다.

- `signInWithGoogle()` (`src/services/supabase.ts:8`)은 `provider: 'google'`만 지원. 이메일/비밀번호, 초대 기반 가입 경로 없음.
- `App.tsx`는 로그인 여부만 분기한다 (`if (!user) return <LoginScreen />;`). role 기반 라우팅·화면 분기가 전혀 없음.
- 로그인 성공 시 `migrateLocalToCloud(userId)` → `loadFromCloud(userId)` 순으로 **해당 유저 소유의 단일 blob**을 가져온다. 다른 유저의 데이터를 읽는 경로 자체가 코드에 존재하지 않는다.
- **SSoT(진실의 원천)는 localStorage**이고 Supabase `user_data`는 2초 디바운스 백업/동기화일 뿐이다 (`src/utils/storage.ts`의 `setItem()`이 `window.dispatchEvent(new Event('storage-sync'))`를 쏘면 `App.tsx`의 `scheduleSyncIfLoggedIn`이 받아 `syncToCloud`). 즉 **한 브라우저 세션의 로컬 변경이 실시간으로 서버에 반영되는 것이 아니라 지연 반영**이며, 다른 사람이 그 사람 데이터를 실시간으로 들여다볼 수 있는 경로가 애초에 없다.

→ 이 세 가지가 "선생이 학생 진행상황을 본다"는 요구사항과 정면으로 부딪히는 지점이다 (2장 설계 전체, 특히 2-4·2-7절에서 해소).

### 1-2. Supabase 스키마 — 확인 가능한 것과 불가능한 것

`supabase/migrations/001_question_bank.sql`만 저장소에 있고, `user_data`/`shared_content`의 실제 CREATE TABLE + RLS 정책은 **저장소에 없다** (Supabase 대시보드/SQL 에디터에서 수기 실행된 것으로 추정 — `docs/DEVELOPMENT_SUMMARY.md:151-168`에 `shared_content`용 SQL만 기록으로 남아있음). 확인된 것:

```sql
-- question_bank (실존 마이그레이션 파일, supabase/migrations/001_question_bank.sql)
create table if not exists question_bank (
  id uuid primary key default gen_random_uuid(),
  curriculum_id text not null, day_num int not null,
  difficulty text not null check (difficulty in ('beginner','intermediate','advanced')),
  topic text, question text not null,
  type text not null check (type in ('multiple_choice','short_answer')),
  options jsonb, answer text not null, explanation text not null,
  created_at timestamptz not null default now()
);
alter table question_bank enable row level security;
create policy "question_bank_public_read" on question_bank for select using (true);
-- insert/update/delete 정책 없음 → service_role만 쓰기 가능
```

```sql
-- shared_content (DEVELOPMENT_SUMMARY.md 기록, 실제 마이그레이션 파일은 없음)
CREATE TABLE shared_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL, template_id TEXT, topic TEXT NOT NULL, day_num INT NOT NULL,
  summary TEXT NOT NULL, quizzes JSONB NOT NULL, use_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE shared_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_can_read" ON shared_content FOR SELECT USING (true);
CREATE POLICY "anyone_can_insert" ON shared_content FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone_can_update" ON shared_content FOR UPDATE USING (true);
```

`user_data`의 RLS는 코드/문서 어디에도 없다. `syncToCloud`/`loadFromCloud`가 `.eq('user_id', userId)`로만 필터링하는 걸 보면 RLS는 사실상 표준 패턴(`auth.uid() = user_id`)일 것으로 **추정**되지만, 대시보드를 직접 확인하기 전엔 단정할 수 없다. **→ 3-5절 열린 질문에 포함.**

기존 RLS 패턴에서 관찰되는 두 갈래:
- `question_bank`: 전원 읽기 허용, 쓰기는 service_role 전용 (관리자가 사전 제작한 콘텐츠)
- `shared_content`: 전원 읽기·쓰기 허용 (신뢰 문제 없는 익명 캐시 풀)
- `user_data`(추정): 본인 행만 읽기/쓰기 (`auth.uid() = user_id`)

새로 추가할 교사-학생 테이블은 이 중 어느 패턴과도 다른 **"관계 기반 접근"**(교사는 자기 반 학생 데이터만, 학생은 자기 것만)이 필요하다 — 기존 3패턴에 없던 새로운 RLS 유형이므로 신중히 설계해야 한다 (2-3, 2-4절).

### 1-3. 핵심 데이터 모델 — "오늘 숙제 완료" 개념은 이미 존재한다

`src/types/index.ts`:
- `Session.status: 'pending' | 'in_progress' | 'completed'` (라인 2, 40)
- `Session.date`, `Session.goalId`, `Session.dailyQuizIds`, `Session.testQuizIds`, `Session.quizAnswers`, `Session.quizScore/quizTotal`

`src/utils/storage.ts:82-86`:
```ts
export function getTodaySession(goalId: string): Session | undefined {
  const today = new Date().toISOString().split('T')[0];
  const matches = getSessions().filter((s) => s.goalId === goalId && s.date === today);
  return matches[matches.length - 1];
}
```
그리고 `HomeScreen.tsx:65-66`: `const isDone = todaySession?.status === 'completed';`

→ **"오늘 숙제를 다 했는가"는 이미 `Session(goalId, date).status === 'completed'`로 정확히 표현되는 개념이다.** 새로 발명할 필요 없이 그대로 재사용 가능 — 단, 지금은 이 판단이 로컬(같은 브라우저)에서만 가능하고, 교사가 원격에서 조회할 방법이 없다는 게 갭이다.

`Goal`에는 `assignedBy` 같은 필드가 없다 (개인 목표만 전제). `GoalStatus`, `dailyPlan`, `summaryContent`, `quizPoolIds`, `level` 등은 그대로 "교사 배정 숙제"에도 재사용 가능한 형태다.

### 1-4. 콘텐츠 생성 파이프라인

- `src/services/gemini.ts`의 `generateGoalContent(goalId, topic, deadline, level, rawContent, ...)`은 **정확히 "필기(rawContent)를 근거자료로 AI 요약+퀴즈를 만드는" 함수**다 (라인 92-195, 프롬프트 라인 115: `${rawContent ? '참고 자료:\n' + rawContent : ''}`). `generateDailyContent`도 동일하게 `rawContent`를 받아 일자별 콘텐츠를 만든다.
- 결과는 `{ summary, quizPool: Quiz[] }` / `{ summary, quizzes: Quiz[] }` 형태로, `Quiz` 타입 그대로 저장 가능.
- `src/services/questionBank.ts`의 `fetchFromBank()`는 **사전 제작·검수된** 문제(관리자만 씀)를 조회하는 용도라 "선생님 직접 출제"와는 성격이 다르다 (선생님은 앱 관리자가 아니라 일반 로그인 유저이므로 `question_bank`의 service_role 전용 쓰기 정책을 그대로 쓸 수 없다).
- `src/services/contentPool.ts`의 `fetchFromPool`/`saveToPool`(`shared_content`, `cache_key = "t:{templateId}:d{dayNum}"`)은 **동일 템플릿을 쓰는 서로 다른 유저끼리 AI 생성 결과를 공유해 Gemini 호출을 줄이는 캐시**다. 이 패턴이 "선생님이 반 전체에 필기를 한 번 올리고 학생들이 나눠 쓰는" 시나리오와 구조적으로 가장 가깝다 — **재사용 가치가 크다** (2-5절에서 구체화).

### 1-5. Cloudflare Worker — 레이트리밋과 학원 시나리오의 충돌 가능성

`cloudflare_worker.js:14, 41-56`: `DAILY_LIMIT = 20`, 키는 `` `${ip}:${today}` `` — **IP 단위** 일 20회 제한.

충돌 지점:
- 학원 교실은 보통 **같은 공유 Wi-Fi(같은 공인 IP)**를 쓴다. 학생 20명이 각자 숙제를 열람할 때마다 Gemini를 새로 호출하면 반 전체가 하루 20회 한도를 순식간에 소진하고 이후 학생 전원이 429를 받는다.
- 반대로 "필기 1회 업로드 → 학생마다 개별 생성"을 안 하고 **"필기 1회 업로드 → Gemini 1회 호출 → 결과를 학원 전체가 공유"** 구조로 가면(=`shared_content` 캐시 패턴 재사용), (필기, 난이도) 조합당 Gemini 호출은 사실상 1회로 끝나 레이트리밋과 충돌하지 않는다. **→ 이것이 2-5절에서 채택하는 이유다.**
- 참고로 `DAILY_LIMIT`은 배포 시점에 존재하는 상수이며, 학원 규모가 커지면(여러 반이 동시에 새 필기 업로드) 이 20이라는 숫자 자체가 병목이 될 수 있다 — 열린 질문에 포함.

### 1-6. 기존 제품 원칙과 비목표 — 긴장 지점 명시

`docs/planning_document.md:112-121` "6. 범위 외(Non-goals)":
```
- 소셜 기능: 친구 공유, 랭킹, 그룹 스터디 등 타인과의 비교·경쟁 기능
- 커리큘럼 직접 판매: 콘텐츠 마켓플레이스, 강의 구독 등 플랫폼 비즈니스 모델
- 심층 분석 대시보드: 학습 패턴의 통계적 분석, 주간·월간 리포트 등 복잡한 인사이트 화면
- 오프라인 완전 지원
- 긴 학습 세션 최적화(30분~1시간)
- 자격증·시험별 특화 콘텐츠 제공
```
`docs/ceo_prompt.md`: 핵심 가치 = "목표를 절대 포기하지 않게 하기", 예산/플랫폼 제약 = **free**.
`docs/architecture_decision.md`: 1인 무료 유지보수 전제, Gemini Free Tier, 서버 없음(정적 호스팅) 원칙.

**긴장 지점 (반드시 CEO와 합의 필요):**

| 기존 비목표/원칙 | 교사-학생 기능 요구 | 긴장의 성격 |
|---|---|---|
| 소셜 기능 없음 (타인과 비교·경쟁 없음) | 교사가 **여러 학생을 나란히 비교**하는 화면이 필연적으로 필요 (누가 안 했는지 알려면 목록이 곧 비교) | **부분 충돌.** "경쟁/랭킹"이 아니라 "관리자 체크리스트"로 성격을 한정하면 회피 가능 — 개인 간 순위·점수 비교 UI는 만들지 않고 "완료 여부(O/X)"만 노출하는 선으로 제한할 것을 제안 (2-7절) |
| 심층 분석 대시보드 없음 | "학생 진행 상황 확인"은 본질적으로 대시보드 | **정면 충돌 가능성.** 통계·그래프·추세 분석까지 가면 비목표를 위반. 완료/미완료 체크리스트 수준으로 엄격히 제한해야 원칙 유지 가능 (2-7절에서 스코프 근거 명시) |
| 1인 무료 유지보수 | 교사-학생 연결, 반 관리, 과제 배정 UI 등은 스크린 수·복잡도가 크게 증가 | **직접 충돌.** 단계적 실행(phased scope, 2-7절)으로 완화 제안 |
| free 예산만 사용 | 반 전체 필기 기반 생성 시 Gemini 호출량 증가 우려 | 1-5절 분석대로 캐시 공유 구조면 완화 가능하나, 반 수가 늘면 재검토 필요 |
| "5분 완결" 원칙 | 교사의 문제 출제(저작) 작업 자체는 5분 넘게 걸릴 수 있음 | **범위 재해석 필요.** "5분 완결"은 학생의 학습 세션에 적용되는 원칙이지 교사의 관리 작업에는 적용 안 된다고 명시적으로 예외 처리 제안 |
| 오프라인 우선 없음 | 교사-학생 기능은 서버(Supabase) 의존이 필수이므로 오히려 이 비목표와는 상충 없음 (원래도 온라인 전제) | 충돌 없음 |

---

## 2. 설계

### 2-1. 역할 모델

**결정: 별도 `profiles` 테이블 신설, `user_data`는 건드리지 않는다.**

이유: `user_data`는 `upsert(payload)`로 **전체 blob을 통째로 덮어쓰는** 구조(`syncToCloud`)라 여기에 `role` 컬럼을 추가하면 매 동기화마다 role을 함께 실어날라야 하고, role 변경 시점과 동기화 타이밍이 꼬일 위험이 있다. role은 자주 안 바뀌는 계정 속성이므로 분리하는 게 안전하다.

```sql
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'teacher')),
  display_name text,
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy "profiles_self_read" on profiles for select using (auth.uid() = user_id);
create policy "profiles_self_upsert" on profiles for insert with check (auth.uid() = user_id);
-- update은 CEO 정책 확정 후 별도 결정 (역할을 유저 스스로 바꿀 수 있게 할지는 3-5절 열린 질문)
```

- 1인 1역할만 지원 (교사가 동시에 학생 역할을 갖는 케이스는 스코프 밖으로 명시 — 사용자 요구사항에도 없음).
- `App.tsx`의 로그인 후 분기에 `profiles.role` 조회를 추가해 `TeacherHomeScreen` vs 기존 `HomeScreen`(학생용, 그대로 유지)으로 라우팅.
- 기존 개인 사용자(현재 프로덕션 유저 전원)는 `profiles` 행이 없는 상태 → **`role` 미설정 시 기본값 `student`로 취급하고 UI상 아무 것도 안 보이게(교사 연결 안 된 상태)** 해서 기존 사용자 경험을 100% 보존한다. 이것이 "최소 침습적"의 핵심이다.

### 2-2. 학원(academy) — 교사 간 필기 공유의 단위 (v1.1 신규)

**CEO 결정: 필기(자료)는 반(class) 단위가 아니라 "같은 학원 내 모든 교사"와 공유한다.** 원래 설계(v1.0)는 필기 소유권을 반/교사 단위로만 짰는데, 이 결정 때문에 교사를 묶는 상위 조직 단위가 필요해졌다.

```sql
create table academies (
  id uuid primary key default gen_random_uuid(),
  name text not null,                -- 예: "○○학원"
  invite_code text unique not null,  -- 교사용 초대 코드(학원장이 발급, 6자리)
  created_at timestamptz not null default now()
);

create table academy_members (
  academy_id uuid not null references academies(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (academy_id, teacher_id)
);

alter table academies enable row level security;
alter table academy_members enable row level security;

-- 학원 소속 교사라면 누구나 학원 정보 읽기
create policy "academies_member_read" on academies for select
  using (exists (select 1 from academy_members m where m.academy_id = academies.id and m.teacher_id = auth.uid()));

-- 최초 학원 생성은 교사 본인이 owner로(별도 owner 개념 없이 첫 멤버 = 사실상 개설자)
create policy "academies_insert_self" on academies for insert with check (true);

create policy "academy_members_self_join" on academy_members for insert with check (auth.uid() = teacher_id);
create policy "academy_members_self_read" on academy_members for select using (auth.uid() = teacher_id);
```

흐름: 학원 최초 개설자(교사)가 학원 생성 → `invite_code` 발급 → 동료 교사에게 코드 공유 → 동료가 "학원 참여" 화면에서 코드 입력해 `academy_members`에 합류. 반(class)은 교사 개인 소유가 아니라 **학원에 귀속**시킨다(아래 2-3절).

### 2-3. 교사-학생 연결(반/클래스) — 초대 코드 방식

```sql
create table classes (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,  -- v1.1: 학원 귀속 추가
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,               -- 예: "중2 영문법반"
  invite_code text unique not null, -- 6자리 영숫자, 예: "7F3K9Q"
  created_at timestamptz not null default now(),
  archived boolean not null default false
);

create table class_members (
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

alter table classes enable row level security;
alter table class_members enable row level security;

-- 교사: 자기 반만 CRUD
create policy "classes_teacher_all" on classes for all
  using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);

-- 학생: 자기가 속한 반은 읽기만 (이름 확인용)
create policy "classes_member_read" on classes for select
  using (exists (select 1 from class_members m where m.class_id = classes.id and m.student_id = auth.uid()));

-- class_members: 교사는 자기 반 멤버 전체 CRUD, 학생은 초대코드로 자기 자신만 insert
create policy "members_teacher_all" on class_members for all
  using (exists (select 1 from classes c where c.id = class_members.class_id and c.teacher_id = auth.uid()))
  with check (exists (select 1 from classes c where c.id = class_members.class_id and c.teacher_id = auth.uid()));

create policy "members_self_join" on class_members for insert
  with check (auth.uid() = student_id);

create policy "members_self_read" on class_members for select
  using (auth.uid() = student_id);
```

흐름: 교사가 반 생성 → `invite_code` 자동 발급(6자리, 클라이언트에서 랜덤 생성 후 unique 충돌 시 재시도) → 학생에게 코드 공유(카톡 등 앱 밖) → 학생이 "반 참여" 화면에서 코드 입력 → `class_members`에 자기 자신을 insert (RLS가 `auth.uid() = student_id`만 허용하므로 다른 학생을 대신 등록 불가).

초대 코드 방식을 택한 이유: 이메일 초대 시스템(발신 서버, 스팸 처리)이나 학교 로스터 연동보다 무료 인프라로 압도적으로 단순하고, 학원 현장에서 이미 익숙한 UX(온라인 클래스 코드 입력)다.

### 2-4. 숙제 배정 데이터 모델 (v1.1: 필기를 `notes` 라이브러리로 분리)

**결정: `Goal`을 확장하지 않고, 새 테이블 `assignments`를 신설한다. 단, 학생 단말에서는 `assignments` → 로컬 `Goal`로 "투영(project)"해서 기존 학습 파이프라인(LearningScreen, TestScreen, Session)을 그대로 재사용한다.**

근거:
- `Goal`은 `activeGoalIds`(최대 5개, `GoalCreateScreen.tsx:24 MAX_ACTIVE_GOALS = 5`)라는 **개인 자기주도 목표 쿼터** 안에서 관리된다. 교사가 배정한 숙제까지 이 쿼터를 갉아먹으면 학생이 "내가 만든 목표"를 못 만들게 되는 부작용이 생긴다. 배정 숙제는 이 쿼터와 분리돼야 한다.
- `assignedBy: teacherId` 필드를 `Goal`에 얹는 안도 고려했으나, `Goal`은 오늘도 `user_data` blob으로 통째 동기화되는 **개인 소유 로컬 우선(local-first)** 구조라서, "교사가 이 Goal의 원본 콘텐츠를 수정하면 학생 전원의 로컬 Goal도 갱신돼야 한다"는 요구를 만족시키기 어렵다. 반면 `assignments`를 서버 SSoT로 두고 학생이 열람 시점에 동기화하면 이 문제가 없다.
- 기존 `Session`/`Quiz`/`getTodaySession()` 로직은 "완료 여부 판단" 인프라로 이미 완성돼 있으므로 **그대로 재사용**한다 — 새로 발명하지 않는다.
- **v1.1 변경**: v1.0에서는 필기(`raw_content`)를 `assignments`에 직접 저장했는데, "학원 내 모든 교사와 공유" 결정 때문에 필기를 `assignments`(반 소유)에서 분리해 `notes`(학원 소유) 테이블로 옮긴다. 교사 B가 교사 A의 필기를 재사용해 자기 반에 새 `assignments`를 만들 수 있게 된다.

```sql
-- 필기 라이브러리 — 학원 소속 교사 전원이 읽을 수 있음
create table notes (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,  -- 작성자
  title text not null,
  raw_content text not null,
  created_at timestamptz not null default now()
);
alter table notes enable row level security;
create policy "notes_academy_read" on notes for select
  using (exists (select 1 from academy_members m where m.academy_id = notes.academy_id and m.teacher_id = auth.uid()));
create policy "notes_author_write" on notes for insert with check (auth.uid() = teacher_id);
create policy "notes_author_update" on notes for update using (auth.uid() = teacher_id);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  title text not null,                 -- 예: "3과 부정사 정리"
  source_type text not null check (source_type in ('notes_ai', 'teacher_quiz')), -- 숙제 소스 A/B
  note_id uuid references notes(id),   -- 소스 A일 때만: 참조할 필기(자기 것이든 동료 교사 것이든)
  due_date date not null,              -- 오늘 숙제 판정 기준일
  target_student_ids uuid[],           -- null이면 반 전체, 아니면 특정 학생만
  created_at timestamptz not null default now()
);

-- 소스 A(필기 기반 AI 생성)의 생성 결과 — v1.1: assignment 단위가 아니라 (note, level) 단위로 캐시.
-- 같은 필기를 여러 교사가 여러 반에서 재사용해도 Gemini 호출은 (note_id, level) 조합당 1회로 끝남
-- (반 단위 공유였던 v1.0보다 캐시 재사용 범위가 학원 전체로 넓어져 Gemini 호출이 더 줄어드는 부수 효과가 있음).
create table note_content_cache (
  note_id uuid not null references notes(id) on delete cascade,
  level text not null check (level in ('beginner', 'intermediate', 'advanced')),
  summary text not null,
  quizzes jsonb not null,              -- SharedQuiz[] 형태 그대로 재사용
  generated_at timestamptz not null default now(),
  primary key (note_id, level)
);
alter table note_content_cache enable row level security;
create policy "note_content_academy_read" on note_content_cache for select
  using (exists (
    select 1 from notes n join academy_members m on m.academy_id = n.academy_id
    where n.id = note_content_cache.note_id and m.teacher_id = auth.uid()
  ));
-- insert는 학생 클라이언트가 최초 열람 시점에 쏘므로(2-5절), 학생도 쓸 수 있어야 함:
create policy "note_content_student_insert" on note_content_cache for insert
  with check (exists (
    select 1 from notes n join academy_members m on m.academy_id = n.academy_id
    where n.id = note_content_cache.note_id
    -- 학생은 academy_members가 아니라 assignments→classes→class_members 경로로 접근 권한 확인
    and exists (
      select 1 from assignments a join class_members cm on cm.class_id = a.class_id
      where a.note_id = n.id and cm.student_id = auth.uid()
    )
  ));

-- 소스 B(교사 직접 출제) — 문항 단위로 저장, Quiz 타입과 필드 1:1 대응
create table assignment_questions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  question text not null,
  type text not null check (type in ('multiple_choice', 'short_answer')),
  options jsonb,
  answer text not null,
  explanation text not null,
  order_index int not null default 0
);

-- 학생의 숙제 완료 신호 — 기존 user_data blob과 분리된 "가벼운 단일 행" 테이블.
-- 학생이 로컬에서 Session.status = 'completed'로 표시하는 순간, 이 테이블에도 upsert한다.
create table assignment_submissions (
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz,
  score int,                           -- quizScore (선택)
  total int,                           -- quizTotal (선택)
  primary key (assignment_id, student_id)
);

alter table assignments enable row level security;
alter table assignment_questions enable row level security;
alter table assignment_submissions enable row level security;

-- 교사: 자기 반 과제 전체 CRUD
create policy "assignments_teacher_all" on assignments for all
  using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);

-- 학생: 자기가 속한 반의 과제 조회만
create policy "assignments_member_read" on assignments for select
  using (exists (select 1 from class_members m where m.class_id = assignments.class_id and m.student_id = auth.uid()));

-- assignment_questions: 부모 assignment 접근 가능한 사람만 읽기, 교사만 쓰기 (note_content_cache의 RLS는 2-4절 참고)
create policy "questions_read" on assignment_questions for select
  using (exists (
    select 1 from assignments a join class_members m on m.class_id = a.class_id
    where a.id = assignment_questions.assignment_id and m.student_id = auth.uid()
  ) or exists (select 1 from assignments a where a.id = assignment_questions.assignment_id and a.teacher_id = auth.uid()));
create policy "questions_teacher_write" on assignment_questions for insert with check (
  exists (select 1 from assignments a where a.id = assignment_questions.assignment_id and a.teacher_id = auth.uid()));

-- 제출 기록: 학생은 자기 것만 쓰기/읽기, 교사는 자기 반 학생 것 읽기 전용
create policy "submissions_self_upsert" on assignment_submissions for insert
  with check (auth.uid() = student_id);
create policy "submissions_self_update" on assignment_submissions for update
  using (auth.uid() = student_id);
create policy "submissions_self_read" on assignment_submissions for select
  using (auth.uid() = student_id);
create policy "submissions_teacher_read" on assignment_submissions for select
  using (exists (
    select 1 from assignments a where a.id = assignment_submissions.assignment_id and a.teacher_id = auth.uid()
  ));
```

학생 단말 동작:
1. 로그인 시(기존 `App.tsx`의 로그인 흐름에 훅 추가) `assignments`를 `class_id in (내가 속한 반)` 조건으로 조회, 로컬에 아직 없는 것만 `Goal`로 변환해 저장(`source: 'assignment', assignmentId` 같은 참조만 로컬 `Goal`에 얹거나, 또는 화면 레벨에서 별도 "오늘의 숙제" 섹션으로 처리 — FO 단계에서 UI 시안과 함께 확정할 구현 세부사항).
2. 학생이 학습을 완료하면(기존 `TestScreen.tsx`가 `Session.status = 'completed'`로 저장하는 시점) 부가 훅으로 `assignment_submissions`에 `upsert({ assignment_id, student_id: userId, completed_at: now, score, total })`.
3. 이 호출은 `user_data`의 2초 디바운스 전체 동기화와 별개로, **완료 시점에 즉시 1회** 쏘면 된다 — 가벼운 단일 행 upsert라 비용 문제 없음.

### 2-5. 숙제 소스 A — 필기 기반 AI 생성 (Gemini 호출 최소화)

**결정: (필기, 난이도) 조합당 Gemini 호출 1회. `contentPool.ts`의 캐시-공유 패턴을 계승하되, v1.1에서는 공유 범위를 반(class)에서 학원(academy) 전체로 넓힌다.**

흐름:
1. 교사가 필기를 `notes`(2-4절, 학원 공유 라이브러리)에 저장 — 본인 것이든, 이미 동료 교사가 올려둔 `notes` 중 하나를 골라도 됨.
2. 교사가 그 `note_id`를 참조해 `assignments(source_type='notes_ai', note_id=...)` 생성 (반마다 별도 assignment, 필기 원문은 공유).
3. **그 학원에서 그 필기+난이도 조합을 처음 여는 학생**이 열람하는 시점에 `note_content_cache(note_id, level)`를 조회 → 없으면 그 학생의 클라이언트가 기존 `generateGoalContent(noteId, title, dueDate, level, rawContent)` (`src/services/gemini.ts:92`)를 그대로 호출해 `{ summary, quizPool }`을 받고, `note_content_cache`에 insert.
4. 이후에는 같은 학원의 **다른 반, 다른 교사가 배정한 assignment라도** 같은 `note_id`+`level`이면 캐시를 그대로 읽기만 함 (Gemini 재호출 없음) — `contentPool.fetchFromPool`/`saveToPool`과 동일한 "최초 1명이 생성, 나머지는 캐시 히트" 패턴을 학원 단위로 확장한 것.
5. 경합 조건(여러 학생이 동시에 최초 열람): `note_content_cache`가 `(note_id, level)` PK이므로 두 번째 insert는 실패하고 조용히 무시(`saveToPool`처럼 try/catch로 삼킴) — 최대 2~3회 정도의 낭비 호출만 허용.
6. 대안으로 "교사가 과제 생성 시점에 미리 Gemini를 호출해 콘텐츠를 즉시 만들어둔다"도 가능하나, 교사가 만든 즉시 학생이 안 볼 수도 있어(숙제 예약) **지연 생성(lazy, 최초 열람 시)** 쪽이 낭비가 적다고 판단.

이렇게 하면 학원 전체에서 필기 1건당 (난이도별) Gemini 호출은 최대 3회(초/중/고급)로 끝나 1-5절에서 지적한 "같은 IP에서 N명이 각자 호출해 레이트리밋 소진" 문제를 원천 차단하고, v1.0(반 단위 공유)보다도 호출 수를 더 아낀다.

### 2-6. 숙제 소스 B — 교사 직접 출제

**최소 기능: 구조화 폼 (자유 텍스트 파싱 아님).**

이유: 자유 텍스트를 AI로 파싱해 구조화하면 다시 Gemini 호출과 파싱 오류 리스크가 생긴다. 교사가 직접 문제/보기/정답/해설을 입력하는 **단순 반복 입력 폼**이 가장 안전하고 무료다.

- 화면: `TeacherQuestionEditorScreen` — 문항 추가 버튼으로 `{ question, type: MC|SA, options[4]?, answer, explanation }` 반복 입력. `Quiz`/`SharedQuiz` 타입(`src/types/index.ts:52-71, 93-99`)과 완전히 동일한 필드 구성이라 **기존 `sanitizeQuizzes()` 검증 유틸(`src/utils/quizValidation.ts`, 이미 정답-선택지 정합성 검사에 쓰이는 함수)을 그대로 재사용**해 교사가 잘못 입력한 문항(정답이 보기에 없는 등)을 저장 전에 걸러낼 수 있다.
- 저장: `assignment_questions`에 문항별 insert. AI 요약(`summary`)은 없음 — 소스 B는 "선생님이 이미 요약을 준 것"이므로 퀴즈만 존재.
- 학생 화면: 기존 `TestScreen.tsx` 흐름을 그대로 태워서 풀게 한다 (문항 소스만 `assignment_questions`로 바뀔 뿐 UI/채점 로직은 동일하게 재사용).

### 2-7. 숙제 검사(완료 확인) 대시보드 — 범위를 의도적으로 좁힌다

**설계: 반 목록 → 반 클릭 → 학생별 O/X 체크리스트. 그 이상은 만들지 않는다.**

```
TeacherHomeScreen (/teacher)
  └─ 반 목록 (classes where teacher_id = me)
        └─ ClassDetailScreen (/teacher/classes/:classId)
              ├─ 오늘 배정된 과제 목록 (assignments where class_id, due_date = today)
              └─ 학생별 완료표 (class_members × assignments, LEFT JOIN assignment_submissions)
                    예: 김민준  ✅ 완료 (18:42)
                        이서연  ❌ 미완료
                        박지호  ⏳ 진행중 (문제 3/8)
```

쿼리 형태(개념): `class_members`를 기준으로 `assignment_submissions`를 LEFT JOIN해서 `completed_at is null` → 미완료로 렌더. 통계·그래프·정답률 추이·주간 리포트는 **의도적으로 만들지 않는다.**

**비목표("심층 분석 대시보드 없음")와 충돌하지 않는 근거:**
- "심층 분석"은 통계적 패턴 분석(주간 추이, 정답률 그래프, 학습 시간 분포 등)을 가리키고, 여기서 만드는 건 **오늘 하루의 이진 상태(했다/안 했다)를 나열하는 체크리스트**뿐이다 — 이건 "분석"이 아니라 "출석부"에 가깝다.
- **v1.1 결정**: 점수(`score/total`)는 교사 대시보드뿐 아니라 **학생 본인에게도 즉시 노출**한다(CEO 확정) — `SessionCompleteScreen.tsx`가 이미 개인 학습에서 `quizScore/quizTotal`을 보여주는 것과 동일한 방식을 그대로 쓰면 되고, 별도 "채점 대기/공개" 상태값은 만들지 않는다(Phase 1 스코프 밖). 그래프/추이 노출은 여전히 명시적으로 제외.
- "타인과 비교" 비목표와는: 학생 관점에서는 서로의 완료 여부/점수를 볼 수 없다(오직 교사와 본인만 본다), 그리고 학생 화면에 반 등수·순위는 절대 노출하지 않는다(교사 화면 정렬은 이름순/미완료 우선 정도) — 이 제약을 지키면 소셜 비교 기능이 아니라 "관리 도구 + 개인 피드백"으로 성격이 유지된다.

### 2-8. 단계적 실행 범위 (Phased Scope)

1인 무료 유지보수 제약을 고려해 전체를 한 번에 만들지 않는다.

**Phase 1 (MVP) — "선생님이 확인만 할 수 있게"**
- `profiles`(role), `classes`, `class_members`(초대 코드 참여만)
- `academies`는 학원이 **1개뿐**이므로(CEO 확정) "학원 생성" UI는 만들지 않고 SQL로 행 1개만 미리 심어둔다. `academy_members`(교사가 그 학원에 합류하는 초대 코드 화면)만 최소 구현
- Phase 1 시점엔 반이 아직 다 이 학원 하나에만 귀속되므로, `notes`(2-4절) 공유 범위 계산도 사실상 "전체 교사"와 동일하게 단순해짐
- 숙제 소스 B(교사 직접 출제)만 먼저 — AI 파이프라인 안 건드리고 순수 CRUD + 기존 TestScreen 재사용이라 리스크가 가장 낮음
- `assignment_submissions` + 완료 체크리스트 대시보드 (학생 본인에게도 점수 즉시 노출)
- 소스 A(필기 기반 AI 생성)는 Phase 2로 미룸 — `notes`/`note_content_cache` 캐시 공유 로직(2-5절)이 별도 검증이 필요한 새 코드 경로이기 때문

**Phase 2 — "필기 기반 AI 숙제"**
- `notes`(학원 공유 필기 라이브러리) + `note_content_cache` + `generateGoalContent` 재사용 파이프라인
- 레이트리밋 실측 모니터링 (학원·반 수 증가 시 `DAILY_LIMIT` 재산정)

**Phase 3 (선택, CEO 판단 후) — 편의 기능**
- 특정 학생만 배정(`target_student_ids`), 마감 임박 알림(기존 `notification.ts` 재사용), 반별/학원별 초대 코드 재발급·만료

의도적으로 뒤로 미루는 것: 학생 개별 성적 그래프, 학부모 계정, 다중 역할(한 사람이 교사+학생 동시), 학원 간 필기 공유(학원 경계 밖으로는 공유 안 함).

---

## 3. CEO에게 확인받아야 할 열린 의사결정 — 전부 해소됨 (v1.2)

- **반/학원 규모 상한 (CEO 확정)**: 당장은 **학원 1개만 지원**하는 걸 전제로 만든다 (다중 학원 온보딩 UI는 이번 스코프에서 제외 — `academies` 테이블 자체는 미래 확장을 위해 남겨두되, 학원 선택/전환 UI는 안 만듦). **반(class) 개수는 상한 없음.** 그만큼 `DAILY_LIMIT=20`(IP당 일 20회) 병목 위험도 줄어든다 — 학원이 하나뿐이면 어차피 필기+난이도 조합 수만큼만 Gemini를 부르고(2-5절), 학원이 여러 개로 늘어날 때만 문제가 되는 시나리오이기 때문.
- **`user_data` 실제 RLS 확인 → 실측 완료**: 대시보드 접근 없이도, Supabase anon key로 `user_data`를 인증 없이 직접 조회해봤다 — 결과 `[]`(0건), HTTP 200. 즉 권한 오류가 아니라 "조건에 맞는 행이 없다"는 응답이라 **RLS가 `auth.uid() = user_id`로 걸려 있고, 로그인 안 한 요청은 아무 것도 못 본다**는 게 실제로 확인됐다. 새 테이블(`profiles`/`academies`/`classes`/`assignments`/`notes` 등)도 전부 이 패턴(자기 것만, `auth.uid()` 기준)으로 일관되게 맞추면 된다.

---

## 4. 요약 — 왜 이 설계인가

- **기존 파이프라인 재사용이 핵심 원칙**: `Session.status`(완료 판정), `generateGoalContent`(필기 기반 생성), `Quiz`/`SharedQuiz` 타입, `sanitizeQuizzes`(검증), `contentPool`의 캐시 공유 패턴 — 전부 이미 있는 것을 새 문제에 재배선했을 뿐, 새로 발명한 개념은 `profiles`(role), `academies`/`academy_members`(학원), `classes`/`class_members`(반), `notes`/`note_content_cache`(공유 필기+캐시), `assignments`/`assignment_questions`/`assignment_submissions`(교사-학생 관계가 필요로 하는 최소 신규 테이블) 뿐이다.
- **`user_data` blob은 건드리지 않는다** — 기존 개인 사용자 100% 무영향, role/academy/class/assignment는 전부 별도 테이블.
- **레이트리밋은 "학원 단위 캐시 공유"로 회피** — 학생 수만큼, 반 수만큼 Gemini를 부르지 않고 (필기, 난이도) 조합당 1회로 끝낸다.
- **대시보드는 의도적으로 얕게, 그러나 학생 본인에게는 즉시 투명하게** — 교사용은 체크리스트 그 이상 가지 않아 "심층 분석 대시보드 없음" 비목표를 지키고, 학생 본인 점수 공개는 기존 개인 학습 경험(`SessionCompleteScreen`)과 일관되게 유지한다.
