import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { requestPermission, scheduleLocalReminder, cancelReminder } from '../services/notification';
import { supabase, signInWithGoogle, signOut, syncToCloud } from '../services/supabase';
import type { User } from '@supabase/supabase-js';
import BottomNav from '../components/BottomNav';

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { appState, updateAppState } = useAppStore();
  const [apiKey, setApiKey] = useState(appState.geminiApiKey);
  const [saved, setSaved] = useState(false);
  const [notifTime, setNotifTime] = useState(appState.notificationTime || '20:00');
  const [notifGranted, setNotifGranted] = useState(appState.notificationGranted);
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

  const handleSave = () => {
    updateAppState({ geminiApiKey: apiKey.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleNotifToggle = async () => {
    if (notifGranted) {
      cancelReminder();
      updateAppState({ notificationGranted: false });
      setNotifGranted(false);
    } else {
      const granted = await requestPermission();
      if (granted) {
        scheduleLocalReminder(notifTime);
        updateAppState({ notificationGranted: true, notificationTime: notifTime });
        setNotifGranted(true);
      } else {
        alert('알림 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.');
      }
    }
  };

  const handleNotifTimeSave = () => {
    updateAppState({ notificationTime: notifTime });
    if (notifGranted) {
      scheduleLocalReminder(notifTime);
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

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-semibold text-gray-900">Gemini API 키</h2>
            <span className="text-xs bg-green-100 text-green-600 font-medium px-2 py-0.5 rounded-full">선택 사항</span>
          </div>
          <p className="text-gray-500 text-sm mb-4">
            입력하지 않아도 하루 20회 무료로 사용할 수 있어요.
            더 많이 사용하려면 개인 키를 입력하세요.
            <br />
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 underline"
            >
              무료 API 키 발급하기 →
            </a>
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="입력 시 개인 키 사용 (무제한)"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base mb-3"
          />
          <button
            onClick={handleSave}
            disabled={apiKey === appState.geminiApiKey}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold min-h-[44px] disabled:opacity-40"
          >
            {saved ? '저장됨!' : apiKey.trim() ? '저장' : '저장 (키 없음으로 초기화)'}
          </button>
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
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">학습 알림</h2>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-700">알림 허용</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {notifGranted ? '알림이 활성화되어 있습니다' : '알림이 비활성화되어 있습니다'}
              </p>
            </div>
            <button
              onClick={handleNotifToggle}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
                notifGranted ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  notifGranted ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {notifGranted && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">알림 시각</label>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={notifTime}
                  onChange={(e) => setNotifTime(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                />
                <button
                  onClick={handleNotifTimeSave}
                  className="px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium min-h-[44px]"
                >
                  적용
                </button>
              </div>
            </div>
          )}
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
        </div>

        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
          <p className="text-amber-700 text-sm">
            API 키는 이 기기의 localStorage에만 저장되며 서버로 전송되지 않습니다.
          </p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
