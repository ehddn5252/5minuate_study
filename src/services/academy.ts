import { supabase } from './supabase';
import type { QuizType, SharedQuiz } from '../types';

export type UserRole = 'student' | 'teacher';

function myDisplayName(user: { user_metadata?: Record<string, unknown>; email?: string }): string {
  const meta = user.user_metadata ?? {};
  return (meta.full_name as string) || (meta.name as string) || user.email || '이름 없음';
}

// 닉네임을 직접 설정해뒀으면 그걸 우선 쓰고, 없으면 Google 이름으로 대체
async function effectiveDisplayName(user: { id: string; user_metadata?: Record<string, unknown>; email?: string }): Promise<string> {
  const { data } = await supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle();
  return data?.display_name || myDisplayName(user);
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
// role만 update하고 display_name은 건드리지 않는다 — 안 그러면 역할 전환할 때마다
// 사용자가 정해둔 닉네임이 Google 이름으로 도로 덮어써진다.
export async function setRole(role: UserRole): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요해요.' };

  const { data: existing } = await supabase.from('profiles').select('user_id').eq('user_id', user.id).maybeSingle();
  if (existing) {
    const { error } = await supabase.from('profiles').update({ role }).eq('user_id', user.id);
    if (error) return { error: '역할 변경에 실패했어요.' };
    return {};
  }
  const { error } = await supabase.from('profiles').insert({ user_id: user.id, role, display_name: myDisplayName(user) });
  if (error) return { error: '역할 변경에 실패했어요.' };
  return {};
}

export async function getMyDisplayName(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return '';
  return effectiveDisplayName(user);
}

// 닉네임 저장 + 이미 참여 중인 반들의 명단 표시 이름도 함께 갱신.
// class_members에 학생 self-UPDATE 정책을 새로 여는 대신, 본인 행의 student_name만
// 정확히 건드리는 좁은 RPC로 처리해서 class_id를 바꿔치기해(초대 코드 없이) 다른 반으로
// 옮겨 들어가는 우회로가 생기지 않게 한다.
export async function setDisplayName(name: string): Promise<{ error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: '닉네임을 입력해주세요.' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요해요.' };

  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: user.id, display_name: trimmed }, { onConflict: 'user_id' });
  if (error) return { error: '닉네임 저장에 실패했어요.' };

  await supabase.rpc('sync_my_display_name', { p_name: trimmed });
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

export interface TeacherOverdueSummary {
  overdueAssignmentCount: number;
  studentsWithOverdueCount: number;
}

// F-71: getTeacherTodaySummary는 "오늘 마감"만 본다 — 반을 여러 개 운영하는 교사가
// "지금까지 밀린 모든 숙제"를 한눈에 보려면 반 하나하나를 들어가봐야 했다. 이 함수는
// 반 개수와 무관하게 쿼리 3번(숙제·명단·제출기록)으로 전체를 집계한다(N+1 방지, F-58/F-60/F-66과
// 동일한 설계 원칙). target_student_ids로 대상이 좁혀진 숙제도 정확히 반영한다.
export async function getTeacherOverdueSummary(): Promise<TeacherOverdueSummary> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { overdueAssignmentCount: 0, studentsWithOverdueCount: 0 };

  const today = new Date().toISOString().split('T')[0];
  const { data: assignments } = await supabase
    .from('assignments')
    .select('id, class_id, target_student_ids')
    .eq('teacher_id', user.id)
    .lt('due_date', today);

  if (!assignments || assignments.length === 0) return { overdueAssignmentCount: 0, studentsWithOverdueCount: 0 };

  const classIds = [...new Set(assignments.map((a) => a.class_id))];
  const { data: members } = await supabase
    .from('class_members')
    .select('class_id, student_id')
    .in('class_id', classIds);

  const { data: submissions } = await supabase
    .from('assignment_submissions')
    .select('assignment_id, student_id')
    .in('assignment_id', assignments.map((a) => a.id))
    .not('completed_at', 'is', null);
  const completedSet = new Set((submissions ?? []).map((s) => `${s.assignment_id}:${s.student_id}`));

  const studentsWithOverdue = new Set<string>();
  let overdueAssignmentCount = 0;
  assignments.forEach((a) => {
    const targetIds = a.target_student_ids as string[] | null;
    const classMembers = (members ?? []).filter((m) => m.class_id === a.class_id);
    const scoped = targetIds ? classMembers.filter((m) => targetIds.includes(m.student_id)) : classMembers;
    let hasIncomplete = false;
    scoped.forEach((m) => {
      if (!completedSet.has(`${a.id}:${m.student_id}`)) {
        hasIncomplete = true;
        studentsWithOverdue.add(m.student_id);
      }
    });
    if (hasIncomplete) overdueAssignmentCount++;
  });

  return { overdueAssignmentCount, studentsWithOverdueCount: studentsWithOverdue.size };
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

export interface StudentAssignmentDetailRow {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  score?: number;
  total?: number;
  submissionId?: string;
  teacherComment?: string;
}

// 학생 명단에서 특정 학생을 눌렀을 때 "이 학생이 이 반에서 어떤 숙제를 했는지/안 했는지"를
// 보여주기 위한 조회. 특정 학생에게만 낸 숙제(target_student_ids)면 대상이 아닌 학생에게는
// 애초에 해당 사항이 없으므로 목록에서 제외한다.
export async function listStudentAssignments(classId: string, studentId: string): Promise<StudentAssignmentDetailRow[]> {
  const { data: assignments } = await supabase
    .from('assignments')
    .select('id, title, due_date, target_student_ids')
    .eq('class_id', classId)
    .order('due_date', { ascending: false });

  const applicable = (assignments ?? []).filter((a) => {
    const targetIds = a.target_student_ids as string[] | null;
    return !targetIds || targetIds.includes(studentId);
  });
  if (applicable.length === 0) return [];

  const { data: submissions } = await supabase
    .from('assignment_submissions')
    .select('id, assignment_id, completed_at, score, total, teacher_comment')
    .eq('student_id', studentId)
    .in('assignment_id', applicable.map((a) => a.id));
  const subMap = new Map((submissions ?? []).map((s) => [s.assignment_id, s]));

  return applicable.map((a) => {
    const s = subMap.get(a.id);
    return {
      id: a.id,
      title: a.title,
      dueDate: a.due_date,
      completed: !!s?.completed_at,
      score: s?.score ?? undefined,
      total: s?.total ?? undefined,
      submissionId: s?.id,
      teacherComment: s?.teacher_comment ?? undefined,
    };
  });
}

// F-62: 위 조회에서 함께 딸려오는 teacher_comment는 읽기 전용 — 실제 저장은 RPC로만 허용한다
// (015 마이그레이션의 set_submission_comment, score/answers 컬럼까지 열리는 걸 막기 위함).
export async function setSubmissionComment(submissionId: string, comment: string): Promise<{ error?: string }> {
  const { error } = await supabase.rpc('set_submission_comment', {
    p_submission_id: submissionId,
    p_comment: comment.trim() === '' ? null : comment.trim(),
  });
  if (error) return { error: '코멘트 저장에 실패했어요.' };
  return {};
}

// F-58/F-60: 학생 명단을 펼치기 전부터 "이 학생이 미제출 숙제가 몇 건인지" 한눈에 보여주기 위한
// 집계. 학생 수만큼 쿼리하지 않도록(N+1 방지) 반 전체의 마감 임박(오늘 포함) 숙제·제출 기록을
// 각각 한 번씩만 조회해 클라이언트에서 합친다. 대상이 특정 학생으로 좁혀진 숙제(target_student_ids)도
// 정확히 반영한다.
// F-60: "이미 마감 지남(overdue)"과 "오늘이 마감(dueToday, 아직 안 늦음)"을 한데 묶지 않고 분리한다 —
// 리서치 결과 이 둘을 뭉뚱그리면 "진짜 위험한" 미제출과 "아직 정상 범위인" 미제출을 교사가 구분하지
// 못해 경고 피로(alert fatigue)로 무시하게 된다는 게 확인됐다.
export interface StudentDueSummary {
  overdue: number;
  dueToday: number;
}

export async function listClassDueSummary(
  classId: string,
  studentIds: string[]
): Promise<Record<string, StudentDueSummary>> {
  const empty: Record<string, StudentDueSummary> = {};
  if (studentIds.length === 0) return empty;
  const today = new Date().toISOString().split('T')[0];

  const { data: assignments } = await supabase
    .from('assignments')
    .select('id, due_date, target_student_ids')
    .eq('class_id', classId)
    .lte('due_date', today);
  const relevantAssignments = assignments ?? [];
  if (relevantAssignments.length === 0) return empty;

  const { data: submissions } = await supabase
    .from('assignment_submissions')
    .select('assignment_id, student_id')
    .in('assignment_id', relevantAssignments.map((a) => a.id))
    .not('completed_at', 'is', null);
  const completedSet = new Set((submissions ?? []).map((s) => `${s.assignment_id}:${s.student_id}`));

  const summary: Record<string, StudentDueSummary> = {};
  studentIds.forEach((studentId) => {
    let overdue = 0;
    let dueToday = 0;
    relevantAssignments.forEach((a) => {
      const targetIds = a.target_student_ids as string[] | null;
      const applicable = !targetIds || targetIds.includes(studentId);
      const done = completedSet.has(`${a.id}:${studentId}`);
      if (!applicable || done) return;
      if (a.due_date < today) overdue++;
      else dueToday++;
    });
    summary[studentId] = { overdue, dueToday };
  });
  return summary;
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
    .insert({ class_id: match.class_id, student_id: user.id, student_name: await effectiveDisplayName(user) });
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

// F-66: 숙제 목록을 펼치기 전에도 "몇 명이 제출했는지" 한눈에 보이게 하기 위한 집계.
// listAssignmentChecklist(숙제 하나 펼쳤을 때 쓰는 함수)와 같은 계산을, 반 전체 숙제에 대해
// 한 번에(쿼리 3번, 숙제·학생 수와 무관) 해서 N+1을 피한다 — F-58/F-60과 같은 설계 원칙.
export async function listClassAssignmentCompletionCounts(
  classId: string
): Promise<Record<string, { completed: number; total: number }>> {
  const { data: assignments } = await supabase
    .from('assignments')
    .select('id, target_student_ids')
    .eq('class_id', classId);
  if (!assignments || assignments.length === 0) return {};

  const { data: members } = await supabase
    .from('class_members')
    .select('student_id')
    .eq('class_id', classId);
  const allStudentIds = (members ?? []).map((m) => m.student_id);

  const { data: submissions } = await supabase
    .from('assignment_submissions')
    .select('assignment_id, student_id')
    .in('assignment_id', assignments.map((a) => a.id))
    .not('completed_at', 'is', null);
  const completedSet = new Set((submissions ?? []).map((s) => `${s.assignment_id}:${s.student_id}`));

  const result: Record<string, { completed: number; total: number }> = {};
  assignments.forEach((a) => {
    const targetIds = a.target_student_ids as string[] | null;
    const scoped = targetIds ? allStudentIds.filter((id) => targetIds.includes(id)) : allStudentIds;
    const completed = scoped.filter((id) => completedSet.has(`${a.id}:${id}`)).length;
    result[a.id] = { completed, total: scoped.length };
  });
  return result;
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
  teacherComment?: string;
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
    .select('assignment_id, completed_at, score, total, teacher_comment')
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
      teacherComment: s?.teacher_comment ?? undefined,
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

export interface AnnouncementRow {
  id: string;
  content: string;
  createdAt: string;
}

export async function listClassAnnouncements(classId: string): Promise<AnnouncementRow[]> {
  const { data } = await supabase
    .from('class_announcements')
    .select('id, content, created_at')
    .eq('class_id', classId)
    .order('created_at', { ascending: false });
  return (data ?? []).map((a) => ({ id: a.id, content: a.content, createdAt: a.created_at }));
}

export async function createAnnouncement(classId: string, content: string): Promise<{ error?: string }> {
  const trimmed = content.trim();
  if (!trimmed) return { error: '공지 내용을 입력해주세요.' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요해요.' };
  const { error } = await supabase
    .from('class_announcements')
    .insert({ class_id: classId, teacher_id: user.id, content: trimmed });
  if (error) return { error: '공지 등록에 실패했어요.' };
  return {};
}

export async function deleteAnnouncement(announcementId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('class_announcements').delete().eq('id', announcementId);
  if (error) return { error: '공지 삭제에 실패했어요.' };
  return {};
}

export interface StudentAnnouncementRow {
  id: string;
  content: string;
  className: string;
  createdAt: string;
}

export async function listMyClassAnnouncements(): Promise<StudentAnnouncementRow[]> {
  const joined = await listMyJoinedClasses();
  if (joined.length === 0) return [];
  const classMap = new Map(joined.map((c) => [c.id, c.name]));

  const { data } = await supabase
    .from('class_announcements')
    .select('id, content, created_at, class_id')
    .in('class_id', joined.map((c) => c.id))
    .order('created_at', { ascending: false });

  return (data ?? []).map((a) => ({
    id: a.id,
    content: a.content,
    className: classMap.get(a.class_id) ?? '',
    createdAt: a.created_at,
  }));
}

export interface WrongAssignmentQuestion {
  assignmentId: string;
  assignmentTitle: string;
  className: string;
  question: string;
  type: QuizType;
  options?: string[];
  answer: string;
  myAnswer: string;
  explanation: string;
}

// 숙제를 채점할 때 서버(submit_assignment RPC)가 이미 계산해둔 wrong_indexes를 그대로 활용해서,
// 학생이 지금까지 제출한 모든 숙제 중 틀린 문제만 모아 보여준다 — 따로 "오답노트에 담기"를
// 누를 필요 없이 항상 최신 상태로 자동 집계됨.
export async function listMyWrongQuestions(): Promise<WrongAssignmentQuestion[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const joined = await listMyJoinedClasses();
  if (joined.length === 0) return [];
  const classMap = new Map(joined.map((c) => [c.id, c.name]));

  const { data: assignments } = await supabase
    .from('assignments')
    .select('id, title, class_id')
    .in('class_id', joined.map((c) => c.id));
  if (!assignments || assignments.length === 0) return [];
  const assignmentMap = new Map(assignments.map((a) => [a.id, a]));

  const { data: submissions } = await supabase
    .from('assignment_submissions')
    .select('assignment_id, wrong_indexes, answers')
    .eq('student_id', user.id)
    .not('completed_at', 'is', null);

  const withWrongs = (submissions ?? []).filter((s) => ((s.wrong_indexes as number[] | null)?.length ?? 0) > 0);
  if (withWrongs.length === 0) return [];

  const results: WrongAssignmentQuestion[] = [];
  for (const s of withWrongs) {
    const assignment = assignmentMap.get(s.assignment_id);
    if (!assignment) continue;
    const questions = await listAssignmentQuestions(s.assignment_id);
    const myAnswers = (s.answers as string[] | null) ?? [];
    for (const idx of s.wrong_indexes as number[]) {
      const q = questions[idx];
      if (!q) continue;
      results.push({
        assignmentId: s.assignment_id,
        assignmentTitle: assignment.title,
        className: classMap.get(assignment.class_id) ?? '',
        question: q.question,
        type: q.type,
        options: q.options,
        answer: q.answer,
        myAnswer: myAnswers[idx] ?? '',
        explanation: q.explanation,
      });
    }
  }
  return results;
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
