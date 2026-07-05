import type { QuizType } from '../types';

interface RawQuizLike {
  question?: unknown;
  type?: unknown;
  options?: unknown;
  answer?: unknown;
  explanation?: unknown;
}

export interface SanitizedQuiz {
  question: string;
  type: QuizType;
  options?: string[];
  answer: string;
  explanation: string;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

// AI/DB가 만든 문제 하나가 실제로 풀 수 있는(채점 가능한) 형태인지 검증한다.
// 사소한 표기 차이(선택지-정답 간 공백/대소문자 차이)는 선택지 표기로 정규화해 보정하고,
// 정답을 선택지 중 어느 것과도 매칭할 수 없는 등 채점이 불가능한 문제는 null을 반환해 폐기한다.
export function sanitizeQuiz(raw: RawQuizLike): SanitizedQuiz | null {
  if (!isNonEmptyString(raw.question) || !isNonEmptyString(raw.answer) || !isNonEmptyString(raw.explanation)) {
    return null;
  }
  if (raw.type !== 'multiple_choice' && raw.type !== 'short_answer') return null;

  const question = raw.question.trim();
  const explanation = raw.explanation.trim();
  const answer = raw.answer.trim();

  if (raw.type === 'short_answer') {
    return { question, type: 'short_answer', answer, explanation };
  }

  // multiple_choice: 선택지가 2개 이상이고, 정답이 선택지 중 하나와 일치해야 채점이 가능하다.
  if (!Array.isArray(raw.options)) return null;
  const options = raw.options.filter(isNonEmptyString).map((o) => o.trim());
  const uniqueOptions = Array.from(new Set(options));
  if (uniqueOptions.length < 2) return null;

  const exactMatch = uniqueOptions.find((o) => o === answer);
  if (exactMatch) {
    return { question, type: 'multiple_choice', options: uniqueOptions, answer: exactMatch, explanation };
  }
  // 대소문자·공백 차이만 있는 경우 선택지 표기로 정규화(그래야 화면에서 정답 하이라이트가 정확히 매칭됨)
  const looseMatch = uniqueOptions.find((o) => o.toLowerCase() === answer.toLowerCase());
  if (looseMatch) {
    return { question, type: 'multiple_choice', options: uniqueOptions, answer: looseMatch, explanation };
  }
  // 정답이 선택지 어디에도 없으면 채점 불가능한 문제이므로 폐기
  return null;
}

export function sanitizeQuizzes(raw: unknown): SanitizedQuiz[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((q) => (q && typeof q === 'object' ? sanitizeQuiz(q as RawQuizLike) : null))
    .filter((q): q is SanitizedQuiz => q !== null);
}
