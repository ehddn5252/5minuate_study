export interface ShareCardData {
  topic: string;
  streak: number;
  score: number;
  total: number;
  isGoalComplete: boolean;
}

export async function generateShareCard(data: ShareCardData): Promise<Blob> {
  const W = 900;
  const H = 500;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // background gradient
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#6366f1');
  grad.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // decorative circle
  ctx.beginPath();
  ctx.arc(W - 80, 80, 140, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(80, H - 60, 100, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fill();

  // app name tag
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  roundRect(ctx, 40, 40, 130, 36, 18);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('5분 학습', 60, 63);

  // main emoji
  ctx.font = '72px sans-serif';
  ctx.fillText(data.isGoalComplete ? '🏆' : '🔥', 40, 180);

  // headline
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 42px sans-serif`;
  ctx.fillText(data.isGoalComplete ? '목표 달성!' : '오늘도 완료!', 40, 240);

  // topic (truncate)
  const topicText = data.topic.length > 22 ? data.topic.slice(0, 22) + '…' : data.topic;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '26px sans-serif';
  ctx.fillText(topicText, 40, 290);

  // stats row
  const stats = [
    { label: '연속 달성', value: `🔥 ${data.streak}일` },
    { label: '정답률', value: `${Math.round((data.score / data.total) * 100)}%` },
    { label: '오늘 점수', value: `${data.score}/${data.total}` },
  ];

  const cardW = 240;
  const cardH = 100;
  const startX = 40;
  const startY = H - cardH - 50;
  const gap = 20;

  stats.forEach((s, i) => {
    const x = startX + i * (cardW / stats.length + gap);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundRect(ctx, x, startY, cardW / stats.length + 10, cardH, 16);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '14px sans-serif';
    ctx.fillText(s.label, x + 14, startY + 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(s.value, x + 14, startY + 68);
  });

  // watermark
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('5minuatestudy.ehddn5252.workers.dev', W - 40, H - 24);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function buildShareText(data: ShareCardData): string {
  return data.isGoalComplete
    ? `${data.topic} — 목표를 달성했어요! 🏆`
    : `${data.topic} — 오늘도 5분 학습 완료 🔥`;
}

export async function shareOrDownload(data: ShareCardData): Promise<void> {
  const blob = await generateShareCard(data);
  const file = new File([blob], '5분학습_달성.png', { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: '5분 학습 달성!',
      text: buildShareText(data),
      files: [file],
    });
    return;
  }

  // fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '5분학습_달성.png';
  a.click();
  URL.revokeObjectURL(url);
}
