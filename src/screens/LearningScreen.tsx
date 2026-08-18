import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useGoalStore, useSessionStore, useQuizStore, useAppStore } from '../store';
import { getTodaySession, saveSession } from '../utils/storage';
import { generateDailyContent } from '../services/gemini';
import { generateId } from '../utils/id';
import { getCurriculumDay } from '../data/curriculum';
import { buildCacheKey, fetchFromPool, saveToPool } from '../services/contentPool';
import { fetchFromBank } from '../services/questionBank';
import { getDailyHook } from '../utils/dailyHook';
import { isSpeechSupported, speakQueue, pauseSpeech, resumeSpeech, stopSpeech, isPaused } from '../utils/speech';
import { useElapsedSeconds, formatElapsed } from '../utils/useElapsedTime';
import type { Quiz } from '../types';

const SPEECH_RATES = [1, 1.25, 1.5];

export default function LearningScreen() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { goals } = useGoalStore();
  const { updateSession } = useSessionStore();
  const { addQuizzes } = useQuizStore();
  const { appState, updateAppState } = useAppStore();

  const goal = goals.find((g) => g.id === goalId);

  const [summary, setSummary] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [todayTopic, setTodayTopic] = useState('');
  // 감사(audit) A-3: "약 5분"이 정적 텍스트뿐이던 것에 실제 경과 시간 타이머를 붙인다.
  const elapsedSeconds = useElapsedSeconds();
  const [poolHit, setPoolHit] = useState<{ useCount: number } | null>(null);
  const [dailyHook, setDailyHook] = useState<string | null>(null);
  // 콜로 지역 문제로 생성 실패 시, 홈으로 나갔다 들어오지 않고도 재시도할 수 있게 하는 트리거
  const [retryTick, setRetryTick] = useState(0);

  // F-25: 듣는 5분 학습 — 오디오 퍼스트 모드
  const [audioMode, setAudioMode] = useState(appState.audioModeEnabled);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rateIdx, setRateIdx] = useState(0);

  useEffect(() => {
    return () => stopSpeech();
  }, []);

  const handleToggleAudioMode = () => {
    const next = !audioMode;
    setAudioMode(next);
    updateAppState({ audioModeEnabled: next });
    if (!next) {
      stopSpeech();
      setIsPlaying(false);
    }
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
    const texts = summary.split('\n').map((l) => l.replace(/^[•·\-*]\s*/, '').trim()).filter(Boolean);
    speakQueue(texts, SPEECH_RATES[rateIdx], () => setIsPlaying(false));
    setIsPlaying(true);
  };

  const handleCycleRate = () => {
    const nextIdx = (rateIdx + 1) % SPEECH_RATES.length;
    setRateIdx(nextIdx);
    if (isPlaying) {
      const texts = summary.split('\n').map((l) => l.replace(/^[•·\-*]\s*/, '').trim()).filter(Boolean);
      speakQueue(texts, SPEECH_RATES[nextIdx], () => setIsPlaying(false));
    }
  };

  // F-26: 오늘의 학습운 — 하루 최초 진입 시 1회만 노출
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (appState.lastDailyHookDate !== today) {
      setDailyHook(getDailyHook());
      updateAppState({ lastDailyHookDate: today });
      const timer = setTimeout(() => setDailyHook(null), 4000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!goal) return;

    // HomeScreen의 "다음 학습 계속하기" 버튼을 눌렀을 때만 다음 세션을 새로 시작한다.
    // 그 외에 이 화면에 도달한 경우(테스트 화면에서 뒤로가기 등)는 오늘 세션이 이미
    // completed 상태여도 새로 만들지 않는다 — 예전엔 "완료됨=다음 세션 시작"으로 취급해서,
    // 테스트를 마친 뒤 뒤로가기만 몇 번 눌러도 조용히 다음 날 콘텐츠가 새로 생성돼버렸다.
    const startNext = (location.state as { startNext?: boolean } | null)?.startNext === true;

    let session = getTodaySession(goal.id);
    if (!session || (session.status === 'completed' && startNext)) {
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
      if (goal.curriculumId) {
        const dayNum = goal.completedSessions + 1;
        const curricDay = getCurriculumDay(goal.curriculumId, dayNum);
        if (curricDay) setTodayTopic(curricDay.topic);
      }
      return;
    }

    const dayNum = goal.completedSessions + 1;
    const totalDays = goal.totalSessions;
    const capturedSession = session;

    // 커리큘럼이 있으면 해당 날짜 내용을 rawContent로 사용
    let effectiveRawContent = goal.rawContent;
    const curricDay = goal.curriculumId ? getCurriculumDay(goal.curriculumId, dayNum) : undefined;
    if (curricDay) {
      setTodayTopic(curricDay.topic);
      effectiveRawContent = curricDay.content;
    }

    // 실무 연계 모드(F-21), 기본이 아닌 AI 말투(F-27), 내신·수능처럼 학교마다 범위가 다른
    // 시험범위 목표(F-33)는 개인화 콘텐츠라 풀/뱅크를 쓰지 않음
    const isPersonalized = !!goal.practicalMode || (!!goal.mateTone && goal.mateTone !== 'plain') || !!goal.examScoped;

    // 템플릿 목표면 공유 풀 먼저 확인
    const cacheKey = goal.templateId && !isPersonalized ? buildCacheKey(goal.templateId, dayNum) : null;

    const applyContent = (s: string, quizzes: Quiz[]) => {
      addQuizzes(quizzes);
      const updated = {
        ...capturedSession,
        summaryContent: s,
        dailyQuizIds: quizzes.map((q) => q.id),
      };
      saveSession(updated);
      updateSession(updated);
      setSummary(s);
    };

    setGenerating(true);

    (async () => {
      // 0) 사전 제작 문제 데이터셋 조회 (커리큘럼 + 날짜 + 난이도 일치 시 Gemini 호출 없이 즉시 사용)
      // 개인화 콘텐츠(실무 연계/커스텀 말투)는 사전 제작 뱅크를 건너뛴다
      if (goal.curriculumId && curricDay && !isPersonalized) {
        const bankData = await fetchFromBank(goal.curriculumId, dayNum, goal.level ?? 'intermediate');
        if (bankData) {
          const quizzes: Quiz[] = bankData.quizzes.map(({ bankId, ...q }) => ({
            ...q,
            id: generateId(),
            goalId: goal.id,
            isWrong: false,
            wrongCount: 0,
            bankQuestionId: bankId,
          }));
          applyContent(curricDay.content, quizzes);
          setGenerating(false);
          return;
        }
      }

      // 1) 공유 풀 조회
      if (cacheKey) {
        const poolData = await fetchFromPool(cacheKey);
        if (poolData) {
          const quizzes: Quiz[] = poolData.quizzes.map((q) => ({
            ...q,
            id: generateId(),
            goalId: goal.id,
            isWrong: false,
            wrongCount: 0,
          }));
          applyContent(poolData.summary, quizzes);
          setPoolHit({ useCount: poolData.useCount });
          setGenerating(false);
          return;
        }
      }

      // 2) 풀 미스 → Gemini 생성
      try {
        const { summary: s, quizzes } = await generateDailyContent(
          goal.id,
          goal.topic,
          dayNum,
          totalDays,
          goal.level,
          effectiveRawContent,
          goal.practicalMode,
          goal.mateTone
        );
        applyContent(s, quizzes);

        // 3) 생성 성공 시 풀에 저장 (fire & forget) — 개인화 콘텐츠는 저장하지 않음
        if (cacheKey && goal.templateId && !isPersonalized) {
          saveToPool({
            cacheKey,
            templateId: goal.templateId,
            topic: goal.topic,
            dayNum,
            summary: s,
            quizzes: quizzes.map(({ id: _id, goalId: _g, isWrong: _w, wrongCount: _c, lastAttemptedAt: _l, ...q }) => q),
          });
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setGenerating(false);
      }
    })();
  // goal.id, retryTick(재시도 버튼)에만 의존
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal?.id, retryTick]);

  const handleRetryGenerate = () => {
    setError('');
    setRetryTick((t) => t + 1);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) setScrolled(true);
  };

  const handleStartTest = () => {
    if (!goal) return;
    stopSpeech();
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
      <div className="min-h-screen bg-[var(--page-bg)] flex items-center justify-center">
        <p className="text-gray-500">목표를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const dayNum = goal.completedSessions + 1;
  const bullets = summary.split('\n').filter((l) => l.trim());

  // 로딩 화면
  if (generating) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] flex flex-col items-center justify-center gap-4 px-4">
        <svg className="animate-spin w-10 h-10 text-[var(--accent-500)]" fill="none" viewBox="0 0 24 24">
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
    const isRateLimit = error.includes('한도');
    return (
      <div className="min-h-screen bg-[var(--page-bg)] flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-4xl">{isRateLimit ? '⏳' : '⚠️'}</div>
        <p className="text-gray-700 text-center font-medium">
          {isRateLimit ? '오늘 무료 생성 한도를 채웠어요' : '콘텐츠 생성 실패'}
        </p>
        <p className="text-gray-500 text-sm text-center">
          {isRateLimit ? '무료로 제공되는 하루 생성 횟수 제한이에요. 내일 다시 이용할 수 있어요.' : error}
        </p>
        {!isRateLimit && (
          <button
            onClick={handleRetryGenerate}
            className="px-5 py-2.5 bg-[var(--accent-600)] text-white rounded-xl font-semibold text-sm min-h-[44px]"
          >
            다시 시도
          </button>
        )}
        <button onClick={() => navigate('/')} className="text-gray-400 text-sm">
          홈으로
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] flex flex-col">
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
              {dayNum}일째 / 전체 {goal.totalSessions}일 · 약 5분 · ⏱ {formatElapsed(elapsedSeconds)}
            </p>
          </div>
          {isSpeechSupported() && (
            <button
              onClick={handleToggleAudioMode}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-sm font-medium min-h-[44px] transition-colors ${
                audioMode ? 'bg-[var(--accent-600)] text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              🔊 듣기
            </button>
          )}
        </div>

        {audioMode && (
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={handleTogglePlay}
              disabled={!summary}
              className="flex-1 py-2.5 rounded-xl bg-[var(--accent-50)] text-[var(--accent-700)] font-semibold text-sm min-h-[44px] disabled:opacity-40"
            >
              {isPlaying ? '⏸ 일시정지' : '▶ 재생'}
            </button>
            <button
              onClick={handleCycleRate}
              className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm min-h-[44px]"
            >
              {SPEECH_RATES[rateIdx]}x
            </button>
          </div>
        )}

        {dailyHook && (
          <div className="flex items-center justify-between gap-2 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 mb-4">
            <p className="text-violet-700 text-sm font-medium">✨ {dailyHook}</p>
            <button
              onClick={() => setDailyHook(null)}
              className="text-violet-400 hover:text-violet-600 flex-shrink-0 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        )}

        <div
          className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4 overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 260px)' }}
          onScroll={handleScroll}
        >
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="bg-[var(--accent-100)] text-[var(--accent-600)] text-xs font-semibold px-3 py-1 rounded-full">
                Day {dayNum}
              </span>
              <h2 className="text-sm font-semibold text-gray-500">오늘의 핵심 내용</h2>
              {poolHit && (
                <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full font-medium">
                  ⚡ {poolHit.useCount > 1 ? `${poolHit.useCount.toLocaleString()}명이 함께 공부 중` : '풀에서 즉시 로드'}
                </span>
              )}
            </div>
            {todayTopic && (
              <p className="text-base font-bold text-gray-800">{todayTopic}</p>
            )}
          </div>
          <ul className="space-y-4">
            {bullets.map((line, i) => {
              const text = line.replace(/^[•·\-*]\s*/, '').trim();
              if (!text) return null;
              return (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-[var(--accent-100)] text-[var(--accent-600)] rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
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
          className="w-full py-4 bg-[var(--accent-600)] text-white rounded-xl font-semibold text-base min-h-[44px] active:opacity-80 transition-opacity disabled:opacity-40"
        >
          테스트 시작
        </button>
      </div>
    </div>
  );
}
