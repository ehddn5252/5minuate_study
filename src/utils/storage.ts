import type { Goal, Session, Quiz, WrongPool, AppState, Badge, BadgeId } from '../types';

const KEYS = {
  GOALS: 'goals',
  SESSIONS: 'sessions',
  QUIZZES: 'quizzes',
  WRONG_POOL: 'wrongPool',
  APP_STATE: 'appState',
};

function getItem<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function setItem<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new Event('storage-sync'));
}

// Goals
export function getGoals(): Goal[] {
  return getItem<Goal>(KEYS.GOALS);
}

export function getGoal(id: string): Goal | undefined {
  return getGoals().find((g) => g.id === id);
}

export function saveGoal(goal: Goal): void {
  const goals = getGoals();
  const idx = goals.findIndex((g) => g.id === goal.id);
  if (idx >= 0) {
    goals[idx] = goal;
  } else {
    goals.push(goal);
  }
  setItem(KEYS.GOALS, goals);
}

export function deleteGoal(id: string): void {
  setItem(KEYS.GOALS, getGoals().filter((g) => g.id !== id));
}

// 목표를 삭제하면서 딸린 세션·오답풀도 함께 정리한다. 단, 북마크("내 문제집")된 문제는
// 목표 주제를 스냅샷으로 남기고 보존한다 — 지워지는 건 목표와 나머지 일반 문제들뿐이다.
export function deleteGoalCascade(goalId: string): void {
  const goal = getGoal(goalId);

  const keptQuizzes = getQuizzes()
    .map((q) => {
      if (q.goalId !== goalId) return q;
      if (q.bookmarked) return { ...q, orphanedGoalTopic: goal?.topic ?? q.orphanedGoalTopic };
      return null;
    })
    .filter((q): q is Quiz => q !== null);
  setItem(KEYS.QUIZZES, keptQuizzes);

  setItem(KEYS.SESSIONS, getSessions().filter((s) => s.goalId !== goalId));
  setItem(KEYS.WRONG_POOL, getWrongPool().filter((w) => w.goalId !== goalId));

  deleteGoal(goalId);
}

// Sessions
export function getSessions(): Session[] {
  return getItem<Session>(KEYS.SESSIONS);
}

export function getSession(id: string): Session | undefined {
  return getSessions().find((s) => s.id === id);
}

export function getSessionsByGoal(goalId: string): Session[] {
  return getSessions().filter((s) => s.goalId === goalId);
}

export function getTodaySession(goalId: string): Session | undefined {
  const today = new Date().toISOString().split('T')[0];
  const matches = getSessions().filter((s) => s.goalId === goalId && s.date === today);
  return matches[matches.length - 1];
}

export function saveSession(session: Session): void {
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.push(session);
  }
  setItem(KEYS.SESSIONS, sessions);
}

export function deleteSession(id: string): void {
  setItem(KEYS.SESSIONS, getSessions().filter((s) => s.id !== id));
}

// Quizzes
export function getQuizzes(): Quiz[] {
  return getItem<Quiz>(KEYS.QUIZZES);
}

export function getQuiz(id: string): Quiz | undefined {
  return getQuizzes().find((q) => q.id === id);
}

export function getQuizzesByGoal(goalId: string): Quiz[] {
  return getQuizzes().filter((q) => q.goalId === goalId);
}

export function saveQuiz(quiz: Quiz): void {
  const quizzes = getQuizzes();
  const idx = quizzes.findIndex((q) => q.id === quiz.id);
  if (idx >= 0) {
    quizzes[idx] = quiz;
  } else {
    quizzes.push(quiz);
  }
  setItem(KEYS.QUIZZES, quizzes);
}

export function saveQuizzes(quizzes: Quiz[]): void {
  const existing = getQuizzes();
  for (const quiz of quizzes) {
    const idx = existing.findIndex((q) => q.id === quiz.id);
    if (idx >= 0) {
      existing[idx] = quiz;
    } else {
      existing.push(quiz);
    }
  }
  setItem(KEYS.QUIZZES, existing);
}

export function deleteQuiz(id: string): void {
  setItem(KEYS.QUIZZES, getQuizzes().filter((q) => q.id !== id));
}

// WrongPool
export function getWrongPool(): WrongPool[] {
  return getItem<WrongPool>(KEYS.WRONG_POOL);
}

export function getWrongPoolByGoal(goalId: string): WrongPool[] {
  return getWrongPool().filter((w) => w.goalId === goalId);
}

// Returns only unresolved (still wrong) entries for a given goal
export function getActiveWrongPool(goalId: string): WrongPool[] {
  return getWrongPool().filter(
    (w) => w.goalId === goalId && !w.resolvedAt
  );
}

export function addToWrongPool(entry: WrongPool): void {
  const pool = getWrongPool();
  const idx = pool.findIndex(
    (w) => w.goalId === entry.goalId && w.quizId === entry.quizId
  );
  if (idx >= 0) {
    pool[idx] = entry;
  } else {
    pool.push(entry);
  }
  setItem(KEYS.WRONG_POOL, pool);
}

export function removeFromWrongPool(goalId: string, quizId: string): void {
  setItem(
    KEYS.WRONG_POOL,
    getWrongPool().filter(
      (w) => !(w.goalId === goalId && w.quizId === quizId)
    )
  );
}

// Badges
export function getBadges(): Badge[] {
  return getItem<Badge>('badges');
}

export function hasBadge(id: BadgeId): boolean {
  return getBadges().some((b) => b.id === id);
}

export function saveBadge(badge: Badge): void {
  const badges = getBadges();
  if (!badges.some((b) => b.id === badge.id)) {
    badges.push(badge);
    localStorage.setItem('badges', JSON.stringify(badges));
  }
}

// AppState
const DEFAULT_APP_STATE: AppState = {
  activeGoalIds: [],
  lastOpenedDate: '',
  urgentGoalIds: [],
  notificationGranted: false,
  notificationTime: '20:00',
  quietHoursStart: '21:30',
  quietHoursEnd: '07:00',
  lastDailyHookDate: '',
  audioModeEnabled: false,
  celebrationEffectsEnabled: true,
  notificationTrigger: '',
};

export function getAppState(): AppState {
  try {
    const raw = localStorage.getItem(KEYS.APP_STATE);
    return raw
      ? { ...DEFAULT_APP_STATE, ...(JSON.parse(raw) as Partial<AppState>) }
      : DEFAULT_APP_STATE;
  } catch {
    return DEFAULT_APP_STATE;
  }
}

export function saveAppState(state: AppState): void {
  localStorage.setItem(KEYS.APP_STATE, JSON.stringify(state));
  window.dispatchEvent(new Event('storage-sync'));
}

export function updateAppState(partial: Partial<AppState>): void {
  saveAppState({ ...getAppState(), ...partial });
}
