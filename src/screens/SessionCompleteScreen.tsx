import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { getBadgeDef } from '../utils/badges';
import { shareOrDownload } from '../utils/shareCard';
import { getIdentityStatement } from '../utils/identity';
import type { BadgeId } from '../types';

interface LocationState {
  score: number;
  total: number;
  streak: number;
  newBadges?: BadgeId[];
  topic?: string;
  usedFreeze?: boolean;
}

export default function SessionCompleteScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const score = state?.score ?? 0;
  const total = state?.total ?? 5;
  const streak = state?.streak ?? 1;
  const newBadges = state?.newBadges ?? [];
  const topic = state?.topic ?? '학습';
  const usedFreeze = state?.usedFreeze ?? false;
  // F-22: 정체성 서사는 매일 노출하지 않고 7일/30일 스트릭 마일스톤에서만 노출(피로도 방지)
  const isStreakMilestone = newBadges.includes('flame_7') || newBadges.includes('persistence_30');
  const percent = Math.round((score / total) * 100);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/');
    }, 4000);
    return () => clearTimeout(timer);
  }, [navigate]);

  const getMessage = () => {
    if (percent === 100) return '완벽해요! 모두 맞혔습니다!';
    if (percent >= 80) return '훌륭합니다! 잘 이해했어요.';
    if (percent >= 60) return '좋아요! 조금 더 복습해볼까요?';
    return '오답 문제를 다시 확인해보세요.';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center p-4 pb-20">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-4 animate-bounce">
          {percent === 100 ? '🎉' : percent >= 80 ? '⭐' : percent >= 60 ? '👍' : '📖'}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">오늘 학습 완료!</h1>
        <p className="text-gray-500 mb-8">{getMessage()}</p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex justify-around">
            <div className="text-center">
              <p className="text-3xl font-bold text-indigo-600">
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
        </div>

        {usedFreeze && (
          <div className="bg-sky-50 rounded-2xl p-4 mb-4 border border-sky-100">
            <p className="text-sky-700 text-sm font-medium">
              🧊 리듬 유지권을 사용했어요 — 어제 못 했어도 스트릭은 이어져요
            </p>
          </div>
        )}

        {isStreakMilestone && (
          <div className="bg-indigo-600 rounded-2xl p-5 mb-4">
            <p className="text-white font-semibold leading-relaxed">
              "{getIdentityStatement(topic)}"
            </p>
          </div>
        )}

        {newBadges.length > 0 && (
          <div className="bg-indigo-50 rounded-2xl p-4 mb-4 border border-indigo-100">
            <p className="text-indigo-700 font-semibold text-sm mb-3">🎉 뱃지 획득!</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {newBadges.map((id) => {
                const def = getBadgeDef(id);
                return (
                  <div key={id} className="flex flex-col items-center gap-1">
                    <span className="text-3xl">{def.icon}</span>
                    <span className="text-xs font-medium text-indigo-600">{def.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-gray-400 text-sm mb-4">4초 후 홈으로 이동합니다</p>

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
          className="w-full mb-3 py-3 border-2 border-indigo-200 text-indigo-600 rounded-xl font-semibold min-h-[44px] disabled:opacity-50"
        >
          {sharing ? '생성 중...' : '📤 결과 공유하기'}
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold min-h-[44px]"
        >
          홈으로 가기
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
