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

  const { error: profileErr } = await supabase
    .from('profiles')
    .insert({ user_id: user.id, role: 'teacher', display_name: myDisplayName(user) });
  if (profileErr && profileErr.code !== '23505') return { error: '프로필 저장에 실패했어요.' };

  return {};
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

export async function getClassInfo(classId: string): Promise<TeacherClassRow | null> {
  const { data } = await supabase
    .from('classes')
    .select('id, name, invite_code, created_at')
    .eq('id', classId)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, name: data.name, inviteCode: data.invite_code, createdAt: data.created_at };
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
  questions: DraftQuestion[]
): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요해요.' };
  if (questions.length === 0) return { error: '문제를 1개 이상 추가해주세요.' };

  const { data: assignment, error: aErr } = await supabase
    .from('assignments')
    .insert({ class_id: classId, teacher_id: user.id, title, source_type: 'teacher_quiz', due_date: dueDate })
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
}

export async function listClassAssignments(classId: string): Promise<AssignmentRow[]> {
  const { data } = await supabase
    .from('assignments')
    .select('id, title, due_date, created_at')
    .eq('class_id', classId)
    .order('due_date', { ascending: false });
  return (data ?? []).map((a) => ({ id: a.id, title: a.title, dueDate: a.due_date, createdAt: a.created_at }));
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
}

export async function listAssignmentChecklist(classId: string, assignmentId: string): Promise<ChecklistRow[]> {
  const { data: members } = await supabase
    .from('class_members')
    .select('student_id, student_name')
    .eq('class_id', classId);
  const { data: submissions } = await supabase
    .from('assignment_submissions')
    .select('student_id, completed_at, score, total, wrong_indexes')
    .eq('assignment_id', assignmentId);
  const subMap = new Map((submissions ?? []).map((s) => [s.student_id, s]));

  return (members ?? []).map((m) => {
    const s = subMap.get(m.student_id);
    return {
      studentId: m.student_id,
      studentName: m.student_name ?? '(이름 없음)',
      completed: !!s?.completed_at,
      completedAt: s?.completed_at ?? undefined,
      score: s?.score ?? undefined,
      total: s?.total ?? undefined,
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
