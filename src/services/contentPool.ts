import { supabase } from './supabase';
import type { SharedQuiz } from '../types';

interface PoolEntry {
  summary: string;
  quizzes: SharedQuiz[];
  useCount: number;
}

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
      .single();

    if (error || !data) return null;

    // 사용 횟수 증가 (fire & forget)
    supabase
      .from('shared_content')
      .update({ use_count: data.use_count + 1 })
      .eq('cache_key', cacheKey)
      .then(() => {});

    return {
      summary: data.summary as string,
      quizzes: data.quizzes as SharedQuiz[],
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
  try {
    await supabase.from('shared_content').insert({
      cache_key: params.cacheKey,
      template_id: params.templateId,
      topic: params.topic,
      day_num: params.dayNum,
      summary: params.summary,
      quizzes: params.quizzes,
      use_count: 1,
    });
    // unique 제약으로 중복이면 그냥 무시됨
  } catch {
    // 풀 저장 실패는 무시 — 사용자 경험에 영향 없음
  }
}
