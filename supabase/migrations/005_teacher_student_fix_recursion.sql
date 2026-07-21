-- 42P17: infinite recursion detected in policy for relation "classes" 수정
--
-- 원인: classes의 정책(classes_member_read)이 class_members를 조회하고,
--   class_members의 정책(members_teacher_all)이 다시 classes를 조회해서 서로를 무한히 되묻는다.
--   (테이블에 .insert().select()로 RETURNING을 받을 때처럼, SELECT 정책까지 평가되는 시점에 드러남)
--
-- 해결: class_members 쪽의 "이 반 담당 교사인가?" 검사를 SECURITY DEFINER 함수로 옮긴다.
--   이 함수는 자신의 소유자 권한으로 classes를 조회하므로 classes의 RLS를 다시 평가하지 않고
--   끝나서, classes → class_members → (함수, RLS 재평가 없음) 에서 순환이 끊긴다.

create or replace function is_teacher_of_class(p_class_id uuid)
returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from classes where id = p_class_id and teacher_id = auth.uid());
$$;
grant execute on function is_teacher_of_class(uuid) to authenticated;

drop policy if exists "members_teacher_all" on class_members;
create policy "members_teacher_all" on class_members for all
  using (is_teacher_of_class(class_members.class_id))
  with check (is_teacher_of_class(class_members.class_id));
