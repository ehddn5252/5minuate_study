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
import AchievementsScreen from './screens/AchievementsScreen';
import StudyMaterialsScreen from './screens/StudyMaterialsScreen';
import ShortsScreen from './screens/ShortsScreen';
import SettingsScreen from './screens/SettingsScreen';
import { initReminder } from './services/notification';
import { supabase, loadFromCloud, migrateLocalToCloud, syncToCloud } from './services/supabase';
import { useGoalStore, useSessionStore, useQuizStore, useAppStore } from './store';

export default function App() {
  const { loadGoals } = useGoalStore();
  const { loadSessions } = useSessionStore();
  const { loadQuizzes } = useQuizStore();
  const { loadAppState } = useAppStore();
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);

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
    initReminder();

    // 초기 세션 확인
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
      if (!session?.user) return;
      const userId = session.user.id;
      await migrateLocalToCloud(userId);
      const loaded = await loadFromCloud(userId);
      if (loaded) reloadAllStores();
    });

    // 로그인/로그아웃 이벤트 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (event === 'SIGNED_IN' && session?.user) {
          const userId = session.user.id;
          await migrateLocalToCloud(userId);
          const loaded = await loadFromCloud(userId);
          if (loaded) reloadAllStores();
        }
        if (event === 'SIGNED_OUT') {
          reloadAllStores();
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

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/goals" element={<GoalListScreen />} />
        <Route path="/goals/create" element={<GoalCreateScreen />} />
        <Route path="/goals/edit/:goalId" element={<GoalEditScreen />} />
        <Route path="/learn/:goalId" element={<LearningScreen />} />
        <Route path="/test/:goalId" element={<TestScreen />} />
        <Route path="/complete/:sessionId" element={<SessionCompleteScreen />} />
        <Route path="/goal-complete/:goalId" element={<GoalCompleteScreen />} />
        <Route path="/wrong-pool" element={<WrongPoolScreen />} />
        <Route path="/achievements" element={<AchievementsScreen />} />
        <Route path="/materials/:goalId" element={<StudyMaterialsScreen />} />
        <Route path="/shorts/:templateId" element={<ShortsScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
    </BrowserRouter>
  );
}
