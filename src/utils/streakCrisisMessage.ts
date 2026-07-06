import type { MateTone } from '../types';

// F-42: 리듬 유지권(F-18) 사용 시점의 감성 연출 — F-30(MESSAGE_BANK)과 동일한 검증 기준으로
// "마지막 기회", "지금 안 하면" 같은 압박형 어휘를 쓰지 않고 안도·응원 프레이밍만 사용한다.
const USED_MESSAGES: Record<MateTone, string> = {
  plain: '리듬 유지권을 사용했어요. 어제 못 했어도 스트릭은 그대로 이어져요.',
  friendly: '괜찮아요, 리듬 유지권 덕분에 스트릭은 안전해요. 함께해줘서 고마워요.',
  hype: '리듬 유지권 발동 완료! 스트릭 안 끊기고 그대로 GO 🔥',
};

const LAST_FREEZE_MESSAGES: Record<MateTone, string> = {
  plain: '남은 리듬 유지권을 다 썼어요. 내일은 직접 이어가볼까요?',
  friendly: '이제 리듬 유지권이 없어요. 그래도 지금까지 잘해왔으니 내일도 문제없을 거예요.',
  hype: '리듬 유지권 완전 소진! 내일은 직접 스트릭 사수하러 가봅시다 💪',
};

export function getStreakCrisisMessage(tone: MateTone = 'plain', freezeRemaining: number): string {
  const bank = freezeRemaining <= 0 ? LAST_FREEZE_MESSAGES : USED_MESSAGES;
  return bank[tone] ?? bank.plain;
}

export function getStreakCrisisMood(freezeRemaining: number): 'concerned' | 'neutral' {
  return freezeRemaining <= 0 ? 'concerned' : 'neutral';
}
