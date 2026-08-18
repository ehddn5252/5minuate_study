import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGoalStore } from '../store';

export default function GoalEditScreen() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { goals, updateGoal } = useGoalStore();

  const goal = goals.find((g) => g.id === goalId);

  const today = new Date().toISOString().split('T')[0];
  const [deadline, setDeadline] = useState(goal?.deadline ?? today);
  const [saved, setSaved] = useState(false);

  if (!goal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">목표를 찾을 수 없습니다.</p>
          <button
            onClick={() => navigate('/goals')}
            className="px-6 py-3 bg-[var(--accent-600)] text-white rounded-xl font-medium min-h-[44px]"
          >
            목표 목록으로
          </button>
        </div>
      </div>
    );
  }

  const originalDeadline = goal.deadline;

  const calcTotalSessions = (createdAt: string, newDeadline: string): number => {
    const start = new Date(createdAt);
    const end = new Date(newDeadline);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(diff, goal.completedSessions);
  };

  const newTotalSessions = calcTotalSessions(goal.createdAt, deadline);

  const isEarlier = deadline < originalDeadline;

  const handleSave = () => {
    if (deadline <= today) return;
    const updated = {
      ...goal,
      deadline,
      totalSessions: newTotalSessions,
    };
    updateGoal(updated);
    setSaved(true);
    setTimeout(() => {
      navigate('/goals');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/goals')}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900 flex-1">목표 수정</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">주제</label>
            <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 text-base">
              {goal.topic}
            </div>
            <p className="text-xs text-gray-400 mt-1">주제는 수정할 수 없습니다.</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">기한</label>
            <input
              type="date"
              value={deadline}
              min={
                (() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  return d.toISOString().split('T')[0];
                })()
              }
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent text-base"
            />
          </div>

          {isEarlier && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-100 rounded-xl">
              <p className="text-orange-600 text-sm">
                기한을 앞당기면 하루 분량이 늘어날 수 있습니다.
              </p>
            </div>
          )}

          <div className="mb-4 text-sm text-gray-500">
            <span>예상 총 세션 수: </span>
            <span className="font-semibold text-gray-900">{newTotalSessions}일</span>
            <span className="ml-2 text-xs text-gray-400">
              (완료: {goal.completedSessions}일 유지)
            </span>
          </div>

          <button
            onClick={handleSave}
            disabled={deadline <= today || saved}
            className="w-full py-3 bg-[var(--accent-600)] text-white rounded-xl font-semibold min-h-[44px] disabled:opacity-40"
          >
            {saved ? '저장됨!' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
