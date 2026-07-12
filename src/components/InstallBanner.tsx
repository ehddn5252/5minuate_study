import { useEffect, useState } from 'react';

// 감사(audit) A-2: vite-plugin-pwa로 manifest·서비스워커는 이미 완비돼 있었고,
// 남아있던 건 설치를 유도하는 배너 UI뿐이었다.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'installBannerDismissed';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true;
}

export default function InstallBanner() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');

  useEffect(() => {
    if (isStandalone()) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredEvent || dismissed || isStandalone()) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const handleInstall = async () => {
    await deferredEvent.prompt();
    await deferredEvent.userChoice;
    setDeferredEvent(null);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  return (
    <div className="mx-4 mb-4 p-4 bg-white rounded-2xl border border-indigo-100 shadow-sm flex items-center gap-3">
      <span className="text-2xl flex-shrink-0">📲</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">홈 화면에 추가하고 더 빠르게 열어보세요</p>
        <p className="text-xs text-gray-400 mt-0.5">앱처럼 바로 실행돼요. 브라우저 주소창도 안 보여요.</p>
      </div>
      <button
        onClick={handleInstall}
        className="flex-shrink-0 px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium min-h-[36px]"
      >
        설치
      </button>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-gray-300 hover:text-gray-500 p-1 min-h-[36px] min-w-[36px] flex items-center justify-center"
        aria-label="닫기"
      >
        ✕
      </button>
    </div>
  );
}
