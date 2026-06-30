import { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useGoalStore } from '../store';

interface LocationState {
  score: number;
  total: number;
  streak: number;
  completedSessions: number;
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
  const percent = Math.round((score / total) * 100);

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
        </div>

        <p className="text-gray-400 text-sm mb-4">6초 후 홈으로 이동합니다</p>

        <button
          onClick={() => navigate('/goals/create')}
          className="w-full mb-3 py-3 bg-indigo-600 text-white rounded-xl font-semibold min-h-[44px]"
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
