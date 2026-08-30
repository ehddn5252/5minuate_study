create table if not exists friendships (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('accepted', 'pending')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

alter table friendships enable row level security;

-- 친구 요청은 요청자 기준으로 저장됨
-- 수락은 기존 pending row를 accepted로 바꾸거나, 양방향 accepted row를 upsert 하도록 앱에서 사용
create policy "friendships_self_read" on friendships
for select using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "friendships_self_insert" on friendships
for insert with check (auth.uid() = user_id and auth.uid() <> friend_id);

create policy "friendships_self_update" on friendships
for update using (auth.uid() = user_id or auth.uid() = friend_id)
with check (auth.uid() = user_id or auth.uid() = friend_id);

create policy "friendships_self_delete" on friendships
for delete using (auth.uid() = user_id or auth.uid() = friend_id);

create or replace view public.friendships_visible as
select
  user_id,
  friend_id,
  status,
  created_at
from public.friendships
where auth.uid() = user_id or auth.uid() = friend_id;

grant select on public.friendships_visible to authenticated;

create or replace function public.search_user_profiles(p_query text)
returns table (user_id uuid, display_name text)
language sql
stable
as $$
  select p.user_id, p.display_name
  from public.profiles p
  where p.user_id <> auth.uid()
    and p.display_name is not null
    and p.display_name ilike '%' || p_query || '%'
  order by p.display_name
  limit 10;
$$;

grant execute on function public.search_user_profiles(text) to authenticated;
