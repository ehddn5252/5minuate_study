import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, signInWithGoogle, signOut, syncToCloud } from '../services/supabase';
import {
  getMyDisplayName,
  setDisplayName,
} from '../services/academy';
import type { User } from '@supabase/supabase-js';
import BottomNav from '../components/BottomNav';
import { useAppStore } from '../store';
import type { AccentTheme, BackgroundTheme } from '../types';
// 배경 무늬(BackgroundPattern) 선택 UI는 잠시 비활성화 상태 — 재활성화 시 이 타입도 다시 import.

const SUPPORT_EMAIL = 'ehddn5252@gmail.com';

const ACCENT_THEMES: { id: AccentTheme; label: string; swatch: string }[] = [
  { id: 'indigo', label: '인디고', swatch: '#4f46e5' },
  { id: 'rose', label: '로즈', swatch: '#e11d48' },
  { id: 'emerald', label: '에메랄드', swatch: '#059669' },
  { id: 'amber', label: '앰버', swatch: '#d97706' },
  { id: 'violet', label: '바이올렛', swatch: '#7c3aed' },
];

const BG_THEMES: { id: BackgroundTheme; label: string; swatch: string; dark?: boolean }[] = [
  { id: 'default', label: '그레이', swatch: '#f9fafb' },
  { id: 'ivory', label: '아이보리', swatch: '#fdf8f0' },
  { id: 'mint', label: '민트', swatch: '#f1faf7' },
  { id: 'lavender', label: '라벤더', swatch: '#f6f4fc' },
  { id: 'charcoal', label: '차콜', swatch: '#1f2937', dark: true },
  { id: 'navy', label: '네이비', swatch: '#0f172a', dark: true },
];

// 배경 무늬 선택 UI 비활성화 — index.css의 관련 규칙과 App/main.tsx 연동은 그대로 두고
// 이 화면의 노출만 잠시 꺼둔다. 재활성화 시 아래 주석을 해제.
// index.css의 html[data-bg-pattern='...'] body 규칙과 동일한 값을 써서 미리보기가 실제와 일치하게 한다.
// const BG_PATTERNS: { id: BackgroundPattern; label: string; backgroundImage: string; backgroundSize: string }[] = [
//   { id: 'none', label: '없음', backgroundImage: 'none', backgroundSize: 'auto' },
//   {
//     id: 'dots',
//     label: '도트',
//     backgroundImage: 'radial-gradient(rgba(0,0,0,0.12) 1.4px, transparent 1.4px)',
//     backgroundSize: '9px 9px',
//   },
//   {
//     id: 'stars',
//     label: '별',
//     backgroundImage:
//       "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='rgba(0,0,0,0.16)'%3E%3Ccircle cx='10' cy='15' r='1.5'/%3E%3Ccircle cx='45' cy='8' r='1'/%3E%3Ccircle cx='65' cy='30' r='1.8'/%3E%3Ccircle cx='25' cy='50' r='1.2'/%3E%3Ccircle cx='55' cy='60' r='1.5'/%3E%3Ccircle cx='75' cy='72' r='1'/%3E%3Ccircle cx='5' cy='68' r='1.3'/%3E%3C/g%3E%3C/svg%3E\")",
//     backgroundSize: '28px 28px',
//   },
//   {
//     id: 'waves',
//     label: '파도',
//     backgroundImage:
//       "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='24' viewBox='0 0 120 24'%3E%3Cpath d='M0 12 Q30 0 60 12 T120 12' fill='none' stroke='rgba(0,0,0,0.16)' stroke-width='3'/%3E%3C/svg%3E\")",
//     backgroundSize: '40px 8px',
//   },
// ];

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { appState, updateAppState } = useAppStore();
  const [user, setUser] = useState<User | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  // 학원/교사 기능은 임시 비활성화 상태 — 개인 학습만 유지한다.

  // 닉네임 — 안 정해두면 Google 이름을 그대로 씀
  const [nickname, setNickname] = useState('');
  const [nicknameSaved, setNicknameSaved] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameMsg, setNicknameMsg] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    getMyDisplayName().then((name) => {
      setNickname(name);
      setNicknameSaved(name);
    });
  }, []);

  const handleSaveNickname = async () => {
    if (!nickname.trim() || nickname.trim() === nicknameSaved) return;
    setNicknameSaving(true);
    setNicknameMsg('');
    const result = await setDisplayName(nickname);
    setNicknameSaving(false);
    if (result.error) {
      setNicknameMsg(result.error);
      return;
    }
    setNicknameSaved(nickname.trim());
    setNicknameMsg('저장됐어요!');
    setTimeout(() => setNicknameMsg(''), 2000);
  };

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
    <div className="min-h-screen bg-[var(--page-bg)] pb-16">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="뒤로"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">설정</h1>
        </div>

        {/* 스킨 섹션 — 포인트 컬러 + 배경 (마스코트는 선택 없이 public/mascot.png로 고정) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">스킨 꾸미기</h2>
          <p className="text-xs text-gray-400 mb-2">포인트 컬러</p>
          <div className="flex gap-2.5 mb-4">
            {ACCENT_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => updateAppState({ accentTheme: t.id })}
                aria-label={t.label}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-90 ${
                  appState.accentTheme === t.id ? 'ring-2 ring-offset-2 ring-gray-300' : ''
                }`}
                style={{ backgroundColor: t.swatch }}
              >
                {appState.accentTheme === t.id && <span className="text-white text-sm">✓</span>}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mb-2">배경</p>
          <div className="flex gap-2.5 mb-4">
            {BG_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => updateAppState({ bgTheme: t.id })}
                aria-label={t.label}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-transform active:scale-90 ${
                  appState.bgTheme === t.id ? 'border-[var(--accent-500)]' : 'border-gray-200'
                }`}
                style={{ backgroundColor: t.swatch }}
              >
                {appState.bgTheme === t.id && (
                  <span className={`text-sm ${t.dark ? 'text-white' : 'text-[var(--accent-600)]'}`}>✓</span>
                )}
              </button>
            ))}
          </div>
          {/* 배경 무늬 선택 UI 비활성화 — 재활성화 시 위 BG_PATTERNS 주석과 함께 해제.
          <p className="text-xs text-gray-400 mb-2">배경 무늬</p>
          <div className="flex gap-2.5 mb-4">
            {BG_PATTERNS.map((p) => (
              <button
                key={p.id}
                onClick={() => updateAppState({ bgPattern: p.id })}
                aria-label={p.label}
                className={`w-10 h-10 rounded-full border-2 bg-gray-50 flex items-center justify-center transition-transform active:scale-90 ${
                  appState.bgPattern === p.id ? 'border-[var(--accent-500)]' : 'border-gray-200'
                }`}
                style={{ backgroundImage: p.backgroundImage, backgroundSize: p.backgroundSize }}
              >
                {appState.bgPattern === p.id && <span className="text-[var(--accent-600)] text-sm">✓</span>}
              </button>
            ))}
          </div>
          */}
        </div>

        {/* F-40: 축하 효과 opt-out — 2026-07-22 CEO 요청으로 일시 비활성화됐다가
            2026-08-22 재미 요소 추가 작업으로 재활성화 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">축하 효과</p>
              <p className="text-xs text-gray-400 mt-0.5">완료 화면의 컨페티·효과음·진동</p>
            </div>
            <button
              onClick={() => updateAppState({ celebrationEffectsEnabled: !appState.celebrationEffectsEnabled })}
              aria-pressed={appState.celebrationEffectsEnabled}
              aria-label="축하 효과 켜기/끄기"
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
                appState.celebrationEffectsEnabled ? 'bg-[var(--accent-600)]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  appState.celebrationEffectsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 계정 섹션 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">계정 & 동기화</h2>
          {user ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[var(--accent-100)] flex items-center justify-center text-[var(--accent-600)] font-bold text-sm flex-shrink-0">
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
                  className="flex-1 py-2.5 border border-[var(--accent-200)] text-[var(--accent-600)] rounded-xl text-sm font-medium min-h-[44px] disabled:opacity-50"
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
                <p className="text-xs text-center mt-2 text-[var(--accent-500)]">{syncMsg}</p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                로그인하면 어느 기기에서나 학습 데이터를 이어서 사용할 수 있어요.
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
            </div>
          )}
          <p className="text-xs text-green-600 mt-4 pt-3 border-t border-gray-100">
            💚 오늘 5분, 내일도 5분이면 충분해요.
          </p>
        </div>

        {user && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
            <h2 className="font-semibold text-gray-900 mb-3">닉네임</h2>
            <div className="flex gap-2">
              <input
                type="text"
                aria-label="닉네임"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveNickname()}
                placeholder="닉네임을 입력하세요"
                maxLength={20}
                className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent text-sm"
              />
              <button
                onClick={handleSaveNickname}
                disabled={!nickname.trim() || nickname.trim() === nicknameSaved || nicknameSaving}
                className="px-4 py-2.5 bg-[var(--accent-600)] text-white rounded-xl text-sm font-medium disabled:opacity-40"
              >
                {nicknameSaving ? '저장 중…' : '저장'}
              </button>
            </div>
            {nicknameMsg && <p className="text-xs text-[var(--accent-500)] mt-2">{nicknameMsg}</p>}
            <p className="text-xs text-gray-400 mt-2">학원 반에 참여 중이면 선생님께 보이는 이름도 함께 바뀌어요.</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">학습 데이터</h2>
          <button
            onClick={() => navigate('/wrong-pool')}
            className="w-full flex items-center justify-between py-2 text-sm text-gray-700 hover:text-[var(--accent-600)] transition-colors"
          >
            <span>오답 목록 보기</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => navigate('/my-questions')}
            className="w-full flex items-center justify-between py-2 text-sm text-gray-700 hover:text-[var(--accent-600)] transition-colors"
          >
            <span>내 문제집 보기</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => navigate('/recordings')}
            className="w-full flex items-center justify-between py-2 text-sm text-gray-700 hover:text-[var(--accent-600)] transition-colors"
          >
            <span>녹음 모음 보기</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => navigate('/cleanup-questions')}
            className="w-full flex items-center justify-between py-2 text-sm text-gray-700 hover:text-[var(--accent-600)] transition-colors"
          >
            <span>쌓인 문제 정리하기</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">학원</h2>
          <p className="text-sm text-gray-500">
            학원/교사 기능은 잠시 비활성화되어 있어요. 개인 학습 기능만 정상적으로 사용하실 수 있습니다.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">고객센터</h2>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('[5분 학습] 문의')}&body=${encodeURIComponent('아래에 문의 내용을 자유롭게 작성해주세요.\n\n')}`}
            className="w-full flex items-center justify-between py-2 text-sm text-gray-700 hover:text-[var(--accent-600)] transition-colors"
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
