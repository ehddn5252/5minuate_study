import { create } from 'zustand';
import type { Goal, Session, Quiz, AppState } from '../types';
import {
  getGoals,
  saveGoal,
  deleteGoal,
  getSessions,
  saveSession,
  deleteSession,
  getQuizzes,
  saveQuiz,
  saveQuizzes,
  deleteQuiz as deleteQuizFromStorage,
  getAppState,
  saveAppState,
} from '../utils/storage';

// Goal Store
interface GoalStore {
  goals: Goal[];
  loadGoals: () => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (goal: Goal) => void;
  removeGoal: (id: string) => void;
}

export const useGoalStore = create<GoalStore>((set) => ({
  goals: getGoals(),
  loadGoals: () => set({ goals: getGoals() }),
  addGoal: (goal) => {
    saveGoal(goal);
    set({ goals: getGoals() });
  },
  updateGoal: (goal) => {
    saveGoal(goal);
    set({ goals: getGoals() });
  },
  removeGoal: (id) => {
    deleteGoal(id);
    set({ goals: getGoals() });
  },
}));

// Session Store
interface SessionStore {
  sessions: Session[];
  loadSessions: () => void;
  addSession: (session: Session) => void;
  updateSession: (session: Session) => void;
  removeSession: (id: string) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessions: getSessions(),
  loadSessions: () => set({ sessions: getSessions() }),
  addSession: (session) => {
    saveSession(session);
    set({ sessions: getSessions() });
  },
  updateSession: (session) => {
    saveSession(session);
    set({ sessions: getSessions() });
  },
  removeSession: (id) => {
    deleteSession(id);
    set({ sessions: getSessions() });
  },
}));

// Quiz Store
interface QuizStore {
  quizzes: Quiz[];
  loadQuizzes: () => void;
  addQuiz: (quiz: Quiz) => void;
  addQuizzes: (quizzes: Quiz[]) => void;
  updateQuiz: (quiz: Quiz) => void;
  deleteQuiz: (id: string) => void;
}

export const useQuizStore = create<QuizStore>((set) => ({
  quizzes: getQuizzes(),
  loadQuizzes: () => set({ quizzes: getQuizzes() }),
  addQuiz: (quiz) => {
    saveQuiz(quiz);
    set({ quizzes: getQuizzes() });
  },
  addQuizzes: (quizzes) => {
    saveQuizzes(quizzes);
    set({ quizzes: getQuizzes() });
  },
  updateQuiz: (quiz) => {
    saveQuiz(quiz);
    set({ quizzes: getQuizzes() });
  },
  deleteQuiz: (id) => {
    deleteQuizFromStorage(id);
    set({ quizzes: getQuizzes() });
  },
}));

// App Store
interface AppStore {
  appState: AppState;
  loadAppState: () => void;
  updateAppState: (partial: Partial<AppState>) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  appState: getAppState(),
  loadAppState: () => set({ appState: getAppState() }),
  updateAppState: (partial) => {
    const next = { ...get().appState, ...partial };
    saveAppState(next);
    set({ appState: next });
  },
}));
