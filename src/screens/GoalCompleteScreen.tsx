import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useGoalStore } from '../store';
import { getBadgeDef } from '../utils/badges';
import { shareOrDownload } from '../utils/shareCard';
import { getIdentityStatement } from '../utils/identity';
import type { BadgeId } from '../types';
import type { GrowthFeedback } from '../utils/growthFeedback';

interface LocationState {
  score: number;
  total: number;
  streak: number;
  completedSessions: number;
  newBadges?: BadgeId[];
  growthFeedback?: GrowthFeedback;
}

export default function GoalCompleteScreen() {
  const navigate = useNavigate();
  const { goalId } = useParams<{ goalId: string }>();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const { goals } = useGoalStore();

  const goal = goals.find((g) => g.id === goalId);
  const score = state?.score ?? 0;
  const total = state?.total ?? 5;
  const streak = state?.streak ?? 1;
  const completedSessions = state?.completedSessions ?? goal?.completedSessions ?? 0;
  const newBadges = state?.newBadges ?? [];
  const growthFeedback = state?.growthFeedback;
  const percent = Math.round((score / total) * 100);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => navigate('/'), 6000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 via-indigo-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="text-7xl mb-4 animate-bounce">🏆</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">목표 달성!</h1>
        {goal && (
          <p className="text-indigo-600 font-semibold text-lg mb-1">{goal.topic}</p>
        )}
        <p className="text-gray-500 mb-8">처음부터 끝까지 완주했어요. 정말 대단합니다!</p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex justify-around">
            <div className="text-center">
              <p className="text-3xl font-bold text-indigo-600">{completedSessions}일</p>
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
          {growthFeedback && (
            <p className="text-center text-xs text-indigo-500 font-medium mt-4 pt-3 border-t border-gray-100">
              📈 {growthFeedback.message}
            </p>
          )}
        </div>

        {goal && (
          <div className="bg-indigo-600 rounded-2xl p-5 mb-4">
            <p className="text-white font-semibold leading-relaxed">
              "{getIdentityStatement(goal.topic)}"
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

        <p className="text-gray-400 text-sm mb-4">6초 후 홈으로 이동합니다</p>

        <div className="flex gap-2 mb-3">
          <button
            onClick={async () => {
              setSharing(true);
              try {
                await shareOrDownload({ topic: goal?.topic ?? '학습 목표', streak, score, total, isGoalComplete: true }, 'parent');
              } finally {
                setSharing(false);
              }
            }}
            disabled={sharing}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm min-h-[44px] disabled:opacity-50"
          >
            {sharing ? '생성 중...' : '👨‍👩‍👧 보호자님께'}
          </button>
          <button
            onClick={async () => {
              setSharing(true);
              try {
                await shareOrDownload({ topic: goal?.topic ?? '학습 목표', streak, score, total, isGoalComplete: true }, 'general');
              } finally {
                setSharing(false);
              }
            }}
            disabled={sharing}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm min-h-[44px] disabled:opacity-50"
          >
            {sharing ? '생성 중...' : '🙋 친구에게'}
          </button>
        </div>
        <button
          onClick={() => navigate('/goals/create')}
          className="w-full mb-3 py-3 border-2 border-indigo-200 text-indigo-600 rounded-xl font-semibold min-h-[44px]"
        >
          새 목표 만들기
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold min-h-[44px]"
        >
          홈으로 가기
        </button>
      </div>
    </div>
  );
}
