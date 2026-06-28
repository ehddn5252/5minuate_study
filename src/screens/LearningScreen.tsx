import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGoalStore, useSessionStore } from '../store';
import { getTodaySession, saveSession } from '../utils/storage';
import { generateId } from '../utils/id';

export default function LearningScreen() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { goals } = useGoalStore();
  const { updateSession } = useSessionStore();

  const goal = goals.find((g) => g.id === goalId);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!goal) return;
    const session = getTodaySession(goal.id);
    if (!session) {
      const newSession = {
        id: generateId(),
        goalId: goal.id,
        date: new Date().toISOString().split('T')[0],
        status: 'in_progress' as const,
        selectedQuizIds: [],
      };
      saveSession(newSession);
    }
  }, [goal]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      setScrolled(true);
    }
  };

  const handleStartTest = () => {
    if (!goal) return;
    const session = getTodaySession(goal.id);
    if (session) {
      const updated = {
        ...session,
        summaryViewedAt: new Date().toISOString(),
      };
      saveSession(updated);
      updateSession(updated);
    }
    navigate(`/test/${goal.id}`);
  };

  if (!goal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">목표를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const bullets = goal.summaryContent
    .split('\n')
    .filter((line) => line.trim());

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="max-w-md mx-auto w-full flex flex-col flex-1 px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{goal.topic}</h1>
            <p className="text-gray-500 text-sm">오늘의 학습 요약 · 약 5분</p>
          </div>
        </div>

        <div
          className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4 overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 280px)' }}
          onScroll={handleScroll}
        >
          <h2 className="text-base font-semibold text-gray-700 mb-4">핵심 내용</h2>
          <ul className="space-y-4">
            {bullets.map((line, i) => {
              const text = line.replace(/^[•·\-*]\s*/, '').trim();
              if (!text) return null;
              return (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-gray-800 text-base leading-relaxed">{text}</p>
                </li>
              );
            })}
          </ul>
        </div>

        {!scrolled && bullets.length > 3 && (
          <p className="text-center text-gray-400 text-xs mb-2">
            아래로 스크롤하여 모두 읽어보세요 ↓
          </p>
        )}

        <button
          onClick={handleStartTest}
          className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold text-base min-h-[44px] active:opacity-80 transition-opacity"
        >
          테스트 시작
        </button>
      </div>
    </div>
  );
}
