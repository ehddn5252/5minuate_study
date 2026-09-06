import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

// 테스트용 로그인: 고정된 두 개의 계정(슬롯 1/2)으로 로그인한다. 익명 로그인은
// 매번 새 유저가 만들어져 친구·닉네임·데이터가 로그인마다 사라지므로 쓰지 않는다.
// 두 계정은 Supabase Dashboard > Authentication > Users에서 한 번 수동 생성해 둔다
// (Auto Confirm 체크, 아래 비밀번호로).
const DEV_TEST_PASSWORD = (import.meta.env.VITE_DEV_TEST_PASSWORD as string | undefined) ?? 'test-5min-2026!';
const DEV_TEST_EMAILS: Record<1 | 2, string> = {
  1: (import.meta.env.VITE_DEV_TEST_EMAIL_1 as string | undefined) ?? 'test1@5minute.study',
  2: (import.meta.env.VITE_DEV_TEST_EMAIL_2 as string | undefined) ?? 'test2@5minute.study',
};

export async function signInWithDevAccount(slot: 1 | 2 = 1): Promise<void> {
  const email = DEV_TEST_EMAILS[slot];
  const { error } = await supabase.auth.signInWithPassword({ email, password: DEV_TEST_PASSWORD });
  if (!error) return;

  throw new Error(
    `테스트 계정 ${slot} 로그인 실패: ${error.message}\n\n` +
      `Supabase Dashboard > Authentication > Users에서 "${email}" 계정을 만들어주세요 ` +
      `(비밀번호: ${DEV_TEST_PASSWORD}, Auto Confirm 체크).`,
  );
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// localStorage 전체를 Supabase에 저장
export async function syncToCloud(userId: string): Promise<void> {
  const payload = {
    user_id: userId,
    goals: JSON.parse(localStorage.getItem('goals') ?? '[]'),
    sessions: JSON.parse(localStorage.getItem('sessions') ?? '[]'),
    quizzes: JSON.parse(localStorage.getItem('quizzes') ?? '[]'),
    wrong_pool: JSON.parse(localStorage.getItem('wrongPool') ?? '[]'),
    badges: JSON.parse(localStorage.getItem('badges') ?? '[]'),
    app_state: JSON.parse(localStorage.getItem('appState') ?? '{}'),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('user_data').upsert(payload);
  if (error) console.error('[Supabase] 동기화 오류:', error.message);
}

// Supabase에서 데이터를 내려받아 localStorage에 저장
export async function loadFromCloud(userId: string): Promise<boolean> {
  // 신규 계정은 user_data 행이 없다 — .single()은 이때 406+콘솔 에러를 내므로 .maybeSingle() 사용.
  const { data, error } = await supabase
    .from('user_data')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return false;

  localStorage.setItem('goals', JSON.stringify(data.goals ?? []));
  localStorage.setItem('sessions', JSON.stringify(data.sessions ?? []));
  localStorage.setItem('quizzes', JSON.stringify(data.quizzes ?? []));
  localStorage.setItem('wrongPool', JSON.stringify(data.wrong_pool ?? []));
  localStorage.setItem('badges', JSON.stringify(data.badges ?? []));
  localStorage.setItem('appState', JSON.stringify(data.app_state ?? {}));

  return true;
}

// 로컬에 데이터가 없고 클라우드에도 없으면 false, 있으면 업로드
export async function migrateLocalToCloud(userId: string): Promise<void> {
  const { data } = await supabase
    .from('user_data')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) {
    // 신규 계정 → 기존 로컬 데이터 업로드
    await syncToCloud(userId);
  }
  // 기존 계정이면 클라우드 우선
}
