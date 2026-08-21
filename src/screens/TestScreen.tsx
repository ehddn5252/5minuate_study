import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGoalStore, useSessionStore, useQuizStore, useAppStore } from '../store';
import { getTodaySession, saveSession, addToWrongPool, removeFromWrongPool, getSessions, getActiveWrongPool, getQuizzes } from '../utils/storage';
import { checkAndAwardBadges } from '../utils/badges';
import { generateId } from '../utils/id';
import { isSpeechSupported, speakQueue, pauseSpeech, resumeSpeech, stopSpeech, isPaused } from '../utils/speech';
import { sanitizeQuiz } from '../utils/quizValidation';
import { getGrowthFeedback } from '../utils/growthFeedback';
import { useElapsedSeconds, formatElapsed } from '../utils/useElapsedTime';
import { computeXpGain, levelForXp } from '../utils/xp';
import { getSurpriseReward } from '../utils/surpriseReward';
import { nextReviewSchedule, categorizeForReview } from '../utils/spacedRepetition';
import { suggestLevelChange, LEVEL_SUGGESTION_WINDOW } from '../utils/difficultyAdaptation';
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

  // 틀린 문제는 세션 마지막에 다시 물어봐 맞힐 때까지 큐 뒤로 계속 보냄 — 점수/XP(answers)에는
  // 영향 없이 순수 복습용 추가 라운드. 같은 문제가 재출제될 때 QuizCard가 리렌더되도록 cardSeq로 key를 강제로 바꾼다.
  const [retryQueue, setRetryQueue] = useState<Quiz[]>([]);
  const [currentRetryQuiz, setCurrentRetryQuiz] = useState<Quiz | null>(null);
  const [inRetryPhase, setInRetryPhase] = useState(false);
  const [cardSeq, setCardSeq] = useState(0);

  // F-25: 듣는 5분 학습 — 오디오 퍼스트 모드
  const [audioMode, setAudioMode] = useState(appState.audioModeEnabled);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rateIdx, setRateIdx] = useState(0);

  // F-36: 콤보(연속 정답) 배너 — 1.2초 후 자동 소멸
  const [comboBanner, setComboBanner] = useState<number | null>(null);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 감사(audit) A-3: 테스트 화면엔 "약 5분" 문구조차 없어 체감 장치를 새로 추가
  const elapsedSeconds = useElapsedSeconds();

  useEffect(() => {
    return () => {
      stopSpeech();
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    };
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

    // F-09 + D-1: 우선순위 = 오답 풀(최대 50%) > 오늘 복습 예정(레거시 포함) > 신규 미출제 > 나머지
    const wrongPoolEntries = getActiveWrongPool(goal.id);
    const wrongQuizIds = new Set(wrongPoolEntries.map((w) => w.quizId));
    const wrongQuizzes = shuffleArray(pool.filter((q) => wrongQuizIds.has(q.id)));
    const nonWrongPool = pool.filter((q) => !wrongQuizIds.has(q.id));

    const today = new Date().toISOString().split('T')[0];
    const dueQuizzes = shuffleArray(nonWrongPool.filter((q) => categorizeForReview(q, today) === 'due'));
    const newQuizzes = shuffleArray(nonWrongPool.filter((q) => categorizeForReview(q, today) === 'new'));
    const restQuizzes = shuffleArray(nonWrongPool.filter((q) => categorizeForReview(q, today) === 'scheduled'));

    const maxWrong = Math.floor(TARGET * 0.5);
    const fromWrong = wrongQuizzes.slice(0, maxWrong);
    let remaining = TARGET - fromWrong.length;
    const fromDue = dueQuizzes.slice(0, remaining);
    remaining -= fromDue.length;
    const fromNew = newQuizzes.slice(0, remaining);
    remaining -= fromNew.length;
    const fromRest = restQuizzes.slice(0, remaining);

    const selected = [...fromWrong, ...fromDue, ...fromNew, ...fromRest].slice(0, TARGET);
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
      <div className="min-h-screen bg-[var(--page-bg)] flex items-center justify-center">
        <p className="text-gray-500">퀴즈를 불러오는 중...</p>
      </div>
    );
  }

  const currentQuiz = inRetryPhase ? (currentRetryQuiz as Quiz) : testQuizzes[currentIndex];
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

  // D-1: 정답이면 복습 간격을 늘리고, 오답이면 처음 단계로 리셋 — 오답풀(다른 화면들과 공유하는
  // 기록)은 여기서 갱신하고, 세션 내 즉시 재출제는 handleAnswer의 retryQueue로 별도 처리한다.
  const applySrsUpdate = (quiz: Quiz, correct: boolean) => {
    const { intervalIndex, nextReviewAt } = nextReviewSchedule(quiz.intervalIndex, correct);
    if (!correct) {
      updateQuiz({
        ...quiz,
        isWrong: true,
        wrongCount: quiz.wrongCount + 1,
        lastAttemptedAt: new Date().toISOString(),
        intervalIndex,
        nextReviewAt,
      });
      // 감사(code review) 수정: 오답 다시풀기/복습믹스와 동일하게 기존 오답풀 기록을 보존한다.
      // 항상 새로 리셋하면 그 화면들이 쌓아온 addedAt/retryCount가 여기서 조용히 사라진다.
      const existingWrongEntry = getActiveWrongPool(goal.id).find((w) => w.quizId === quiz.id);
      addToWrongPool({
        goalId: goal.id,
        quizId: quiz.id,
        addedAt: existingWrongEntry?.addedAt ?? new Date().toISOString(),
        retryCount: existingWrongEntry ? existingWrongEntry.retryCount + 1 : 0,
      });
    } else {
      updateQuiz({
        ...quiz,
        isWrong: false,
        lastAttemptedAt: new Date().toISOString(),
        intervalIndex,
        nextReviewAt,
      });
      removeFromWrongPool(goal.id, quiz.id);
    }
  };

  const handleScoredAnswer = (correct: boolean) => {
    const nextAnswers = [...answers, correct];
    setAnswers(nextAnswers);
    setAnswered(true);

    // F-36: 배열 끝에서부터 연속 정답 개수를 세어 3연속 이상일 때만 배너 노출
    let combo = 0;
    for (let i = nextAnswers.length - 1; i >= 0 && nextAnswers[i]; i--) combo++;
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    if (combo >= 3) {
      setComboBanner(combo);
      comboTimerRef.current = setTimeout(() => setComboBanner(null), 1200);
    } else {
      setComboBanner(null);
    }

    // F-19: 진행 상황을 즉시 저장해 중단 후에도 이어서 진행할 수 있게 함
    const todaySession = getTodaySession(goal.id);
    if (todaySession) {
      const updatedSession = { ...todaySession, quizAnswers: nextAnswers };
      saveSession(updatedSession);
      updateSession(updatedSession);
    }

    const quiz = testQuizzes[currentIndex];
    applySrsUpdate(quiz, correct);
    if (!correct) {
      setRetryQueue((prev) => [...prev, quiz]);
    }
  };

  const handleRetryAnswer = (correct: boolean) => {
    if (!currentRetryQuiz) return;
    setAnswered(true);
    applySrsUpdate(currentRetryQuiz, correct);
    if (!correct) {
      setRetryQueue((prev) => [...prev, currentRetryQuiz]);
    }
  };

  const handleAnswer = (correct: boolean) => {
    if (inRetryPhase) {
      handleRetryAnswer(correct);
    } else {
      handleScoredAnswer(correct);
    }
  };

  const finishSession = () => {
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
      // F-49: 스트릭 프리즈 — 어제를 걸러서 원래는 스트릭이 끊길 상황이지만, 지켜줄 스트릭이
      // 있고(streak > 0) 프리즈가 남아있으면 한 번은 끊기지 않게 보호한다.
      const usedFreeze =
        !alreadyCompletedToday && !hadYesterdaySession && goal.streak > 0 && (goal.streakFreezeRemaining ?? 0) > 0;
      const newStreak = alreadyCompletedToday
        ? goal.streak
        : hadYesterdaySession || usedFreeze
          ? goal.streak + 1
          : 1;
      const newStreakFreezeRemaining = usedFreeze
        ? (goal.streakFreezeRemaining ?? 0) - 1
        : (goal.streakFreezeRemaining ?? 0);
      const newCompletedSessions = goal.completedSessions + 1;
      const isGoalComplete = goal.totalSessions > 0 && newCompletedSessions >= goal.totalSessions;

      // F-37: XP/레벨업 — 개인 누적치만 저장(비교 UI 없음, 소셜 랭킹 비목표와 무관)
      const xpGained = computeXpGain(score, total);
      const newXp = (goal.xp ?? 0) + xpGained;
      const newLevel = levelForXp(newXp);
      const didLevelUp = newLevel > levelForXp(goal.xp ?? 0);

      const updatedGoal = {
        ...goal,
        completedSessions: newCompletedSessions,
        streak: newStreak,
        bestStreak: Math.max(goal.bestStreak, newStreak),
        streakFreezeRemaining: newStreakFreezeRemaining,
        xp: newXp,
        xpLevel: newLevel,
        ...(isGoalComplete ? { status: 'completed' as const, completedAt: new Date().toISOString() } : {}),
      };
      updateGoal(updatedGoal);

      const newBadges = checkAndAwardBadges(goal.id, newStreak);

      // F-31/F-41: "지난 나" 대비 성장 피드백 + 정답률·스트릭 역대 기록 경신 여부
      const isNewBestStreak = newStreak > goal.bestStreak;
      const growthFeedback = getGrowthFeedback(goal.id, score, total, sessionId, isNewBestStreak);

      // F-39: 확률적 깜짝 보상 — 실제 뱃지 획득·레벨업과 같은 세션에는 노출하지 않아(상호배타) 혼동을 막음
      const surpriseReward =
        newBadges.length === 0 && !didLevelUp && Math.random() < 0.2
          ? getSurpriseReward(goal.mateTone ?? 'plain')
          : undefined;

      // D-8: 적응형 난이도 — 최근 정답률이 극단적일 때만 완료 화면에서 조용히 제안(강제 변경 아님)
      const priorPercents = getSessions()
        .filter(
          (s) =>
            s.goalId === goal.id &&
            s.status === 'completed' &&
            s.id !== sessionId &&
            s.quizScore !== undefined &&
            s.quizTotal !== undefined &&
            s.quizTotal > 0
        )
        .slice(-(LEVEL_SUGGESTION_WINDOW - 1))
        .map((s) => s.quizScore! / s.quizTotal!);
      const recentPercents = [...priorPercents, total > 0 ? score / total : 0];
      const levelSuggestion = suggestLevelChange(recentPercents, goal.level);

    if (isGoalComplete) {
      navigate(`/goal-complete/${goal.id}`, {
        state: {
          score, total, streak: newStreak, completedSessions: newCompletedSessions, newBadges,
          topic: goal.topic, growthFeedback, mateTone: goal.mateTone, xpGained, newXp, newLevel, didLevelUp,
          usedFreeze,
        },
      });
    } else {
      navigate(`/complete/${sessionId}`, {
        state: {
          score, total, streak: newStreak, newBadges, topic: goal.topic, growthFeedback,
          mateTone: goal.mateTone, xpGained, newXp, newLevel, didLevelUp, surpriseReward,
          goalId: goal.id, levelSuggestion, usedFreeze,
        },
      });
    }
  };

  const handleNext = () => {
    if (inRetryPhase) {
      if (retryQueue.length === 0) {
        setInRetryPhase(false);
        setCurrentRetryQuiz(null);
        finishSession();
        return;
      }
      const [head, ...rest] = retryQueue;
      setCurrentRetryQuiz(head);
      setRetryQueue(rest);
      setAnswered(false);
      setCardSeq((s) => s + 1);
      return;
    }
    if (isLast) {
      if (retryQueue.length > 0) {
        const [head, ...rest] = retryQueue;
        setCurrentRetryQuiz(head);
        setRetryQueue(rest);
        setInRetryPhase(true);
        setAnswered(false);
        setCardSeq((s) => s + 1);
        return;
      }
      finishSession();
      return;
    }
    setCurrentIndex((i) => i + 1);
    setAnswered(false);
    setCardSeq((s) => s + 1);
  };

  return (
    <div className="min-h-screen bg-[var(--page-bg)] flex flex-col">
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
            {inRetryPhase ? (
              <div className="flex items-center justify-between text-xs text-amber-600 font-medium">
                <span>🔁 오답 다시 풀기</span>
                <span>남은 {retryQueue.length + 1}개</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>진행 · ⏱ {formatElapsed(elapsedSeconds)}</span>
                  <span>{currentIndex + 1}/{testQuizzes.length}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-500)] rounded-full transition-all"
                    style={{ width: `${((currentIndex + (answered ? 1 : 0)) / testQuizzes.length) * 100}%` }}
                  />
                </div>
              </>
            )}
          </div>
          {isSpeechSupported() && (
            <button
              onClick={handleToggleAudioMode}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-sm font-medium min-h-[44px] transition-colors ${
                audioMode ? 'bg-[var(--accent-600)] text-white' : 'bg-gray-100 text-gray-500'
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
              className="flex-1 py-2.5 rounded-xl bg-[var(--accent-50)] text-[var(--accent-700)] font-semibold text-sm min-h-[44px]"
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

        {comboBanner !== null && !inRetryPhase && (
          <div className="mb-3 text-center">
            <span className="inline-block px-4 py-1.5 bg-orange-100 text-orange-600 rounded-full text-sm font-bold animate-count-up-pop">
              🔥 {comboBanner}연속 정답!
            </span>
          </div>
        )}

        <div className="flex-1">
          <QuizCard
            key={`${currentQuiz.id}-${cardSeq}`}
            quiz={currentQuiz}
            index={inRetryPhase ? 0 : currentIndex}
            total={inRetryPhase ? retryQueue.length + 1 : testQuizzes.length}
            onAnswer={handleAnswer}
            mateTone={goal.mateTone}
          />
        </div>

        {answered && (
          <button
            onClick={handleNext}
            className="w-full mt-4 py-4 bg-[var(--accent-600)] text-white rounded-xl font-semibold text-base min-h-[44px] active:scale-95 transition-transform"
          >
            {inRetryPhase
              ? retryQueue.length === 0
                ? '결과 보기'
                : '다음 문제'
              : isLast
                ? retryQueue.length > 0
                  ? '오답 다시 풀기'
                  : '결과 보기'
                : '다음 문제'}
          </button>
        )}
      </div>
    </div>
  );
}
