import { supabase } from './supabase';
import { sanitizeQuizzes } from '../utils/quizValidation';
import type { QuizLevel, SharedQuiz } from '../types';

const MIN_BANK_QUIZZES = 8;

// 사전 제작된 문제 데이터셋에서 조회 (커리큘럼 + 날짜 + 난이도 일치)
export async function fetchFromBank(
  curriculumId: string,
  dayNum: number,
  level: QuizLevel
): Promise<{ quizzes: SharedQuiz[] } | null> {
  try {
    const { data, error } = await supabase
      .from('question_bank')
      .select('question, type, options, answer, explanation')
      .eq('curriculum_id', curriculumId)
      .eq('day_num', dayNum)
      .eq('difficulty', level);

    if (error || !data) return null;

    // 저장된 문제 중 정답-선택지가 안 맞는 등 손상된 항목은 걸러내고, 남은 게 너무 적으면 미스로 취급
    const validQuizzes = sanitizeQuizzes(data);
    if (validQuizzes.length < MIN_BANK_QUIZZES) return null;

    return { quizzes: validQuizzes };
  } catch {
    return null;
  }
}
