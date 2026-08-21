import { useNavigate } from 'react-router-dom';
import { useGoalStore, useQuizStore } from '../store';
import BottomNav from '../components/BottomNav';
import type { Quiz } from '../types';

export default function MyQuestionBookScreen() {
  const navigate = useNavigate();
  const { goals } = useGoalStore();
  const { quizzes, updateQuiz } = useQuizStore();

  // 목표가 삭제돼도 북마크한 문제는 남아있으므로, goals가 아니라 북마크된 퀴즈를 기준으로
  // 묶는다. 목표를 찾을 수 없으면(삭제됨) 스냅샷으로 남긴 orphanedGoalTopic을 대신 쓴다.
  const sections = Array.from(
    quizzes
      .filter((q) => q.bookmarked)
      .reduce((map, quiz) => {
        const goal = goals.find((g) => g.id === quiz.goalId);
        const label = goal?.topic ?? quiz.orphanedGoalTopic ?? '삭제된 목표';
        const list = map.get(label) ?? [];
        list.push(quiz);
        map.set(label, list);
        return map;
      }, new Map<string, Quiz[]>())
  ).map(([topic, bookmarked]) => ({ topic, bookmarked }));

  const handleRemove = (quiz: Quiz) => {
    updateQuiz({ ...quiz, bookmarked: false });
  };

  return (
    <div className="min-h-screen bg-[var(--page-bg)] pb-16">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="뒤로"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900 flex-1">내 문제집</h1>
          {sections.length > 0 && (
            <button
              onClick={() => navigate('/bookmark-review')}
              className="flex-shrink-0 px-3 py-2 bg-[var(--accent-600)] text-white rounded-xl text-sm font-medium min-h-[40px]"
            >
              복습 시작
            </button>
          )}
        </div>

        {sections.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔖</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">담아둔 문제가 없어요</h2>
            <p className="text-gray-500 text-sm">
              학습 중 마음에 드는 문제를<br />담아서 모아보세요.
            </p>
          </div>
        ) : (
          sections.map(({ topic, bookmarked }) => (
            <div key={topic} className="mb-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 px-1">
                {topic}
              </h2>
              {bookmarked.map((quiz) => (
                <div key={quiz.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-gray-900 text-sm font-medium leading-snug flex-1">{quiz.question}</p>
                    <button
                      onClick={() => handleRemove(quiz)}
                      className="flex-shrink-0 text-gray-300 hover:text-red-400 text-lg leading-none min-h-[28px] min-w-[28px] flex items-center justify-center"
                      aria-label="담기 해제"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-[var(--accent-600)] text-sm mb-1.5 pl-1">
                    정답: <strong>{quiz.answer}</strong>
                  </p>
                  {quiz.explanation && (
                    <p className="text-gray-500 text-xs pl-1 leading-relaxed">{quiz.explanation}</p>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
}
