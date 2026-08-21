import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGoalStore, useQuizStore } from '../store';
import { getActiveWrongPool, addToWrongPool, removeFromWrongPool, getQuizzes } from '../utils/storage';
import { nextReviewSchedule } from '../utils/spacedRepetition';
import QuizCard from '../components/QuizCard';
import type { Quiz } from '../types';

export default function RetryWrongScreen() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { goals } = useGoalStore();
  const { updateQuiz } = useQuizStore();

  const goal = goals.find((g) => g.id === goalId);
  const [quizList, setQuizList] = useState<Quiz[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!goal || initialized.current) return;
    initialized.current = true;

    const pool = getActiveWrongPool(goal.id);
    const allQuizzes = getQuizzes();
    const list = pool
      .map((entry) => allQuizzes.find((q) => q.id === entry.quizId))
      .filter((q): q is Quiz => q !== undefined);
    setQuizList(list);
  }, [goal]);

  if (!goal || quizList.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <p className="text-gray-500 mb-6">다시 풀 오답이 없어요.</p>
          <button
            onClick={() => navigate('/wrong-pool')}
            className="px-6 py-3 bg-[var(--accent-600)] text-white rounded-xl font-semibold min-h-[44px]"
          >
            오답 목록으로
          </button>
        </div>
      </div>
    );
  }

  const currentQuiz = quizList[currentIndex];
  const isLast = currentIndex === quizList.length - 1;

  const handleAnswer = (correct: boolean) => {
    setAnswers((prev) => [...prev, correct]);
    setAnswered(true);

    // D-1: 여기서 정답 처리를 놓치면 오답풀 "졸업" 문제가 간격 반복 스케줄에 반영되지 않는다
    const { intervalIndex, nextReviewAt } = nextReviewSchedule(currentQuiz.intervalIndex, correct);

    if (correct) {
      updateQuiz({
        ...currentQuiz,
        isWrong: false,
        lastAttemptedAt: new Date().toISOString(),
        intervalIndex,
        nextReviewAt,
      });
      removeFromWrongPool(goal.id, currentQuiz.id);
    } else {
      const existing = getActiveWrongPool(goal.id).find((w) => w.quizId === currentQuiz.id);
      updateQuiz({
        ...currentQuiz,
        wrongCount: currentQuiz.wrongCount + 1,
        lastAttemptedAt: new Date().toISOString(),
        intervalIndex,
        nextReviewAt,
      });
      addToWrongPool({
        goalId: goal.id,
        quizId: currentQuiz.id,
        addedAt: existing?.addedAt ?? new Date().toISOString(),
        retryCount: (existing?.retryCount ?? 0) + 1,
      });
    }
  };

  const handleNext = () => {
    if (isLast) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setAnswered(false);
    }
  };

  if (finished) {
    const score = answers.filter(Boolean).length;
    return (
      <div className="min-h-screen bg-[var(--page-bg)] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔁</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">다시 풀기 완료!</h1>
          <p className="text-gray-500 mb-8">
            {score} / {quizList.length}개를 맞혔어요
          </p>
          <button
            onClick={() => navigate('/wrong-pool')}
            className="w-full py-3 bg-[var(--accent-600)] text-white rounded-xl font-semibold min-h-[44px]"
          >
            오답 목록으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] flex flex-col">
      <div className="max-w-md mx-auto w-full flex flex-col flex-1 px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/wrong-pool')}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="뒤로"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>오답 다시 풀기 · {goal.topic}</span>
              <span>{currentIndex + 1}/{quizList.length}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${((currentIndex + (answered ? 1 : 0)) / quizList.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex-1">
          <QuizCard
            key={currentQuiz.id}
            quiz={currentQuiz}
            index={currentIndex}
            total={quizList.length}
            onAnswer={handleAnswer}
            mateTone={goal.mateTone}
          />
        </div>

        {answered && (
          <button
            onClick={handleNext}
            className="w-full mt-4 py-4 bg-[var(--accent-600)] text-white rounded-xl font-semibold text-base min-h-[44px] active:scale-95 transition-transform"
          >
            {isLast ? '결과 보기' : '다음 문제'}
          </button>
        )}
      </div>
    </div>
  );
}
