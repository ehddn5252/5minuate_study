import { useEffect, useState } from 'react';

// F-51: 오프라인 상태 안내 — 네트워크가 끊기면 AI 생성·동기화·로그인 같은 요청이
// 이유 없이 실패한 것처럼 보여 사용자가 "앱이 고장났다"고 오해할 수 있다.
// navigator.onLine + online/offline 이벤트로 상태를 추적해 화면 최상단에 조용히 알린다.
export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  // fixed 오버레이 대신 일반 흐름 요소로 둔다 — 화면마다 최상단에 형제로 렌더링되므로
  // 이미 그 화면 콘텐츠를 자연스럽게 아래로 밀어내며, 헤더와 겹치는 문제가 없다.
  return (
    <div className="bg-amber-500 text-white text-xs font-medium text-center py-1.5 px-4">
      📶 오프라인 상태예요 — 인터넷 연결을 확인해주세요
    </div>
  );
}
