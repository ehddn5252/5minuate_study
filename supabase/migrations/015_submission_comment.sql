-- F-62: 선생님이 학생 제출물에 짧은 코멘트를 남길 수 있게 한다. 학생은 이미 자기 제출 기록에
-- select 권한이 있으므로(submissions_self_read, 002) 코멘트도 자동으로 함께 보인다.
-- teacher_comment 컬럼에 직접 update 권한을 주면 같은 행의 score/answers까지 함께 열리므로
-- (011의 submit_assignment와 같은 이유로), RPC로 코멘트 컬럼만 딱 집어 갱신하게 제한한다.
alter table assignment_submissions add column if not exists teacher_comment text;

create or replace function set_submission_comment(p_submission_id uuid, p_comment text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_teacher_id uuid;
begin
  select a.teacher_id into v_teacher_id
  from assignment_submissions s
  join assignments a on a.id = s.assignment_id
  where s.id = p_submission_id;

  if v_teacher_id is null or v_teacher_id <> auth.uid() then
    raise exception '이 제출물에 코멘트를 남길 권한이 없어요.';
  end if;

  update assignment_submissions set teacher_comment = p_comment where id = p_submission_id;
end;
$$;
grant execute on function set_submission_comment(uuid, text) to authenticated;
