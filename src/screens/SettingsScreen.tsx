import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, signInWithGoogle, signOut, syncToCloud } from '../services/supabase';
import {
  fetchMyRole,
  getMyAcademyName,
  listMyJoinedClasses,
  setRole as setUserRole,
  getMyDisplayName,
  setDisplayName,
  type UserRole,
  type JoinedClass,
} from '../services/academy';
import type { User } from '@supabase/supabase-js';
import BottomNav from '../components/BottomNav';
import { useAppStore } from '../store';
import { getMascotFace } from '../utils/mascot';
import type { AccentTheme, MascotSkin } from '../types';

const SUPPORT_EMAIL = 'ehddn5252@gmail.com';

const ACCENT_THEMES: { id: AccentTheme; label: string; swatch: string }[] = [
  { id: 'indigo', label: '인디고', swatch: '#4f46e5' },
  { id: 'rose', label: '로즈', swatch: '#e11d48' },
  { id: 'emerald', label: '에메랄드', swatch: '#059669' },
  { id: 'amber', label: '앰버', swatch: '#d97706' },
  { id: 'violet', label: '바이올렛', swatch: '#7c3aed' },
];

const MASCOT_SKINS: { id: MascotSkin; label: string }[] = [
  { id: 'classic', label: '스마일' },
  { id: 'cat', label: '고양이' },
];

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { appState, updateAppState } = useAppStore();
  const [user, setUser] = useState<User | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  // 이미 참여한 학원/반이 있으면 코드 입력 화면 대신 참여 현황을 보여준다 —
  // 한 번 등록하면 다시 코드를 넣을 필요 없이 이 화면에서 바로 확인만 하면 되게 하기 위함
  const [role, setRole] = useState<UserRole>('student');
  const [academyName, setAcademyName] = useState<string | null>(null);
  const [joinedClasses, setJoinedClasses] = useState<JoinedClass[]>([]);
  const [academyLoading, setAcademyLoading] = useState(true);
  const [switchingRole, setSwitchingRole] = useState(false);

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

  useEffect(() => {
    (async () => {
      setAcademyLoading(true);
      const [r, name] = await Promise.all([fetchMyRole(), getMyAcademyName()]);
      setRole(r);
      // academyName은 role과 무관하게 조회한다 — "선생님이었다가 학생 모드로 전환한" 계정도
      // academy_members 소속은 그대로 남아있으므로, 그 경우에도 전환 버튼을 보여줄 수 있어야 함
      setAcademyName(name);
      if (r === 'student') {
        setJoinedClasses(await listMyJoinedClasses());
      }
      setAcademyLoading(false);
    })();
  }, []);

  // 학생↔선생님 화면 전환 — academy_members 소속은 그대로 두고 profiles.role만 바꾼다.
  // App.tsx가 role을 로그인 시점에만 조회하므로, 새로고침해서 다시 읽게 한다.
  const handleSwitchRole = async (nextRole: UserRole) => {
    setSwitchingRole(true);
    const result = await setUserRole(nextRole);
    setSwitchingRole(false);
    if (result.error) return;
    window.location.href = '/';
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

        {/* 스킨 섹션 — 포인트 컬러 + 마스코트 캐릭터 */}
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
          <p className="text-xs text-gray-400 mb-2">마스코트</p>
          <div className="flex gap-2.5">
            {MASCOT_SKINS.map((s) => (
              <button
                key={s.id}
                onClick={() => updateAppState({ mascotSkin: s.id })}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-colors ${
                  appState.mascotSkin === s.id
                    ? 'border-[var(--accent-500)] bg-[var(--accent-50)]'
                    : 'border-gray-200'
                }`}
              >
                <span className="text-2xl">{getMascotFace('celebrate', 'plain', s.id)}</span>
                <span className={`text-xs font-medium ${appState.mascotSkin === s.id ? 'text-[var(--accent-700)]' : 'text-gray-500'}`}>
                  {s.label}
                </span>
              </button>
            ))}
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
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">학원</h2>
          {academyLoading ? (
            <p className="text-xs text-gray-400">확인 중…</p>
          ) : role === 'teacher' ? (
            <>
              <p className="text-sm text-gray-700 mb-3">🏫 {academyName ?? '학원'} 소속 선생님으로 활동 중이에요</p>
              <button
                onClick={() => handleSwitchRole('student')}
                disabled={switchingRole}
                className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {switchingRole ? '전환 중…' : '학생 모드로 전환'}
              </button>
            </>
          ) : (
            <>
              {academyName && (
                <div className="mb-3 p-3 bg-[var(--accent-50)] rounded-xl">
                  <p className="text-sm text-[var(--accent-700)] mb-2">
                    🏫 {academyName} 선생님 계정이에요 (지금은 학생 화면 사용 중)
                  </p>
                  <button
                    onClick={() => handleSwitchRole('teacher')}
                    disabled={switchingRole}
                    className="w-full py-2 bg-[var(--accent-600)] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {switchingRole ? '전환 중…' : '선생님 모드로 전환'}
                  </button>
                </div>
              )}
              {joinedClasses.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-1.5">참여 중인 반</p>
                  <ul className="space-y-1">
                    {joinedClasses.map((c) => (
                      <li key={c.id} className="text-sm text-gray-700">🙋 {c.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                onClick={() => navigate('/join-class')}
                className="w-full flex items-center justify-between py-2 text-sm text-gray-700 hover:text-[var(--accent-600)] transition-colors"
              >
                <span>{joinedClasses.length > 0 ? '+ 다른 반 참여하기' : '반 참여하기'}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {!academyName && (
                <button
                  onClick={() => navigate('/teacher/onboard')}
                  className="w-full flex items-center justify-between py-2 text-sm text-gray-700 hover:text-[var(--accent-600)] transition-colors"
                >
                  <span>선생님이신가요? 학원 시작하기</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </>
          )}
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
