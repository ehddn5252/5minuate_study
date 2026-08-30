import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoalStore, useQuizStore, useSessionStore } from '../store';
import {
  acceptFriendRequest,
  addFriend,
  buildStudyShareLink,
  getFriendLeaderboard,
  listFriends,
  listPendingRequests,
  rejectFriendRequest,
  searchUsersByDisplayName,
  type FriendRequestItem,
  type LeaderboardItem,
  type SocialUserSearchResult,
  type StudyShareType,
} from '../services/social';

export default function FriendsScreen() {
  const navigate = useNavigate();
  const { goals } = useGoalStore();
  const { sessions } = useSessionStore();
  const { quizzes } = useQuizStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [friends, setFriends] = useState<{ userId: string; displayName: string; score: number }[]>([]);
  const [requests, setRequests] = useState<FriendRequestItem[]>([]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SocialUserSearchResult[]>([]);
  const [message, setMessage] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [shareType, setShareType] = useState<StudyShareType>('goal');
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');

  useEffect(() => {
    if (goals.length === 0) {
      setSelectedGoalId('');
      setSelectedSessionId('');
      return;
    }

    const nextSelectedGoal = goals.find((goal) => goal.id === selectedGoalId)
      ?? goals.find((goal) => goal.status === 'active')
      ?? goals[0];
    setSelectedGoalId(nextSelectedGoal.id);

    const nextSessions = sessions.filter((session) => session.goalId === nextSelectedGoal.id);
    const nextSelectedSession = nextSessions.find((session) => session.id === selectedSessionId) ?? nextSessions[0];
    if (nextSelectedSession) setSelectedSessionId(nextSelectedSession.id);
    else setSelectedSessionId('');
  }, [goals, sessions, selectedGoalId, selectedSessionId]);

  const goalSessions = useMemo(
    () => sessions.filter((session) => session.goalId === selectedGoalId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [sessions, selectedGoalId]
  );

  const selectedSession = useMemo(
    () => goalSessions.find((session) => session.id === selectedSessionId) ?? goalSessions[0],
    [goalSessions, selectedSessionId]
  );

  const selectedQuizList = useMemo(() => {
    if (!selectedSession) return [];
    const selectedQuizIds = new Set(selectedSession.selectedQuizIds ?? []);
    return quizzes
      .filter((quiz) => selectedQuizIds.has(quiz.id))
      .slice(0, 8)
      .map((quiz) => ({
        question: quiz.question,
        answer: quiz.answer,
        explanation: quiz.explanation,
      }));
  }, [quizzes, selectedSession]);

  const refresh = async () => {
    setLeaderboard(await getFriendLeaderboard());
    setFriends(await listFriends());
    setRequests(await listPendingRequests());
    window.dispatchEvent(new CustomEvent('friendRequestsChanged'));
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSearch = async () => {
    setSearchResults(await searchUsersByDisplayName(query));
  };

  const handleAddFriend = async (friendId: string) => {
    const result = await addFriend(friendId);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage('친구 요청을 보냈어요. 상대가 수락하면 친구가 됩니다.');
    setQuery('');
    setSearchResults([]);
    await refresh();
  };

  const handleAcceptRequest = async (friendId: string) => {
    const result = await acceptFriendRequest(friendId);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage('친구가 되었습니다!');
    await refresh();
  };

  const handleRejectRequest = async (friendId: string) => {
    const result = await rejectFriendRequest(friendId);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage('친구 요청을 거절했어요.');
    await refresh();
  };

  const handleShare = async () => {
    const goal = goals.find((item) => item.id === selectedGoalId) ?? goals[0];
    if (!goal) {
      setCopyMessage('공유할 학습 목표가 아직 없어요.');
      return;
    }

    const shareUrl = buildStudyShareLink({
      ...goal,
      shareType,
      sessionId: shareType === 'goal' ? undefined : selectedSession?.id,
      sessionDate: shareType === 'goal' ? undefined : selectedSession?.date,
      sessionSummary: shareType === 'goal' ? undefined : selectedSession?.summaryContent ?? '',
      quizIds: shareType === 'quizset' ? selectedSession?.selectedQuizIds ?? [] : undefined,
      quizList: shareType === 'quizset' ? selectedQuizList : undefined,
    });

    try {
      await navigator.clipboard.writeText(shareUrl);
      const label = shareType === 'goal' ? '목표' : shareType === 'session' ? '세션' : '문제집';
      setCopyMessage(`"${goal.topic}" ${label} 공유 링크를 복사했어요. 친구에게 보내보세요.`);
    } catch {
      setCopyMessage(shareUrl);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--page-bg)] pb-24">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px]"
            aria-label="뒤로"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">친구 & 경쟁</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-700">점수 리더보드</p>
              <p className="text-xs text-gray-400 mt-0.5">오늘의 학습 점수로 경쟁해요</p>
            </div>
            <span className="text-2xl">🏆</span>
          </div>
          <div className="space-y-2">
            {leaderboard.map((item) => (
              <div
                key={item.userId}
                className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-gray-700">#{item.rank}</span>
                  <span className="text-sm font-medium text-gray-900 truncate">{item.displayName}</span>
                </div>
                <span className="text-sm font-bold text-[var(--accent-600)]">{item.score}점</span>
              </div>
            ))}
          </div>
        </div>

        {requests.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
            <h2 className="font-semibold text-gray-900 mb-3">친구 요청</h2>
            <div className="space-y-3">
              {requests.map((request) => (
                <div key={request.userId} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{request.displayName}</p>
                      <p className="text-xs text-gray-400">점수 {request.score}점</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(request.userId)}
                        className="px-3 py-1.5 rounded-lg bg-[var(--accent-600)] text-white text-xs font-semibold"
                      >
                        수락
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.userId)}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold"
                      >
                        거절
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">친구 추가</h2>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="닉네임으로 친구 찾기"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-200)]"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2.5 rounded-xl bg-[var(--accent-600)] text-white font-medium text-sm"
            >
              검색
            </button>
          </div>
          {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}
          <div className="mt-3 space-y-2">
            {searchResults.map((person) => (
              <div key={person.userId} className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">{person.displayName}</p>
                </div>
                <button
                  onClick={() => handleAddFriend(person.userId)}
                  className="px-3 py-1.5 rounded-lg bg-[var(--accent-50)] text-[var(--accent-700)] text-xs font-semibold"
                >
                  친구 추가
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">내 친구</h2>
            <span className="text-xs text-gray-400">{friends.length}명</span>
          </div>
          {friends.length === 0 ? (
            <p className="text-sm text-gray-500">아직 추가된 친구가 없어요.</p>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <div key={friend.userId} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{friend.displayName}</p>
                    <p className="text-xs text-gray-400">점수 {friend.score}점</p>
                  </div>
                  <span className="text-xs text-[var(--accent-600)] font-semibold">친구</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">같은 학습 공유</h2>
          {goals.length > 0 ? (
            <>
              <label className="block text-xs font-medium text-gray-500 mb-2">공유 범위</label>
              <select
                value={shareType}
                onChange={(e) => setShareType(e.target.value as StudyShareType)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--accent-200)] mb-3"
              >
                <option value="goal">목표 전체</option>
                <option value="session">특정 세션</option>
                <option value="quizset">문제집</option>
              </select>

              <label className="block text-xs font-medium text-gray-500 mb-2">학습 목표 선택</label>
              <select
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--accent-200)] mb-3"
              >
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.topic}
                    {goal.status === 'active' ? ' • 진행 중' : goal.status === 'completed' ? ' • 완료' : ' • 보관'}
                  </option>
                ))}
              </select>

              {(shareType === 'session' || shareType === 'quizset') && (
                <>
                  <label className="block text-xs font-medium text-gray-500 mb-2">세션 선택</label>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--accent-200)] mb-3"
                    disabled={goalSessions.length === 0}
                  >
                    {goalSessions.length === 0 ? (
                      <option value="">세션이 아직 없어요</option>
                    ) : (
                      goalSessions.map((session) => (
                        <option key={session.id} value={session.id}>
                          {session.date} · {session.summaryContent ? session.summaryContent.slice(0, 24) : '세션 학습'}
                        </option>
                      ))
                    )}
                  </select>
                </>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500 mb-3">공유할 학습이 아직 없어요.</p>
          )}
          <button
            onClick={handleShare}
            disabled={goals.length === 0 || ((shareType === 'session' || shareType === 'quizset') && goalSessions.length === 0)}
            className="w-full py-3 rounded-xl bg-[var(--accent-600)] text-white font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {shareType === 'goal' ? '목표 링크 생성' : shareType === 'session' ? '세션 링크 생성' : '문제집 링크 생성'}
          </button>
          {copyMessage && <p className="mt-3 text-sm text-gray-600">{copyMessage}</p>}
        </div>
      </div>
    </div>
  );
}
