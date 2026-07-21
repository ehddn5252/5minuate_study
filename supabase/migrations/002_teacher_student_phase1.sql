-- 학원용 선생모드/학생모드 Phase 1 (docs/planning_document_teacher_student_mode.md 참고)
-- Supabase SQL 에디터에서 직접 실행하세요 (service_role 권한 필요, anon key로는 실행 불가)
-- Phase 2(notes/note_content_cache, 필기 기반 AI 숙제)는 이번엔 만들지 않음
--
-- 이 파일은 여러 번 실행해도 안전합니다(테이블은 if not exists, 정책은 drop 후 재생성).

-- ── 1. 역할 ──────────────────────────────────────────────
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'teacher')),
  display_name text,
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;
drop policy if exists "profiles_self_read" on profiles;
create policy "profiles_self_read" on profiles for select using (auth.uid() = user_id);
drop policy if exists "profiles_self_upsert" on profiles;
create policy "profiles_self_upsert" on profiles for insert with check (auth.uid() = user_id);

-- ── 2. 학원 (당장 1개만 사용 — 아래 seed 참고) ──────────────
create table if not exists academies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists academy_members (
  academy_id uuid not null references academies(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (academy_id, teacher_id)
);

alter table academies enable row level security;
alter table academy_members enable row level security;

drop policy if exists "academies_member_read" on academies;
create policy "academies_member_read" on academies for select
  using (exists (select 1 from academy_members m where m.academy_id = academies.id and m.teacher_id = auth.uid()));
-- academies_insert_self는 004에서 제거됨(의도적) — 여기서 다시 만들지 않는다.

drop policy if exists "academy_members_self_join" on academy_members;
create policy "academy_members_self_join" on academy_members for insert with check (auth.uid() = teacher_id);
drop policy if exists "academy_members_self_read" on academy_members;
create policy "academy_members_self_read" on academy_members for select using (auth.uid() = teacher_id);

-- 학원 1개 시드 — invite_code는 원하는 값으로 바꿔서 실행해도 됨 (교사가 앱에서 "학원 참여"할 때 입력)
insert into academies (name, invite_code) values ('우리 학원', 'ACADEMY1')
on conflict (invite_code) do nothing;

-- ── 3. 반(class) ─────────────────────────────────────────
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  invite_code text unique not null,
  created_at timestamptz not null default now(),
  archived boolean not null default false
);

create table if not exists class_members (
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

alter table classes enable row level security;
alter table class_members enable row level security;

-- classes_teacher_all은 004에서 학원 소속 검증이 추가된 버전으로 다시 만들어지므로 여기선 건드리지 않음
drop policy if exists "classes_teacher_all" on classes;
create policy "classes_teacher_all" on classes for all
  using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);
drop policy if exists "classes_member_read" on classes;
create policy "classes_member_read" on classes for select
  using (exists (select 1 from class_members m where m.class_id = classes.id and m.student_id = auth.uid()));

drop policy if exists "members_teacher_all" on class_members;
create policy "members_teacher_all" on class_members for all
  using (exists (select 1 from classes c where c.id = class_members.class_id and c.teacher_id = auth.uid()))
  with check (exists (select 1 from classes c where c.id = class_members.class_id and c.teacher_id = auth.uid()));
drop policy if exists "members_self_join" on class_members;
create policy "members_self_join" on class_members for insert with check (auth.uid() = student_id);
drop policy if exists "members_self_read" on class_members;
create policy "members_self_read" on class_members for select using (auth.uid() = student_id);

-- ── 4. 숙제(과제) — Phase 1은 source_type='teacher_quiz'(직접 출제)만 사용 ──
create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_type text not null check (source_type in ('notes_ai', 'teacher_quiz')),
  note_id uuid, -- Phase 2(notes 테이블)에서 사용, Phase 1에서는 항상 null
  due_date date not null,
  target_student_ids uuid[],
  created_at timestamptz not null default now()
);

create table if not exists assignment_questions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  question text not null,
  type text not null check (type in ('multiple_choice', 'short_answer')),
  options jsonb,
  answer text not null,
  explanation text not null,
  order_index int not null default 0
);

create table if not exists assignment_submissions (
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz,
  score int,
  total int,
  primary key (assignment_id, student_id)
);

alter table assignments enable row level security;
alter table assignment_questions enable row level security;
alter table assignment_submissions enable row level security;

-- assignments_teacher_all은 004에서 반 소유권 검증이 추가된 버전으로 다시 만들어지므로 여기선 건드리지 않음
drop policy if exists "assignments_teacher_all" on assignments;
create policy "assignments_teacher_all" on assignments for all
  using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);
drop policy if exists "assignments_member_read" on assignments;
create policy "assignments_member_read" on assignments for select
  using (exists (select 1 from class_members m where m.class_id = assignments.class_id and m.student_id = auth.uid()));

drop policy if exists "questions_read" on assignment_questions;
create policy "questions_read" on assignment_questions for select
  using (exists (
    select 1 from assignments a join class_members m on m.class_id = a.class_id
    where a.id = assignment_questions.assignment_id and m.student_id = auth.uid()
  ) or exists (select 1 from assignments a where a.id = assignment_questions.assignment_id and a.teacher_id = auth.uid()));
drop policy if exists "questions_teacher_write" on assignment_questions;
create policy "questions_teacher_write" on assignment_questions for insert with check (
  exists (select 1 from assignments a where a.id = assignment_questions.assignment_id and a.teacher_id = auth.uid()));

-- submissions_self_upsert/self_update는 004에서 제거됨(의도적, RPC로만 쓰게 함) — 여기서 다시 만들지 않는다.
drop policy if exists "submissions_self_read" on assignment_submissions;
create policy "submissions_self_read" on assignment_submissions for select using (auth.uid() = student_id);
drop policy if exists "submissions_teacher_read" on assignment_submissions;
create policy "submissions_teacher_read" on assignment_submissions for select
  using (exists (
    select 1 from assignments a where a.id = assignment_submissions.assignment_id and a.teacher_id = auth.uid()
  ));
