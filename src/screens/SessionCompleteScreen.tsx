import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { getBadgeDef } from '../utils/badges';
import { shareOrDownload } from '../utils/shareCard';
import { getIdentityStatement } from '../utils/identity';
import { getMascotFace } from '../utils/mascot';
import { useCountUp } from '../utils/useCountUp';
import { celebrate } from '../utils/celebration';
import { nextLevel, LEVEL_LABEL } from '../utils/difficultyAdaptation';
import type { LevelSuggestion } from '../utils/difficultyAdaptation';
import { useAppStore, useGoalStore } from '../store';
import type { BadgeId, MateTone } from '../types';
import type { GrowthFeedback } from '../utils/growthFeedback';

interface LocationState {
  score: number;
  total: number;
  streak: number;
  newBadges?: BadgeId[];
  topic?: string;
  growthFeedback?: GrowthFeedback;
  mateTone?: MateTone;
  xpGained?: number;
  newXp?: number;
  newLevel?: number;
  didLevelUp?: boolean;
  surpriseReward?: string;
  goalId?: string;
  levelSuggestion?: LevelSuggestion | null;
  usedFreeze?: boolean;
  maxNextReviewAt?: string;
}

export default function SessionCompleteScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const { appState } = useAppStore();
  const { goals, updateGoal } = useGoalStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const score = state?.score ?? 0;
  const total = state?.total ?? 5;
  const streak = state?.streak ?? 1;
  const newBadges = state?.newBadges ?? [];
  const topic = state?.topic ?? '학습';
  const growthFeedback = state?.growthFeedback;
  const mateTone = state?.mateTone ?? 'plain';
  const xpGained = state?.xpGained ?? 0;
  const newLevel = state?.newLevel ?? 1;
  const didLevelUp = state?.didLevelUp ?? false;
  const surpriseReward = state?.surpriseReward;
  const usedFreeze = state?.usedFreeze ?? false;
  // F-61: 오늘 맞힌 문제 중 가장 멀리 밀린 복습 간격을 "다음 만남"으로 안내 — 간격 반복
  // 스케줄러가 실제로 사용자를 위해 뭘 했는지 투명하게 보여줘 신뢰를 쌓는다(업계 통용 패턴).
  // maxNextReviewAt은 정답일 때만 채워지므로(오답은 항상 내일로 리셋) 최소 3일 이상만 들어온다.
  const daysUntilNextReview = state?.maxNextReviewAt
    ? Math.round(
        (new Date(state.maxNextReviewAt).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000
      )
    : undefined;
  const levelSuggestion = state?.levelSuggestion;
  const suggestionGoal = goals.find((g) => g.id === state?.goalId);
  const [suggestionHandled, setSuggestionHandled] = useState(false);
  // 감사(code review) 수정: 카드 렌더 조건과 자동이동 보류 조건이 따로 놀면, suggestionGoal이
  // 없을 때(예: 다른 탭 로그아웃으로 스토어가 갱신된 경우) 카드는 안 뜨는데 자동이동만 영원히
  // 막히는 상태가 될 수 있었다 — 하나의 값으로 통일해서 세 군데가 항상 같은 판단을 하게 한다.
  const isSuggestionPending = Boolean(levelSuggestion) && !suggestionHandled && Boolean(suggestionGoal);
  // F-22: 정체성 서사는 매일 노출하지 않고 7일/30일 스트릭 마일스톤에서만 노출(피로도 방지)
  const isStreakMilestone = newBadges.includes('flame_7') || newBadges.includes('persistence_30');
  // 감사(audit) P-2: 마일스톤 정체성 서사 카드가 이미 그 뱃지를 강조해서 보여주므로,
  // 아래 뱃지 목록에서는 같은 뱃지를 중복 언급하지 않고 그 외 뱃지만 보여준다.
  const gridBadges = isStreakMilestone
    ? newBadges.filter((id) => id !== 'flame_7' && id !== 'persistence_30')
    : newBadges;
  const percent = Math.round((score / total) * 100);
  const [sharing, setSharing] = useState(false);
  const xpDisplay = useCountUp(xpGained, 600);

  // F-37: 레벨업처럼 드문 순간에만 자동 이동 타이머를 짧게 연장(캡 +2초), 평소 세션은 회귀 없음
  // D-8: 난이도 제안에 응답하기 전까지는 자동 이동을 보류한다(답하지도 못하고 넘어가면 안 되므로)
  useEffect(() => {
    if (isSuggestionPending) return;
    const delay = didLevelUp ? 6000 : 4000;
    const timer = setTimeout(() => {
      navigate('/');
    }, delay);
    return () => clearTimeout(timer);
  }, [navigate, didLevelUp, isSuggestionPending]);

  const handleAcceptLevelSuggestion = () => {
    if (suggestionGoal && levelSuggestion) {
      updateGoal({ ...suggestionGoal, level: nextLevel(suggestionGoal.level, levelSuggestion) });
    }
    setSuggestionHandled(true);
  };

  const handleDismissLevelSuggestion = () => {
    setSuggestionHandled(true);
  };

  // F-40: 눈에 띄는 순간(만점·뱃지·레벨업)에만 컨페티·사운드·진동 — opt-out 가능(설정 화면 "축하 효과").
  // 2026-07-22 CEO 요청으로 일시 비활성화됐다가, 2026-08-22 재미 요소 추가 작업으로 재활성화.
  useEffect(() => {
    if (!appState.celebrationEffectsEnabled) return;
    if (percent === 100 || newBadges.length > 0 || didLevelUp) {
      celebrate(canvasRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getMessage = () => {
    if (percent === 100) return '완벽해요! 모두 맞혔습니다!';
    if (percent >= 80) return '훌륭합니다! 잘 이해했어요.';
    if (percent >= 60) return '좋아요! 조금 더 복습해볼까요?';
    return '오답 문제를 다시 확인해보세요.';
  };

  // 감사(audit) P-2: 완료 화면에 조건부 카드가 최대 5개(레벨업/마일스톤/뱃지/프리즈/깜짝보상)까지
  // 동시에 뜰 수 있어 6초 안에 다 읽기 힘든 과밀 문제가 있었다. 중요도 순으로 정렬해 상위 2개만
  // 전체 카드로 보여주고, 나머지는 한 줄 요약 칩으로 축약한다(정보 손실 없이 화면만 가볍게).
  const achievementCards = [
    didLevelUp && {
      key: 'levelup',
      chip: { icon: '🎉', label: '레벨업' },
      full: (
        <div className="bg-gradient-to-r from-[var(--accent-600)] to-purple-600 rounded-2xl p-5 mb-4 text-center animate-count-up-pop">
          <p className="text-3xl mb-1">🎉</p>
          <p className="text-white font-bold text-lg">레벨 {newLevel} 달성!</p>
        </div>
      ),
    },
    isStreakMilestone && {
      key: 'milestone',
      chip: { icon: '🏅', label: '마일스톤 달성' },
      full: (
        <div className="bg-[var(--accent-600)] rounded-2xl p-5 mb-4">
          <p className="text-white font-semibold leading-relaxed">
            "{getIdentityStatement(topic)}"
          </p>
        </div>
      ),
    },
    gridBadges.length > 0 && {
      key: 'badges',
      chip: { icon: '🎉', label: `뱃지 ${gridBadges.length}개 획득` },
      full: (
        <div className="bg-[var(--accent-50)] rounded-2xl p-4 mb-4 border border-[var(--accent-100)]">
          <p className="text-[var(--accent-700)] font-semibold text-sm mb-3">🎉 뱃지 획득!</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {gridBadges.map((id) => {
              const def = getBadgeDef(id);
              return (
                <div key={id} className="flex flex-col items-center gap-1">
                  <span className="text-3xl">{def.icon}</span>
                  <span className="text-xs font-medium text-[var(--accent-600)]">{def.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      ),
    },
    usedFreeze && {
      key: 'freeze',
      chip: { icon: '🧊', label: '스트릭 프리즈 사용' },
      full: (
        <div className="bg-sky-50 rounded-2xl p-4 mb-4 border border-sky-100">
          <p className="text-sky-700 text-sm font-medium">
            🧊 어제 하루를 쉬었지만 프리즈 덕분에 스트릭이 끊기지 않았어요!
          </p>
        </div>
      ),
    },
    !!surpriseReward && {
      key: 'surprise',
      chip: { icon: '🎁', label: '깜짝 선물' },
      full: (
        <div className="bg-amber-50 rounded-2xl p-4 mb-4 border border-amber-100">
          <p className="text-amber-700 text-sm font-medium">{surpriseReward}</p>
        </div>
      ),
    },
  ].filter((c): c is Extract<typeof c, { key: string }> => Boolean(c));

  const shownCards = achievementCards.slice(0, 2);
  const overflowCards = achievementCards.slice(2);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--accent-50)] to-white flex items-center justify-center p-4 pb-20">
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />
      <div className="max-w-md w-full text-center">
        <img src="/mascot.png" alt="마스코트" className="w-24 h-24 mx-auto mb-4 animate-bounce" />

        <h1 className="text-2xl font-bold text-gray-900 mb-2">오늘 학습 완료!</h1>
        <p className="text-gray-500 mb-8">{getMessage()}</p>

        {shownCards.find((c) => c.key === 'levelup')?.full}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex justify-around">
            <div className="text-center">
              <p className="text-3xl font-bold text-[var(--accent-600)]">
                {score}/{total}
              </p>
              <p className="text-gray-500 text-sm mt-1">정답</p>
            </div>
            <div className="w-px bg-gray-100" />
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-500">
                🔥 {streak}
              </p>
              <p className="text-gray-500 text-sm mt-1">연속 달성</p>
            </div>
            <div className="w-px bg-gray-100" />
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">{percent}%</p>
              <p className="text-gray-500 text-sm mt-1">정답률</p>
            </div>
          </div>
          {xpGained > 0 && (
            <p className="text-center text-xs text-purple-500 font-semibold mt-4 pt-3 border-t border-gray-100">
              ✨ XP +{xpDisplay}
            </p>
          )}
          {growthFeedback && (
            <p
              className={`text-center text-xs mt-2 ${
                growthFeedback.isPersonalBest ? 'text-amber-600 font-bold' : 'text-[var(--accent-500)] font-medium'
              }`}
            >
              {growthFeedback.isPersonalBest ? `🏅 ${getMascotFace('celebrate', mateTone)} ` : '📈 '}
              {growthFeedback.message}
              {growthFeedback.isPersonalBest && ' — 자기 최고 기록!'}
            </p>
          )}
          {daysUntilNextReview !== undefined && daysUntilNextReview > 0 && (
            <p
              className={`text-center text-xs text-gray-400 mt-2 ${
                xpGained > 0 || growthFeedback ? '' : 'pt-3 border-t border-gray-100'
              }`}
            >
              🗓️ 가장 오래 기억한 문제는 {daysUntilNextReview}일 뒤에 다시 만나요
            </p>
          )}
        </div>

        {shownCards.filter((c) => c.key !== 'levelup').map((c) => (
          <div key={c.key}>{c.full}</div>
        ))}

        {overflowCards.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {overflowCards.map((c) => (
              <span
                key={c.key}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-500 rounded-full text-xs font-medium"
              >
                {c.chip.icon} {c.chip.label}
              </span>
            ))}
          </div>
        )}

        {isSuggestionPending && suggestionGoal && levelSuggestion && (
          <div className="bg-violet-50 rounded-2xl p-4 mb-4 border border-violet-100 text-left">
            <p className="text-violet-700 text-sm font-medium mb-3">
              {levelSuggestion === 'up'
                ? `최근 정답률이 아주 높아요! 다음부터 ${LEVEL_LABEL[nextLevel(suggestionGoal.level, 'up')]}로 올려볼까요?`
                : `요즘 조금 힘드셨나봐요. 다음부터 ${LEVEL_LABEL[nextLevel(suggestionGoal.level, 'down')]}로 낮춰볼까요?`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDismissLevelSuggestion}
                className="flex-1 py-2 border border-violet-200 text-violet-600 rounded-xl text-sm font-medium min-h-[40px]"
              >
                괜찮아요
              </button>
              <button
                onClick={handleAcceptLevelSuggestion}
                className="flex-1 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium min-h-[40px]"
              >
                좋아요!
              </button>
            </div>
          </div>
        )}

        {!isSuggestionPending && (
          <p className="text-gray-400 text-sm mb-4">
            {didLevelUp ? '6초' : '4초'} 후 홈으로 이동합니다
          </p>
        )}

        <div className="mb-3">
          <button
            onClick={async () => {
              setSharing(true);
              try {
                await shareOrDownload({ topic, streak, score, total, isGoalComplete: false });
              } finally {
                setSharing(false);
              }
            }}
            disabled={sharing}
            className="w-full py-3 border-2 border-[var(--accent-200)] text-[var(--accent-600)] rounded-xl font-semibold text-sm min-h-[44px] disabled:opacity-50"
          >
            {sharing ? '생성 중...' : '🙋 친구에게'}
          </button>
        </div>
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 bg-[var(--accent-600)] text-white rounded-xl font-semibold min-h-[44px]"
        >
          홈으로 가기
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
