-- 반(class)에 선생님이 시간에 민감한 짧은 공지(예: "내일 휴강")를 올리고, 그 반
-- 학생들이 읽을 수 있게 한다. class_materials(008)와 같은 소유권 확인 패턴을 그대로 따른다.

create table if not exists class_announcements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table class_announcements enable row level security;

drop policy if exists "announcements_teacher_all" on class_announcements;
create policy "announcements_teacher_all" on class_announcements for all
  using (auth.uid() = teacher_id)
  with check (
    auth.uid() = teacher_id
    and exists (select 1 from classes c where c.id = class_announcements.class_id and c.teacher_id = auth.uid())
  );

-- 학생: 자기가 속한 반의 공지만 읽기
drop policy if exists "announcements_member_read" on class_announcements;
create policy "announcements_member_read" on class_announcements for select
  using (exists (
    select 1 from class_members m where m.class_id = class_announcements.class_id and m.student_id = auth.uid()
  ));
