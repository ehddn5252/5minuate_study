-- 친구 검색이 항상 0건이던 근본 원인 수정.
--
-- profiles 테이블의 select 정책(profiles_self_read)이 "auth.uid() = user_id"라서
-- 본인 행만 읽을 수 있었다. 앱의 친구 검색은 profiles를 display_name으로 직접
-- 조회하므로 RLS에 걸려 남을 절대 찾지 못했다. 016에서 만든 search_user_profiles
-- 함수도 security definer가 아니라 똑같이 막혀 있었다.
--
-- Supabase SQL 에디터에서 그대로 실행하세요. 여러 번 실행해도 안전합니다.

-- ── 1. 검색 함수를 security definer로 (남의 프로필을 이름으로 찾을 수 있게) ──
-- 전체 테이블을 여는 대신, 필요한 컬럼(user_id, display_name)만 돌려준다.
create or replace function public.search_user_profiles(p_query text)
returns table (user_id uuid, display_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.user_id, p.display_name
  from public.profiles p
  where p.user_id <> auth.uid()
    and p.display_name is not null
    and length(btrim(p_query)) >= 1
    and p.display_name ilike '%' || btrim(p_query) || '%'
  order by p.display_name
  limit 20;
$$;

grant execute on function public.search_user_profiles(text) to authenticated;

-- ── 2. 친구/요청 상대의 프로필 이름을 읽을 수 있게 ──
-- 친구 목록·요청 목록에서 상대 display_name을 보여주려면 그 행을 읽을 수 있어야 한다.
-- friendships에 나와 엮인(양방향 중 하나라도) 상대의 프로필만 열어준다.
drop policy if exists "profiles_friend_read" on profiles;
create policy "profiles_friend_read" on profiles for select
using (
  exists (
    select 1 from friendships f
    where (f.user_id = auth.uid() and f.friend_id = profiles.user_id)
       or (f.friend_id = auth.uid() and f.user_id = profiles.user_id)
  )
);

-- ── 3. 닉네임 중복 금지 (대소문자 무시) ──
-- 이 인덱스 생성이 "could not create unique index" 오류로 실패하면 이미 중복된
-- 닉네임이 있는 것이다. 아래 쿼리로 확인하고 정리한 뒤 다시 실행하세요:
--   select lower(display_name), count(*) from profiles
--   where display_name is not null group by 1 having count(*) > 1;
create unique index if not exists profiles_display_name_lower_key
  on profiles (lower(display_name))
  where display_name is not null;

-- ── 4. 친구 점수(리더보드)용 user_data 읽기 ──
-- user_data 테이블이 self-only RLS면 친구 점수가 전부 0으로 보인다.
-- 테이블이 있을 때만 친구 한정 읽기 정책을 추가한다.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'user_data') then
    execute 'drop policy if exists "user_data_friend_read" on public.user_data';
    execute $p$
      create policy "user_data_friend_read" on public.user_data for select
      using (
        exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and ((f.user_id = auth.uid() and f.friend_id = user_data.user_id)
              or (f.friend_id = auth.uid() and f.user_id = user_data.user_id))
        )
      )
    $p$;
  end if;
end $$;
