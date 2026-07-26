import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import GoalCreateScreen from './screens/GoalCreateScreen';
import GoalListScreen from './screens/GoalListScreen';
import GoalEditScreen from './screens/GoalEditScreen';
import LearningScreen from './screens/LearningScreen';
import TestScreen from './screens/TestScreen';
import SessionCompleteScreen from './screens/SessionCompleteScreen';
import GoalCompleteScreen from './screens/GoalCompleteScreen';
import WrongPoolScreen from './screens/WrongPoolScreen';
import RetryWrongScreen from './screens/RetryWrongScreen';
import MyQuestionBookScreen from './screens/MyQuestionBookScreen';
import CalendarScreen from './screens/CalendarScreen';
import LanguageHubScreen from './screens/LanguageHubScreen';
import MixReviewScreen from './screens/MixReviewScreen';
import RecordingsScreen from './screens/RecordingsScreen';
import AchievementsScreen from './screens/AchievementsScreen';
import StudyMaterialsScreen from './screens/StudyMaterialsScreen';
import ShortsScreen from './screens/ShortsScreen';
import SettingsScreen from './screens/SettingsScreen';
import TeacherOnboardScreen from './screens/TeacherOnboardScreen';
import TeacherHomeScreen from './screens/TeacherHomeScreen';
import ClassDetailScreen from './screens/ClassDetailScreen';
import AssignmentCreateScreen from './screens/AssignmentCreateScreen';
import JoinClassScreen from './screens/JoinClassScreen';
import MyAssignmentsScreen from './screens/MyAssignmentsScreen';
import AssignmentSolveScreen from './screens/AssignmentSolveScreen';
import { supabase, loadFromCloud, migrateLocalToCloud, syncToCloud } from './services/supabase';
import { fetchMyRole, type UserRole } from './services/academy';
import { clearAllLocalData } from './utils/storage';
import { useGoalStore, useSessionStore, useQuizStore, useAppStore } from './store';

const LAST_USER_KEY = 'lastAuthUserId';

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
  const { loadAppState } = useAppStore();
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

  if (!authChecked) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  // 로그인 전에도 "쇼츠" 미리보기는 열람 가능하게 함 — shared_content/curriculum은
  // 공개 읽기라 로그인 없이도 안전하게 보여줄 수 있고, 로그인부터 요구하면 가치를
  // 하나도 못 보여준 채 이탈시키게 된다.
  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/shorts/:templateId" element={<ShortsScreen />} />
          <Route path="*" element={<LoginScreen />} />
        </Routes>
      </BrowserRouter>
    );
  }

  if (!roleChecked) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
