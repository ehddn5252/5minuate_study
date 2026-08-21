import { getSessions, getGoals, getAppState } from '../utils/storage';
import type { MateTone } from '../types';

// ⚠️ 이 모듈 전체가 App.tsx에서 호출되지 않는 상태다 — 학습 알림(리마인더)은
// CEO 요청으로 2026-07-22부로 일시 비활성화됐고(App.tsx 주석 참고), 재활성화를
// 대비해 파일은 그대로 남겨둔 상태다. 즉 아래 로직(F-53 포함)은 지금 실제 사용자에게는
// 발송되지 않는다 — 알림 시스템이 다시 켜질 때를 대비한 코드다.

let scheduledTimer: ReturnType<typeof setTimeout> | null = null;
let quietRetryTimer: ReturnType<typeof setTimeout> | null = null;

// F-20/F-30: 다그치는 톤 대신 자기연민 허용형 문구 뱅크에서 매번 다르게 선택.
// mateTone(F-27, 목표 단위 AI 말투 선택)별로 뱅크를 분리해, 부모 잔소리 톤과 겹치지 않는 동행형 문구를 제공한다.
// plain은 기존 5종 문구를 그대로 유지해 회귀가 없도록 한다.
const MESSAGE_BANK: Record<MateTone, string[]> = {
  plain: [
    '오늘 못 했어도 괜찮아요, 내일 5분이면 충분해요 📚',
    '잠깐이면 돼요 — 지금 5분만 투자해볼까요? 📚',
    '바빴던 하루였죠? 그래도 5분은 남아있어요 📚',
    '조금 늦었지만 지금 시작해도 충분해요 📚',
    '오늘의 5분, 아직 늦지 않았어요 📚',
  ],
  friendly: [
    '오늘 못 했어도 정말 괜찮아요, 내일 5분이면 충분해요 📚💕',
    '잠깐이면 돼요~ 저랑 같이 5분만 해볼까요? 📚',
    '바빴던 하루였죠? 그래도 5분은 우리를 위해 남겨둬요 📚',
    '조금 늦었지만 지금 시작해도 정말 충분해요 📚',
    '오늘의 5분, 같이 가볼까요? 아직 안 늦었어요 📚',
  ],
  hype: [
    '헉! 오늘 아직 안 했다구요?! 지금 딱 5분이면 클리어 가능 🔥',
    '자자~ 5분 타임어택 들어갑니다! 준비되셨나요?! 📢',
    '오늘의 미션 등장! 5분 안에 끝내면 완료 🏆',
    '어라라~ 아직인가요? 늦지 않았어요, 고고! 🚀',
    '5분만 투자하면 오늘도 완료?! 지금 시작 ㄱㄱ 📚',
  ],
};

// F-53: 장기 이탈 컴백 문구 — 매일 도는 리마인더가 1일 쉰 사람과 2주 쉰 사람에게
// 똑같은 문구를 보내고 있었다. 오래 쉬었을수록 "왜 안 하냐"는 뉘앙스보다 "돌아온 걸
// 환영한다"는 win-back 톤이 재참여율에 낫다는 리서치를 반영해 별도 뱅크를 둔다.
const LAPSED_MESSAGE_BANK: Record<MateTone, string[]> = {
  plain: [
    '오랜만이에요! 잠깐 쉬었지만 언제든 다시 시작할 수 있어요 🌱',
    '며칠 쉬었다고 목표가 사라지는 건 아니에요. 오늘 5분부터 다시 가볼까요? 📚',
  ],
  friendly: [
    '오랜만이에요! 그동안 잘 지내셨죠? 우리 다시 5분만 같이 해볼까요? 💕',
    '괜찮아요, 잠깐 멀어졌던 것뿐이에요. 다시 돌아온 걸 환영해요 🌱',
  ],
  hype: [
    '오 오랜만입니다! 다시 불태워볼까요?! 딱 5분이면 감 다시 잡아요 🔥',
    '컴백 타임! 쉬었던 만큼 오늘 화끈하게 다시 시작해봐요 🚀',
  ],
};
const LAPSED_THRESHOLD_DAYS = 7;

// D-3: 실행의도(implementation intention) — "언제"뿐 아니라 "어떤 상황에"까지 알림 문구에
// 담으면 막연한 의도보다 실제 행동 개시율이 높아진다는 습관형성 연구를 반영. 트리거가 설정돼
// 있으면 감성 문구 대신 이 템플릿을 쓰고, 없으면(자유롭게 시간만 설정한 사용자) 기존 문구 그대로.
const TRIGGER_TEMPLATES: Record<MateTone, (trigger: string) => string> = {
  plain: (trigger) => `${trigger}, 5분만 투자해볼까요? 📚`,
  friendly: (trigger) => `${trigger}, 저랑 5분만 같이 해볼까요? 📚`,
  hype: (trigger) => `${trigger}! 지금이 딱 5분 타이밍이에요 🔥`,
};

function pickMessage(tone: MateTone, trigger?: string, isLapsed = false): string {
  // 오래 쉰 사용자에게는 실행의도 트리거 문구("점심 먹고 나서, 5분만...")보다
  // 컴백을 환영하는 톤이 먼저다 — trigger가 있어도 lapsed 뱅크를 우선한다.
  if (isLapsed) {
    const lapsedBank = LAPSED_MESSAGE_BANK[tone] ?? LAPSED_MESSAGE_BANK.plain;
    return lapsedBank[Math.floor(Math.random() * lapsedBank.length)];
  }
  if (trigger) {
    const template = TRIGGER_TEMPLATES[tone] ?? TRIGGER_TEMPLATES.plain;
    return template(trigger);
  }
  const bank = MESSAGE_BANK[tone] ?? MESSAGE_BANK.plain;
  return bank[Math.floor(Math.random() * bank.length)];
}

// F-53: incompleteGoal의 가장 최근 완료 세션(날짜) 기준으로 며칠 쉬었는지 계산한다.
// 완료 세션이 아예 없으면(목표를 만들고 한 번도 안 한 경우) 장기 이탈로 취급하지 않는다 —
// "돌아온 걸 환영해요" 문구가 아직 시작도 안 한 사람에겐 어색하기 때문.
function daysSinceLastCompletion(goalId: string, sessions: ReturnType<typeof getSessions>, today: string): number | null {
  const completedDates = sessions
    .filter((s) => s.goalId === goalId && s.status === 'completed')
    .map((s) => s.date)
    .sort();
  if (completedDates.length === 0) return null;
  const lastDate = completedDates[completedDates.length - 1];
  const diffMs = new Date(today).getTime() - new Date(lastDate).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
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
  // F-30: 알림 대상(아직 완료 안 한) 목표 자신의 mateTone을 우선 사용
  const incompleteGoal = goals.find(
    (g) => !sessions.some((s) => s.goalId === g.id && s.date === today && s.status === 'completed')
  );
  if (!incompleteGoal) return;

  // F-20: 방해 금지 시간대엔 발송을 보류하고, 시간대가 끝나는 시점(당일 내)으로 재스케줄
  const appState = getAppState();
  if (isWithinQuietHours(new Date(), appState.quietHoursStart, appState.quietHoursEnd)) {
    scheduleQuietHoursRetry(appState.quietHoursEnd);
    return;
  }

  // F-53: 며칠 쉬었는지에 따라 문구 톤을 바꾼다(장기 이탈 컴백 문구는 위 정의 참고)
  const daysSince = daysSinceLastCompletion(incompleteGoal.id, sessions, today);
  const isLapsed = daysSince !== null && daysSince >= LAPSED_THRESHOLD_DAYS;

  const opts: NotificationOptions = {
    body: pickMessage(incompleteGoal.mateTone ?? 'plain', appState.notificationTrigger || undefined, isLapsed),
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
