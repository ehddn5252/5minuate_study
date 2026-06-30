import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGoalStore, useSessionStore, useQuizStore, useAppStore } from '../store';
import { getTodaySession, saveSession } from '../utils/storage';
import { generateDailyContent } from '../services/gemini';
import { generateId } from '../utils/id';

export default function LearningScreen() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { goals } = useGoalStore();
  const { updateSession } = useSessionStore();
  const { addQuizzes } = useQuizStore();
  const { appState } = useAppStore();

  const goal = goals.find((g) => g.id === goalId);

  const [summary, setSummary] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!goal) return;

    let session = getTodaySession(goal.id);
    if (!session) {
      session = {
        id: generateId(),
        goalId: goal.id,
        date: new Date().toISOString().split('T')[0],
        status: 'in_progress' as const,
        selectedQuizIds: [],
      };
      saveSession(session);
    }

    // 이미 오늘 콘텐츠가 생성된 경우 → 그대로 표시
    if (session.summaryContent) {
      setSummary(session.summaryContent);
      return;
    }

    // 오늘 콘텐츠 새로 생성
    if (!appState.geminiApiKey) {
      setError('Gemini API 키가 설정되지 않았습니다. 설정에서 입력해주세요.');
      return;
    }

    const dayNum = goal.completedSessions + 1;
    const totalDays = goal.totalSessions;
    const capturedSession = session;

    setGenerating(true);
    generateDailyContent(
      goal.id,
      goal.topic,
      dayNum,
      totalDays,
      appState.geminiApiKey,
      goal.rawContent
    )
      .then(({ summary: s, quizzes }) => {
        addQuizzes(quizzes);
        const updated = {
          ...capturedSession,
          summaryContent: s,
          dailyQuizIds: quizzes.map((q) => q.id),
        };
        saveSession(updated);
        updateSession(updated);
        setSummary(s);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setGenerating(false));
  // goal.id만 의존: 목표가 바뀔 때만 재실행
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal?.id]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) setScrolled(true);
  };

  const handleStartTest = () => {
    if (!goal) return;
    const session = getTodaySession(goal.id);
    if (session) {
      const updated = { ...session, summaryViewedAt: new Date().toISOString() };
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

  const dayNum = goal.completedSessions + 1;
  const bullets = summary.split('\n').filter((l) => l.trim());

  // 로딩 화면
  if (generating) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <svg className="animate-spin w-10 h-10 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-gray-600 font-medium text-center">
          {dayNum}일째 학습 콘텐츠 생성 중…
        </p>
        <p className="text-gray-400 text-sm text-center">약 10~20초 소요됩니다</p>
      </div>
    );
  }

  // 에러 화면
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-red-500 text-center">{error}</p>
        <button
          onClick={() => navigate('/settings')}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold"
        >
          설정으로 이동
        </button>
        <button onClick={() => navigate('/')} className="text-gray-400 text-sm">
          홈으로
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="max-w-md mx-auto w-full flex flex-col flex-1 px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">{goal.topic}</h1>
            <p className="text-gray-400 text-xs mt-0.5">
              {dayNum}일째 / 전체 {goal.totalSessions}일 · 약 5분
            </p>
          </div>
        </div>

        <div
          className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4 overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 260px)' }}
          onScroll={handleScroll}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-indigo-100 text-indigo-600 text-xs font-semibold px-3 py-1 rounded-full">
              Day {dayNum}
            </span>
            <h2 className="text-sm font-semibold text-gray-500">오늘의 핵심 내용</h2>
          </div>
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
          disabled={!summary}
          className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold text-base min-h-[44px] active:opacity-80 transition-opacity disabled:opacity-40"
        >
          테스트 시작
        </button>
      </div>
    </div>
  );
}
