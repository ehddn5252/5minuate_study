import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DEV_DEMO_EMAIL = (import.meta.env.VITE_DEV_DEMO_EMAIL as string | undefined) ?? 'demo@5minute.study';
const DEV_DEMO_PASSWORD = (import.meta.env.VITE_DEV_DEMO_PASSWORD as string | undefined) ?? 'demo123456';

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signInWithDevAccount(): Promise<void> {
  if (!import.meta.env.DEV && !import.meta.env.VITE_DEV_DEMO_EMAIL) {
    throw new Error('개발용 로그인은 로컬 개발 환경에서만 사용할 수 있어요. VITE_DEV_DEMO_EMAIL과 VITE_DEV_DEMO_PASSWORD를 설정해 주세요.');
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: DEV_DEMO_EMAIL,
    password: DEV_DEMO_PASSWORD,
  });

  if (signInError) {
    const { error: signUpError } = await supabase.auth.signUp({
      email: DEV_DEMO_EMAIL,
      password: DEV_DEMO_PASSWORD,
    });

    if (signUpError) throw signUpError;

    const { error: retryError } = await supabase.auth.signInWithPassword({
      email: DEV_DEMO_EMAIL,
      password: DEV_DEMO_PASSWORD,
    });
    if (retryError) throw retryError;
    return;
  }
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
  const { data, error } = await supabase
    .from('user_data')
    .select('*')
    .eq('user_id', userId)
    .single();

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
    .single();

  if (!data) {
    // 신규 계정 → 기존 로컬 데이터 업로드
    await syncToCloud(userId);
  }
  // 기존 계정이면 클라우드 우선
}
