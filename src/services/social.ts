import { supabase } from './supabase';
import type { Goal, Session } from '../types';

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

export function computeStudyScore(goals: Goal[] = [], sessions: Session[] = []): number {
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
  return goalScore + sessionScore + streakBonus + perfectGoalBonus;
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

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .ilike('display_name', `%${trimmed}%`)
    .limit(10);

  if (error || !data) return [];

  return data
    .filter((row) => row.display_name)
    .map((row) => ({
      userId: row.user_id,
      displayName: row.display_name ?? '이름 없음',
    }));
}

export async function addFriend(friendId: string): Promise<{ error?: string }> {
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
    const { error: acceptError } = await supabase
      .from('friendships')
      .upsert(
        [{ user_id: friendId, friend_id: user.id, status: 'accepted' }, { user_id: user.id, friend_id: friendId, status: 'accepted' }],
        { onConflict: 'user_id, friend_id' }
      );
    if (acceptError) return { error: '친구 수락에 실패했어요.' };
    return {};
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
      .select('goals, sessions')
      .eq('user_id', row.user_id)
      .maybeSingle();
    const goals = Array.isArray(payload?.goals) ? payload.goals : [];
    const sessions = Array.isArray(payload?.sessions) ? payload.sessions : [];

    result.push({
      userId: row.user_id,
      displayName: profile.display_name ?? '이름 없음',
      score: computeStudyScore(goals as Goal[], sessions as Session[]),
      direction: 'incoming',
    });
  }

  return result.sort((a, b) => b.score - a.score);
}

export async function acceptFriendRequest(friendId: string): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요해요.' };

  const { error } = await supabase
    .from('friendships')
    .upsert(
      [
        { user_id: friendId, friend_id: user.id, status: 'accepted' },
        { user_id: user.id, friend_id: friendId, status: 'accepted' },
      ],
      { onConflict: 'user_id, friend_id' }
    );

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
      .select('goals, sessions')
      .eq('user_id', friendId)
      .maybeSingle();

    const goals = Array.isArray(payload?.goals) ? payload.goals : [];
    const sessions = Array.isArray(payload?.sessions) ? payload.sessions : [];

    result.push({
      userId: friendId,
      displayName: profile.display_name ?? '이름 없음',
      score: computeStudyScore(goals as Goal[], sessions as Session[]),
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
    .select('goals, sessions')
    .eq('user_id', user.id)
    .maybeSingle();

  const meScore = computeStudyScore(
    Array.isArray(meData?.goals) ? (meData.goals as Goal[]) : [],
    Array.isArray(meData?.sessions) ? (meData.sessions as Session[]) : []
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

export function buildStudyShareLink(goal: Pick<Goal, 'id' | 'topic' | 'summaryContent' | 'dailyPlan'>): string {
  const payload = {
    goalId: goal.id,
    topic: goal.topic,
    summary: goal.summaryContent ?? '',
    dailyPlan: goal.dailyPlan ?? '',
    at: new Date().toISOString(),
  };
  const text = JSON.stringify(payload);
  const encoded = btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16))));
  return `${window.location.origin}/shared/${encoded}`;
}

export function decodeStudyShareLink(code: string): {
  goalId: string;
  topic: string;
  summary: string;
  dailyPlan: string;
} | null {
  try {
    const raw = decodeURIComponent(
      Array.from(atob(code), (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')
    );
    const parsed = JSON.parse(raw) as {
      goalId?: string;
      topic?: string;
      summary?: string;
      dailyPlan?: string;
    };
    if (!parsed.goalId || !parsed.topic) return null;
    return {
      goalId: parsed.goalId,
      topic: parsed.topic,
      summary: parsed.summary ?? '',
      dailyPlan: parsed.dailyPlan ?? '',
    };
  } catch {
    return null;
  }
}
