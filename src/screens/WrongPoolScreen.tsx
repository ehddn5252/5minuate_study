import { useNavigate } from 'react-router-dom';
import { useGoalStore, useQuizStore } from '../store';
import { getActiveWrongPool } from '../utils/storage';
import BottomNav from '../components/BottomNav';
import type { Quiz } from '../types';

export default function WrongPoolScreen() {
  const navigate = useNavigate();
  const { goals } = useGoalStore();
  const { quizzes } = useQuizStore();

  const sections = goals
    .filter((g) => g.status === 'active')
    .map((goal) => {
      const pool = getActiveWrongPool(goal.id);
      const wrongQuizzes = pool
        .map((entry) => quizzes.find((q) => q.id === entry.quizId))
        .filter((q): q is Quiz => q !== undefined);
      return { goal, wrongQuizzes };
    })
    .filter((s) => s.wrongQuizzes.length > 0);

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
          <h1 className="text-xl font-bold text-gray-900">오답 목록</h1>
        </div>

        {sections.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">오답이 없어요!</h2>
            <p className="text-gray-500 text-sm">
              모든 문제를 맞혔거나<br />아직 학습을 시작하지 않았어요.
            </p>
          </div>
        ) : (
          sections.map(({ goal, wrongQuizzes }) => (
            <div key={goal.id} className="mb-6">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {goal.topic}
                </h2>
                <button
                  onClick={() => navigate(`/retry/${goal.id}`)}
                  className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full min-h-[28px]"
                >
                  🔁 다시 풀기
                </button>
              </div>
              {wrongQuizzes.map((quiz) => (
                <div key={quiz.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5">
                      오답
                    </span>
                    <p className="text-gray-900 text-sm font-medium leading-snug">{quiz.question}</p>
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
