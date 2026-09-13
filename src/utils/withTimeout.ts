// Supabase JS 클라이언트에는 자체 타임아웃이 없다 — 서버가 응답 없이 멈추면(hang) 이
// 프로미스가 영원히 pending 상태로 남아 try/catch로도 못 잡고 화면이 로딩 상태에 갇힌다.
// ms 안에 안 끝나면 fallbackValue로 강제 진행시켜, 호출부가 "캐시 미스"처럼 자연스럽게
// 처리할 수 있게 한다(진짜 응답이 늦게 와도 무시 — 이미 폴백 경로로 넘어간 뒤라 안전).
export function withTimeout<T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallbackValue), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallbackValue);
      }
    );
  });
}
