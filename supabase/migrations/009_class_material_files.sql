-- 수업 자료(class_materials)에 파일 첨부(PDF·이미지 등) 1개를 붙일 수 있게 한다.
-- 저장 경로 규칙: "{class_id}/{파일명}" — storage.foldername(name)의 첫 세그먼트가 class_id가
-- 되도록 강제해서, 별도 조인 없이도 파일 하나하나의 소속 반을 RLS에서 바로 판별할 수 있게 한다.

alter table class_materials add column if not exists file_path text;
alter table class_materials add column if not exists file_name text;
alter table class_materials add column if not exists file_size int;

insert into storage.buckets (id, name, public)
values ('class-materials', 'class-materials', false)
on conflict (id) do nothing;

drop policy if exists "class_materials_files_teacher_write" on storage.objects;
create policy "class_materials_files_teacher_write"
on storage.objects for insert
with check (
  bucket_id = 'class-materials'
  and exists (
    select 1 from classes c
    where c.id::text = (storage.foldername(name))[1] and c.teacher_id = auth.uid()
  )
);

drop policy if exists "class_materials_files_teacher_delete" on storage.objects;
create policy "class_materials_files_teacher_delete"
on storage.objects for delete
using (
  bucket_id = 'class-materials'
  and exists (
    select 1 from classes c
    where c.id::text = (storage.foldername(name))[1] and c.teacher_id = auth.uid()
  )
);

-- 읽기: 그 반의 담당 교사이거나 소속 학생이면 다운로드(서명 URL 발급)를 위한 조회 가능
drop policy if exists "class_materials_files_read" on storage.objects;
create policy "class_materials_files_read"
on storage.objects for select
using (
  bucket_id = 'class-materials'
  and (
    exists (
      select 1 from classes c
      where c.id::text = (storage.foldername(name))[1] and c.teacher_id = auth.uid()
    )
    or exists (
      select 1 from class_members m
      where m.class_id::text = (storage.foldername(name))[1] and m.student_id = auth.uid()
    )
  )
);
