-- assignments.target_student_ids는 이미 스키마엔 있었지만(002) RLS/RPC가 이를 전혀
-- 확인하지 않아서, 특정 학생에게만 낸 숙제라도 같은 반 다른 학생이 assignment_id만 알면
-- (URL 직접 접근 등으로) 읽고 풀 수 있는 허점이 있었다. 세 곳 모두 대상 지정을 확인하도록 고친다.

drop policy if exists "assignments_member_read" on assignments;
create policy "assignments_member_read" on assignments for select
  using (
    exists (select 1 from class_members m where m.class_id = assignments.class_id and m.student_id = auth.uid())
    and (target_student_ids is null or auth.uid() = any(target_student_ids))
  );

drop policy if exists "questions_read" on assignment_questions;
create policy "questions_read" on assignment_questions for select
  using (
    exists (
      select 1 from assignments a join class_members m on m.class_id = a.class_id
      where a.id = assignment_questions.assignment_id
      and m.student_id = auth.uid()
      and (a.target_student_ids is null or auth.uid() = any(a.target_student_ids))
    )
    or exists (select 1 from assignments a where a.id = assignment_questions.assignment_id and a.teacher_id = auth.uid())
  );

create or replace function submit_assignment(p_assignment_id uuid, p_answers text[])
returns table(score int, total int)
language plpgsql security definer set search_path = public as $$
declare
  v_class_id uuid;
  v_target_ids uuid[];
  v_answers text[];
  v_score int := 0;
  v_total int;
  v_wrong int[] := '{}';
  i int;
begin
  select class_id, target_student_ids into v_class_id, v_target_ids from assignments where id = p_assignment_id;
  if v_class_id is null then
    raise exception '숙제를 찾을 수 없어요.';
  end if;

  if not exists (
    select 1 from class_members where class_id = v_class_id and student_id = auth.uid()
  ) then
    raise exception '이 숙제에 접근할 권한이 없어요.';
  end if;

  if v_target_ids is not null and not (auth.uid() = any(v_target_ids)) then
    raise exception '이 숙제에 접근할 권한이 없어요.';
  end if;

  select array_agg(answer order by order_index) into v_answers
  from assignment_questions where assignment_id = p_assignment_id;

  v_total := coalesce(array_length(v_answers, 1), 0);

  for i in 1..v_total loop
    if p_answers[i] is not null and trim(both from p_answers[i]) = trim(both from v_answers[i]) then
      v_score := v_score + 1;
    else
      v_wrong := array_append(v_wrong, i - 1);
    end if;
  end loop;

  insert into assignment_submissions (assignment_id, student_id, completed_at, score, total, wrong_indexes, answers)
  values (p_assignment_id, auth.uid(), now(), v_score, v_total, v_wrong, p_answers)
  on conflict (assignment_id, student_id)
  do update set
    completed_at = excluded.completed_at,
    score = excluded.score,
    total = excluded.total,
    wrong_indexes = excluded.wrong_indexes,
    answers = excluded.answers;

  return query select v_score, v_total;
end;
$$;
grant execute on function submit_assignment(uuid, text[]) to authenticated;
