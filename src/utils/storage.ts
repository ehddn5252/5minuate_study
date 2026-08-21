import type { Goal, Session, Quiz, WrongPool, AppState, Badge, BadgeId, BackgroundTheme } from '../types';

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

// 계정 전환(같은 브라우저에서 다른 Google 계정으로 로그인) 시 이전 계정의 로컬 데이터가
// 새 계정 것으로 오인되어 클라우드에 업로드되는 걸 막기 위해, 로그인 전환 시점에 호출한다.
export function clearAllLocalData(): void {
  localStorage.removeItem(KEYS.GOALS);
  localStorage.removeItem(KEYS.SESSIONS);
  localStorage.removeItem(KEYS.QUIZZES);
  localStorage.removeItem(KEYS.WRONG_POOL);
  localStorage.removeItem('badges');
  localStorage.removeItem(KEYS.APP_STATE);
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
  accentTheme: 'indigo',
  bgTheme: 'default',
  bgPattern: 'none',
};

// F-56: 저장된 상태가 전혀 없는(진짜 첫 실행) 경우에 한해 OS의 다크 모드 설정을 반영한
// 배경 스킨('차콜')을 기본값으로 준다. 한 번이라도 설정을 저장한 사용자에게는 절대 적용되지
// 않는다 — Settings에서 직접 고른 값(설령 '그레이'를 명시적으로 골랐어도)을 덮어쓰지 않기 위함.
function getPreferredBgTheme(): BackgroundTheme {
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'charcoal';
    }
  } catch {
    // matchMedia 미지원 환경 — 기본값 유지
  }
  return DEFAULT_APP_STATE.bgTheme;
}

export function getAppState(): AppState {
  try {
    const raw = localStorage.getItem(KEYS.APP_STATE);
    if (raw) {
      return { ...DEFAULT_APP_STATE, ...(JSON.parse(raw) as Partial<AppState>) };
    }
    return { ...DEFAULT_APP_STATE, bgTheme: getPreferredBgTheme() };
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

// F-65: 학원 공지를 안 읽었는지 표시하기 위한 "마지막으로 확인한 시각". 저장된 값이 아예 없으면
// (기능이 막 추가된 시점, 또는 진짜 첫 로그인) 지금까지의 공지를 전부 "안 읽음"으로 잡지 않도록
// 호출부에서 처음엔 이 값을 최신 공지 시각으로 채워 넣는다(getUnseenAnnouncementCount 참고).
const LAST_SEEN_ANNOUNCEMENT_KEY = 'lastSeenAnnouncementAt';

export function getLastSeenAnnouncementAt(): string | null {
  return localStorage.getItem(LAST_SEEN_ANNOUNCEMENT_KEY);
}

export function setLastSeenAnnouncementAt(iso: string): void {
  localStorage.setItem(LAST_SEEN_ANNOUNCEMENT_KEY, iso);
}
