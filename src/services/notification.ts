import { getSessions, getGoals, getAppState } from '../utils/storage';

let scheduledTimer: ReturnType<typeof setTimeout> | null = null;
let quietRetryTimer: ReturnType<typeof setTimeout> | null = null;

// F-20: 다그치는 톤 대신 자기연민 허용형 문구 뱅크에서 매번 다르게 선택
const MESSAGE_BANK = [
  '오늘 못 했어도 괜찮아요, 내일 5분이면 충분해요 📚',
  '잠깐이면 돼요 — 지금 5분만 투자해볼까요? 📚',
  '바빴던 하루였죠? 그래도 5분은 남아있어요 📚',
  '조금 늦었지만 지금 시작해도 충분해요 📚',
  '오늘의 5분, 아직 늦지 않았어요 📚',
];

function pickMessage(): string {
  return MESSAGE_BANK[Math.floor(Math.random() * MESSAGE_BANK.length)];
}

// F-20: 방해 금지 시간대(예: 21:30~07:00, 자정을 넘는 범위 포함) 판정
function isWithinQuietHours(now: Date, start: string, end: string): boolean {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  if (startMinutes === endMinutes) return false;
  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

function scheduleQuietHoursRetry(endTime: string): void {
  if (quietRetryTimer !== null) {
    clearTimeout(quietRetryTimer);
    quietRetryTimer = null;
  }
  const [eh, em] = endTime.split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(eh, em, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  const delay = target.getTime() - now.getTime();
  quietRetryTimer = setTimeout(() => {
    quietRetryTimer = null;
    showReminder();
  }, delay);
}

export async function requestPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

async function showReminder(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const goals = getGoals().filter((g) => g.status === 'active');
  if (goals.length === 0) return;

  const sessions = getSessions();
  const allDone = goals.every((g) =>
    sessions.some((s) => s.goalId === g.id && s.date === today && s.status === 'completed')
  );
  if (allDone) return;

  // F-20: 방해 금지 시간대엔 발송을 보류하고, 시간대가 끝나는 시점(당일 내)으로 재스케줄
  const appState = getAppState();
  if (isWithinQuietHours(new Date(), appState.quietHoursStart, appState.quietHoursEnd)) {
    scheduleQuietHoursRetry(appState.quietHoursEnd);
    return;
  }

  const opts: NotificationOptions = {
    body: pickMessage(),
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification('5분 학습 알림', opts);
      return;
    }
  } catch {
    // fall through
  }
  new Notification('5분 학습 알림', opts);
}

export function scheduleLocalReminder(time: string): void {
  if (scheduledTimer !== null) {
    clearTimeout(scheduledTimer);
    scheduledTimer = null;
  }

  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);

  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  const delay = target.getTime() - now.getTime();

  scheduledTimer = setTimeout(() => {
    showReminder();
    scheduledTimer = null;
    scheduleLocalReminder(time);
  }, delay);
}

export function cancelReminder(): void {
  if (scheduledTimer !== null) {
    clearTimeout(scheduledTimer);
    scheduledTimer = null;
  }
  if (quietRetryTimer !== null) {
    clearTimeout(quietRetryTimer);
    quietRetryTimer = null;
  }
}

export function initReminder(): void {
  try {
    const raw = localStorage.getItem('appState');
    if (!raw) return;
    const state = JSON.parse(raw) as { notificationGranted?: boolean; notificationTime?: string };
    if (state.notificationGranted && state.notificationTime) {
      scheduleLocalReminder(state.notificationTime);
    }
  } catch {
    // ignore
  }
}
