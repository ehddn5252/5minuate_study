-- 앱 안에서 친구에게 학습(목표/세션/문제집)을 바로 보내는 기능.
-- 지금까지는 공유 링크를 만들어 클립보드에 복사 → 외부(카톡 등)로 전달하는 방법뿐이었다.
--
-- Supabase SQL 에디터에서 그대로 실행하세요. 여러 번 실행해도 안전합니다.
-- (017_friend_search_fix.sql을 먼저 실행해야 합니다 — friendships 테이블/정책 전제)

create table if not exists study_shares (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  -- social.ts의 StudyShareLinkPayload를 그대로 저장 (링크 공유와 동일 구조)
  payload jsonb not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table study_shares enable row level security;

-- 보내기: 본인이 sender이고, 받는 사람과 "수락된 친구" 사이일 때만
drop policy if exists "study_shares_insert" on study_shares;
create policy "study_shares_insert" on study_shares for insert
with check (
  sender_id = auth.uid()
  and recipient_id <> auth.uid()
  and exists (
    select 1 from friendships f
    where f.status = 'accepted'
      and ((f.user_id = auth.uid() and f.friend_id = recipient_id)
        or (f.friend_id = auth.uid() and f.user_id = recipient_id))
  )
);

-- 읽기: 받은 사람 또는 보낸 사람
drop policy if exists "study_shares_read" on study_shares;
create policy "study_shares_read" on study_shares for select
using (recipient_id = auth.uid() or sender_id = auth.uid());

-- 읽음 처리(read_at 갱신): 받은 사람만
drop policy if exists "study_shares_recipient_update" on study_shares;
create policy "study_shares_recipient_update" on study_shares for update
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

-- 삭제(받은함에서 지우기): 받은 사람 또는 보낸 사람
drop policy if exists "study_shares_delete" on study_shares;
create policy "study_shares_delete" on study_shares for delete
using (recipient_id = auth.uid() or sender_id = auth.uid());

create index if not exists study_shares_recipient_idx
  on study_shares (recipient_id, created_at desc);
