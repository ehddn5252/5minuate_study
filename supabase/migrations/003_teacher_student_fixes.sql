-- Phase 1 구현 중 발견된 RLS 설계 보완 (002 실행 후에 실행하세요)
--
-- 1) class_members에 학생 이름 스냅샷 추가 — 교사가 완료 체크리스트에서 학생 이름을 봐야 하는데,
--    profiles 테이블은 본인 행만 읽을 수 있게 설계했으므로(교사가 학생 프로필을 못 읽음),
--    profiles RLS를 여는 대신 반 참여 시점에 이름을 class_members에 그대로 스냅샷한다.
alter table class_members add column if not exists student_name text;

-- 2) 초대 코드로 학원/반을 "찾는" 단계의 RLS 문제 해결.
--    academies_member_read/classes_member_read는 "이미 멤버인 사람만 읽기" 정책이라,
--    아직 멤버가 아닌 사람이 초대 코드로 조회하는 최초 참여 시점엔 항상 0건이 나와 참여 자체가 불가능했다.
--    테이블 전체를 열어주는 대신, 코드로 id만 돌려주는 좁은 RPC 함수로 우회한다(전체 목록 열람은 막힘).
create or replace function resolve_academy_invite(code text)
returns table(academy_id uuid, academy_name text)
language sql security definer set search_path = public as $$
  select id, name from academies where invite_code = code;
$$;
grant execute on function resolve_academy_invite(text) to authenticated;

create or replace function resolve_class_invite(code text)
returns table(class_id uuid, class_name text)
language sql security definer set search_path = public as $$
  select id, name from classes where invite_code = code;
$$;
grant execute on function resolve_class_invite(text) to authenticated;

-- 3) 학원은 당장 1개만 쓰기로 했으므로(002에서 이미 seed) 앱에서 새 학원을 만들 일이 없다.
--    "누구나 academies insert 가능" 정책은 쓰이지 않으면서 불필요하게 열려있던 구멍이라 제거한다.
drop policy if exists "academies_insert_self" on academies;
