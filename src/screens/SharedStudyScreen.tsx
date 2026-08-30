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

  const contentForGoal = payload.summary || payload.sessionSummary || payload.dailyPlan ||
    (payload.quizList && payload.quizList.length > 0
      ? payload.quizList.map((item) => `Q. ${item.question}\nA. ${item.answer}`).join('\n\n')
      : '');

  const buttonLabel =
    payload.shareType === 'goal'
      ? '이 목표를 내 목표로 저장하기'
      : payload.shareType === 'session'
        ? '이 세션을 내 목표로 저장하기'
        : '이 문제집을 내 목표로 저장하기';

  return (
    <div className="min-h-screen bg-[var(--page-bg)] pb-16">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">
            {payload.shareType === 'goal' ? '공유된 목표' : payload.shareType === 'session' ? '공유된 세션' : '공유된 문제집'}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{payload.topic}</h1>

          {payload.sessionDate && (
            <p className="mt-2 text-xs text-gray-400">세션 날짜: {payload.sessionDate}</p>
          )}

          <div className="mt-4 rounded-xl bg-[var(--accent-50)] border border-[var(--accent-200)] p-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {payload.summary || payload.sessionSummary || '공유된 학습 설명이 아직 없어요.'}
            </p>
          </div>

          {payload.dailyPlan && (
            <div className="mt-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">오늘의 학습 계획</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{payload.dailyPlan}</p>
            </div>
          )}

          {payload.quizList && payload.quizList.length > 0 && (
            <div className="mt-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">문제집 미리보기</h2>
              <div className="space-y-3">
                {payload.quizList.map((item, index) => (
                  <div key={`${item.question}-${index}`} className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Q{index + 1}</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.question}</p>
                    <p className="mt-2 text-sm font-medium text-[var(--accent-700)]">정답: {item.answer}</p>
                    {item.explanation && <p className="mt-1 text-xs text-gray-500 whitespace-pre-wrap">{item.explanation}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-2">
            <Link
              to={`/goals/create?topic=${encodeURIComponent(payload.topic)}&content=${encodeURIComponent(contentForGoal)}&shareType=${encodeURIComponent(payload.shareType ?? 'goal')}${payload.sessionDate ? `&sessionDate=${encodeURIComponent(payload.sessionDate)}` : ''}${payload.sessionSummary ? `&sessionSummary=${encodeURIComponent(payload.sessionSummary)}` : ''}`}
              className="flex-1 text-center py-3 rounded-xl bg-[var(--accent-600)] text-white font-semibold"
            >
              {buttonLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
