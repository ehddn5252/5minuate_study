import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomeScreen from './screens/HomeScreen';
import GoalCreateScreen from './screens/GoalCreateScreen';
import GoalListScreen from './screens/GoalListScreen';
import LearningScreen from './screens/LearningScreen';
import TestScreen from './screens/TestScreen';
import SessionCompleteScreen from './screens/SessionCompleteScreen';
import SettingsScreen from './screens/SettingsScreen';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/goals" element={<GoalListScreen />} />
        <Route path="/goals/create" element={<GoalCreateScreen />} />
        <Route path="/learn/:goalId" element={<LearningScreen />} />
        <Route path="/test/:goalId" element={<TestScreen />} />
        <Route path="/complete/:sessionId" element={<SessionCompleteScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
    </BrowserRouter>
  );
}
