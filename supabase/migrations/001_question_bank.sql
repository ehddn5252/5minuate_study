-- question_bank: 난이도별 사전 제작 문제 데이터셋
-- Supabase SQL 에디터에서 직접 실행하세요 (service_role 권한 필요, anon key로는 실행 불가)

create table if not exists question_bank (
  id uuid primary key default gen_random_uuid(),
  curriculum_id text not null,
  day_num int not null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  topic text,
  question text not null,
  type text not null check (type in ('multiple_choice', 'short_answer')),
  options jsonb,
  answer text not null,
  explanation text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_question_bank_lookup
  on question_bank (curriculum_id, day_num, difficulty);

alter table question_bank enable row level security;

-- 읽기는 누구나 가능 (앱이 anon key로 조회)
drop policy if exists "question_bank_public_read" on question_bank;
create policy "question_bank_public_read"
  on question_bank for select
  using (true);

-- insert/update/delete 정책 없음 → service_role(대시보드, SQL 에디터)만 쓰기 가능
