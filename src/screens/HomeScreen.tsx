import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoalStore, useSessionStore } from '../store';
import { TEMPLATES as TEMPLATES_PREVIEW } from '../data/templates';
import { getTodaySession, saveSession, getSessions } from '../utils/storage';
import { generateId } from '../utils/id';
import type { Goal, MateTone } from '../types';
import BottomNav from '../components/BottomNav';
import InstallBanner from '../components/InstallBanner';

// F-30: 긴급 독려 배너도 mateTone(F-27)에 맞춰 압박형 대신 동행형 문구로 분기
const URGENT_MESSAGES: Record<MateTone, (topic: string) => string> = {
  plain: (topic) => `📢 ${topic}을 잊지 않았죠? 오늘 딱 5분만요!`,
  friendly: (topic) => `📢 ${topic}, 요즘 뜸했죠? 오늘 5분만 같이 해볼까요?`,
  hype: (topic) => `📢 ${topic} 도전 중단?! 지금 5분이면 부활 가능 🔥`,
};

function DaysLeft({ deadline }: { deadline: string }) {
  const today = new Date().toISOString().split('T')[0];
  const diff = Math.ceil(
    (new Date(deadline).getTime() - new Date(today).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return <span className="text-red-500 text-sm">마감 지남</span>;
  if (diff === 0) return <span className="text-orange-500 text-sm font-semibold">오늘 마감!</span>;
  return <span className="text-indigo-500 text-sm">D-{diff}</span>;
}

function DelayLabel({ goal }: { goal: Goal }) {
  if (goal.totalSessions === 0) return null;
  const today = new Date().toISOString().split('T')[0];
  const daysPassed = Math.max(
    Math.ceil((new Date(today).getTime() - new Date(goal.createdAt.split('T')[0]).getTime()) / (1000 * 60 * 60 * 24)),
    0
  );
  const expected = Math.min(daysPassed / goal.totalSessions, 1);
  const actual = goal.completedSessions / goal.totalSessions;
  const gap = expected - actual;
  if (gap <= 0.05) return null;
  if (gap <= 0.2)
    return <span className="text-xs font-medium text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">조금 뒤처지고 있어요</span>;
  return <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">서둘러야 해요!</span>;
}

function GoalCard({ goal }: { goal: Goal }) {
  const navigate = useNavigate();
  const { loadSessions } = useSessionStore();

  const handleStart = () => {
    let session = getTodaySession(goal.id);
    if (!session) {
      session = {
        id: generateId(),
        goalId: goal.id,
        date: new Date().toISOString().split('T')[0],
        status: 'in_progress',
        selectedQuizIds: [],
      };
      saveSession(session);
      loadSessions();
    }
    navigate(`/learn/${goal.id}`);
  };

  const todaySession = getTodaySession(goal.id);
  const isDone = todaySession?.status === 'completed';
  // F-23: 퀴즈 도중 중단한 세션이 있으면 "이어하기" 상태로 우선 안내
  const answeredCount = todaySession?.quizAnswers?.length ?? 0;
  const totalQuizCount = todaySession?.testQuizIds?.length ?? 0;
  const isMidQuiz = !isDone && totalQuizCount > 0 && answeredCount < totalQuizCount;
  const progress =
    goal.totalSessions > 0
      ? Math.round((goal.completedSessions / goal.totalSessions) * 100)
      : 0;
  // D-6: 목표 그라디언트 효과 — 완주가 가까워질수록(남은 세션 적을수록) %보다 절대 개수가
  // 더 강하게 행동을 유도한다는 소비자행동 연구를 반영. 손실회피(지연 경고) 위주였던 기존
  // 문구 포트폴리오에 접근 동기(거의 다 왔다) 축을 보탠다.
  const remainingSessions = goal.totalSessions - goal.completedSessions;
  const isNearFinish =
    goal.totalSessions > 0 &&
    remainingSessions > 0 &&
    (remainingSessions <= 3 || remainingSessions / goal.totalSessions <= 0.2);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">{goal.topic}</h3>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <DaysLeft deadline={goal.deadline} />
            <DelayLabel goal={goal} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {goal.streak > 0 && (
            <div className="flex items-center gap-1 bg-orange-50 rounded-full px-3 py-1">
              <span className="text-orange-500 text-sm font-semibold">
                🔥 {goal.streak}일
              </span>
            </div>
          )}
          {/* F-37: XP/레벨업 — 완료 화면에서 한 번 반짝이고 사라지지 않도록 상시 배지로도 노출 */}
          {(goal.xp ?? 0) > 0 && (
            <div className="flex items-center gap-1 bg-indigo-50 rounded-full px-3 py-1">
              <span className="text-indigo-500 text-xs font-semibold">
                ✨ Lv.{goal.xpLevel ?? 1}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        {isNearFinish ? (
          <p className="text-xs font-semibold text-amber-600 mb-1">
            🏁 이제 {remainingSessions}번만 더 하면 끝나요!
          </p>
        ) : (
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>진행률</span>
            <span>{progress}%</span>
          </div>
        )}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isNearFinish ? 'bg-amber-500' : 'bg-indigo-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {isDone ? (
        <div>
          <div className="flex items-center justify-center gap-2 py-2 mb-2 rounded-xl bg-green-50 text-green-600 font-medium text-sm">
            <span>✓ 오늘 학습 완료!</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleStart}
              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-base min-h-[44px] active:opacity-80 transition-opacity"
            >
              다음 학습 계속하기
            </button>
            <button
              onClick={() => navigate(`/materials/${goal.id}`)}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-indigo-50 text-indigo-600 font-medium text-sm min-h-[44px]"
            >
              📚
            </button>
          </div>
        </div>
      ) : isMidQuiz ? (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/test/${goal.id}`)}
            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-base min-h-[44px] active:opacity-80 transition-opacity"
          >
            이어하기 · {totalQuizCount - answeredCount}문항 남음
          </button>
          <button
            onClick={() => navigate(`/materials/${goal.id}`)}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-indigo-50 text-indigo-600 font-medium text-sm min-h-[44px]"
          >
            📚
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleStart}
            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-base min-h-[44px] active:opacity-80 transition-opacity"
          >
            오늘 학습 시작 · 약 5분
          </button>
          <button
            onClick={() => navigate(`/materials/${goal.id}`)}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-indigo-50 text-indigo-600 font-medium text-sm min-h-[44px]"
          >
            📚
          </button>
        </div>
      )}
    </div>
  );
}

function UrgentBanner({ goals, onStart }: { goals: Goal[]; onStart: (goalId: string) => void }) {
  const today = new Date().toISOString().split('T')[0];
  const dismissKey = `urgentBannerDismissed_${today}`;
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(dismissKey) === '1';
  });

  const urgentGoal = goals.find((goal) => {
    if (goal.status !== 'active' || goal.totalSessions === 0) return false;

    // Check 2 consecutive days of no completion
    const allSessions = getSessions().filter((s) => s.goalId === goal.id && s.status === 'completed');
    const completedDates = new Set(allSessions.map((s) => s.date));
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const yStr = yesterday.toISOString().split('T')[0];
    const tdStr = twoDaysAgo.toISOString().split('T')[0];
    const twoDaysMissed = !completedDates.has(yStr) && !completedDates.has(tdStr);

    // Check progress gap >= 30%
    const created = goal.createdAt.split('T')[0];
    const daysPassed = Math.max(
      Math.ceil((new Date(today).getTime() - new Date(created).getTime()) / (1000 * 60 * 60 * 24)),
      0
    );
    const expectedProgress = Math.min(daysPassed / goal.totalSessions, 1);
    const actualProgress = goal.completedSessions / goal.totalSessions;
    const bigGap = expectedProgress - actualProgress >= 0.3;

    return twoDaysMissed || bigGap;
  });

  if (!urgentGoal || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(dismissKey, '1');
    setDismissed(true);
  };

  return (
    <div
      className="mx-4 mb-4 p-4 bg-indigo-600 rounded-2xl flex items-center gap-3 cursor-pointer active:opacity-90 transition-opacity"
      onClick={() => onStart(urgentGoal.id)}
    >
      <div className="flex-1">
        <p className="text-white font-semibold text-sm">
          {(URGENT_MESSAGES[urgentGoal.mateTone ?? 'plain'] ?? URGENT_MESSAGES.plain)(urgentGoal.topic)}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        className="text-indigo-200 hover:text-white p-1 min-h-[36px] min-w-[36px] flex items-center justify-center"
      >
        ✕
      </button>
    </div>
  );
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const { goals, loadGoals } = useGoalStore();
  const { loadSessions } = useSessionStore();

  useEffect(() => {
    loadGoals();
    loadSessions();
  }, [loadGoals, loadSessions]);

  const activeGoals = goals.filter((g) => g.status === 'active');

  const handleBannerStart = (goalId: string) => {
    let session = getTodaySession(goalId);
    if (!session) {
      session = {
        id: generateId(),
        goalId,
        date: new Date().toISOString().split('T')[0],
        status: 'in_progress',
        selectedQuizIds: [],
      };
      saveSession(session);
    }
    navigate(`/learn/${goalId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <UrgentBanner goals={activeGoals} onStart={handleBannerStart} />
      <InstallBanner />
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">오늘의 학습</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {new Date().toLocaleDateString('ko-KR', {
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/calendar')}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => navigate('/goals')}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {activeGoals.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-5xl mb-4">📚</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">학습 목표가 없어요</h2>
            <p className="text-gray-500 text-sm mb-6">
              새로운 목표를 추가하거나<br />쇼츠로 먼저 체험해보세요!
            </p>
            <button
              onClick={() => navigate('/goals/create')}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-base min-h-[44px] mb-3"
            >
              목표 만들기
            </button>
            <p className="text-xs text-gray-400 mb-3">또는 지금 바로 맛보기</p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {(['english_grammar', 'iip_practical', 'driving_written'] as const).map((tid) => {
                const tpl = TEMPLATES_PREVIEW.find((t) => t.id === tid);
                if (!tpl) return null;
                return (
                  <button
                    key={tid}
                    onClick={() => navigate(`/shorts/${tid}`)}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-sm font-medium text-indigo-700"
                  >
                    <span>{tpl.icon}</span>
                    <span>{tpl.name}</span>
                    <span className="text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">⚡ 쇼츠</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {/* D-4: 인터리빙 복습믹스 — 목표가 여러 개일 때만, 개별 목표 진행률과 무관한 별도 트랙 */}
            {activeGoals.length >= 2 && (
              <button
                onClick={() => navigate('/mix-review')}
                className="w-full flex items-center gap-3 p-4 mb-4 bg-purple-50 border border-purple-100 rounded-2xl text-left hover:border-purple-200 transition-colors"
              >
                <span className="text-2xl flex-shrink-0">🔀</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-purple-700">오늘의 복습 믹스</p>
                  <p className="text-xs text-purple-400 mt-0.5">여러 목표를 섞어서 5분에 훑어보기</p>
                </div>
              </button>
            )}
            {activeGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
            <button
              onClick={() => navigate('/goals/create')}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-medium text-sm min-h-[44px] hover:border-indigo-300 hover:text-indigo-400 transition-colors"
            >
              + 목표 추가
            </button>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
