import { getStarPositions } from '../utils/constellation';

const WIDTH = 320;
const HEIGHT = 200;

interface Props {
  count: number;
}

// 완료한 목표 하나당 별 하나. 순서대로 선으로 이어 "내가 걸어온 학습 시퀀스"가 그대로
// 별자리 모양이 되도록 한다 — 이 앱의 핵심 개념(목표를 이어가는 시퀀스)을 그대로 시각화.
export default function ConstellationView({ count }: Props) {
  const points = getStarPositions(count, WIDTH, HEIGHT);

  if (count === 0) {
    return (
      <div className="rounded-2xl bg-[#0f1729] border border-white/10 shadow-sm p-6 text-center">
        <p className="text-3xl mb-2">✨</p>
        <p className="text-slate-300 text-sm">
          목표를 하나 완주하면 첫 별이 떠요
        </p>
      </div>
    );
  }

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    // 배경 스킨이 남색/차콜(다크)일 때 카드 배경과 거의 같은 색이라 경계가 안 보였다 —
    // 어떤 스킨에서도 카드 영역이 구분되도록 border를 항상 넣는다.
    <div className="rounded-2xl bg-[#0f1729] border border-white/10 shadow-sm p-4 overflow-hidden">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label={`완료한 목표 ${count}개로 이루어진 나의 별자리`}
      >
        <path d={pathD} fill="none" stroke="rgba(199,210,254,0.35)" strokeWidth={1} />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={i === points.length - 1 ? 5 : 3.2} fill="#fbbf24" opacity={0.95} />
            <circle cx={p.x} cy={p.y} r={i === points.length - 1 ? 9 : 6} fill="#fbbf24" opacity={0.18} />
          </g>
        ))}
      </svg>
      <p className="text-center text-amber-200 text-sm font-semibold mt-1">
        ⭐ 나의 별자리 · 별 {count}개
      </p>
    </div>
  );
}
