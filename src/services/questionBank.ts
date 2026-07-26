import { supabase } from './supabase';
import { sanitizeQuiz } from '../utils/quizValidation';
import type { SanitizedQuiz } from '../utils/quizValidation';
import type { QuizLevel, SharedQuiz } from '../types';

const MIN_BANK_QUIZZES = 8;

export type BankQuiz = SharedQuiz & { bankId: string };

// 사전 제작된 문제 데이터셋에서 조회 (커리큘럼 + 날짜 + 난이도 일치).
// bankId(question_bank.id)를 같이 돌려줘야 나중에 "이 문제 신고" 시 원본 행을 가리킬 수 있다.
export async function fetchFromBank(
  curriculumId: string,
  dayNum: number,
  level: QuizLevel
): Promise<{ quizzes: BankQuiz[] } | null> {
  try {
    const { data, error } = await supabase
      .from('question_bank')
      .select('id, question, type, options, answer, explanation')
      .eq('curriculum_id', curriculumId)
      .eq('day_num', dayNum)
      .eq('difficulty', level);

    if (error || !data) return null;

    // 저장된 문제 중 정답-선택지가 안 맞는 등 손상된 항목은 걸러내고, 남은 게 너무 적으면 미스로 취급.
    // sanitizeQuizzes(배치용)는 검증된 필드만 남기고 id를 버리므로, 여기서는 행 단위로
    // sanitizeQuiz를 직접 돌려 bankId를 함께 붙인다.
    const validQuizzes = data
      .map((row) => {
        const sanitized: SanitizedQuiz | null = sanitizeQuiz(row);
        return sanitized ? { ...sanitized, bankId: row.id as string } : null;
      })
      .filter((q): q is BankQuiz => q !== null);

    if (validQuizzes.length < MIN_BANK_QUIZZES) return null;

    return { quizzes: validQuizzes };
  } catch {
    return null;
  }
}

// 사용자가 question_bank 문제를 "잘못됐다"고 신고하면 즉시 지우지 않고 검토 목록에 쌓아둔다 —
// 직접 저술/검토한 콘텐츠라 한 사람 판단만으로 바로 지우기엔 리스크가 있어서다.
export async function reportBankQuestion(questionBankId: string, note?: string): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요해요.' };

  const { error } = await supabase
    .from('question_bank_reports')
    .insert({ question_bank_id: questionBankId, reporter_id: user.id, note: note ?? null });
  if (error) return { error: '제보에 실패했어요.' };
  return {};
}
