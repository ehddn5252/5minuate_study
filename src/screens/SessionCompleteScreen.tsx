import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

interface LocationState {
  score: number;
  total: number;
  streak: number;
}

export default function SessionCompleteScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const score = state?.score ?? 0;
  const total = state?.total ?? 5;
  const streak = state?.streak ?? 1;
  const percent = Math.round((score / total) * 100);

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

        <p className="text-gray-400 text-sm mb-4">4초 후 홈으로 이동합니다</p>

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
