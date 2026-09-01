-- "친구 수락에 실패했어요." 버그 수정.
--
-- 수락은 두 행을 만들어야 한다:
--   1) 상대→나 pending 행을 accepted로 (UPDATE)
--   2) 나→상대 accepted 행 (INSERT)
-- 그런데 앱은 이걸 upsert 배열로 한 번에 처리했고, friendships_self_insert 정책이
-- "auth.uid() = user_id"라서 1번 행(user_id = 상대)의 INSERT WITH CHECK에 걸린다.
-- ON CONFLICT DO UPDATE라도 Postgres는 제안된 행의 INSERT WITH CHECK를 먼저 검사하므로
-- 전체 구문이 실패한다.
--
-- 학원 기능(submit_assignment 등)과 같은 패턴으로 security definer RPC로 처리한다.
--
-- Supabase SQL 에디터에서 실행하세요. (016·017 먼저 실행 전제)

create or replace function public.accept_friend_request(p_requester uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  -- 나에게 온 pending 요청이 실제로 있어야만 수락 가능
  if not exists (
    select 1 from friendships
    where user_id = p_requester and friend_id = auth.uid() and status = 'pending'
  ) then
    raise exception 'no pending friend request from %', p_requester;
  end if;

  update friendships set status = 'accepted'
   where user_id = p_requester and friend_id = auth.uid();

  insert into friendships (user_id, friend_id, status)
  values (auth.uid(), p_requester, 'accepted')
  on conflict (user_id, friend_id) do update set status = 'accepted';
end;
$$;

grant execute on function public.accept_friend_request(uuid) to authenticated;
