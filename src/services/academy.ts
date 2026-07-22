import { supabase } from './supabase';
import type { QuizType, SharedQuiz } from '../types';

export type UserRole = 'student' | 'teacher';

function myDisplayName(user: { user_metadata?: Record<string, unknown>; email?: string }): string {
  const meta = user.user_metadata ?? {};
  return (meta.full_name as string) || (meta.name as string) || user.email || '이름 없음';
}

// 혼동되는 0/O/1/I 제외
const INVITE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)];
  return code;
}

export async function fetchMyRole(): Promise<UserRole> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'student';
  const { data } = await supabase.from('profiles').select('role').eq('user_id', user.id).maybeSingle();
  return (data?.role as UserRole) ?? 'student';
}

// profiles 행이 있으면 role만 갱신, 없으면 새로 만든다 — 선생님↔학생 화면 전환에 사용.
// academy_members(학원 소속)는 건드리지 않으므로 학생 모드로 바꿔도 소속은 그대로 남아
// 나중에 초대 코드를 다시 입력할 필요 없이 다시 선생님 모드로 돌아올 수 있다.
export async function setRole(role: UserRole): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요해요.' };

  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: user.id, role, display_name: myDisplayName(user) }, { onConflict: 'user_id' });
  if (error) return { error: '역할 변경에 실패했어요.' };
  return {};
}

// 이미 학원에 참여한 선생님인지(설정 화면에서 "선생님 시작하기"를 또 보여줄지 판단용)
export async function getMyAcademyName(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('academy_members')
    .select('academies(name)')
    .eq('teacher_id', user.id)
    .maybeSingle();
  // supabase-js는 타입 생성 없이는 임베드 관계를 항상 배열로 추론하지만, 실제로는
  // academy_members→academies가 다대일이라 런타임엔 단일 객체로 오기도 한다 — 둘 다 대응.
  const raw = data?.academies as { name: string } | { name: string }[] | null | undefined;
  const academy = Array.isArray(raw) ? raw[0] : raw;
  return academy?.name ?? null;
}

// 학원 초대 코드로 선생 역할이 됨 — academies 테이블은 멤버만 읽을 수 있어(RLS) 참여 전엔
// 조회가 안 되므로, id만 좁게 돌려주는 RPC(resolve_academy_invite)로 코드를 확인한다.
export async function becomeTeacher(inviteCode: string): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요해요.' };

  const { data: rows, error: rpcErr } = await supabase.rpc('resolve_academy_invite', {
    code: inviteCode.trim().toUpperCase(),
  });
  const match = rows?.[0];
  if (rpcErr || !match) return { error: '학원 코드를 찾을 수 없어요. 코드를 다시 확인해주세요.' };

  const { error: joinErr } = await supabase
    .from('academy_members')
    .insert({ academy_id: match.academy_id, teacher_id: user.id });
  if (joinErr && joinErr.code !== '23505') return { error: '학원 참여에 실패했어요.' };

  // upsert라 이미 profiles 행이 있어도(예: 학생 모드로 전환했던 계정) role이 확실히 teacher로 바뀐다
  return setRole('teacher');
}

export interface TeacherClassRow {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
}

export async function listMyClasses(): Promise<TeacherClassRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('classes')
    .select('id, name, invite_code, created_at')
    .eq('teacher_id', user.id)
    .eq('archived', false)
    .order('created_at', { ascending: false });
  return (data ?? []).map((c) => ({ id: c.id, name: c.name, inviteCode: c.invite_code, createdAt: c.created_at }));
}

export interface TeacherTodaySummary {
  dueTodayCount: number;
  incompleteCount: number;
}

// 선생님 홈에서 "오늘 확인할 것"을 한눈에 보여주기 위한 요약 — 반/숙제를 일일이 열어보지 않아도 됨
export async function getTeacherTodaySummary(): Promise<TeacherTodaySummary> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { dueTodayCount: 0, incompleteCount: 0 };

  const today = new Date().toISOString().split('T')[0];
  const { data: assignments } = await supabase
    .from('assignments')
    .select('id, class_id')
    .eq('teacher_id', user.id)
    .eq('due_date', today);

  if (!assignments || assignments.length === 0) return { dueTodayCount: 0, incompleteCount: 0 };

  const classIds = [...new Set(assignments.map((a) => a.class_id))];
  const assignmentIds = assignments.map((a) => a.id);

  const { data: members } = await supabase
    .from('class_members')
    .select('class_id, student_id')
    .in('class_id', classIds);

  const { data: submissions } = await supabase
    .from('assignment_submissions')
    .select('assignment_id, student_id, completed_at')
    .in('assignment_id', assignmentIds);

  const completedSet = new Set(
    (submissions ?? []).filter((s) => s.completed_at).map((s) => `${s.assignment_id}:${s.student_id}`)
  );

  let incompleteCount = 0;
  for (const a of assignments) {
    for (const m of (members ?? []).filter((mm) => mm.class_id === a.class_id)) {
      if (!completedSet.has(`${a.id}:${m.student_id}`)) incompleteCount++;
    }
  }

  return { dueTodayCount: assignments.length, incompleteCount };
}

export async function getClassInfo(classId: string): Promise<TeacherClassRow | null> {
  const { data } = await supabase
    .from('classes')
    .select('id, name, invite_code, created_at')
    .eq('id', classId)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, name: data.name, inviteCode: data.invite_code, createdAt: data.created_at };
}

export interface RosterRow {
  studentId: string;
  studentName: string;
  joinedAt: string;
}

export async function listClassRoster(classId: string): Promise<RosterRow[]> {
  const { data } = await supabase
    .from('class_members')
    .select('student_id, student_name, joined_at')
    .eq('class_id', classId)
    .order('joined_at', { ascending: true });
  return (data ?? []).map((m) => ({
    studentId: m.student_id,
    studentName: m.student_name ?? '(이름 없음)',
    joinedAt: m.joined_at,
  }));
}

export async function removeStudentFromClass(classId: string, studentId: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('class_members')
    .delete()
    .eq('class_id', classId)
    .eq('student_id', studentId);
  if (error) return { error: '학생 내보내기에 실패했어요.' };
  return {};
}

export async function createClass(name: string): Promise<{ classId?: string; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요해요.' };

  const { data: memberships } = await supabase
    .from('academy_members')
    .select('academy_id')
    .eq('teacher_id', user.id)
    .limit(1);
  const membership = memberships?.[0];
  if (!membership) return { error: '먼저 학원에 참여해주세요.' };

  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = generateInviteCode();
    const { data, error } = await supabase
      .from('classes')
      .insert({ academy_id: membership.academy_id, teacher_id: user.id, name, invite_code: inviteCode })
      .select('id')
      .single();
    if (!error && data) return { classId: data.id };
    if (error && error.code !== '23505') {
      return { error: `반 생성에 실패했어요. (${error.code}: ${error.message})` };
    }
  }
  return { error: '반 생성에 실패했어요. 다시 시도해주세요.' };
}

export interface JoinedClass {
  id: string;
  name: string;
}

export async function listMyJoinedClasses(): Promise<JoinedClass[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: memberships } = await supabase.from('class_members').select('class_id').eq('student_id', user.id);
  const classIds = (memberships ?? []).map((m) => m.class_id);
  if (classIds.length === 0) return [];
  const { data: classes } = await supabase.from('classes').select('id, name').in('id', classIds);
  return (classes ?? []).map((c) => ({ id: c.id, name: c.name }));
}

export async function joinClassByCode(code: string): Promise<{ error?: string; className?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요해요.' };

  const { data: rows, error: rpcErr } = await supabase.rpc('resolve_class_invite', {
    code: code.trim().toUpperCase(),
  });
  const match = rows?.[0];
  if (rpcErr || !match) return { error: '반 코드를 찾을 수 없어요. 코드를 다시 확인해주세요.' };

  const { error } = await supabase
    .from('class_members')
    .insert({ class_id: match.class_id, student_id: user.id, student_name: myDisplayName(user) });
  if (error && error.code !== '23505') return { error: '반 참여에 실패했어요.' };

  return { className: match.class_name };
}

export interface DraftQuestion {
  question: string;
  type: QuizType;
  options?: string[];
  answer: string;
  explanation: string;
}

export async function createAssignment(
  classId: string,
  title: string,
  dueDate: string,
  questions: DraftQuestion[],
  targetStudentIds?: string[]
): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요해요.' };
  if (questions.length === 0) return { error: '문제를 1개 이상 추가해주세요.' };

  const { data: assignment, error: aErr } = await supabase
    .from('assignments')
    .insert({
      class_id: classId,
      teacher_id: user.id,
      title,
      source_type: 'teacher_quiz',
      due_date: dueDate,
      target_student_ids: targetStudentIds && targetStudentIds.length > 0 ? targetStudentIds : null,
    })
    .select('id')
    .single();
  if (aErr || !assignment) return { error: '숙제 생성에 실패했어요.' };

  const rows = questions.map((q, i) => ({
    assignment_id: assignment.id,
    question: q.question,
    type: q.type,
    options: q.options ?? null,
    answer: q.answer,
    explanation: q.explanation,
    order_index: i,
  }));
  const { error: qErr } = await supabase.from('assignment_questions').insert(rows);
  if (qErr) return { error: '문제 저장에 실패했어요.' };

  return {};
}

export interface AssignmentRow {
  id: string;
  title: string;
  dueDate: string;
  createdAt: string;
  targetCount?: number;
}

export async function listClassAssignments(classId: string): Promise<AssignmentRow[]> {
  const { data } = await supabase
    .from('assignments')
    .select('id, title, due_date, created_at, target_student_ids')
    .eq('class_id', classId)
    .order('due_date', { ascending: false });
  return (data ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    dueDate: a.due_date,
    createdAt: a.created_at,
    targetCount: (a.target_student_ids as string[] | null)?.length ?? undefined,
  }));
}

// assignment_questions/assignment_submissions는 assignments 삭제 시 on delete cascade로 함께 지워진다
export async function deleteAssignment(assignmentId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
  if (error) return { error: '숙제 삭제에 실패했어요.' };
  return {};
}

// 같은 숙제(문제 포함)를 선생님의 다른 반에도 그대로 복사한다 — 여러 섹션에 같은 커리큘럼을
// 가르칠 때 매번 처음부터 다시 만들지 않아도 되게 하기 위함. 대상 학생 지정은 반마다 다를 수
// 있으니 복사본은 항상 반 전체 대상으로 만든다.
export async function copyAssignmentToClasses(
  assignmentId: string,
  targetClassIds: string[]
): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요해요.' };
  if (targetClassIds.length === 0) return { error: '복사할 반을 선택해주세요.' };

  const { data: original } = await supabase
    .from('assignments')
    .select('title, source_type, due_date')
    .eq('id', assignmentId)
    .maybeSingle();
  if (!original) return { error: '원본 숙제를 찾을 수 없어요.' };

  const questions = await listAssignmentQuestions(assignmentId);
  if (questions.length === 0) return { error: '문제가 없는 숙제는 복사할 수 없어요.' };

  for (const classId of targetClassIds) {
    const { data: newAssignment, error: aErr } = await supabase
      .from('assignments')
      .insert({
        class_id: classId,
        teacher_id: user.id,
        title: original.title,
        source_type: original.source_type,
        due_date: original.due_date,
      })
      .select('id')
      .single();
    if (aErr || !newAssignment) return { error: '복사에 실패했어요.' };

    const rows = questions.map((q, i) => ({
      assignment_id: newAssignment.id,
      question: q.question,
      type: q.type,
      options: q.options ?? null,
      answer: q.answer,
      explanation: q.explanation,
      order_index: i,
    }));
    const { error: qErr } = await supabase.from('assignment_questions').insert(rows);
    if (qErr) return { error: '문제 복사에 실패했어요.' };
  }

  return {};
}

export interface ChecklistRow {
  studentId: string;
  studentName: string;
  completed: boolean;
  completedAt?: string;
  score?: number;
  total?: number;
  // assignment_questions의 order_index와 대응 — submit_assignment RPC가 채점하면서 함께 기록
  wrongIndexes: number[];
  // 문항 순서대로 제출한 답 전체 — wrongIndexes와 조합해 "학생 답: OOO"를 보여줄 때 씀
  answers: string[];
}

export async function listAssignmentChecklist(classId: string, assignmentId: string): Promise<ChecklistRow[]> {
  const { data: assignment } = await supabase
    .from('assignments')
    .select('target_student_ids')
    .eq('id', assignmentId)
    .maybeSingle();
  const targetIds = assignment?.target_student_ids as string[] | null;

  const { data: members } = await supabase
    .from('class_members')
    .select('student_id, student_name')
    .eq('class_id', classId);
  // 특정 학생에게만 낸 숙제면, 대상이 아닌 학생은 체크리스트에도 안 보이게 한다
  const scopedMembers = targetIds ? (members ?? []).filter((m) => targetIds.includes(m.student_id)) : members ?? [];

  const { data: submissions } = await supabase
    .from('assignment_submissions')
    .select('student_id, completed_at, score, total, wrong_indexes, answers')
    .eq('assignment_id', assignmentId);
  const subMap = new Map((submissions ?? []).map((s) => [s.student_id, s]));

  return scopedMembers.map((m) => {
    const s = subMap.get(m.student_id);
    return {
      studentId: m.student_id,
      studentName: m.student_name ?? '(이름 없음)',
      completed: !!s?.completed_at,
      completedAt: s?.completed_at ?? undefined,
      score: s?.score ?? undefined,
      total: s?.total ?? undefined,
      answers: s?.answers ?? [],
      wrongIndexes: s?.wrong_indexes ?? [],
    };
  });
}

export async function listAssignmentQuestions(assignmentId: string): Promise<SharedQuiz[]> {
  const { data } = await supabase
    .from('assignment_questions')
    .select('question, type, options, answer, explanation')
    .eq('assignment_id', assignmentId)
    .order('order_index', { ascending: true });
  return (data ?? []) as SharedQuiz[];
}

export interface MySubmission {
  score: number;
  total: number;
  answers: string[];
}

// 이미 제출한 숙제를 다시 열었을 때 재풀이(재채점) 대신 복습(읽기 전용) 화면을 보여주기 위해 조회
export async function getMySubmission(assignmentId: string): Promise<MySubmission | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('assignment_submissions')
    .select('score, total, answers, completed_at')
    .eq('assignment_id', assignmentId)
    .eq('student_id', user.id)
    .maybeSingle();
  if (!data?.completed_at) return null;
  return { score: data.score ?? 0, total: data.total ?? 0, answers: data.answers ?? [] };
}

export interface StudentAssignmentRow {
  id: string;
  title: string;
  dueDate: string;
  className: string;
  completed: boolean;
  score?: number;
  total?: number;
}

export async function listMyAssignments(): Promise<StudentAssignmentRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const joined = await listMyJoinedClasses();
  if (joined.length === 0) return [];
  const classMap = new Map(joined.map((c) => [c.id, c.name]));

  const { data: assignments } = await supabase
    .from('assignments')
    .select('id, title, due_date, class_id')
    .in('class_id', joined.map((c) => c.id))
    .order('due_date', { ascending: false });

  const { data: submissions } = await supabase
    .from('assignment_submissions')
    .select('assignment_id, completed_at, score, total')
    .eq('student_id', user.id);
  const subMap = new Map((submissions ?? []).map((s) => [s.assignment_id, s]));

  return (assignments ?? []).map((a) => {
    const s = subMap.get(a.id);
    return {
      id: a.id,
      title: a.title,
      dueDate: a.due_date,
      className: classMap.get(a.class_id) ?? '',
      completed: !!s?.completed_at,
      score: s?.score ?? undefined,
      total: s?.total ?? undefined,
    };
  });
}

// 점수를 클라이언트가 계산해서 그대로 믿고 저장하면 devtools에서 임의 점수로 조작할 수 있으므로,
// 문제별로 실제 제출한 답만 보내고 채점은 서버(RPC, submit_assignment)가 정답과 대조해 수행한다.
// 객관식은 고른 보기 텍스트를, 단답형은 자기채점 결과(QuizCard와 동일한 패턴)를 answer 문자열로 보낸다.
export async function submitAssignment(
  assignmentId: string,
  answers: string[]
): Promise<{ score: number; total: number } | null> {
  const { data, error } = await supabase.rpc('submit_assignment', {
    p_assignment_id: assignmentId,
    p_answers: answers,
  });
  if (error || !data?.[0]) return null;
  return { score: data[0].score, total: data[0].total };
}

const MATERIAL_FILES_BUCKET = 'class-materials';
const MAX_MATERIAL_FILE_SIZE = 10 * 1024 * 1024; // 10MB — 무료 Supabase Storage 용량을 고려한 상한

export interface UploadedMaterialFile {
  path: string;
  name: string;
  size: number;
}

// 저장 경로는 반드시 "{classId}/..."로 시작해야 한다 — RLS(storage.objects)가
// storage.foldername(name)의 첫 세그먼트를 class_id로 보고 소속 반을 판별하기 때문.
export async function uploadClassMaterialFile(
  classId: string,
  file: File
): Promise<{ file?: UploadedMaterialFile; error?: string }> {
  if (file.size > MAX_MATERIAL_FILE_SIZE) {
    return { error: '파일은 10MB 이하만 올릴 수 있어요.' };
  }
  const safeName = file.name.replace(/[^\w.\-가-힣 ]/g, '_');
  const path = `${classId}/${Date.now()}_${safeName}`;
  const { error } = await supabase.storage.from(MATERIAL_FILES_BUCKET).upload(path, file);
  if (error) return { error: '파일 업로드에 실패했어요.' };
  return { file: { path, name: file.name, size: file.size } };
}

// 비공개 버킷이라 매번 짧은 유효기간의 서명 URL을 새로 발급해서 다운로드/미리보기에 쓴다.
export async function getClassMaterialFileUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(MATERIAL_FILES_BUCKET).createSignedUrl(path, 600);
  if (error || !data) return null;
  return data.signedUrl;
}

export interface ClassMaterialRow {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
}

export async function listClassMaterials(classId: string): Promise<ClassMaterialRow[]> {
  const { data } = await supabase
    .from('class_materials')
    .select('id, title, content, created_at, file_path, file_name, file_size')
    .eq('class_id', classId)
    .order('created_at', { ascending: false });
  return (data ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    content: m.content,
    createdAt: m.created_at,
    filePath: m.file_path ?? undefined,
    fileName: m.file_name ?? undefined,
    fileSize: m.file_size ?? undefined,
  }));
}

export async function createClassMaterial(
  classId: string,
  title: string,
  content: string,
  file?: UploadedMaterialFile
): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요해요.' };
  const { error } = await supabase.from('class_materials').insert({
    class_id: classId,
    teacher_id: user.id,
    title,
    content,
    file_path: file?.path ?? null,
    file_name: file?.name ?? null,
    file_size: file?.size ?? null,
  });
  if (error) return { error: '자료 등록에 실패했어요.' };
  return {};
}

export async function deleteClassMaterial(materialId: string): Promise<{ error?: string }> {
  const { data: existing } = await supabase
    .from('class_materials')
    .select('file_path')
    .eq('id', materialId)
    .maybeSingle();

  const { error } = await supabase.from('class_materials').delete().eq('id', materialId);
  if (error) return { error: '자료 삭제에 실패했어요.' };

  if (existing?.file_path) {
    await supabase.storage.from(MATERIAL_FILES_BUCKET).remove([existing.file_path]).catch(() => {});
  }
  return {};
}

export interface StudentMaterialRow {
  id: string;
  title: string;
  content: string;
  className: string;
  createdAt: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
}

export async function listMyClassMaterials(): Promise<StudentMaterialRow[]> {
  const joined = await listMyJoinedClasses();
  if (joined.length === 0) return [];
  const classMap = new Map(joined.map((c) => [c.id, c.name]));

  const { data } = await supabase
    .from('class_materials')
    .select('id, title, content, created_at, class_id, file_path, file_name, file_size')
    .in('class_id', joined.map((c) => c.id))
    .order('created_at', { ascending: false });

  return (data ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    content: m.content,
    className: classMap.get(m.class_id) ?? '',
    createdAt: m.created_at,
    filePath: m.file_path ?? undefined,
    fileName: m.file_name ?? undefined,
    fileSize: m.file_size ?? undefined,
  }));
}
