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

export interface LevelTestQuestion {
  id: string;
  difficulty: QuizLevel;
  question: string;
  options: string[];
  answer: string;
}

const LEVEL_TEST_PER_DIFFICULTY = 2;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 레벨테스트용 문제 조회 — question_bank Day1의 객관식 문제를 난이도별로 몇 개씩 뽑아 섞는다.
// 새 콘텐츠를 따로 만들지 않고 이미 저술해둔 사전 제작 문제집을 재사용한다.
// 3난이도 모두 데이터가 충분한 커리큘럼(현재는 english_grammar/english_vocab/english_writing)에서만 동작한다.
export async function fetchLevelTestQuestions(curriculumId: string): Promise<LevelTestQuestion[] | null> {
  try {
    const { data, error } = await supabase
      .from('question_bank')
      .select('id, difficulty, question, options, answer')
      .eq('curriculum_id', curriculumId)
      .eq('day_num', 1)
      .eq('type', 'multiple_choice');

    if (error || !data) return null;

    const byDifficulty: Record<QuizLevel, typeof data> = { beginner: [], intermediate: [], advanced: [] };
    for (const row of data) {
      const d = row.difficulty as QuizLevel;
      if (byDifficulty[d]) byDifficulty[d].push(row);
    }

    const picked: LevelTestQuestion[] = [];
    for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
      const pool = byDifficulty[level];
      if (pool.length < LEVEL_TEST_PER_DIFFICULTY) return null;
      for (const row of shuffle(pool).slice(0, LEVEL_TEST_PER_DIFFICULTY)) {
        picked.push({
          id: row.id,
          difficulty: level,
          question: row.question,
          options: (row.options as string[] | null) ?? [],
          answer: row.answer,
        });
      }
    }
    // 난이도 순서대로 나오면 눈치채기 쉬우니 전체를 섞는다
    return shuffle(picked);
  } catch {
    return null;
  }
}

// 난이도별 정답률로 추천 레벨을 정한다 — 문항이 2개뿐이라 정교한 채점보다는
// "고급을 절반 이상 맞히면 고급, 초급도 다 틀리면 초급, 나머지는 중급" 정도의 단순 규칙.
export function computeRecommendedLevel(results: { difficulty: QuizLevel; correct: boolean }[]): QuizLevel {
  const scoreByLevel: Record<QuizLevel, { correct: number; total: number }> = {
    beginner: { correct: 0, total: 0 },
    intermediate: { correct: 0, total: 0 },
    advanced: { correct: 0, total: 0 },
  };
  for (const r of results) {
    scoreByLevel[r.difficulty].total++;
    if (r.correct) scoreByLevel[r.difficulty].correct++;
  }

  const advanced = scoreByLevel.advanced;
  const beginner = scoreByLevel.beginner;
  if (advanced.total > 0 && advanced.correct / advanced.total >= 0.5) return 'advanced';
  if (beginner.total > 0 && beginner.correct / beginner.total === 0) return 'beginner';
  return 'intermediate';
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
