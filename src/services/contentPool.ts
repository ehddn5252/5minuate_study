import { supabase } from './supabase';
import { sanitizeQuizzes } from '../utils/quizValidation';
import type { SharedQuiz } from '../types';

interface PoolEntry {
  summary: string;
  quizzes: SharedQuiz[];
  useCount: number;
}

// 공유 풀 히트를 신뢰하기 위한 최소 유효 문항 수 (다른 사용자가 남긴 데이터가 손상됐을 가능성 대비)
const MIN_VALID_POOL_QUIZZES = 3;

// 캐시 키: "t:{templateId}:d{dayNum}"
export function buildCacheKey(templateId: string, dayNum: number): string {
  return `t:${templateId}:d${dayNum}`;
}

// 공유 풀에서 콘텐츠 조회
export async function fetchFromPool(cacheKey: string): Promise<PoolEntry | null> {
  try {
    const { data, error } = await supabase
      .from('shared_content')
      .select('summary, quizzes, use_count')
      .eq('cache_key', cacheKey)
      // 캐시 미스(0행)는 정상 흐름이다. .single()은 0행에 406+콘솔 에러를 내므로
      // .maybeSingle()로 조용히 null을 받는다 — 로그인 없이 열리는 쇼츠 화면 콘솔이 지저분해지지 않게.
      .maybeSingle();

    if (error || !data || !data.summary) return null;

    // 정답-선택지가 안 맞는 등 손상된 문제는 걸러내고, 남은 게 너무 적으면 캐시 미스로 취급
    const validQuizzes = sanitizeQuizzes(data.quizzes);
    if (validQuizzes.length < MIN_VALID_POOL_QUIZZES) return null;

    // 사용 횟수 증가 (fire & forget)
    supabase
      .from('shared_content')
      .update({ use_count: data.use_count + 1 })
      .eq('cache_key', cacheKey)
      .then(() => {});

    return {
      summary: data.summary as string,
      quizzes: validQuizzes,
      useCount: data.use_count as number,
    };
  } catch {
    return null;
  }
}

// 공유 풀에 콘텐츠 저장 (중복이면 무시)
export async function saveToPool(params: {
  cacheKey: string;
  templateId: string;
  topic: string;
  dayNum: number;
  summary: string;
  quizzes: SharedQuiz[];
}): Promise<void> {
  // 손상된 문제가 공유 풀에 저장되어 다른 사용자에게 퍼지지 않도록 저장 전에도 한 번 더 검증한다.
  const validQuizzes = sanitizeQuizzes(params.quizzes);
  if (validQuizzes.length < MIN_VALID_POOL_QUIZZES) return;

  try {
    await supabase.from('shared_content').insert({
      cache_key: params.cacheKey,
      template_id: params.templateId,
      topic: params.topic,
      day_num: params.dayNum,
      summary: params.summary,
      quizzes: validQuizzes,
      use_count: 1,
    });
    // unique 제약으로 중복이면 그냥 무시됨
  } catch {
    // 풀 저장 실패는 무시 — 사용자 경험에 영향 없음
  }
}
