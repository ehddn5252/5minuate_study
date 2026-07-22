-- profiles에 UPDATE 정책이 없어서, 한 번 선생님이 되면 role을 다시 학생으로
-- 되돌릴 방법이 없었다(설정 화면에서 "학생 모드로 전환"을 누를 수 있게 하기 위한 선행 작업).
-- 본인 행만 수정 가능하도록 제한한다.

drop policy if exists "profiles_self_update" on profiles;
create policy "profiles_self_update" on profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
