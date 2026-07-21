-- 교사가 "학생이 뭘 골라서 틀렸는지"까지 볼 수 있게, 제출한 답 전체(문항 순서대로)를
-- assignment_submissions에 저장한다. wrong_indexes와 조합하면 오답 문항에서
-- "학생 답: OOO / 정답: XXX"를 보여줄 수 있다.

alter table assignment_submissions add column if not exists answers text[];

create or replace function submit_assignment(p_assignment_id uuid, p_answers text[])
returns table(score int, total int)
language plpgsql security definer set search_path = public as $$
declare
  v_class_id uuid;
  v_answers text[];
  v_score int := 0;
  v_total int;
  v_wrong int[] := '{}';
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
