import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, signInWithGoogle, signOut, syncToCloud } from '../services/supabase';
import type { User } from '@supabase/supabase-js';
import BottomNav from '../components/BottomNav';

const SUPPORT_EMAIL = 'ehddn5252@gmail.com';

export default function SettingsScreen() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    setSyncMsg('');
    try {
      await syncToCloud(user.id);
      setSyncMsg('동기화 완료!');
    } catch {
      setSyncMsg('동기화 실패');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">설정</h1>
        </div>

        {/* 계정 섹션 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">계정 & 동기화</h2>
          {user ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                  {user.email?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                  <p className="text-xs text-green-500 mt-0.5">✓ 로그인됨 — 자동 동기화 중</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex-1 py-2.5 border border-indigo-200 text-indigo-600 rounded-xl text-sm font-medium min-h-[44px] disabled:opacity-50"
                >
                  {syncing ? '동기화 중...' : '지금 동기화'}
                </button>
                <button
                  onClick={() => signOut()}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium min-h-[44px]"
                >
                  로그아웃
                </button>
              </div>
              {syncMsg && (
                <p className="text-xs text-center mt-2 text-indigo-500">{syncMsg}</p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                로그인하면 어느 기기에서나 학습 데이터를 이어서 사용할 수 있어요.
              </p>
              <button
                onClick={() => signInWithGoogle()}
                className="w-full flex items-center justify-center gap-3 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 min-h-[44px] hover:border-indigo-300 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google로 로그인
              </button>
            </div>
          )}
          <p className="text-xs text-green-600 mt-4 pt-3 border-t border-gray-100">
            💚 5분 학습은 지금도, 앞으로도 완전 무료예요.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">학습 데이터</h2>
          <button
            onClick={() => navigate('/wrong-pool')}
            className="w-full flex items-center justify-between py-2 text-sm text-gray-700 hover:text-indigo-600 transition-colors"
          >
            <span>오답 목록 보기</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => navigate('/my-questions')}
            className="w-full flex items-center justify-between py-2 text-sm text-gray-700 hover:text-indigo-600 transition-colors"
          >
            <span>내 문제집 보기</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => navigate('/recordings')}
            className="w-full flex items-center justify-between py-2 text-sm text-gray-700 hover:text-indigo-600 transition-colors"
          >
            <span>녹음 모음 보기</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">학원</h2>
          <button
            onClick={() => navigate('/join-class')}
            className="w-full flex items-center justify-between py-2 text-sm text-gray-700 hover:text-indigo-600 transition-colors"
          >
            <span>반 참여하기</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => navigate('/teacher/onboard')}
            className="w-full flex items-center justify-between py-2 text-sm text-gray-700 hover:text-indigo-600 transition-colors"
          >
            <span>선생님이신가요? 학원 시작하기</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">고객센터</h2>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('[5분 학습] 문의')}&body=${encodeURIComponent('아래에 문의 내용을 자유롭게 작성해주세요.\n\n')}`}
            className="w-full flex items-center justify-between py-2 text-sm text-gray-700 hover:text-indigo-600 transition-colors"
          >
            <span>문의하기</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <p className="text-xs text-gray-400 mt-2">{SUPPORT_EMAIL}로 이메일이 연결돼요.</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
