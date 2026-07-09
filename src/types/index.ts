export type GoalStatus = 'active' | 'completed' | 'inactive';
export type SessionStatus = 'pending' | 'in_progress' | 'completed';
export type QuizType = 'multiple_choice' | 'short_answer';
export type QuizLevel = 'beginner' | 'intermediate' | 'advanced';
export type MateTone = 'friendly' | 'hype' | 'plain';

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
  level: QuizLevel;
  streakFreezeRemaining: number;
  practicalMode?: boolean;
  mateTone?: MateTone;
  examScoped?: boolean;
  xp?: number;
  xpLevel?: number;
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
  testQuizIds?: string[];
  quizAnswers?: boolean[];
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
  bookmarked?: boolean;
  // 목표가 삭제될 때 이 문제가 북마크된 상태였다면, 목표를 찾을 수 없어도
  // "내 문제집"에서 계속 표시할 수 있도록 목표 주제를 스냅샷으로 남긴다.
  orphanedGoalTopic?: string;
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
  quietHoursStart: string;
  quietHoursEnd: string;
  lastDailyHookDate: string;
  audioModeEnabled: boolean;
  celebrationEffectsEnabled: boolean;
}
