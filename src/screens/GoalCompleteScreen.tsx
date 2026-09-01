import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useGoalStore, useAppStore, useSessionStore, useQuizStore } from '../store';
import { computeStudyScore } from '../services/social';
import { archiveGoalToBookmarks, deleteGoalCascade, recordCompletedGoalScore } from '../utils/storage';
import { getBadgeDef } from '../utils/badges';
import { shareOrDownload } from '../utils/shareCard';
import { getIdentityStatement } from '../utils/identity';
import { getMascotFace } from '../utils/mascot';
import { useCountUp } from '../utils/useCountUp';
import { celebrate } from '../utils/celebration';
import type { BadgeId, MateTone } from '../types';
import type { GrowthFeedback } from '../utils/growthFeedback';

interface LocationState {
  score: number;
  total: number;
  streak: number;
  completedSessions: number;
  topic?: string;
  newBadges?: BadgeId[];
  growthFeedback?: GrowthFeedback;
  mateTone?: MateTone;
  xpGained?: number;
  newLevel?: number;
  didLevelUp?: boolean;
}

export default function GoalCompleteScreen() {
  const navigate = useNavigate();
  const { goalId } = useParams<{ goalId: string }>();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const { goals, loadGoals } = useGoalStore();
  const { sessions, loadSessions } = useSessionStore();
  const { quizzes, loadQuizzes } = useQuizStore();
  const { appState } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [archiveResult, setArchiveResult] = useState<'kept' | 'deleted' | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const goal = goals.find((g) => g.id === goalId);
  // 보관/삭제를 정하면 goal이 store에서 사라지므로, 화면 표시에 쓸 값은 처음 한 번만 스냅샷.
  const snapshotRef = useRef<{ topic: string; quizCount: number } | null>(null);
  if (goal && !snapshotRef.current) {
    snapshotRef.current = { topic: goal.topic, quizCount: quizzes.filter((q) => q.goalId === goal.id).length };
  }
  const displayTopic = snapshotRef.current?.topic ?? state?.topic ?? '';
  const goalQuizCount = snapshotRef.current?.quizCount ?? 0;

  const handleArchiveDecision = (keep: boolean) => {
    if (goal) {
      const goalSessions = sessions.filter((s) => s.goalId === goal.id);
      recordCompletedGoalScore(computeStudyScore([goal], goalSessions));
      if (keep) archiveGoalToBookmarks(goal.id);
      else deleteGoalCascade(goal.id);
      loadGoals();
      loadSessions();
      loadQuizzes();
    }
    setArchiveResult(keep ? 'kept' : 'deleted');
  };
  const score = state?.score ?? 0;
  const total = state?.total ?? 5;
  const streak = state?.streak ?? 1;
  const completedSessions = state?.completedSessions ?? goal?.completedSessions ?? 0;
  const newBadges = state?.newBadges ?? [];
  const growthFeedback = state?.growthFeedback;
  const mateTone = state?.mateTone ?? goal?.mateTone ?? 'plain';
  const xpGained = state?.xpGained ?? 0;
  const newLevel = state?.newLevel ?? 1;
  const didLevelUp = state?.didLevelUp ?? false;
  const percent = Math.round((score / total) * 100);
  const [sharing, setSharing] = useState(false);
  const xpDisplay = useCountUp(xpGained, 600);

  // 보관 여부를 아직 안 정했으면 자동으로 홈에 보내지 않는다(선택을 받아야 목표·문제가 정리됨).
  // 정할 목표가 없거나(새로고침 등) 이미 정했으면, 잠시 뒤 홈으로.
  useEffect(() => {
    if (goal && archiveResult === null) return;
    const delay = didLevelUp ? 8000 : 6000;
    const timer = setTimeout(() => navigate('/'), delay);
    return () => clearTimeout(timer);
  }, [navigate, didLevelUp, goal, archiveResult]);

  // F-40: 목표 완주는 이미 특별한 순간이므로 항상 축하 연출(opt-out 가능, 설정 화면 "축하 효과").
  // 2026-07-22 CEO 요청으로 일시 비활성화됐다가, 2026-08-22 재미 요소 추가 작업으로 재활성화.
  useEffect(() => {
    if (!appState.celebrationEffectsEnabled) return;
    celebrate(canvasRef.current, { particleCount: 120 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 via-[var(--accent-50)] to-white flex items-center justify-center p-4">
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />
      <div className="max-w-md w-full text-center">
        <div className="text-7xl mb-4 animate-bounce">🏆</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">목표 달성!</h1>
        {displayTopic && (
          <p className="text-[var(--accent-600)] font-semibold text-lg mb-1">{displayTopic}</p>
        )}
        <p className="text-gray-500 mb-8">처음부터 끝까지 완주했어요. 정말 대단합니다!</p>

        {didLevelUp && (
          <div className="bg-gradient-to-r from-[var(--accent-600)] to-purple-600 rounded-2xl p-5 mb-4 text-center animate-count-up-pop">
            <p className="text-3xl mb-1">🎉</p>
            <p className="text-white font-bold text-lg">레벨 {newLevel} 달성!</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex justify-around">
            <div className="text-center">
              <p className="text-3xl font-bold text-[var(--accent-600)]">{completedSessions}일</p>
              <p className="text-gray-500 text-sm mt-1">총 학습</p>
            </div>
            <div className="w-px bg-gray-100" />
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-500">🔥 {streak}</p>
              <p className="text-gray-500 text-sm mt-1">연속 달성</p>
            </div>
            <div className="w-px bg-gray-100" />
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">{percent}%</p>
              <p className="text-gray-500 text-sm mt-1">마지막 점수</p>
            </div>
          </div>
          {xpGained > 0 && (
            <p className="text-center text-xs text-purple-500 font-semibold mt-4 pt-3 border-t border-gray-100">
              ✨ XP +{xpDisplay}
            </p>
          )}
          {growthFeedback && (
            <p
              className={`text-center text-xs mt-2 ${
                growthFeedback.isPersonalBest ? 'text-amber-600 font-bold' : 'text-[var(--accent-500)] font-medium'
              }`}
            >
              {growthFeedback.isPersonalBest ? `🏅 ${getMascotFace('celebrate', mateTone)} ` : '📈 '}
              {growthFeedback.message}
              {growthFeedback.isPersonalBest && ' — 자기 최고 기록!'}
            </p>
          )}
        </div>

        {displayTopic && (
          <div className="bg-[var(--accent-600)] rounded-2xl p-5 mb-4">
            <p className="text-white font-semibold leading-relaxed">
              "{getIdentityStatement(displayTopic)}"
            </p>
          </div>
        )}

        {newBadges.length > 0 && (
          <div className="bg-yellow-50 rounded-2xl p-4 mb-4 border border-yellow-200">
            <p className="text-yellow-700 font-semibold text-sm mb-3">🎉 뱃지 획득!</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {newBadges.map((id) => {
                const def = getBadgeDef(id);
                return (
                  <div key={id} className="flex flex-col items-center gap-1">
                    <span className="text-3xl">{def.icon}</span>
                    <span className="text-xs font-medium text-yellow-700">{def.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-3">
          <button
            onClick={async () => {
              setSharing(true);
              try {
                await shareOrDownload({ topic: goal?.topic ?? '학습 목표', streak, score, total, isGoalComplete: true });
              } finally {
                setSharing(false);
              }
            }}
            disabled={sharing}
            className="w-full py-3 bg-[var(--accent-600)] text-white rounded-xl font-semibold text-sm min-h-[44px] disabled:opacity-50"
          >
            {sharing ? '생성 중...' : '🙋 친구에게'}
          </button>
        </div>

        {goal && archiveResult === null ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-left">
            <p className="font-semibold text-gray-900 mb-1">이 문제집을 보관할까요?</p>
            <p className="text-sm text-gray-500 mb-4">
              보관하면 문제 {goalQuizCount}개가 '내 문제집'에 저장돼요.
              보관하지 않으면 이 목표와 문제는 삭제됩니다(따로 담아둔 문제는 남아요).
            </p>
            {confirmingDelete ? (
              <div>
                <p className="text-sm text-red-600 font-medium mb-3">
                  문제 {goalQuizCount}개와 이 목표를 삭제할까요? 되돌릴 수 없어요.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleArchiveDecision(false)}
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold min-h-[44px]"
                  >
                    삭제
                  </button>
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold min-h-[44px]"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => handleArchiveDecision(true)}
                  className="flex-1 py-3 bg-[var(--accent-600)] text-white rounded-xl font-semibold min-h-[44px]"
                >
                  문제집에 보관
                </button>
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold min-h-[44px]"
                >
                  보관 안 함
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {archiveResult && (
              <p className="text-gray-500 text-sm mb-3">
                {archiveResult === 'kept' ? "'내 문제집'에 보관했어요." : '목표와 문제를 정리했어요.'}
              </p>
            )}
            <button
              onClick={() => navigate('/goals/create')}
              className="w-full mb-3 py-3 border-2 border-[var(--accent-200)] text-[var(--accent-600)] rounded-xl font-semibold min-h-[44px]"
            >
              새 목표 만들기
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold min-h-[44px]"
            >
              홈으로 가기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
