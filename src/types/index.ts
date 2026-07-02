export type GoalStatus = 'active' | 'completed' | 'inactive';
export type SessionStatus = 'pending' | 'in_progress' | 'completed';
export type QuizType = 'multiple_choice' | 'short_answer';

export interface Goal {
  id: string;
  topic: string;
  deadline: string;
  status: GoalStatus;
  createdAt: string;
  completedAt?: string;
  totalSessions: number;
  completedSessions: number;
  streak: number;
  bestStreak: number;
  notificationTime: string;
  notificationEnabled: boolean;
  rawContent?: string;
  templateId?: string;
  curriculumId?: string;
  notes?: string;
  dailyPlan: string;
  summaryContent: string;
  quizPoolIds: string[];
}

export interface Session {
  id: string;
  goalId: string;
  date: string;
  status: SessionStatus;
  summaryViewedAt?: string;
  completedAt?: string;
  selectedQuizIds: string[];
  quizScore?: number;
  quizTotal?: number;
  summaryContent?: string;
  dailyQuizIds?: string[];
}

export interface Quiz {
  id: string;
  goalId: string;
  question: string;
  type: QuizType;
  options?: string[];
  answer: string;
  explanation: string;
  isWrong: boolean;
  wrongCount: number;
  lastAttemptedAt?: string;
}

export interface WrongPool {
  goalId: string;
  quizId: string;
  addedAt: string;
  retryCount: number;
  resolvedAt?: string;
}

export type BadgeId =
  | 'first_step'
  | 'flame_7'
  | 'persistence_30'
  | 'perfect_5'
  | 'zero_wrong';

export interface Badge {
  id: BadgeId;
  unlockedAt: string;
}

export interface SharedQuiz {
  question: string;
  type: QuizType;
  options?: string[];
  answer: string;
  explanation: string;
}

export interface AppState {
  activeGoalIds: string[];
  lastOpenedDate: string;
  urgentGoalIds: string[];
  geminiApiKey: string;
  notificationGranted: boolean;
  notificationTime: string;
}
