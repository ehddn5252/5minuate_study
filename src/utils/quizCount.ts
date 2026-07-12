// F-02 원칙 복원: 사용자가 문제 수를 직접 고르게 하지 않고(F-44 선택 UI 제거),
// 참고 자료 분량과 목표 기한을 바탕으로 자동으로 정한다.
// - 기한이 길수록 반복 없이 오래 풀 수 있도록 문제 풀을 키운다.
// - 참고 자료가 충분히 있으면(AI가 우려먹지 않고 다양하게 뽑아낼 재료가 있다는 뜻) 한 단계 올려준다.
export function computeAutoQuizCount(rawContent: string | undefined, daysLeft: number): number {
  let base: number;
  if (daysLeft <= 13) base = 5;
  else if (daysLeft <= 45) base = 10;
  else base = 15;

  const contentLength = rawContent?.trim().length ?? 0;
  if (contentLength >= 1000) base += 5;

  return Math.min(20, base);
}
