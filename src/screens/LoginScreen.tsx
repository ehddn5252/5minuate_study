import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../services/supabase';
import { TEMPLATES } from '../data/templates';

// 로그인 없이 먼저 체험해볼 수 있는 쇼츠 미리보기 칩 — HomeScreen 빈 상태의 맛보기 칩과 같은 템플릿 구성
const PREVIEW_TEMPLATE_IDS = ['english_grammar', 'iip_practical', 'driving_written'] as const;

export default function LoginScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--page-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">5분 학습</h1>
        <p className="text-gray-500 text-sm mb-8">
          매일 5분, 목표만 정하면 요약과 문제를 자동으로 만들어드려요.
        </p>
        <button
          onClick={() => signInWithGoogle()}
          className="w-full flex items-center justify-center gap-3 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 min-h-[44px] hover:border-[var(--accent-300)] transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google로 로그인
        </button>

        <p className="text-xs text-gray-400 mt-6 mb-3">계정 없이 먼저 둘러볼래요</p>
        <div className="flex gap-2 justify-center flex-wrap">
          {PREVIEW_TEMPLATE_IDS.map((tid) => {
            const tpl = TEMPLATES.find((t) => t.id === tid);
            if (!tpl) return null;
            return (
              <button
                key={tid}
                onClick={() => navigate(`/shorts/${tid}`)}
                className="flex items-center gap-1.5 px-3 py-2 bg-[var(--accent-50)] border border-[var(--accent-200)] rounded-xl text-xs font-medium text-[var(--accent-700)]"
              >
                <span>{tpl.icon}</span>
                <span>{tpl.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
