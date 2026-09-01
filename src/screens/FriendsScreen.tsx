import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoalStore, useQuizStore, useSessionStore } from '../store';
import {
  acceptFriendRequest,
  addFriend,
  buildStudySharePayload,
  buildStudyShareLink,
  dismissReceivedShare,
  encodeStudySharePayload,
  getFriendLeaderboard,
  listFriends,
  listPendingRequests,
  listReceivedShares,
  markReceivedSharesRead,
  rejectFriendRequest,
  searchUsersByDisplayName,
  sendStudyShareToFriend,
  type FriendRequestItem,
  type LeaderboardItem,
  type ReceivedShareItem,
  type SocialUserSearchResult,
  type StudyShareType,
} from '../services/social';

function relativeTime(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

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
  // 'quizset' 공유 시 범위: 이 세션 / 목표 전체 / 커리큘럼 Day 구간
  const [quizsetScope, setQuizsetScope] = useState<'session' | 'goal' | 'dayrange'>('session');
  const [dayFrom, setDayFrom] = useState(1);
  const [dayTo, setDayTo] = useState(5);
  const [sendTargetId, setSendTargetId] = useState('');
  const [sending, setSending] = useState(false);
  const [receivedShares, setReceivedShares] = useState<ReceivedShareItem[]>([]);

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

  const selectedGoal = useMemo(
    () => goals.find((goal) => goal.id === selectedGoalId) ?? goals[0],
    [goals, selectedGoalId]
  );

  // 커리큘럼 목표는 "N번째 세션 = Day N" — 날짜 오름차순으로 정렬해 인덱스로 Day를 매핑한다.
  const sessionsByDay = useMemo(
    () => [...goalSessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [goalSessions]
  );

  // 공유 링크(URL에 base64로 통째로 실림)와 메신저 전달을 고려한 상한.
  const QUIZSET_MAX = 30;

  // 받는 사람이 "똑같은 문제"를 그대로 복원하도록, 어떤 공유 유형이든 실제 문제를 담는다.
  const quizsetAll = useMemo(() => {
    let quizIds: Set<string>;
    if (shareType === 'goal' || (shareType === 'quizset' && quizsetScope === 'goal')) {
      quizIds = new Set(
        quizzes.filter((quiz) => quiz.goalId === selectedGoalId).map((quiz) => quiz.id)
      );
    } else if (shareType === 'quizset' && quizsetScope === 'dayrange') {
      const lo = Math.max(1, Math.min(dayFrom, dayTo));
      const hi = Math.max(dayFrom, dayTo);
      quizIds = new Set(
        sessionsByDay.slice(lo - 1, hi).flatMap((session) => session.selectedQuizIds ?? [])
      );
    } else {
      quizIds = new Set(selectedSession?.selectedQuizIds ?? []);
    }
    return quizzes.filter((quiz) => quizIds.has(quiz.id));
  }, [quizzes, selectedSession, shareType, quizsetScope, selectedGoalId, dayFrom, dayTo, sessionsByDay]);

  const selectedQuizList = useMemo(
    () =>
      quizsetAll.slice(0, QUIZSET_MAX).map((quiz) => ({
        question: quiz.question,
        type: quiz.type,
        options: quiz.options,
        answer: quiz.answer,
        explanation: quiz.explanation,
      })),
    [quizsetAll]
  );

  const refresh = async () => {
    setLeaderboard(await getFriendLeaderboard());
    setFriends(await listFriends());
    setRequests(await listPendingRequests());
    setReceivedShares(await listReceivedShares());
    window.dispatchEvent(new CustomEvent('friendRequestsChanged'));
  };

  // 커리큘럼이 아닌 목표로 바꾸면 'Day 구간' 범위는 성립하지 않으므로 되돌린다
  useEffect(() => {
    if (quizsetScope === 'dayrange' && !selectedGoal?.curriculumId) {
      setQuizsetScope('session');
    }
  }, [selectedGoal, quizsetScope]);

  useEffect(() => {
    if (friends.length === 0) {
      setSendTargetId('');
    } else if (!friends.some((f) => f.userId === sendTargetId)) {
      setSendTargetId(friends[0].userId);
    }
  }, [friends, sendTargetId]);

  useEffect(() => {
    (async () => {
      await refresh();
      // 받은 공유 목록을 열었으니 읽음 처리 → 하단 탭 배지 정리
      await markReceivedSharesRead();
      window.dispatchEvent(new CustomEvent('studySharesChanged'));
    })();
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
    setMessage(result.accepted ? '친구가 되었어요!' : '친구 요청을 보냈어요. 상대가 수락하면 친구가 됩니다.');
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

  const shareLabel = shareType === 'goal' ? '목표' : shareType === 'session' ? '세션' : '문제집';

  const shareDisabled =
    goals.length === 0 ||
    (shareType === 'session' && goalSessions.length === 0) ||
    // 공유는 "똑같은 문제 전달"이 핵심이라, 담을 문제가 없으면 보내지 못하게 막는다
    selectedQuizList.length === 0;

  // 문제집 공유에서 한 세션이 아니라 목표 전체/Day 구간을 고른 경우엔 세션 정보를 붙이지 않는다
  const quizsetIsWholeGoal = shareType === 'quizset' && quizsetScope !== 'session';

  const currentShareInput = () => {
    const goal = goals.find((item) => item.id === selectedGoalId) ?? goals[0];
    if (!goal) return null;
    const attachSession = shareType !== 'goal' && !quizsetIsWholeGoal;
    return {
      ...goal,
      shareType,
      sessionId: attachSession ? selectedSession?.id : undefined,
      sessionDate: attachSession ? selectedSession?.date : undefined,
      sessionSummary: attachSession ? selectedSession?.summaryContent ?? '' : undefined,
      // 어떤 유형이든 실제 문제를 담아 받는 사람이 똑같은 문제를 그대로 받게 한다
      quizList: selectedQuizList,
    };
  };

  const handleShare = async () => {
    const input = currentShareInput();
    if (!input) {
      setCopyMessage('공유할 학습 목표가 아직 없어요.');
      return;
    }
    const shareUrl = buildStudyShareLink(input);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyMessage(`"${input.topic}" ${shareLabel} 공유 링크를 복사했어요. 친구에게 보내보세요.`);
    } catch {
      setCopyMessage(shareUrl);
    }
  };

  const handleSendToFriend = async () => {
    const input = currentShareInput();
    if (!input) {
      setCopyMessage('공유할 학습 목표가 아직 없어요.');
      return;
    }
    if (!sendTargetId) {
      setCopyMessage('보낼 친구를 선택해주세요.');
      return;
    }
    setSending(true);
    const result = await sendStudyShareToFriend(sendTargetId, buildStudySharePayload(input));
    setSending(false);
    const friendName = friends.find((f) => f.userId === sendTargetId)?.displayName ?? '친구';
    setCopyMessage(result.error ?? `${friendName}님에게 "${input.topic}" ${shareLabel}을(를) 보냈어요.`);
  };

  const handleSaveReceived = (share: ReceivedShareItem) => {
    navigate(`/shared/${encodeStudySharePayload(share.payload)}`);
  };

  const handleDismissReceived = async (id: string) => {
    await dismissReceivedShare(id);
    setReceivedShares((prev) => prev.filter((s) => s.id !== id));
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

        {receivedShares.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
            <h2 className="font-semibold text-gray-900 mb-3">받은 공유</h2>
            <div className="space-y-3">
              {receivedShares.map((share) => {
                const label = share.payload.shareType === 'goal' ? '목표' : share.payload.shareType === 'session' ? '세션' : '문제집';
                return (
                  <div key={share.id} className="rounded-xl border border-gray-200 p-3">
                    <p className="text-xs text-gray-400">
                      {share.senderName}님이 보낸 {label} · {relativeTime(share.createdAt)}
                    </p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{share.payload.topic}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      문제 {share.payload.quizList?.length ?? 0}개
                    </p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleSaveReceived(share)}
                        className="px-3 py-1.5 rounded-lg bg-[var(--accent-600)] text-white text-xs font-semibold"
                      >
                        보기 / 저장
                      </button>
                      <button
                        onClick={() => handleDismissReceived(share.id)}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                );
              })}
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

              {shareType === 'quizset' && (
                <>
                  <label className="block text-xs font-medium text-gray-500 mb-2">문제집 범위</label>
                  <select
                    value={quizsetScope}
                    onChange={(e) => setQuizsetScope(e.target.value as typeof quizsetScope)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--accent-200)] mb-3"
                  >
                    <option value="session">특정 세션의 문제</option>
                    <option value="goal">목표 전체 문제 (최대 {QUIZSET_MAX}개)</option>
                    {selectedGoal?.curriculumId && <option value="dayrange">커리큘럼 Day 구간</option>}
                  </select>

                  {quizsetScope === 'dayrange' && (
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="number"
                        min={1}
                        value={dayFrom}
                        onChange={(e) => setDayFrom(Math.max(1, Number(e.target.value) || 1))}
                        className="w-20 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--accent-200)]"
                        aria-label="시작 Day"
                      />
                      <span className="text-sm text-gray-400">~</span>
                      <input
                        type="number"
                        min={1}
                        value={dayTo}
                        onChange={(e) => setDayTo(Math.max(1, Number(e.target.value) || 1))}
                        className="w-20 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--accent-200)]"
                        aria-label="끝 Day"
                      />
                      <span className="text-xs text-gray-400">Day</span>
                    </div>
                  )}
                  {quizsetScope !== 'session' && (
                    <p className="text-xs text-gray-400 mb-3">
                      {quizsetAll.length > QUIZSET_MAX
                        ? `문제 ${quizsetAll.length}개 중 앞에서부터 ${QUIZSET_MAX}개만 담겨요.`
                        : `문제 ${selectedQuizList.length}개가 담겨요.`}
                    </p>
                  )}
                </>
              )}

              {(shareType === 'session' || (shareType === 'quizset' && quizsetScope === 'session')) && (
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

          {goals.length > 0 && (
            <>
              <label className="block text-xs font-medium text-gray-500 mb-2">친구에게 바로 보내기</label>
              {friends.length === 0 ? (
                <p className="text-xs text-gray-400 mb-3">친구를 먼저 추가하면 앱에서 바로 보낼 수 있어요.</p>
              ) : (
                <div className="flex gap-2 mb-3">
                  <select
                    value={sendTargetId}
                    onChange={(e) => setSendTargetId(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--accent-200)]"
                  >
                    {friends.map((friend) => (
                      <option key={friend.userId} value={friend.userId}>{friend.displayName}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleSendToFriend}
                    disabled={sending || shareDisabled}
                    className="px-4 py-2.5 rounded-xl bg-[var(--accent-600)] text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {sending ? '보내는 중…' : '보내기'}
                  </button>
                </div>
              )}
            </>
          )}

          <button
            onClick={handleShare}
            disabled={shareDisabled}
            className="w-full py-3 rounded-xl bg-[var(--accent-50)] text-[var(--accent-700)] font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {shareType === 'goal' ? '목표 링크 복사' : shareType === 'session' ? '세션 링크 복사' : '문제집 링크 복사'}
          </button>
          {copyMessage && <p className="mt-3 text-sm text-gray-600">{copyMessage}</p>}
        </div>
      </div>
    </div>
  );
}
