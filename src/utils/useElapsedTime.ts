import { useEffect, useState } from 'react';

// 감사(audit) A-3: "약 5분"이 정적 텍스트로만 존재하고 실제 체감 장치가 없던 것에 대한 보완 —
// 화면에 머문 시간을 초 단위로 세어 실시간 타이머로 보여준다.
export function useElapsedSeconds(): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return seconds;
}

export function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
