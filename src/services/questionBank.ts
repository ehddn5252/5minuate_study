import { supabase } from './supabase';
import type { QuizLevel, SharedQuiz } from '../types';

const MIN_BANK_QUIZZES = 8;

interface BankRow {
  question: string;
  type: 'multiple_choice' | 'short_answer';
  options: string[] | null;
  answer: string;
  explanation: string;
}

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

    if (error || !data || data.length < MIN_BANK_QUIZZES) return null;

    const rows = data as BankRow[];
    const quizzes: SharedQuiz[] = rows.map((r) => ({
      question: r.question,
      type: r.type,
      options: r.options ?? undefined,
      answer: r.answer,
      explanation: r.explanation,
    }));

    return { quizzes };
  } catch {
    return null;
  }
}
