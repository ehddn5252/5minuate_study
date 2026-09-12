import { useEffect, useState } from 'react';

// 실제 생성 시간(10~20초)을 정확히 예측할 수 없으니, 점근선 형태로 서서히 채워지는 진행바를 쓴다.
// 92%에서 멈춰 "다 된 것 같은데 안 끝난다"는 인상을 주지 않고, 실제 완료되면 부모가 이 컴포넌트를
// 언마운트(로딩 화면 자체를 교체)하는 방식으로 100% 도달을 대신한다.
const ASYMPTOTE = 92;
const TAU_MS = 7000;

export default function EstimatedProgressBar() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      setPct(ASYMPTOTE * (1 - Math.exp(-elapsed / TAU_MS)));
    }, 200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden mt-2">
      <div
        className="h-full bg-[var(--accent-500)] rounded-full"
        style={{ width: `${pct}%`, transition: 'width 200ms linear' }}
      />
    </div>
  );
}
