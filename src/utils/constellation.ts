// 완료한 목표 개수(별)를 밤하늘처럼 자연스럽게 흩뿌려 배치한다. Math.random 대신 골든 앵글
// 나선(해바라기 씨앗 배치와 같은 원리)을 써서 같은 개수라면 항상 같은 모양이 나오게 한다
// (재렌더링마다 별자리가 흔들리지 않도록).
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export interface StarPoint {
  x: number;
  y: number;
}

// count개의 별을 width x height 안에 배치한다. 가장자리에 안 붙도록 8% 여백을 둔다.
export function getStarPositions(count: number, width: number, height: number): StarPoint[] {
  if (count <= 0) return [];
  const marginX = width * 0.08;
  const marginY = height * 0.08;
  const usableW = width - marginX * 2;
  const usableH = height - marginY * 2;
  const points: StarPoint[] = [];
  for (let i = 0; i < count; i++) {
    // 반지름은 sqrt(i)에 비례시켜야 나선 안에서 밀도가 고르게 퍼진다.
    const r = Math.sqrt((i + 0.5) / count);
    const theta = i * GOLDEN_ANGLE;
    const nx = 0.5 + r * Math.cos(theta) * 0.5;
    const ny = 0.5 + r * Math.sin(theta) * 0.5;
    points.push({ x: marginX + nx * usableW, y: marginY + ny * usableH });
  }
  return points;
}
