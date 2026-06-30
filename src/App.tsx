import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomeScreen from './screens/HomeScreen';
import GoalCreateScreen from './screens/GoalCreateScreen';
import GoalListScreen from './screens/GoalListScreen';
import GoalEditScreen from './screens/GoalEditScreen';
import LearningScreen from './screens/LearningScreen';
import TestScreen from './screens/TestScreen';
import SessionCompleteScreen from './screens/SessionCompleteScreen';
import GoalCompleteScreen from './screens/GoalCompleteScreen';
import WrongPoolScreen from './screens/WrongPoolScreen';
import SettingsScreen from './screens/SettingsScreen';
import AchievementsScreen from './screens/AchievementsScreen';
import { initReminder } from './services/notification';

export default function App() {
  useEffect(() => {
    initReminder();
  }, []);

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
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
    </BrowserRouter>
  );
}
