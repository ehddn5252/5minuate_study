-- 사용자가 question_bank(직접 저술한 사전 제작 문제집) 문제를 "잘못됐다"고 신고하면
-- 즉시 삭제하지 않고 이 테이블에 쌓아둔다. 한 사람 판단만으로 검토된 콘텐츠를 바로
-- 지우는 건 리스크가 있어서, 신고는 검토 대기열로만 쓰고 실제 수정/삭제는 Supabase
-- SQL 에디터에서 직접 확인 후 처리한다.

create table if not exists question_bank_reports (
  id uuid primary key default gen_random_uuid(),
  question_bank_id uuid not null references question_bank(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

alter table question_bank_reports enable row level security;

-- 로그인한 사용자는 본인 명의로만 제보를 남길 수 있다(insert만, select/update/delete 정책
-- 없음 — 검토는 관리자가 대시보드/SQL 에디터에서 직접 확인).
drop policy if exists "reports_insert_own" on question_bank_reports;
create policy "reports_insert_own" on question_bank_reports for insert
  with check (auth.uid() = reporter_id);
