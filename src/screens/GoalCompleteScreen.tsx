import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useGoalStore, useAppStore } from '../store';
import { getBadgeDef } from '../utils/badges';
import { shareOrDownload } from '../utils/shareCard';
import { getIdentityStatement } from '../utils/identity';
import { getMascotFace } from '../utils/mascot';
import { useCountUp } from '../utils/useCountUp';
import type { BadgeId, MateTone } from '../types';
import type { GrowthFeedback } from '../utils/growthFeedback';

interface LocationState {
  score: number;
  total: number;
  streak: number;
  completedSessions: number;
  newBadges?: BadgeId[];
  growthFeedback?: GrowthFeedback;
  mateTone?: MateTone;
  xpGained?: number;
  newLevel?: number;
  didLevelUp?: boolean;
}

export default function GoalCompleteScreen() {
  const navigate = useNavigate();
  const { goalId } = useParams<{ goalId: string }>();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const { goals } = useGoalStore();
  const mascotSkin = useAppStore((s) => s.appState.mascotSkin);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const goal = goals.find((g) => g.id === goalId);
  const score = state?.score ?? 0;
  const total = state?.total ?? 5;
  const streak = state?.streak ?? 1;
  const completedSessions = state?.completedSessions ?? goal?.completedSessions ?? 0;
  const newBadges = state?.newBadges ?? [];
  const growthFeedback = state?.growthFeedback;
  const mateTone = state?.mateTone ?? goal?.mateTone ?? 'plain';
  const xpGained = state?.xpGained ?? 0;
  const newLevel = state?.newLevel ?? 1;
  const didLevelUp = state?.didLevelUp ?? false;
  const percent = Math.round((score / total) * 100);
  const [sharing, setSharing] = useState(false);
  const xpDisplay = useCountUp(xpGained, 600);

  // F-37: 레벨업처럼 드문 순간에만 자동 이동 타이머를 짧게 연장(캡 +2초)
  useEffect(() => {
    const delay = didLevelUp ? 8000 : 6000;
    const timer = setTimeout(() => navigate('/'), delay);
    return () => clearTimeout(timer);
  }, [navigate, didLevelUp]);

  // F-40: 목표 완주는 이미 특별한 순간이므로 항상 축하 연출(opt-out 가능) — CEO 요청으로 일시 비활성화 (2026-07-22)
  useEffect(() => {
    return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 via-[var(--accent-50)] to-white flex items-center justify-center p-4">
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />
      <div className="max-w-md w-full text-center">
        <div className="text-7xl mb-4 animate-bounce">🏆</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">목표 달성!</h1>
        {goal && (
          <p className="text-[var(--accent-600)] font-semibold text-lg mb-1">{goal.topic}</p>
        )}
        <p className="text-gray-500 mb-8">처음부터 끝까지 완주했어요. 정말 대단합니다!</p>

        {didLevelUp && (
          <div className="bg-gradient-to-r from-[var(--accent-600)] to-purple-600 rounded-2xl p-5 mb-4 text-center animate-count-up-pop">
            <p className="text-3xl mb-1">🎉</p>
            <p className="text-white font-bold text-lg">레벨 {newLevel} 달성!</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex justify-around">
            <div className="text-center">
              <p className="text-3xl font-bold text-[var(--accent-600)]">{completedSessions}일</p>
              <p className="text-gray-500 text-sm mt-1">총 학습</p>
            </div>
            <div className="w-px bg-gray-100" />
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-500">🔥 {streak}</p>
              <p className="text-gray-500 text-sm mt-1">연속 달성</p>
            </div>
            <div className="w-px bg-gray-100" />
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">{percent}%</p>
              <p className="text-gray-500 text-sm mt-1">마지막 점수</p>
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
              {growthFeedback.isPersonalBest ? `🏅 ${getMascotFace('celebrate', mateTone, mascotSkin)} ` : '📈 '}
              {growthFeedback.message}
              {growthFeedback.isPersonalBest && ' — 자기 최고 기록!'}
            </p>
          )}
        </div>

        {goal && (
          <div className="bg-[var(--accent-600)] rounded-2xl p-5 mb-4">
            <p className="text-white font-semibold leading-relaxed">
              "{getIdentityStatement(goal.topic)}"
            </p>
          </div>
        )}

        {newBadges.length > 0 && (
          <div className="bg-yellow-50 rounded-2xl p-4 mb-4 border border-yellow-200">
            <p className="text-yellow-700 font-semibold text-sm mb-3">🎉 뱃지 획득!</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {newBadges.map((id) => {
                const def = getBadgeDef(id);
                return (
                  <div key={id} className="flex flex-col items-center gap-1">
                    <span className="text-3xl">{def.icon}</span>
                    <span className="text-xs font-medium text-yellow-700">{def.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-gray-400 text-sm mb-4">{didLevelUp ? '8초' : '6초'} 후 홈으로 이동합니다</p>

        <div className="mb-3">
          <button
            onClick={async () => {
              setSharing(true);
              try {
                await shareOrDownload({ topic: goal?.topic ?? '학습 목표', streak, score, total, isGoalComplete: true });
              } finally {
                setSharing(false);
              }
            }}
            disabled={sharing}
            className="w-full py-3 bg-[var(--accent-600)] text-white rounded-xl font-semibold text-sm min-h-[44px] disabled:opacity-50"
          >
            {sharing ? '생성 중...' : '🙋 친구에게'}
          </button>
        </div>
        <button
          onClick={() => navigate('/goals/create')}
          className="w-full mb-3 py-3 border-2 border-[var(--accent-200)] text-[var(--accent-600)] rounded-xl font-semibold min-h-[44px]"
        >
          새 목표 만들기
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold min-h-[44px]"
        >
          홈으로 가기
        </button>
      </div>
    </div>
  );
}
