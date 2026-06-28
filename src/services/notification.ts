let scheduledTimer: ReturnType<typeof setTimeout> | null = null;

export async function requestPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
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
    new Notification('5분 학습 알림', {
      body: '오늘 학습을 아직 안 했어요! 지금 5분만 투자해보세요 📚',
      icon: '/icon-192.png',
    });
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
