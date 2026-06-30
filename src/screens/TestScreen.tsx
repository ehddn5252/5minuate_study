import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGoalStore, useSessionStore, useQuizStore } from '../store';
import { getTodaySession, saveSession, addToWrongPool, removeFromWrongPool, getSessions, getActiveWrongPool } from '../utils/storage';
import { checkAndAwardBadges } from '../utils/badges';
import { generateId } from '../utils/id';
import type { Quiz } from '../types';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface QuizCardProps {
  quiz: Quiz;
  index: number;
  total: number;
  onAnswer: (correct: boolean) => void;
}

function QuizCard({ quiz, index, total, onAnswer }: QuizCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [shortInput, setShortInput] = useState('');
  const [revealed, setRevealed] = useState(false);

  const handleMultipleChoice = (option: string) => {
    if (revealed) return;
    setSelected(option);
    setRevealed(true);
    onAnswer(option === quiz.answer);
  };

  const handleShortAnswer = () => {
    if (revealed) return;
    setRevealed(true);
    const correct =
      shortInput.trim().toLowerCase() === quiz.answer.trim().toLowerCase();
    onAnswer(correct);
  };

  const isCorrect =
    revealed &&
    (quiz.type === 'multiple_choice'
      ? selected === quiz.answer
      : shortInput.trim().toLowerCase() === quiz.answer.trim().toLowerCase());

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          {quiz.type === 'multiple_choice' ? '객관식' : '단답형'}
        </span>
        <span className="text-xs text-gray-400">
          {index + 1} / {total}
        </span>
      </div>

      <p className="text-gray-900 text-base font-medium leading-relaxed mb-5">
        {quiz.question}
      </p>

      {quiz.type === 'multiple_choice' && quiz.options ? (
        <div className="space-y-3">
          {quiz.options.map((option) => {
            let cls =
              'w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors min-h-[44px] ';
            if (!revealed) {
              cls += 'border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50';
            } else if (option === quiz.answer) {
              cls += 'border-green-500 bg-green-50 text-green-700';
            } else if (option === selected) {
              cls += 'border-red-400 bg-red-50 text-red-700';
            } else {
              cls += 'border-gray-200 text-gray-400';
            }
            return (
              <button
                key={option}
                onClick={() => handleMultipleChoice(option)}
                className={cls}
                disabled={revealed}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            value={shortInput}
            onChange={(e) => setShortInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !revealed && handleShortAnswer()}
            placeholder="답을 입력하세요"
            disabled={revealed}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
          />
          {!revealed && (
            <button
              onClick={handleShortAnswer}
              disabled={!shortInput.trim()}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold min-h-[44px] disabled:opacity-40"
            >
              제출
            </button>
          )}
        </div>
      )}

      {revealed && (
        <div
          className={`mt-4 p-4 rounded-xl ${
            isCorrect ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
          }`}
        >
          <p
            className={`font-semibold text-sm mb-1 ${
              isCorrect ? 'text-green-700' : 'text-amber-700'
            }`}
          >
            {isCorrect ? '정답입니다!' : '다음에 다시 나와요'}
          </p>
          {!isCorrect && (
            <p className="text-amber-600 text-sm mb-1">
              정답: <strong>{quiz.answer}</strong>
            </p>
          )}
          <p className="text-gray-600 text-sm">{quiz.explanation}</p>
        </div>
      )}
    </div>
  );
}

export default function TestScreen() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { goals, updateGoal } = useGoalStore();
  const { updateSession } = useSessionStore();
  const { quizzes, updateQuiz } = useQuizStore();

  const goal = goals.find((g) => g.id === goalId);
  const [testQuizzes, setTestQuizzes] = useState<Quiz[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [answered, setAnswered] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!goal || initialized.current) return;
    initialized.current = true;

    const pool = quizzes.filter((q) => goal.quizPoolIds.includes(q.id));
    const TARGET = Math.min(5, pool.length);

    // F-09: prioritise wrong answers (up to 50% of TARGET)
    const wrongPoolEntries = getActiveWrongPool(goal.id);
    const wrongQuizIds = new Set(wrongPoolEntries.map((w) => w.quizId));
    const wrongQuizzes = shuffleArray(pool.filter((q) => wrongQuizIds.has(q.id)));
    const correctQuizzes = shuffleArray(pool.filter((q) => !wrongQuizIds.has(q.id)));

    const maxWrong = Math.floor(TARGET * 0.5);
    const fromWrong = wrongQuizzes.slice(0, maxWrong);
    const remaining = TARGET - fromWrong.length;
    const fromCorrect = correctQuizzes.slice(0, remaining);

    setTestQuizzes([...fromWrong, ...fromCorrect].slice(0, TARGET));
  }, [goal, quizzes]);

  if (!goal || testQuizzes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">퀴즈를 불러오는 중...</p>
      </div>
    );
  }

  const currentQuiz = testQuizzes[currentIndex];
  const isLast = currentIndex === testQuizzes.length - 1;

  const handleAnswer = (correct: boolean) => {
    setAnswers((prev) => [...prev, correct]);
    setAnswered(true);

    const quiz = testQuizzes[currentIndex];
    if (!correct) {
      const updated = {
        ...quiz,
        isWrong: true,
        wrongCount: quiz.wrongCount + 1,
        lastAttemptedAt: new Date().toISOString(),
      };
      updateQuiz(updated);
      addToWrongPool({
        goalId: goal.id,
        quizId: quiz.id,
        addedAt: new Date().toISOString(),
        retryCount: 0,
      });
    } else {
      updateQuiz({
        ...quiz,
        isWrong: false,
        lastAttemptedAt: new Date().toISOString(),
      });
      removeFromWrongPool(goal.id, quiz.id);
    }
  };

  const handleNext = () => {
    if (isLast) {
      const score = [...answers].filter(Boolean).length;
      const total = testQuizzes.length;

      // Update session
      const existingSession = getTodaySession(goal.id);
      let sessionId: string;
      if (existingSession) {
        sessionId = existingSession.id;
        const updatedSession = {
          ...existingSession,
          status: 'completed' as const,
          completedAt: new Date().toISOString(),
          selectedQuizIds: testQuizzes.map((q) => q.id),
          quizScore: score,
          quizTotal: total,
        };
        saveSession(updatedSession);
        updateSession(updatedSession);
      } else {
        sessionId = generateId();
        const newSession = {
          id: sessionId,
          goalId: goal.id,
          date: new Date().toISOString().split('T')[0],
          status: 'completed' as const,
          completedAt: new Date().toISOString(),
          selectedQuizIds: testQuizzes.map((q) => q.id),
          quizScore: score,
          quizTotal: total,
        };
        saveSession(newSession);
        updateSession(newSession);
      }

      // Update streak: +1 if there was a completed session yesterday, else reset to 1
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const allSessions = getSessions();
      const hadYesterdaySession = allSessions.some(
        (s) => s.goalId === goal.id && s.date === yesterdayStr && s.status === 'completed'
      );
      const newStreak = hadYesterdaySession ? goal.streak + 1 : 1;
      const newCompletedSessions = goal.completedSessions + 1;
      const isGoalComplete = goal.totalSessions > 0 && newCompletedSessions >= goal.totalSessions;
      const updatedGoal = {
        ...goal,
        completedSessions: newCompletedSessions,
        streak: newStreak,
        bestStreak: Math.max(goal.bestStreak, newStreak),
        ...(isGoalComplete ? { status: 'completed' as const, completedAt: new Date().toISOString() } : {}),
      };
      updateGoal(updatedGoal);

      const newBadges = checkAndAwardBadges(goal.id, score, total, newStreak);

      if (isGoalComplete) {
        navigate(`/goal-complete/${goal.id}`, {
          state: { score, total, streak: newStreak, completedSessions: newCompletedSessions, newBadges, topic: goal.topic },
        });
      } else {
        navigate(`/complete/${sessionId}`, {
          state: { score, total, streak: newStreak, newBadges, topic: goal.topic },
        });
      }
    } else {
      setCurrentIndex((i) => i + 1);
      setAnswered(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="max-w-md mx-auto w-full flex flex-col flex-1 px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(`/learn/${goal.id}`)}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>진행</span>
              <span>{currentIndex + 1}/{testQuizzes.length}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${((currentIndex + (answered ? 1 : 0)) / testQuizzes.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex-1">
          <QuizCard
            key={currentQuiz.id}
            quiz={currentQuiz}
            index={currentIndex}
            total={testQuizzes.length}
            onAnswer={handleAnswer}
          />
        </div>

        {answered && (
          <button
            onClick={handleNext}
            className="w-full mt-4 py-4 bg-indigo-600 text-white rounded-xl font-semibold text-base min-h-[44px] active:opacity-80 transition-opacity"
          >
            {isLast ? '결과 보기' : '다음 문제'}
          </button>
        )}
      </div>
    </div>
  );
}
