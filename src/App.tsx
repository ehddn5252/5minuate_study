import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
// LoginScreen만 즉시 로드 — 로그인 전 첫 화면이라 지연 로드하면 첫 화면 자체가 느려짐.
// 나머지 화면은 전부 lazy로 분리해 초기 번들 크기를 줄인다(각 화면은 실제로 들어갈 때만 받음).
import LoginScreen from './screens/LoginScreen';
import { supabase, loadFromCloud, migrateLocalToCloud, syncToCloud } from './services/supabase';
import { fetchMyRole, type UserRole } from './services/academy';
import { clearAllLocalData } from './utils/storage';
import { useGoalStore, useSessionStore, useQuizStore, useAppStore } from './store';
const HomeScreen = lazy(() => import('./screens/HomeScreen'));
const GoalCreateScreen = lazy(() => import('./screens/GoalCreateScreen'));
const GoalListScreen = lazy(() => import('./screens/GoalListScreen'));
const GoalEditScreen = lazy(() => import('./screens/GoalEditScreen'));
const LearningScreen = lazy(() => import('./screens/LearningScreen'));
const TestScreen = lazy(() => import('./screens/TestScreen'));
const SessionCompleteScreen = lazy(() => import('./screens/SessionCompleteScreen'));
const GoalCompleteScreen = lazy(() => import('./screens/GoalCompleteScreen'));
const WrongPoolScreen = lazy(() => import('./screens/WrongPoolScreen'));
const RetryWrongScreen = lazy(() => import('./screens/RetryWrongScreen'));
const MyQuestionBookScreen = lazy(() => import('./screens/MyQuestionBookScreen'));
const CalendarScreen = lazy(() => import('./screens/CalendarScreen'));
const LanguageHubScreen = lazy(() => import('./screens/LanguageHubScreen'));
const MixReviewScreen = lazy(() => import('./screens/MixReviewScreen'));
const RecordingsScreen = lazy(() => import('./screens/RecordingsScreen'));
const AchievementsScreen = lazy(() => import('./screens/AchievementsScreen'));
const StudyMaterialsScreen = lazy(() => import('./screens/StudyMaterialsScreen'));
const ShortsScreen = lazy(() => import('./screens/ShortsScreen'));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));
const TeacherOnboardScreen = lazy(() => import('./screens/TeacherOnboardScreen'));
const TeacherHomeScreen = lazy(() => import('./screens/TeacherHomeScreen'));
const ClassDetailScreen = lazy(() => import('./screens/ClassDetailScreen'));
const AssignmentCreateScreen = lazy(() => import('./screens/AssignmentCreateScreen'));
const JoinClassScreen = lazy(() => import('./screens/JoinClassScreen'));
const MyAssignmentsScreen = lazy(() => import('./screens/MyAssignmentsScreen'));
const AssignmentSolveScreen = lazy(() => import('./screens/AssignmentSolveScreen'));
const LevelTestScreen = lazy(() => import('./screens/LevelTestScreen'));

const LAST_USER_KEY = 'lastAuthUserId';
// signInWithGoogle의 redirectTo가 항상 origin("/")으로 돌아오게 돼 있어(OAuth 리다이렉트는
// 브라우저 풀 리로드라 현재 경로가 그대로 보존되지 않음), 로그인 전에 쇼츠에서 고른
// templateId를 여기 잠깐 담아뒀다가 로그인 완료 후 목표 만들기 화면으로 이어서 보낸다.
const PENDING_TEMPLATE_KEY = 'pendingTemplateId';

// 로그인 안 된 상태에서 /goals/create?templateId=X로 오면(쇼츠 → "목표 만들고 제대로
// 공부하기") templateId를 저장해두고 로그인 화면을 보여준다.
function CaptureTemplateThenLogin() {
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const templateId = searchParams.get('templateId');
    if (templateId) localStorage.setItem(PENDING_TEMPLATE_KEY, templateId);
  }, [searchParams]);
  return <LoginScreen />;
}

// 로그인 완료 후 한 번, 저장해둔 templateId가 있으면 목표 만들기 화면으로 이어서 보낸다.
function PendingTemplateRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const pending = localStorage.getItem(PENDING_TEMPLATE_KEY);
    if (pending) {
      localStorage.removeItem(PENDING_TEMPLATE_KEY);
      navigate(`/goals/create?templateId=${pending}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// 화면 전환이 라우터 기본 동작(순간 전환)이라 딱딱하게 느껴져서, 경로가 바뀔 때마다
// key를 새로 줘서 살짝 페이드+슬라이드 인 되게 한다. 새 라이브러리(framer-motion 등)
// 없이 Tailwind 키프레임(page-enter)만으로 구현.
function AnimatedRoutes({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-page-enter">
      {children}
    </div>
  );
}

// 같은 브라우저에서 다른 Google 계정으로 로그인하면, migrateLocalToCloud가 "클라우드에 데이터가
// 없으면 신규 계정"이라고 판단해 이전 계정이 남긴 로컬 데이터를 새 계정 것으로 착각해 업로드해버린다.
// 로그인한 계정이 마지막으로 기억한 계정과 다르면 먼저 로컬 데이터를 비워 이 오염을 막는다.
function ensureLocalDataOwnership(userId: string) {
  const lastUserId = localStorage.getItem(LAST_USER_KEY);
  if (lastUserId && lastUserId !== userId) {
    clearAllLocalData();
  }
  localStorage.setItem(LAST_USER_KEY, userId);
}

export default function App() {
  const { loadGoals } = useGoalStore();
  const { loadSessions } = useSessionStore();
  const { loadQuizzes } = useQuizStore();
  const { loadAppState, appState } = useAppStore();
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  // 학원용 선생/학생 모드 — role이 없으면(신규/개인 사용자) 기존 학생 화면 그대로 노출
  const [role, setRole] = useState<UserRole>('student');
  const [roleChecked, setRoleChecked] = useState(false);

  const reloadAllStores = () => {
    loadGoals();
    loadSessions();
    loadQuizzes();
    loadAppState();
  };

  // 데이터 변경 감지 → 2초 디바운스 후 클라우드 동기화
  const scheduleSyncIfLoggedIn = () => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) syncToCloud(user.id).catch(() => {});
    }, 2000);
  };

  useEffect(() => {
    // 학습 알림(리마인더)은 CEO 요청으로 일시 비활성화 (2026-07-22) — services/notification.ts는 그대로 둠

    // 초기 세션 확인
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
      if (!session?.user) {
        setRoleChecked(true);
        return;
      }
      const userId = session.user.id;
      ensureLocalDataOwnership(userId);
      await migrateLocalToCloud(userId);
      const loaded = await loadFromCloud(userId);
      if (loaded) reloadAllStores();
      setRole(await fetchMyRole());
      setRoleChecked(true);
    });

    // 로그인/로그아웃 이벤트 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (event === 'SIGNED_IN' && session?.user) {
          const userId = session.user.id;
          ensureLocalDataOwnership(userId);
          await migrateLocalToCloud(userId);
          const loaded = await loadFromCloud(userId);
          if (loaded) reloadAllStores();
          setRole(await fetchMyRole());
          setRoleChecked(true);
        }
        if (event === 'SIGNED_OUT') {
          clearAllLocalData();
          localStorage.removeItem(LAST_USER_KEY);
          reloadAllStores();
          setRole('student');
        }
      }
    );

    // localStorage 변경 감지 → 동기화 스케줄
    const handleStorage = () => scheduleSyncIfLoggedIn();
    window.addEventListener('storage-sync', handleStorage);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage-sync', handleStorage);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 설정 화면에서 스킨을 바꾸거나, 로그인 후 클라우드에서 appState를 새로 불러올 때도
  // main.tsx의 최초 1회 적용과 별개로 계속 반영되도록 여기서 동기화한다.
  useEffect(() => {
    document.documentElement.dataset.theme = appState.accentTheme;
  }, [appState.accentTheme]);

  if (!authChecked) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  // 로그인 전에도 "쇼츠" 미리보기는 열람 가능하게 함 — shared_content/curriculum은
  // 공개 읽기라 로그인 없이도 안전하게 보여줄 수 있고, 로그인부터 요구하면 가치를
  // 하나도 못 보여준 채 이탈시키게 된다.
  if (!user) {
    return (
      <BrowserRouter>
        <AnimatedRoutes>
          <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
            <Routes>
              <Route path="/shorts/:templateId" element={<ShortsScreen />} />
              <Route path="/goals/create" element={<CaptureTemplateThenLogin />} />
              <Route path="*" element={<LoginScreen />} />
            </Routes>
          </Suspense>
        </AnimatedRoutes>
      </BrowserRouter>
    );
  }

  if (!roleChecked) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  return (
    <BrowserRouter>
      <PendingTemplateRedirect />
      <AnimatedRoutes>
      <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <Routes>
        <Route path="/" element={role === 'teacher' ? <TeacherHomeScreen /> : <HomeScreen />} />
        {/* 선생님 계정도 개인 학습 화면을 볼 수 있는 통로 — role은 그대로 두고 화면만 잠깐 전환 */}
        <Route path="/my-study" element={<HomeScreen />} />
        <Route path="/teacher/onboard" element={<TeacherOnboardScreen />} />
        <Route path="/teacher/classes/:classId" element={<ClassDetailScreen />} />
        <Route path="/teacher/classes/:classId/new-assignment" element={<AssignmentCreateScreen />} />
        <Route path="/join-class" element={<JoinClassScreen />} />
        <Route path="/assignments" element={<MyAssignmentsScreen />} />
        <Route path="/assignments/:assignmentId" element={<AssignmentSolveScreen />} />
        <Route path="/goals" element={<GoalListScreen />} />
        <Route path="/goals/create" element={<GoalCreateScreen />} />
        <Route path="/level-test/:templateId" element={<LevelTestScreen />} />
        <Route path="/goals/edit/:goalId" element={<GoalEditScreen />} />
        <Route path="/learn/:goalId" element={<LearningScreen />} />
        <Route path="/test/:goalId" element={<TestScreen />} />
        <Route path="/complete/:sessionId" element={<SessionCompleteScreen />} />
        <Route path="/goal-complete/:goalId" element={<GoalCompleteScreen />} />
        <Route path="/wrong-pool" element={<WrongPoolScreen />} />
        <Route path="/retry/:goalId" element={<RetryWrongScreen />} />
        <Route path="/my-questions" element={<MyQuestionBookScreen />} />
        <Route path="/calendar" element={<CalendarScreen />} />
        <Route path="/language" element={<LanguageHubScreen />} />
        <Route path="/mix-review" element={<MixReviewScreen />} />
        <Route path="/recordings" element={<RecordingsScreen />} />
        <Route path="/achievements" element={<AchievementsScreen />} />
        <Route path="/materials/:goalId" element={<StudyMaterialsScreen />} />
        <Route path="/shorts/:templateId" element={<ShortsScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
      </Suspense>
      </AnimatedRoutes>
    </BrowserRouter>
  );
}
