import { useEffect, useState } from 'react';

// F-37: 완료 화면 XP 카운트업 연출용 훅
export function useCountUp(target: number, durationMs = 600): number {
  const [value, setValue] = useState(target <= 0 ? target : 0);

  useEffect(() => {
    if (target <= 0) {
      setValue(target);
      return;
    }
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      setValue(Math.round(target * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}
