import { getSessions, getGoals } from '../utils/storage';

let scheduledTimer: ReturnType<typeof setTimeout> | null = null;

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

  const opts: NotificationOptions = {
    body: '오늘 학습을 아직 안 했어요! 지금 5분만 투자해보세요 📚',
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
