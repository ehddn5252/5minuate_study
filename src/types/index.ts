export type GoalStatus = 'active' | 'completed' | 'inactive';
export type SessionStatus = 'pending' | 'in_progress' | 'completed';
export type QuizType = 'multiple_choice' | 'short_answer';
export type QuizLevel = 'beginner' | 'intermediate' | 'advanced';
export type MateTone = 'friendly' | 'hype' | 'plain';
export type AccentTheme = 'indigo' | 'rose' | 'emerald' | 'amber' | 'violet';
export type BackgroundTheme = 'default' | 'ivory' | 'mint' | 'lavender' | 'charcoal' | 'navy';
export type BackgroundPattern = 'none' | 'dots' | 'stars' | 'waves';

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
  practicalMode?: boolean;
  mateTone?: MateTone;
  examScoped?: boolean;
  xp?: number;
  xpLevel?: number;
  // F-49: 스트릭 프리즈 — 하루를 건너뛰어도 1회는 스트릭이 끊기지 않게 보호해주는 개수.
  // 목표 생성 시 1개 지급, 소진되면 다시 채워지지 않는다(재충전은 향후 사이클 과제).
  streakFreezeRemaining?: number;
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
  // D-1: 라이트너 상자(간격 반복) 상태 — intervalIndex는 몇 번째 간격 단계인지(0~4),
  // nextReviewAt은 다음 복습 예정일('YYYY-MM-DD', 날짜 단위). 둘 다 없으면 신규 미출제로 취급.
  intervalIndex?: number;
  nextReviewAt?: string;
  bookmarked?: boolean;
  // 목표가 삭제될 때 이 문제가 북마크된 상태였다면, 목표를 찾을 수 없어도
  // "내 문제집"에서 계속 표시할 수 있도록 목표 주제를 스냅샷으로 남긴다.
  orphanedGoalTopic?: string;
  // question_bank(사전 제작 문제집)에서 온 문제면 원본 행 id — 신고 시 로컬 삭제 대신
  // 검토용 제보 테이블에 기록하기 위해 필요하다. 없으면 개인용 AI 생성 문제로 취급.
  bankQuestionId?: string;
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

// 친구에게 공유받아 저장할 때, 문제(→ 북마크로 저장)와 별개로 요약/오늘의 계획 텍스트를
// 담아두기 위한 메모. 목표(Goal)를 새로 만들지 않고 '내 문제집' 주제별로 붙여 보여준다.
export interface SharedTopicNote {
  id: string;
  topic: string;
  summary: string;
  dailyPlan: string;
  createdAt: string;
}

export interface AppState {
  activeGoalIds: string[];
  lastOpenedDate: string;
  urgentGoalIds: string[];
  notificationGranted: boolean;
  notificationTime: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  lastDailyHookDate: string;
  audioModeEnabled: boolean;
  celebrationEffectsEnabled: boolean;
  // D-3: 실행의도(if-then 계획) — "점심 먹고 나서"처럼 알림에 담을 상황 트리거 문구.
  // 프리셋으로만 설정되며(자유 입력 아님), 비어있으면 기존 감성 문구만 사용한다.
  notificationTrigger: string;
  // F-41: 스킨 — 앱 전체 포인트 컬러(accentTheme)를 사용자가 고를 수 있게.
  // 마스코트 캐릭터는 선택지 없이 public/mascot.png 하나로 고정한다(F-44).
  accentTheme: AccentTheme;
  // F-41: 배경 스킨 — 화면 바탕색만 살짝 바꾸는 옵션(라이트 톤 유지, 다크모드 아님).
  bgTheme: BackgroundTheme;
  // F-41: 배경 무늬 — bgTheme(바탕색)과 별개로 화면 여백에 은은한 도트/별/파도 패턴을 깔아주는 옵션.
  bgPattern: BackgroundPattern;
  // 목표 완료 시 목표·세션을 정리(보관/삭제)하면서 사라지는 학습 점수를 여기 누적해,
  // 리더보드 점수가 "완료했더니 깎이는" 일이 없게 한다.
  lifetimeStudyScore: number;
  // 친구에게 공유받아 저장한 요약/계획 메모 목록 (문제는 quizzes 북마크로 별도 저장됨)
  sharedNotes: SharedTopicNote[];
}
