-- 반(class)에 선생님이 수업 자료(텍스트)를 올리고, 그 반 학생들이 읽을 수 있게 한다.
-- classes/assignments 만들 때 겪었던 "auth.uid() = teacher_id만 확인해서 소유권 우회 가능" 문제를
-- 처음부터 피하기 위해 INSERT/UPDATE 시 반 소유권을 함께 확인한다.

create table if not exists class_materials (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table class_materials enable row level security;

drop policy if exists "materials_teacher_all" on class_materials;
create policy "materials_teacher_all" on class_materials for all
  using (auth.uid() = teacher_id)
  with check (
    auth.uid() = teacher_id
    and exists (select 1 from classes c where c.id = class_materials.class_id and c.teacher_id = auth.uid())
  );

-- 학생: 자기가 속한 반의 자료만 읽기
drop policy if exists "materials_member_read" on class_materials;
create policy "materials_member_read" on class_materials for select
  using (exists (
    select 1 from class_members m where m.class_id = class_materials.class_id and m.student_id = auth.uid()
  ));
