import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { decodeStudyShareLink } from '../services/social';
import { useQuizStore } from '../store';
import { generateId } from '../utils/id';
import type { Quiz } from '../types';

export default function SharedStudyScreen() {
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const { addQuizzes } = useQuizStore();
  const [saved, setSaved] = useState(false);

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

  const quizList = payload.quizList ?? [];
  const label = payload.shareType === 'goal' ? '목표' : payload.shareType === 'session' ? '세션' : '문제집';

  const handleSave = () => {
    if (quizList.length === 0) return;
    const quizzes: Quiz[] = quizList.map((item) => ({
      id: generateId(),
      goalId: '',
      question: item.question,
      type: item.type ?? 'short_answer',
      options: item.options,
      answer: item.answer,
      explanation: item.explanation ?? '',
      isWrong: false,
      wrongCount: 0,
      bookmarked: true,
      // 목표 없이 '내 문제집'에 바로 담기므로, 어느 주제인지 스냅샷으로 남긴다
      orphanedGoalTopic: payload.topic,
    }));
    addQuizzes(quizzes);
    setSaved(true);
  };

  return (
    <div className="min-h-screen bg-[var(--page-bg)] pb-16">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-600)]">
            공유된 {label}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{payload.topic}</h1>

          {payload.sessionDate && (
            <p className="mt-2 text-xs text-gray-400">세션 날짜: {payload.sessionDate}</p>
          )}

          {(payload.summary || payload.sessionSummary) && (
            <div className="mt-4 rounded-xl bg-[var(--accent-50)] border border-[var(--accent-200)] p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {payload.summary || payload.sessionSummary}
              </p>
            </div>
          )}

          {quizList.length > 0 && (
            <div className="mt-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">문제 {quizList.length}개</h2>
              <div className="space-y-3">
                {quizList.map((item, index) => (
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

          <div className="mt-6">
            {saved ? (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">'내 문제집'에 저장했어요.</p>
                <button
                  onClick={() => navigate('/my-questions')}
                  className="w-full py-3 rounded-xl bg-[var(--accent-600)] text-white font-semibold"
                >
                  내 문제집으로 가기
                </button>
              </div>
            ) : quizList.length > 0 ? (
              <button
                onClick={handleSave}
                className="w-full py-3 rounded-xl bg-[var(--accent-600)] text-white font-semibold"
              >
                이 문제 {quizList.length}개를 내 문제집에 저장하기
              </button>
            ) : (
              <p className="text-sm text-gray-500 text-center">저장할 문제가 없는 공유예요.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
