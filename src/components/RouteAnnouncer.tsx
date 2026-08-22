import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// F-77: SPA는 페이지가 다시 로드되지 않아 스크린 리더 사용자가 화면이 바뀐 걸 알 방법이
// 없다 — 화면마다 이미 있는 <h1>을 그대로 재사용해 라우트가 바뀔 때마다 그 텍스트를
// document.title과 aria-live 영역에 반영한다. 새 라우트를 추가할 때마다 경로↔이름 표를
// 따로 유지할 필요가 없도록, 화면 컴포넌트를 고치는 대신 이미 있는 제목만 읽는 방식을 택했다.
export default function RouteAnnouncer() {
  const location = useLocation();
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const lastAnnouncedRef = useRef('');

  useEffect(() => {
    // F-78: 이 앱의 화면 대부분이 React.lazy + Suspense로 지연 로드된다 — 라우트가 바뀐
    // 직후 첫 커밋엔 fallback(빈 화면)만 있고, 실제 화면의 <h1>은 코드 청크가 로드된
    // 몇 백ms 뒤에야 나타난다. pathname 변경 시점에만 한 번 찾으면 이 지연 커밋을 놓쳐서
    // 실제로는 거의 항상 알림이 비어있었다(직접 렌더링해 확인). MutationObserver로 DOM에
    // <h1>이 실제로 나타나는 순간을 직접 감지해야 한다.
    lastAnnouncedRef.current = '';

    const announce = () => {
      const heading = document.querySelector('h1');
      const label = heading?.textContent?.trim();
      if (!label || label === lastAnnouncedRef.current) return;
      lastAnnouncedRef.current = label;
      document.title = `${label} · 5분 학습`;
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = label;
      }
    };

    announce();
    const observer = new MutationObserver(announce);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [location.pathname]);

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only" ref={liveRegionRef} />
  );
}
