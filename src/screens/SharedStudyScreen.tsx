import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { decodeStudyShareLink } from '../services/social';

export default function SharedStudyScreen() {
  const { shareCode } = useParams();
  const navigate = useNavigate();

  const payload = useMemo(() => {
    if (!shareCode) return null;
    return decodeStudyShareLink(shareCode);
  }, [shareCode]);

  if (!payload) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-lg font-semibold text-gray-900 mb-2">유효하지 않은 공유 링크예요</p>
          <p className="text-sm text-gray-500 mb-4">공유자가 보낸 링크를 다시 확인해 주세요.</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 rounded-xl bg-[var(--accent-600)] text-white font-semibold"
          >
            홈으로 가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] pb-16">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">공유된 학습</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{payload.topic}</h1>

          <div className="mt-4 rounded-xl bg-[var(--accent-50)] border border-[var(--accent-200)] p-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{payload.summary || '공유된 학습 설명이 아직 없어요.'}</p>
          </div>

          {payload.dailyPlan && (
            <div className="mt-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">오늘의 학습 계획</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{payload.dailyPlan}</p>
            </div>
          )}

          <div className="mt-6 flex gap-2">
            <Link
              to={`/goals/create?topic=${encodeURIComponent(payload.topic)}&content=${encodeURIComponent(payload.summary || payload.dailyPlan || '')}`}
              className="flex-1 text-center py-3 rounded-xl bg-[var(--accent-600)] text-white font-semibold"
            >
              같은 목표로 시작하기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
