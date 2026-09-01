import { supabase } from './supabase';
import type { Goal, QuizType, Session } from '../types';

// 목표 완료 시 목표·세션을 지우면서(보관하거나 삭제하거나) 잃게 되는 점수를 appState에 누적해
// 리더보드 점수가 "완료했더니 오히려 깎이는" 일이 없게 한다. computeStudyScore에 더해진다.
function lifetimeBonusFrom(appState: unknown): number {
  if (appState && typeof appState === 'object' && 'lifetimeStudyScore' in appState) {
    const v = (appState as { lifetimeStudyScore?: unknown }).lifetimeStudyScore;
    return typeof v === 'number' && Number.isFinite(v) ? v : 0;
  }
  return 0;
}

export interface SocialUserSearchResult {
  userId: string;
  displayName: string;
  email?: string;
}

export interface FriendItem {
  userId: string;
  displayName: string;
  score: number;
  status: 'accepted' | 'pending';
}

export interface LeaderboardItem {
  userId: string;
  displayName: string;
  score: number;
  rank: number;
}

export interface FriendRequestItem {
  userId: string;
  displayName: string;
  score: number;
  direction: 'incoming' | 'outgoing';
}

export function computeStudyScore(goals: Goal[] = [], sessions: Session[] = [], lifetimeBonus = 0): number {
  const goalScore = goals.reduce((sum, goal) => {
    if (goal.status === 'completed') return sum + 250 + goal.streak * 15 + goal.completedSessions * 10;
    if (goal.status === 'active') return sum + Math.max(goal.completedSessions * 24, 25) + goal.streak * 8;
    return sum;
  }, 0);

  const completedSessions = sessions.filter((session) => session.status === 'completed');
  const sessionScore = completedSessions.reduce((sum, session) => {
    const base = (session.quizScore ?? 0) * 18 + 40;
    const accuracyBonus = session.quizTotal && session.quizTotal > 0
      ? Math.round(((session.quizScore ?? 0) / session.quizTotal) * 50)
      : 0;
    const perfectBonus = session.quizScore === session.quizTotal && session.quizTotal && session.quizTotal > 0 ? 60 : 0;
    return sum + base + accuracyBonus + perfectBonus;
  }, 0);

  const streakBonus = goals.reduce((sum, goal) => sum + Math.min(goal.streak, 30) * 5, 0);
  const perfectGoalBonus = goals.filter((goal) => goal.status === 'completed').length * 80;
  return goalScore + sessionScore + streakBonus + perfectGoalBonus + lifetimeBonus;
}

export async function countPendingFriendRequests(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .eq('friend_id', user.id)
    .eq('status', 'pending');

  if (error) return 0;
  return count ?? 0;
}

export async function searchUsersByDisplayName(term: string): Promise<SocialUserSearchResult[]> {
  const trimmed = term.trim();
  if (!trimmed) return [];

  // profiles는 RLS로 본인 행만 읽을 수 있어 직접 조회하면 남을 못 찾는다 —
  // 016/017에서 만든 security definer RPC로 검색한다.
  const { data, error } = await supabase.rpc('search_user_profiles', { p_query: trimmed });

  if (error || !data) return [];

  return (data as { user_id: string; display_name: string | null }[])
    .filter((row) => row.display_name)
    .map((row) => ({
      userId: row.user_id,
      displayName: row.display_name ?? '이름 없음',
    }));
}

export async function addFriend(friendId: string): Promise<{ error?: string; accepted?: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요해요.' };
  if (friendId === user.id) return { error: '본인은 친구로 추가할 수 없어요.' };

  const { data: existingRows, error: checkError } = await supabase
    .from('friendships')
    .select('user_id, friend_id, status')
    .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);

  if (checkError) return { error: '친구 상태를 확인하는 중 오류가 발생했어요.' };

  const reverseRequest = existingRows?.find((row) => row.user_id === friendId && row.friend_id === user.id && row.status === 'pending');
  if (reverseRequest) {
    // 상대가 이미 나에게 요청을 보내둔 상태 → 바로 수락 (RLS 때문에 RPC로 처리)
    const { error: acceptError } = await supabase.rpc('accept_friend_request', { p_requester: friendId });
    if (acceptError) return { error: '친구 수락에 실패했어요.' };
    return { accepted: true };
  }

  const acceptedAlready = existingRows?.some((row) => row.status === 'accepted' && ((row.user_id === user.id && row.friend_id === friendId) || (row.user_id === friendId && row.friend_id === user.id)));
  if (acceptedAlready) return { error: '이미 친구예요.' };

  const { error } = await supabase
    .from('friendships')
    .upsert({ user_id: user.id, friend_id: friendId, status: 'pending' }, { onConflict: 'user_id, friend_id' });

  if (error) return { error: '친구 요청을 보낼 수 없어요.' };
  return {};
}

export async function listPendingRequests(): Promise<FriendRequestItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows, error } = await supabase
    .from('friendships')
    .select('user_id, friend_id, status')
    .eq('friend_id', user.id)
    .eq('status', 'pending');

  if (error || !rows || rows.length === 0) return [];

  const senderIds = rows.map((row) => row.user_id);
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .in('user_id', senderIds);

  if (profileError || !profiles) return [];

  const result: FriendRequestItem[] = [];
  for (const row of rows) {
    const profile = profiles.find((item) => item.user_id === row.user_id);
    if (!profile) continue;
    const { data: payload } = await supabase
      .from('user_data')
      .select('goals, sessions, app_state')
      .eq('user_id', row.user_id)
      .maybeSingle();
    const goals = Array.isArray(payload?.goals) ? payload.goals : [];
    const sessions = Array.isArray(payload?.sessions) ? payload.sessions : [];

    result.push({
      userId: row.user_id,
      displayName: profile.display_name ?? '이름 없음',
      score: computeStudyScore(goals as Goal[], sessions as Session[], lifetimeBonusFrom(payload?.app_state)),
      direction: 'incoming',
    });
  }

  return result.sort((a, b) => b.score - a.score);
}

export async function acceptFriendRequest(friendId: string): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요해요.' };

  // friendships_self_insert 정책(auth.uid() = user_id)이 "상대→나" 행 갱신을 막으므로
  // security definer RPC(019 마이그레이션)로 양방향 accepted 행을 만든다.
  const { error } = await supabase.rpc('accept_friend_request', { p_requester: friendId });

  if (error) return { error: '친구 수락에 실패했어요.' };
  return {};
}

export async function rejectFriendRequest(friendId: string): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요해요.' };

  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('user_id', friendId)
    .eq('friend_id', user.id);

  if (error) return { error: '요청을 거절하는 데 실패했어요.' };
  return {};
}

export async function listFriends(): Promise<FriendItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows, error } = await supabase
    .from('friendships')
    .select('user_id, friend_id, status')
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
    .eq('status', 'accepted');

  if (error || !rows || rows.length === 0) return [];

  const friendIds = Array.from(
    new Set(
      rows
        .map((row) => (row.user_id === user.id ? row.friend_id : row.user_id))
        .filter((id) => id !== user.id)
    )
  );

  if (friendIds.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .in('user_id', friendIds);

  if (profileError || !profiles) return [];

  const result: FriendItem[] = [];
  for (const friendId of friendIds) {
    const profile = profiles.find((item) => item.user_id === friendId);
    if (!profile) continue;

    const { data: payload } = await supabase
      .from('user_data')
      .select('goals, sessions, app_state')
      .eq('user_id', friendId)
      .maybeSingle();

    const goals = Array.isArray(payload?.goals) ? payload.goals : [];
    const sessions = Array.isArray(payload?.sessions) ? payload.sessions : [];

    result.push({
      userId: friendId,
      displayName: profile.display_name ?? '이름 없음',
      score: computeStudyScore(goals as Goal[], sessions as Session[], lifetimeBonusFrom(payload?.app_state)),
      status: 'accepted',
    });
  }

  return result.sort((a, b) => b.score - a.score);
}

export async function getFriendLeaderboard(): Promise<LeaderboardItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const friends = await listFriends();
  const { data: meData } = await supabase
    .from('user_data')
    .select('goals, sessions, app_state')
    .eq('user_id', user.id)
    .maybeSingle();

  const meScore = computeStudyScore(
    Array.isArray(meData?.goals) ? (meData.goals as Goal[]) : [],
    Array.isArray(meData?.sessions) ? (meData.sessions as Session[]) : [],
    lifetimeBonusFrom(meData?.app_state)
  );

  const all = [
    { userId: user.id, displayName: '나', score: meScore, status: 'accepted' as const },
    ...friends,
  ];

  return all
    .sort((a, b) => b.score - a.score)
    .map((item, index) => ({
      userId: item.userId,
      displayName: item.displayName,
      score: item.score,
      rank: index + 1,
    }));
}

export type StudyShareType = 'goal' | 'session' | 'quizset';

export interface StudyShareLinkPayload {
  shareType: StudyShareType;
  goalId: string;
  topic: string;
  summary: string;
  dailyPlan: string;
  sessionId?: string;
  sessionDate?: string;
  sessionSummary?: string;
  quizIds?: string[];
  // 받는 사람이 "똑같은 문제"를 그대로 복원할 수 있도록 type/options까지 담는다
  quizList?: Array<{
    question: string;
    type?: QuizType;
    options?: string[];
    answer: string;
    explanation?: string;
  }>;
  at: string;
}

type ShareGoalInput = Pick<Goal, 'id' | 'topic' | 'summaryContent' | 'dailyPlan'> & {
  shareType?: StudyShareType;
  sessionId?: string;
  sessionDate?: string;
  sessionSummary?: string;
  quizIds?: string[];
  // 받는 사람이 "똑같은 문제"를 그대로 복원할 수 있도록 type/options까지 담는다
  quizList?: Array<{
    question: string;
    type?: QuizType;
    options?: string[];
    answer: string;
    explanation?: string;
  }>;
};

export function buildStudySharePayload(goal: ShareGoalInput): StudyShareLinkPayload {
  return {
    shareType: goal.shareType ?? 'goal',
    goalId: goal.id,
    topic: goal.topic,
    summary: goal.summaryContent ?? '',
    dailyPlan: goal.dailyPlan ?? '',
    sessionId: goal.sessionId,
    sessionDate: goal.sessionDate,
    sessionSummary: goal.sessionSummary ?? '',
    quizIds: goal.quizIds ?? [],
    quizList: goal.quizList ?? [],
    at: new Date().toISOString(),
  };
}

// 링크 공유와 앱 내 공유("받은 공유" → 저장하기)가 같은 /shared/:code 화면을 재사용하도록,
// 페이로드를 URL 조각(base64)으로 인코딩하는 부분만 따로 뽑았다.
export function encodeStudySharePayload(payload: StudyShareLinkPayload): string {
  const text = JSON.stringify(payload);
  return btoa(
    encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
  );
}

export function buildStudyShareLink(goal: ShareGoalInput): string {
  return `${window.location.origin}/shared/${encodeStudySharePayload(buildStudySharePayload(goal))}`;
}

export function decodeStudyShareLink(code: string): StudyShareLinkPayload | null {
  try {
    const raw = decodeURIComponent(
      Array.from(atob(code), (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')
    );
    const parsed = JSON.parse(raw) as Partial<StudyShareLinkPayload>;
    if (!parsed.goalId || !parsed.topic) return null;

    return {
      shareType: parsed.shareType ?? 'goal',
      goalId: parsed.goalId,
      topic: parsed.topic,
      summary: parsed.summary ?? '',
      dailyPlan: parsed.dailyPlan ?? '',
      sessionId: parsed.sessionId,
      sessionDate: parsed.sessionDate,
      sessionSummary: parsed.sessionSummary ?? '',
      quizIds: parsed.quizIds ?? [],
      quizList: parsed.quizList ?? [],
      at: parsed.at ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// ── 앱 내 친구 공유 (study_shares 테이블, 018 마이그레이션) ──────────────

export interface ReceivedShareItem {
  id: string;
  senderName: string;
  payload: StudyShareLinkPayload;
  createdAt: string;
  read: boolean;
}

export async function sendStudyShareToFriend(
  friendId: string,
  payload: StudyShareLinkPayload
): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요해요.' };
  if (friendId === user.id) return { error: '본인에게는 보낼 수 없어요.' };

  const { error } = await supabase
    .from('study_shares')
    .insert({ sender_id: user.id, recipient_id: friendId, payload });

  // RLS(친구 아님) 위반이면 42501
  if (error) return { error: error.code === '42501' ? '친구에게만 보낼 수 있어요.' : '공유 전송에 실패했어요.' };
  return {};
}

export async function listReceivedShares(): Promise<ReceivedShareItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows, error } = await supabase
    .from('study_shares')
    .select('id, sender_id, payload, created_at, read_at')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error || !rows || rows.length === 0) return [];

  const senderIds = Array.from(new Set(rows.map((row) => row.sender_id)));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .in('user_id', senderIds);

  const nameById = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name as string | null]));

  return rows.map((row) => ({
    id: row.id,
    senderName: nameById.get(row.sender_id) ?? '친구',
    payload: row.payload as StudyShareLinkPayload,
    createdAt: row.created_at,
    read: !!row.read_at,
  }));
}

export async function countUnreadShares(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('study_shares')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .is('read_at', null);

  if (error) return 0;
  return count ?? 0;
}

export async function markReceivedSharesRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('study_shares')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', user.id)
    .is('read_at', null);
}

export async function dismissReceivedShare(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('study_shares').delete().eq('id', id);
  if (error) return { error: '삭제에 실패했어요.' };
  return {};
}
