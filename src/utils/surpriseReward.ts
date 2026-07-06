import type { MateTone } from '../types';

// F-39: 확률적 깜짝 보상 — 결제·가챠·수집형 인벤토리 없이, 이미 있는 격려 카피만 노출.
// 실제 뱃지 획득(newBadges)이나 레벨업과 같은 세션에서는 호출하지 않아(TestScreen에서 상호배타 처리)
// "이게 진짜 보상인지 랜덤인지" 혼동을 막는다.
const SURPRISE_MESSAGES: Record<MateTone, string[]> = {
  plain: [
    '🎁 오늘 하루도 꾸준히 잘 쌓이고 있어요',
    '🎁 이 페이스 그대로면 목표 완주가 머지않았어요',
    '🎁 작은 하루들이 모여 큰 결과를 만들어요',
  ],
  friendly: [
    '🎁 오늘도 한 걸음 더 가까워졌어요!',
    '🎁 우리 진짜 잘하고 있어요, 계속 이대로만!',
    '🎁 매일 조금씩, 그게 제일 오래가는 방법이에요',
  ],
  hype: [
    '🎁 오늘도 클리어! 다음 스테이지 가보자구요 🔥',
    '🎁 이 페이스 미쳤다, 이대로 쭉 갑시다!',
    '🎁 오늘 몫 완료! 내일도 이 기세 그대로 🚀',
  ],
};

export function getSurpriseReward(tone: MateTone = 'plain'): string {
  const bank = SURPRISE_MESSAGES[tone] ?? SURPRISE_MESSAGES.plain;
  return bank[Math.floor(Math.random() * bank.length)];
}
