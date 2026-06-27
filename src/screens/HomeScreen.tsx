import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoalStore, useSessionStore, useAppStore } from '../store';
import { getTodaySession, saveSession } from '../utils/storage';
import { generateId } from '../utils/id';
import type { Goal } from '../types';

function DaysLeft({ deadline }: { deadline: string }) {
  const today = new Date().toISOString().split('T')[0];
  const diff = Math.ceil(
    (new Date(deadline).getTime() - new Date(today).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return <span className="text-red-500 text-sm">마감 지남</span>;
  if (diff === 0) return <span className="text-orange-500 text-sm font-semibold">오늘 마감!</span>;
  return <span className="text-indigo-500 text-sm">D-{diff}</span>;
}

function GoalCard({ goal }: { goal: Goal }) {
  const navigate = useNavigate();
  const { loadSessions } = useSessionStore();

  const handleStart = () => {
    let session = getTodaySession(goal.id);
    if (!session) {
      session = {
        id: generateId(),
        goalId: goal.id,
        date: new Date().toISOString().split('T')[0],
        status: 'in_progress',
        selectedQuizIds: [],
      };
      saveSession(session);
      loadSessions();
    }
    navigate(`/learn/${goal.id}`);
  };

  const todaySession = getTodaySession(goal.id);
  const isDone = todaySession?.status === 'completed';
  const progress =
    goal.totalSessions > 0
      ? Math.round((goal.completedSessions / goal.totalSessions) * 100)
      : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">{goal.topic}</h3>
          <DaysLeft deadline={goal.deadline} />
        </div>
        {goal.streak > 0 && (
          <div className="flex items-center gap-1 bg-orange-50 rounded-full px-3 py-1">
            <span className="text-orange-500 text-sm font-semibold">
              🔥 {goal.streak}일
            </span>
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>진행률</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {isDone ? (
        <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-50 text-green-600 font-medium">
          <span>오늘 학습 완료!</span>
        </div>
      ) : (
        <button
          onClick={handleStart}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-base min-h-[44px] active:opacity-80 transition-opacity"
        >
          오늘 학습 시작 · 약 5분
        </button>
      )}
    </div>
  );
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const { goals, loadGoals } = useGoalStore();
  const { appState } = useAppStore();

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const activeGoals = goals.filter((g) => g.status === 'active');

  if (!appState.geminiApiKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <div className="text-4xl mb-4">🔑</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">API 키 설정 필요</h2>
          <p className="text-gray-500 text-sm mb-6">
            Gemini API 키를 입력해야 학습 콘텐츠를 생성할 수 있습니다.
          </p>
          <button
            onClick={() => navigate('/settings')}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold min-h-[44px]"
          >
            API 키 입력하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">오늘의 학습</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {new Date().toLocaleDateString('ko-KR', {
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })}
            </p>
          </div>
          <button
            onClick={() => navigate('/goals')}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {activeGoals.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📚</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">학습 목표가 없어요</h2>
            <p className="text-gray-500 text-sm mb-8">
              새로운 목표를 추가하고<br />하루 5분 학습을 시작해보세요!
            </p>
            <button
              onClick={() => navigate('/goals/create')}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-base min-h-[44px]"
            >
              첫 목표 만들기
            </button>
          </div>
        ) : (
          <>
            {activeGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
            <button
              onClick={() => navigate('/goals/create')}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-medium text-sm min-h-[44px] hover:border-indigo-300 hover:text-indigo-400 transition-colors"
            >
              + 목표 추가
            </button>
          </>
        )}
      </div>
    </div>
  );
}
