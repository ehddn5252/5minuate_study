// Fisher-Yates — 객관식 보기를 화면에 뿌리기 전에 순서를 섞어 정답 위치가 매번 고정되지 않게 한다.
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
