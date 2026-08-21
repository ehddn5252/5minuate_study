import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinClassByCode } from '../services/academy';

export default function JoinClassScreen() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joinedName, setJoinedName] = useState('');

  const handleSubmit = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    const result = await joinClassByCode(code);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setJoinedName(result.className ?? '반');
  };

  if (joinedName) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-4xl">🎉</div>
        <p className="text-gray-700 text-center font-medium">{joinedName}에 참여했어요!</p>
        <button
          onClick={() => navigate('/assignments')}
          className="px-5 py-2.5 bg-[var(--accent-600)] text-white rounded-xl font-semibold text-sm min-h-[44px]"
        >
          숙제 보러가기
        </button>
        <button onClick={() => navigate('/')} className="text-gray-400 text-sm">
          홈으로
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] flex flex-col">
      <div className="max-w-md mx-auto w-full px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center mb-4"
          aria-label="뒤로"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h1 className="text-xl font-bold text-gray-900 mb-1">🙋 반 참여하기</h1>
        <p className="text-gray-400 text-sm mb-6">선생님께 받은 반 코드를 입력해주세요.</p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="예: 7F3K9Q"
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent text-base mb-3"
          />
          {error && <p role="alert" className="text-red-500 text-sm mb-3">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={!code.trim() || loading}
            className="w-full py-3 bg-[var(--accent-600)] text-white rounded-xl font-semibold text-sm min-h-[44px] disabled:opacity-40"
          >
            {loading ? '확인 중…' : '참여하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
