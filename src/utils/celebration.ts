// F-40: 완료 화면 축하 연출 — 신규 npm 의존성 없이 캔버스 컨페티 + Web Audio 효과음 + 진동(지원 브라우저만)으로 직접 구현.
// canvas-confetti 같은 라이브러리를 추가하면 이 프로젝트 최초의 "장식성" 의존성이 되고
// Cloudflare Workers 정적 배포 + PWA 캐시에 새 청크가 늘어나므로, 50~80줄 수준의 직접 구현으로 대체한다.

const CONFETTI_COLORS = ['#6366f1', '#f59e0b', '#22c55e', '#ec4899', '#38bdf8'];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
}

function runConfetti(canvas: HTMLCanvasElement, particleCount: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.scale(dpr, dpr);

  const particles: Particle[] = Array.from({ length: particleCount }, () => ({
    x: window.innerWidth / 2,
    y: window.innerHeight * 0.3,
    vx: (Math.random() - 0.5) * 12,
    vy: Math.random() * -10 - 4,
    size: Math.random() * 6 + 4,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 12,
  }));

  const gravity = 0.35;
  const durationMs = 1600;
  const startTime = performance.now();
  let frameId: number;

  const frame = (now: number) => {
    const elapsed = now - startTime;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (const p of particles) {
      p.vy += gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }

    if (elapsed < durationMs) {
      frameId = requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  };

  frameId = requestAnimationFrame(frame);
  setTimeout(() => cancelAnimationFrame(frameId), durationMs + 100);
}

export function launchConfetti(canvas: HTMLCanvasElement | null, particleCount = 80): void {
  if (!canvas) return;
  runConfetti(canvas, particleCount);
}

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!audioCtx) audioCtx = new AudioCtor();
  // Safari 등 일부 브라우저는 사용자 제스처 안에서 생성해도 'suspended' 상태로 시작할 때가
  // 있어, 그대로 두면 오실레이터를 예약해도 소리가 전혀 안 난다. 매번 호출 시점에 확인해서 깨운다.
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// 브라우저 내장 Web Audio API로 짧은 축하 차임(도-미-솔)만 생성 — 오디오 파일 자산 없음
export function playCelebrationChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99];
  const noteDuration = 0.12;

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const startAt = ctx.currentTime + i * noteDuration;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.2, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + noteDuration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + noteDuration);
  });
}

// 문제 하나를 답할 때마다의 즉각 효과음 — playCelebrationChime(세션/목표 완료 전용)과는
// 별개로 매 문제 정답/오답에 짧고 가벼운 소리를 준다. "오답은 부드럽게" 원칙에 맞춰
// 오답 사운드도 buzzer 같은 harsh한 톤 없이 낮고 짧은 하강음으로만 처리한다.
export function playAnswerSound(correct: boolean): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (correct) {
    // 밝고 깔끔한 두 음(G5 → C6)
    const notes = [784.0, 1046.5];
    const noteDuration = 0.09;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const startAt = ctx.currentTime + i * noteDuration * 0.9;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.18, startAt + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + noteDuration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + noteDuration);
    });
  } else {
    // 부드러운 하강음(G4 → Eb4) — 벌점처럼 느껴지지 않게 짧고 조용하게
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const startAt = ctx.currentTime;
    osc.frequency.setValueAtTime(392.0, startAt);
    osc.frequency.exponentialRampToValueAtTime(311.1, startAt + 0.15);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + 0.18);
  }
}

// iOS Safari 등 navigator.vibrate 미지원 브라우저에서는 조용히 무시
export function triggerCelebrationHaptic(): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate([40, 30, 40]);
  }
}

export function celebrate(canvas: HTMLCanvasElement | null, options?: { particleCount?: number }): void {
  launchConfetti(canvas, options?.particleCount);
  playCelebrationChime();
  triggerCelebrationHaptic();
}
