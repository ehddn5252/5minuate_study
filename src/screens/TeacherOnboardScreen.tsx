import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { becomeTeacher } from '../services/academy';

export default function TeacherOnboardScreen() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    const result = await becomeTeacher(code);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    // role은 App.tsx가 로그인 시점에 한 번만 조회하므로, 새로고침해서 다시 조회하게 한다
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="max-w-md mx-auto w-full px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center mb-4"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h1 className="text-xl font-bold text-gray-900 mb-1">🏫 선생님이신가요?</h1>
        <p className="text-gray-400 text-sm mb-6">학원에서 받은 초대 코드를 입력하면 반을 만들고 숙제를 관리할 수 있어요.</p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <label className="text-sm font-medium text-gray-700 mb-2 block">학원 초대 코드</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="예: ACADEMY1"
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent text-base mb-3"
          />
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={!code.trim() || loading}
            className="w-full py-3 bg-[var(--accent-600)] text-white rounded-xl font-semibold text-sm min-h-[44px] disabled:opacity-40"
          >
            {loading ? '확인 중…' : '선생님 시작하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
