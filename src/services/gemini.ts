import type { Quiz, QuizLevel, MateTone } from '../types';
import { generateId } from '../utils/id';
import { sanitizeQuizzes } from '../utils/quizValidation';

const GEMINI_MODEL = 'gemini-2.5-flash';

// AI가 문제를 충분히·제대로 만들지 못했을 때(형식 오류, 정답-선택지 불일치 등)를 대비한 최소 유효 문항 수.
// 요청한 개수(quizCount)의 최소 1/3은 유효해야 하며, 최소 3개는 확보되어야 한다.
function minValidGoalQuizzes(quizCount: number): number {
  return Math.max(3, Math.ceil(quizCount / 3));
}
const MIN_VALID_DAILY_QUIZZES = 3; // 8개 요청

// F-44: 목표 생성 시 만들 문제 수를 사용자가 고를 수 있게 하되, 객관식:단답형 = 2:1 비율은 유지
function splitQuizCount(quizCount: number): { mc: number; sa: number } {
  const mc = Math.round(quizCount * (2 / 3));
  return { mc, sa: quizCount - mc };
}

const LEVEL_DESC: Record<QuizLevel, string> = {
  beginner: '초급 — 기초 개념 위주로 쉬운 어휘와 단순한 문장 구조로 설명하고 출제하세요.',
  intermediate: '중급 — 표준적인 난이도로 핵심 개념과 응용을 균형 있게 다루세요.',
  advanced: '고급 — 심화 개념과 실전 수준의 응용 문제를 포함하고, 헷갈리기 쉬운 선택지를 활용하세요.',
};

const PRACTICAL_MODE_INSTRUCTION =
  '각 요약 항목 또는 퀴즈 해설 중 적절한 곳에, 실무에서 어떻게 적용되는지 보여주는 예시를 1줄 이내로 자연스럽게 포함하세요. 항목 수나 분량 제한은 그대로 지키세요.';

// F-27: AI 케미 학습메이트 — 말투 프리셋. 'plain'은 기존과 동일한 중립 톤(기본값, 회귀 없음)이라 지시문을 추가하지 않는다.
const TONE_INSTRUCTION: Record<MateTone, string> = {
  friendly: '설명 말투는 다정한 친구처럼 편안하고 다정하게 써주세요. 존댓말은 유지하되 따뜻하고 친근한 어조로 작성하세요.',
  hype: '설명 말투는 텐션 높은 예능 자막체처럼 재미있고 리듬감 있게 써주세요. 과하지 않은 선에서 유행어·감탄사를 섞어도 좋습니다.',
  plain: '',
};

interface GeminiResponse {
  candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
}

// API 키가 있으면 직접 호출, 없으면 CF Worker 프록시 사용
async function callGemini(body: object, apiKey: string): Promise<GeminiResponse> {
  const url = apiKey
    ? `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`
    : '/api/generate';

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (response.status === 429) {
    const err = await response.json() as { error: string };
    throw new Error(err.error ?? '일일 생성 한도를 초과했습니다.');
  }
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`생성 오류: ${response.status} — ${err.slice(0, 200)}`);
  }
  return response.json() as Promise<GeminiResponse>;
}

interface GenerateGoalContentResult {
  summary: string;
  quizPool: Quiz[];
}

interface GenerateDailyContentResult {
  summary: string;
  quizzes: Quiz[];
}

export async function generateGoalContent(
  goalId: string,
  topic: string,
  deadline: string,
  level: QuizLevel = 'intermediate',
  apiKey = '',
  rawContent?: string,
  practicalMode = false,
  mateTone: MateTone = 'plain',
  quizCount = 5
): Promise<GenerateGoalContentResult> {
  const today = new Date().toISOString().split('T')[0];
  const daysLeft = Math.ceil(
    (new Date(deadline).getTime() - new Date(today).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const { mc: mcCount, sa: saCount } = splitQuizCount(quizCount);

  const prompt = `
당신은 학습 도우미입니다. 아래 주제에 대한 학습 콘텐츠를 JSON 형식으로 생성해주세요.

주제: ${topic}
난이도: ${LEVEL_DESC[level]}
마감일: ${deadline} (오늘로부터 ${daysLeft}일 후)
${rawContent ? `참고 자료:\n${rawContent}` : ''}
${practicalMode ? PRACTICAL_MODE_INSTRUCTION : ''}
${TONE_INSTRUCTION[mateTone]}

다음 JSON 형식으로 응답하세요:
{
  "summary": "주제에 대한 핵심 내용을 3~7개의 불릿 포인트로 정리. 각 항목은 '• ' 으로 시작하고 줄바꿈으로 구분",
  "quizzes": [
    {
      "question": "질문 내용",
      "type": "multiple_choice",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
      "answer": "정답 선택지 텍스트",
      "explanation": "해설"
    },
    {
      "question": "단답형 질문",
      "type": "short_answer",
      "answer": "정답",
      "explanation": "해설"
    }
  ]
}

퀴즈는 정확히 ${quizCount}개를 생성하세요. multiple_choice는 ${mcCount}개, short_answer는 ${saCount}개.
JSON만 응답하고 다른 텍스트는 포함하지 마세요.
`.trim();

  const data = await callGemini({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      // 문제 15개 기준 16384 토큰이 안전한 것으로 검증됐던 값(문항당 약 1100 토큰)을 그대로 비례 적용
      maxOutputTokens: Math.min(32768, Math.max(8192, quizCount * 1100 + 2000)),
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
    },
  }, apiKey);

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Gemini 응답에서 JSON을 찾을 수 없습니다.');
  }

  let parsed: { summary?: string; quizzes?: unknown };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('AI 응답이 잘려서 처리하지 못했습니다. 다시 시도해주세요.');
  }

  if (!parsed.summary || typeof parsed.summary !== 'string' || !parsed.summary.trim()) {
    throw new Error('AI가 요약을 만들지 못했습니다. 다시 시도해주세요.');
  }

  // 정답이 선택지와 안 맞는 등 채점 불가능한 문제는 걸러내고, 남은 문제가 너무 적으면 실패로 처리한다.
  const validQuizzes = sanitizeQuizzes(parsed.quizzes);
  if (validQuizzes.length < minValidGoalQuizzes(quizCount)) {
    throw new Error('AI가 문제를 제대로 만들지 못했습니다. 다시 시도해주세요.');
  }

  const quizPool: Quiz[] = validQuizzes.map((q) => ({
    id: generateId(),
    goalId,
    question: q.question,
    type: q.type,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    isWrong: false,
    wrongCount: 0,
  }));

  return {
    summary: parsed.summary,
    quizPool,
  };
}

export async function generateDailyContent(
  goalId: string,
  topic: string,
  dayNum: number,
  totalDays: number,
  level: QuizLevel = 'intermediate',
  apiKey = '',
  rawContent?: string,
  practicalMode = false,
  mateTone: MateTone = 'plain'
): Promise<GenerateDailyContentResult> {
  const prompt = `
당신은 학습 도우미입니다. 아래 주제를 ${totalDays}일에 걸쳐 단계적으로 학습하는 커리큘럼에서 오늘(${dayNum}일째) 배울 내용을 생성해주세요.

주제: ${topic}
난이도: ${LEVEL_DESC[level]}
오늘: ${dayNum}일째 / 전체 ${totalDays}일
${rawContent ? `참고 자료:\n${rawContent}\n` : ''}
${practicalMode ? PRACTICAL_MODE_INSTRUCTION : ''}
${TONE_INSTRUCTION[mateTone]}

규칙:
- 전체 ${totalDays}일을 균등하게 나눠 각 날짜마다 새로운 내용을 다룹니다.
- ${dayNum}일째에 해당하는 진도(앞 날들과 겹치지 않는 새 내용)를 다루세요.
- 초반(1~${Math.ceil(totalDays * 0.3)}일): 기초 개념, 중반(${Math.ceil(totalDays * 0.3) + 1}~${Math.ceil(totalDays * 0.7)}일): 핵심 내용, 후반(${Math.ceil(totalDays * 0.7) + 1}~${totalDays}일): 심화/응용.

다음 JSON 형식으로만 응답하세요:
{
  "summary": "오늘(${dayNum}일째) 배울 핵심 내용을 3~5개 불릿 포인트로 정리. 각 항목은 '• '으로 시작하고 줄바꿈으로 구분",
  "quizzes": [
    {
      "question": "질문",
      "type": "multiple_choice",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
      "answer": "정답 선택지 텍스트",
      "explanation": "해설"
    }
  ]
}

퀴즈는 정확히 8개. multiple_choice 6개, short_answer 2개. 오늘 배운 내용 기반으로 출제.
JSON만 응답하세요.
`.trim();

  const data = await callGemini({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
    },
  }, apiKey);

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini 응답에서 JSON을 찾을 수 없습니다.');

  let parsed: { summary?: string; quizzes?: unknown };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('AI 응답이 잘려서 처리하지 못했습니다. 다시 시도해주세요.');
  }

  if (!parsed.summary || typeof parsed.summary !== 'string' || !parsed.summary.trim()) {
    throw new Error('AI가 요약을 만들지 못했습니다. 다시 시도해주세요.');
  }

  const validQuizzes = sanitizeQuizzes(parsed.quizzes);
  if (validQuizzes.length < MIN_VALID_DAILY_QUIZZES) {
    throw new Error('AI가 문제를 제대로 만들지 못했습니다. 다시 시도해주세요.');
  }

  const quizzes: Quiz[] = validQuizzes.map((q) => ({
    id: generateId(),
    goalId,
    question: q.question,
    type: q.type,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    isWrong: false,
    wrongCount: 0,
  }));

  return { summary: parsed.summary, quizzes };
}
