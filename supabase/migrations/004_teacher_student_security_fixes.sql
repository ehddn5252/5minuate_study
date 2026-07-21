-- 코드리뷰에서 발견된 인가(authorization) 허점 수정 (002/003 실행 후 실행하세요)
--
-- 문제 1: classes/assignments의 INSERT 정책이 "auth.uid() = teacher_id"만 확인해서,
--   자기 자신을 teacher_id로 넣기만 하면 (a) 학원에 가입 안 한 사람이 반을 만들거나
--   (b) 반의 학생이 그 반에 가짜 "숙제"를 만들어 넣을 수 있었다(진짜 선생님 목록에는 안 보임).
--   academy_id/class_id 소유권을 실제로 확인하도록 WITH CHECK를 강화한다.

drop policy if exists "classes_teacher_all" on classes;
create policy "classes_teacher_all" on classes for all
  using (auth.uid() = teacher_id)
  with check (
    auth.uid() = teacher_id
    and exists (select 1 from academy_members m where m.academy_id = classes.academy_id and m.teacher_id = auth.uid())
  );

drop policy if exists "assignments_teacher_all" on assignments;
create policy "assignments_teacher_all" on assignments for all
  using (auth.uid() = teacher_id)
  with check (
    auth.uid() = teacher_id
    and exists (select 1 from classes c where c.id = assignments.class_id and c.teacher_id = auth.uid())
  );

-- 문제 2: assignment_submissions에 학생이 직접 insert/update할 수 있었는데, RLS는
--   "auth.uid() = student_id"만 볼 뿐 점수(score)나 반 소속 여부는 전혀 검증하지 않아,
--   브라우저 콘솔에서 임의의 점수로 제출을 조작할 수 있었다. 클라이언트 직접 쓰기를 막고
--   서버에서 실제 정답과 대조해 채점하는 RPC(submit_assignment)로만 기록하게 한다.

drop policy if exists "submissions_self_upsert" on assignment_submissions;
drop policy if exists "submissions_self_update" on assignment_submissions;
-- submissions_self_read(본인 제출 조회)와 submissions_teacher_read(담당 교사 조회)는 그대로 유지.

create or replace function submit_assignment(p_assignment_id uuid, p_answers text[])
returns table(score int, total int)
language plpgsql security definer set search_path = public as $$
declare
  v_class_id uuid;
  v_answers text[];
  v_score int := 0;
  v_total int;
  i int;
begin
  select class_id into v_class_id from assignments where id = p_assignment_id;
  if v_class_id is null then
    raise exception '숙제를 찾을 수 없어요.';
  end if;

  if not exists (
    select 1 from class_members where class_id = v_class_id and student_id = auth.uid()
  ) then
    raise exception '이 숙제에 접근할 권한이 없어요.';
  end if;

  select array_agg(answer order by order_index) into v_answers
  from assignment_questions where assignment_id = p_assignment_id;

  v_total := coalesce(array_length(v_answers, 1), 0);

  for i in 1..v_total loop
    if p_answers[i] is not null and trim(both from p_answers[i]) = trim(both from v_answers[i]) then
      v_score := v_score + 1;
    end if;
  end loop;

  insert into assignment_submissions (assignment_id, student_id, completed_at, score, total)
  values (p_assignment_id, auth.uid(), now(), v_score, v_total)
  on conflict (assignment_id, student_id)
  do update set completed_at = excluded.completed_at, score = excluded.score, total = excluded.total;

  return query select v_score, v_total;
end;
$$;
grant execute on function submit_assignment(uuid, text[]) to authenticated;
