import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoalStore } from '../store';
import type { Goal } from '../types';

function DaysLeft({ deadline }: { deadline: string }) {
  const today = new Date().toISOString().split('T')[0];
  const diff = Math.ceil(
    (new Date(deadline).getTime() - new Date(today).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return <span className="text-red-500 text-xs">마감 지남</span>;
  if (diff === 0) return <span className="text-orange-500 text-xs font-semibold">오늘 마감!</span>;
  if (diff <= 3) return <span className="text-orange-400 text-xs">D-{diff}</span>;
  return <span className="text-gray-400 text-xs">D-{diff}</span>;
}

function GoalItem({ goal, onDeactivate }: { goal: Goal; onDeactivate: (id: string) => void }) {
  const navigate = useNavigate();
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const progress =
    goal.totalSessions > 0
      ? Math.round((goal.completedSessions / goal.totalSessions) * 100)
      : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-3">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{goal.topic}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <DaysLeft deadline={goal.deadline} />
            {goal.streak > 0 && (
              <span className="text-xs text-orange-500">🔥 {goal.streak}일 연속</span>
            )}
          </div>
        </div>
        <span
          className={`ml-2 flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
            goal.status === 'active'
              ? 'bg-green-100 text-green-600'
              : goal.status === 'completed'
              ? 'bg-blue-100 text-blue-600'
              : 'bg-gray-100 text-gray-400'
          }`}
        >
          {goal.status === 'active' ? '진행중' : goal.status === 'completed' ? '완료' : '중단'}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{goal.completedSessions}/{goal.totalSessions}일 완료</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress}%`,
              backgroundColor: progress >= 80 ? '#22c55e' : progress >= 50 ? '#6366f1' : '#94a3b8',
            }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        {goal.status === 'active' && (
          <button
            onClick={() => navigate(`/learn/${goal.id}`)}
            className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium min-h-[44px]"
          >
            학습하기
          </button>
        )}
        {goal.status === 'active' && !confirmDeactivate && (
          <button
            onClick={() => setConfirmDeactivate(true)}
            className="px-4 py-2 border border-gray-200 text-gray-500 rounded-xl text-sm min-h-[44px]"
          >
            중단
          </button>
        )}
        {confirmDeactivate && (
          <div className="flex-1 flex gap-2">
            <button
              onClick={() => setConfirmDeactivate(false)}
              className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm min-h-[44px]"
            >
              취소
            </button>
            <button
              onClick={() => {
                onDeactivate(goal.id);
                setConfirmDeactivate(false);
              }}
              className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-medium min-h-[44px]"
            >
              중단 확인
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoalListScreen() {
  const navigate = useNavigate();
  const { goals, updateGoal } = useGoalStore();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'inactive'>('active');

  const handleDeactivate = (id: string) => {
    const goal = goals.find((g) => g.id === id);
    if (goal) {
      updateGoal({ ...goal, status: 'inactive' });
    }
  };

  const filtered = filter === 'all' ? goals : goals.filter((g) => g.status === filter);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900 flex-1">학습 목표</h1>
          <button
            onClick={() => navigate('/goals/create')}
            className="p-2 rounded-xl bg-indigo-600 text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {(['active', 'all', 'completed', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium min-h-[36px] transition-colors ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {f === 'active' ? '진행중' : f === 'all' ? '전체' : f === 'completed' ? '완료' : '중단'}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">목표가 없습니다</p>
            <button
              onClick={() => navigate('/goals/create')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium min-h-[44px]"
            >
              목표 추가
            </button>
          </div>
        ) : (
          filtered.map((goal) => (
            <GoalItem key={goal.id} goal={goal} onDeactivate={handleDeactivate} />
          ))
        )}
      </div>
    </div>
  );
}
