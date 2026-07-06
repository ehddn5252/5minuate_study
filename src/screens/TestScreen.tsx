import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGoalStore, useSessionStore, useQuizStore, useAppStore } from '../store';
import { getTodaySession, saveSession, addToWrongPool, removeFromWrongPool, getSessions, getActiveWrongPool, getQuizzes } from '../utils/storage';
import { checkAndAwardBadges } from '../utils/badges';
import { generateId } from '../utils/id';
import { isSpeechSupported, speakQueue, pauseSpeech, resumeSpeech, stopSpeech, isPaused } from '../utils/speech';
import { sanitizeQuiz } from '../utils/quizValidation';
import { getGrowthFeedback } from '../utils/growthFeedback';
import QuizCard from '../components/QuizCard';
import type { Quiz } from '../types';

const SPEECH_RATES = [1, 1.25, 1.5];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function TestScreen() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { goals, updateGoal } = useGoalStore();
  const { updateSession } = useSessionStore();
  const { quizzes, updateQuiz } = useQuizStore();
  const { appState, updateAppState } = useAppStore();

  const goal = goals.find((g) => g.id === goalId);
  const [testQuizzes, setTestQuizzes] = useState<Quiz[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [answered, setAnswered] = useState(false);
  const initialized = useRef(false);

  // F-25: 듣는 5분 학습 — 오디오 퍼스트 모드
  const [audioMode, setAudioMode] = useState(appState.audioModeEnabled);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rateIdx, setRateIdx] = useState(0);

  useEffect(() => {
    return () => stopSpeech();
  }, []);

  // 문항이 바뀌면 이전 문항 낭독은 멈춘다(자동으로 다음 문항을 읽지는 않음)
  useEffect(() => {
    stopSpeech();
    setIsPlaying(false);
  }, [currentIndex]);

  useEffect(() => {
    if (!goal || initialized.current) return;
    initialized.current = true;

    const todaySession = getTodaySession(goal.id);
    const allQuizzes = getQuizzes();

    // F-19: 이전에 저장된 문항 순서가 있으면 그대로 복원(중단 후 재개)
    if (todaySession?.testQuizIds && todaySession.testQuizIds.length > 0) {
      const restored = todaySession.testQuizIds
        .map((id) => allQuizzes.find((q) => q.id === id))
        .filter((q): q is Quiz => q !== undefined);
      const savedAnswers = todaySession.quizAnswers ?? [];
      setTestQuizzes(restored);
      setAnswers(savedAnswers);
      setCurrentIndex(Math.min(savedAnswers.length, Math.max(restored.length - 1, 0)));
      setAnswered(savedAnswers.length >= restored.length);
      return;
    }

    // 오늘 세션의 dailyQuizIds 우선 사용, 없으면 goal.quizPoolIds fallback
    // 정답-선택지가 안 맞는 등 손상된 문제(과거에 저장된 데이터 포함)는 출제 대상에서 제외
    const dailyIds = todaySession?.dailyQuizIds ?? [];
    const pool = (dailyIds.length > 0
      ? allQuizzes.filter((q) => dailyIds.includes(q.id))
      : allQuizzes.filter((q) => goal.quizPoolIds.includes(q.id))
    ).filter((q) => sanitizeQuiz(q) !== null);

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

    const selected = [...fromWrong, ...fromCorrect].slice(0, TARGET);
    setTestQuizzes(selected);

    // F-19: 문항 순서를 세션에 고정 저장해 중단 후에도 같은 문항으로 재개되게 함
    if (todaySession) {
      const updated = { ...todaySession, testQuizIds: selected.map((q) => q.id), quizAnswers: [] };
      saveSession(updated);
      updateSession(updated);
    }
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

  const handleToggleAudioMode = () => {
    const next = !audioMode;
    setAudioMode(next);
    updateAppState({ audioModeEnabled: next });
    if (!next) {
      stopSpeech();
      setIsPlaying(false);
    }
  };

  const buildSpeechTexts = (): string[] => {
    const texts = [currentQuiz.question];
    if (currentQuiz.type === 'multiple_choice' && currentQuiz.options) {
      texts.push(...currentQuiz.options);
    }
    return texts;
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      pauseSpeech();
      setIsPlaying(false);
      return;
    }
    if (isPaused()) {
      resumeSpeech();
      setIsPlaying(true);
      return;
    }
    speakQueue(buildSpeechTexts(), SPEECH_RATES[rateIdx], () => setIsPlaying(false));
    setIsPlaying(true);
  };

  const handleCycleRate = () => {
    const nextIdx = (rateIdx + 1) % SPEECH_RATES.length;
    setRateIdx(nextIdx);
    if (isPlaying) {
      speakQueue(buildSpeechTexts(), SPEECH_RATES[nextIdx], () => setIsPlaying(false));
    }
  };

  const handleAnswer = (correct: boolean) => {
    const nextAnswers = [...answers, correct];
    setAnswers(nextAnswers);
    setAnswered(true);

    // F-19: 진행 상황을 즉시 저장해 중단 후에도 이어서 진행할 수 있게 함
    const todaySession = getTodaySession(goal.id);
    if (todaySession) {
      const updatedSession = { ...todaySession, quizAnswers: nextAnswers };
      saveSession(updatedSession);
      updateSession(updatedSession);
    }

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
      // 같은 날 여러 번 학습을 이어가도(다음 학습 계속하기) 스트릭은 하루에 한 번만 증가
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const allSessions = getSessions();
      const alreadyCompletedToday = allSessions.some(
        (s) => s.goalId === goal.id && s.date === today && s.status === 'completed' && s.id !== sessionId
      );
      const hadYesterdaySession = allSessions.some(
        (s) => s.goalId === goal.id && s.date === yesterdayStr && s.status === 'completed'
      );
      // F-18: 어제 세션이 없어도, 남은 "리듬 유지권"이 있으면 스트릭을 끊지 않고 이어감
      const freezeAvailable = (goal.streakFreezeRemaining ?? 0) > 0 && goal.streak > 0;
      const canUseFreeze = !alreadyCompletedToday && !hadYesterdaySession && freezeAvailable;
      const usedFreeze = canUseFreeze;
      const newStreak = alreadyCompletedToday
        ? goal.streak
        : hadYesterdaySession || canUseFreeze
          ? goal.streak + 1
          : 1;
      const newCompletedSessions = goal.completedSessions + 1;
      const isGoalComplete = goal.totalSessions > 0 && newCompletedSessions >= goal.totalSessions;

      // 30세션마다 리듬 유지권 1개 재충전(최대 2개)
      const FREEZE_CAP = 2;
      const freezeAfterUse = usedFreeze
        ? (goal.streakFreezeRemaining ?? 0) - 1
        : (goal.streakFreezeRemaining ?? 0);
      const newFreezeRemaining = newCompletedSessions % 30 === 0
        ? Math.min(FREEZE_CAP, freezeAfterUse + 1)
        : freezeAfterUse;

      const updatedGoal = {
        ...goal,
        completedSessions: newCompletedSessions,
        streak: newStreak,
        bestStreak: Math.max(goal.bestStreak, newStreak),
        streakFreezeRemaining: newFreezeRemaining,
        ...(isGoalComplete ? { status: 'completed' as const, completedAt: new Date().toISOString() } : {}),
      };
      updateGoal(updatedGoal);

      const newBadges = checkAndAwardBadges(goal.id, newStreak);

      // F-31: "지난 나" 대비 성장 피드백 — 같은 목표의 자기 이력만 비교(타인/랭킹 비교 아님)
      const growthFeedback = getGrowthFeedback(goal.id, score, total, sessionId);

      if (isGoalComplete) {
        navigate(`/goal-complete/${goal.id}`, {
          state: { score, total, streak: newStreak, completedSessions: newCompletedSessions, newBadges, topic: goal.topic, growthFeedback },
        });
      } else {
        navigate(`/complete/${sessionId}`, {
          state: { score, total, streak: newStreak, newBadges, topic: goal.topic, usedFreeze, growthFeedback },
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
          {isSpeechSupported() && (
            <button
              onClick={handleToggleAudioMode}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-sm font-medium min-h-[44px] transition-colors ${
                audioMode ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              🔊
            </button>
          )}
        </div>

        {audioMode && (
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={handleTogglePlay}
              className="flex-1 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 font-semibold text-sm min-h-[44px]"
            >
              {isPlaying ? '⏸ 일시정지' : '▶ 문제 듣기'}
            </button>
            <button
              onClick={handleCycleRate}
              className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm min-h-[44px]"
            >
              {SPEECH_RATES[rateIdx]}x
            </button>
          </div>
        )}

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
