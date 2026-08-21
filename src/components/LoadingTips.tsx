import { useEffect, useState } from 'react';
import { LOADING_TIPS } from '../data/loadingTips';

// F-73: 이 컴포넌트가 마운트돼 있는 동안(=로딩 중)에만 팁을 순환시킨다.
// aria-live는 의도적으로 붙이지 않음 — 2.5초마다 바뀌는 부가 정보를 스크린 리더가
// 계속 읽으면 오히려 방해가 된다(F-68에서 role="alert"를 정적 텍스트에 남용하지 않기로
// 한 것과 같은 이유).
export default function LoadingTips() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * LOADING_TIPS.length));

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % LOADING_TIPS.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <p className="text-[var(--accent-500)] text-xs mt-1.5 transition-opacity">
      {LOADING_TIPS[index]}
    </p>
  );
}
