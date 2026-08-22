import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// F-77: SPA는 페이지가 다시 로드되지 않아 스크린 리더 사용자가 화면이 바뀐 걸 알 방법이
// 없다 — 화면마다 이미 있는 <h1>을 그대로 재사용해 라우트가 바뀔 때마다 그 텍스트를
// document.title과 aria-live 영역에 반영한다. 새 라우트를 추가할 때마다 경로↔이름 표를
// 따로 유지할 필요가 없도록, 화면 컴포넌트를 고치는 대신 이미 있는 제목만 읽는 방식을 택했다.
export default function RouteAnnouncer() {
  const location = useLocation();
  const liveRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const heading = document.querySelector('h1');
    const label = heading?.textContent?.trim();
    if (!label) return;
    document.title = `${label} · 5분 학습`;
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = label;
    }
  }, [location.pathname]);

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only" ref={liveRegionRef} />
  );
}
