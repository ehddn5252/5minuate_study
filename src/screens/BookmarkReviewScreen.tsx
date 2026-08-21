import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoalStore, useQuizStore } from '../store';
import { getActiveWrongPool, addToWrongPool, removeFromWrongPool } from '../utils/storage';
import { nextReviewSchedule } from '../utils/spacedRepetition';
import QuizCard from '../components/QuizCard';
import type { Quiz } from '../types';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// F-63: 내 문제집(북마크)은 지금까지 문제·정답·해설을 바로 보여주기만 해서 "다시 읽기"였지
// "다시 풀기"가 아니었다 — 인출 연습(retrieval practice) 관점에서 재학습 효과가 약하다.
// 이 화면은 RetryWrongScreen과 같은 구조로 북마크된 문제를 실제로 풀게 한다. 오답 처리도
// TestScreen의 applySrsUpdate와 동일하게 오답풀에 반영해, 어디서 풀었든 오답노트에 모이게 한다.
export default function BookmarkReviewScreen() {
  const navigate = useNavigate();
  const { goals } = useGoalStore();
  const { quizzes, updateQuiz } = useQuizStore();

  const [quizList, setQuizList] = useState<Quiz[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setQuizList(shuffleArray(quizzes.filter((q) => q.bookmarked)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (quizList.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-4">🔖</div>
          <p className="text-gray-500 mb-6">담아둔 문제가 없어요.</p>
          <button
            onClick={() => navigate('/my-questions')}
            className="px-6 py-3 bg-[var(--accent-600)] text-white rounded-xl font-semibold min-h-[44px]"
          >
            내 문제집으로
          </button>
        </div>
      </div>
    );
  }

  const currentQuiz = quizList[currentIndex];
  const currentGoal = goals.find((g) => g.id === currentQuiz.goalId);
  const isLast = currentIndex === quizList.length - 1;

  const handleAnswer = (correct: boolean) => {
    setAnswers((prev) => [...prev, correct]);
    setAnswered(true);

    const { intervalIndex, nextReviewAt } = nextReviewSchedule(currentQuiz.intervalIndex, correct);

    if (correct) {
      updateQuiz({
        ...currentQuiz,
        isWrong: false,
        lastAttemptedAt: new Date().toISOString(),
        intervalIndex,
        nextReviewAt,
      });
      removeFromWrongPool(currentQuiz.goalId, currentQuiz.id);
    } else {
      const existing = getActiveWrongPool(currentQuiz.goalId).find((w) => w.quizId === currentQuiz.id);
      updateQuiz({
        ...currentQuiz,
        isWrong: true,
        wrongCount: currentQuiz.wrongCount + 1,
        lastAttemptedAt: new Date().toISOString(),
        intervalIndex,
        nextReviewAt,
      });
      addToWrongPool({
        goalId: currentQuiz.goalId,
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
          <div className="text-6xl mb-4">🔖</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">북마크 복습 완료!</h1>
          <p className="text-gray-500 mb-8">
            {score} / {quizList.length}개를 맞혔어요
          </p>
          <button
            onClick={() => navigate('/my-questions')}
            className="w-full py-3 bg-[var(--accent-600)] text-white rounded-xl font-semibold min-h-[44px]"
          >
            내 문제집으로
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
            onClick={() => navigate('/my-questions')}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="뒤로"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>북마크 복습</span>
              <span>{currentIndex + 1}/{quizList.length}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent-500)] rounded-full transition-all"
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
            mateTone={currentGoal?.mateTone}
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
