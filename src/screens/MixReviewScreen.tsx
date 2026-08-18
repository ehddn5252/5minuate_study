import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoalStore, useQuizStore } from '../store';
import { getActiveWrongPool, addToWrongPool, removeFromWrongPool, getQuizzes } from '../utils/storage';
import { nextReviewSchedule, categorizeForReview } from '../utils/spacedRepetition';
import { sanitizeQuiz } from '../utils/quizValidation';
import QuizCard from '../components/QuizCard';
import type { Goal, Quiz } from '../types';

const TARGET = 5;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface GoalQueue {
  wrong: Quiz[];
  due: Quiz[];
  fresh: Quiz[];
  rest: Quiz[];
}

// D-4: 목표별 우선순위(오답 → 오늘 복습 예정 → 신규 → 나머지)는 F-09/D-1과 동일하게 유지하되,
// 여러 목표를 한 세션에 인터리빙하기 위해 버킷을 분리해서 반환한다. 오답 버킷을 따로 두는 이유는
// 호출부에서 F-09와 동일하게 세션 전체 기준 50% 캡을 적용하기 위함(버킷 순서만으론 캡을 못 건다).
function buildGoalQueue(goalId: string, allQuizzes: Quiz[], today: string): GoalQueue {
  const pool = allQuizzes.filter((q) => q.goalId === goalId && sanitizeQuiz(q) !== null);
  const wrongIds = new Set(getActiveWrongPool(goalId).map((w) => w.quizId));
  const wrong = shuffleArray(pool.filter((q) => wrongIds.has(q.id)));
  const nonWrong = pool.filter((q) => !wrongIds.has(q.id));
  const due = shuffleArray(nonWrong.filter((q) => categorizeForReview(q, today) === 'due'));
  const fresh = shuffleArray(nonWrong.filter((q) => categorizeForReview(q, today) === 'new'));
  const rest = shuffleArray(nonWrong.filter((q) => categorizeForReview(q, today) === 'scheduled'));
  return { wrong, due, fresh, rest };
}

export default function MixReviewScreen() {
  const navigate = useNavigate();
  const { goals } = useGoalStore();
  const { updateQuiz } = useQuizStore();

  const [mixList, setMixList] = useState<Quiz[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const activeGoals = goals.filter((g) => g.status === 'active');
    const allQuizzes = getQuizzes();
    const today = new Date().toISOString().split('T')[0];
    const queues = activeGoals.map((g) => buildGoalQueue(g.id, allQuizzes, today));

    // 인터리빙: 목표를 한 바퀴씩 돌며 한 문제씩 뽑아 여러 주제가 섞이게 한다(blocked practice 방지).
    // F-09와 동일하게 오답 문제는 세션 전체의 최대 50%로 캡을 걸어, 오답이 많은 목표 하나가
    // 믹스 세션을 독점하지 않게 한다.
    const selected: Quiz[] = [];
    const roundRobinPull = (pickBucket: (q: GoalQueue) => Quiz[], limit: number) => {
      let progressed = true;
      while (selected.length < limit && progressed) {
        progressed = false;
        for (const queue of queues) {
          if (selected.length >= limit) break;
          const bucket = pickBucket(queue);
          const next = bucket.shift();
          if (next) {
            selected.push(next);
            progressed = true;
          }
        }
      }
    };

    const maxWrong = Math.floor(TARGET * 0.5);
    roundRobinPull((q) => q.wrong, Math.min(TARGET, maxWrong));
    roundRobinPull((q) => q.due, TARGET);
    roundRobinPull((q) => q.fresh, TARGET);
    roundRobinPull((q) => q.rest, TARGET);
    setMixList(selected);
  }, [goals]);

  const goalById = (goalId: string): Goal | undefined => goals.find((g) => g.id === goalId);

  if (mixList.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-4">🔀</div>
          <p className="text-gray-500 mb-6">
            복습 믹스를 만들려면 진행 중인 목표가 2개 이상이고,<br />풀 문제가 있어야 해요.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold min-h-[44px]"
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  const currentQuiz = mixList[currentIndex];
  const currentGoal = goalById(currentQuiz.goalId);
  const isLast = currentIndex === mixList.length - 1;

  const handleAnswer = (correct: boolean) => {
    setAnswers((prev) => [...prev, correct]);
    setAnswered(true);

    // D-1과 동일하게 개별 문제의 복습 스케줄은 갱신하되, 목표의 스트릭·세션 진행률은
    // 건드리지 않는다(D-4는 완전히 별도 트랙 — "5분 완결" 핵심 루프와 독립).
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔀</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">복습 믹스 완료!</h1>
          <p className="text-gray-500 mb-8">
            {score} / {mixList.length}개를 맞혔어요
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold min-h-[44px]"
          >
            홈으로
          </button>
        </div>
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
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>🔀 오늘의 복습 믹스 · {currentGoal?.topic ?? ''}</span>
              <span>{currentIndex + 1}/{mixList.length}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{ width: `${((currentIndex + (answered ? 1 : 0)) / mixList.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex-1">
          <QuizCard
            key={currentQuiz.id}
            quiz={currentQuiz}
            index={currentIndex}
            total={mixList.length}
            onAnswer={handleAnswer}
            mateTone={currentGoal?.mateTone}
          />
        </div>

        {answered && (
          <button
            onClick={handleNext}
            className="w-full mt-4 py-4 bg-indigo-600 text-white rounded-xl font-semibold text-base min-h-[44px] active:scale-95 transition-transform"
          >
            {isLast ? '결과 보기' : '다음 문제'}
          </button>
        )}
      </div>
    </div>
  );
}
