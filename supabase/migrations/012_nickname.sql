-- 닉네임을 바꾸면 이미 참여 중인 반들의 표시 이름(class_members.student_name)도 같이
-- 갱신되게 한다. class_members에 학생 self-UPDATE 정책을 여는 대신, 본인 student_name만
-- 정확히 건드리는 좁은 함수로 처리해서 class_id를 바꿔치기해(초대 코드 없이) 다른 반으로
-- 옮겨 들어가는 우회로가 생기지 않게 한다.

create or replace function sync_my_display_name(p_name text)
returns void
language sql security definer set search_path = public as $$
  update class_members set student_name = p_name where student_id = auth.uid();
$$;
grant execute on function sync_my_display_name(text) to authenticated;
