import { useNavigate } from 'react-router-dom';
import { useGoalStore, useQuizStore } from '../store';
import BottomNav from '../components/BottomNav';
import type { Quiz } from '../types';

export default function MyQuestionBookScreen() {
  const navigate = useNavigate();
  const { goals } = useGoalStore();
  const { quizzes, updateQuiz } = useQuizStore();

  const sections = goals
    .map((goal) => {
      const bookmarked = quizzes.filter((q) => q.goalId === goal.id && q.bookmarked);
      return { goal, bookmarked };
    })
    .filter((s) => s.bookmarked.length > 0);

  const handleRemove = (quiz: Quiz) => {
    updateQuiz({ ...quiz, bookmarked: false });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">내 문제집</h1>
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
          sections.map(({ goal, bookmarked }) => (
            <div key={goal.id} className="mb-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 px-1">
                {goal.topic}
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
                  <p className="text-indigo-600 text-sm mb-1.5 pl-1">
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
