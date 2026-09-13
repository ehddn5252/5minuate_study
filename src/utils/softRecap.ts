import { getYesterdaySession, getQuiz } from './storage';
import type { Quiz, Session } from '../types';

// F-84: 완전학습(mastery learning, Bloom) 소프트 리캡 — 어제 세션 정답률이 이 기준 미만이면
// 어제 가장 많이 틀린 객관식 문항 1개를 오늘 F-82 프리테스트 슬롯에 끼워넣는다. 하드 게이트가
// 아니라 프리테스트 후보 구성만 바꾸는 것이므로, difficultyAdaptation.ts의 LOW_THRESHOLD(0.5,
// "레벨을 낮추자"는 훨씬 무거운 개입 기준)를 그대로 가져다 쓰지 않고 별도 상수로 둔다 —
// 이건 가벼운 워밍업 복습이라 훨씬 자주 발동해도 무해하다.
export const RECAP_MASTERY_THRESHOLD = 0.8;

function getWrongQuizIds(session: Session): string[] {
  const ids = session.testQuizIds ?? session.selectedQuizIds;
  const answers = session.quizAnswers;
  if (!ids || !answers) return [];
  return ids.filter((_, i) => answers[i] === false);
}

// 오늘의 F-82 프리테스트 후보에 끼워넣을 어제 오답 문항 1개를 고른다. 조건에 안 맞으면(어제
// 세션 없음/이미 완전학습 기준 충족/오답이 전부 단답형 등) undefined를 반환해 기존 F-82
// 동작 그대로 유지되게 한다.
export function pickRecapQuiz(goalId: string): Quiz | undefined {
  const yesterday = getYesterdaySession(goalId);
  if (!yesterday || !yesterday.quizTotal || yesterday.quizTotal <= 0) return undefined;
  if ((yesterday.quizScore ?? 0) / yesterday.quizTotal >= RECAP_MASTERY_THRESHOLD) return undefined;

  const wrongIds = getWrongQuizIds(yesterday);
  const candidates = wrongIds
    .map((id) => getQuiz(id))
    .filter((q): q is Quiz => !!q && q.type === 'multiple_choice' && !!q.options && q.options.length >= 2);
  if (candidates.length === 0) return undefined;

  return candidates.sort((a, b) => b.wrongCount - a.wrongCount)[0];
}
