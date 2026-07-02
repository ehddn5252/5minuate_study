import type { Quiz } from '../types';
import { generateId } from '../utils/id';

const GEMINI_MODEL = 'gemini-2.5-flash';

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

interface GeminiQuizRaw {
  question: string;
  type: 'multiple_choice' | 'short_answer';
  options?: string[];
  answer: string;
  explanation: string;
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
  apiKey = '',
  rawContent?: string
): Promise<GenerateGoalContentResult> {
  const today = new Date().toISOString().split('T')[0];
  const daysLeft = Math.ceil(
    (new Date(deadline).getTime() - new Date(today).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const prompt = `
당신은 학습 도우미입니다. 아래 주제에 대한 학습 콘텐츠를 JSON 형식으로 생성해주세요.

주제: ${topic}
마감일: ${deadline} (오늘로부터 ${daysLeft}일 후)
${rawContent ? `참고 자료:\n${rawContent}` : ''}

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

퀴즈는 정확히 15개를 생성하세요. multiple_choice는 10개, short_answer는 5개.
JSON만 응답하고 다른 텍스트는 포함하지 마세요.
`.trim();

  const data = await callGemini({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  }, apiKey);

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Gemini 응답에서 JSON을 찾을 수 없습니다.');
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    summary: string;
    quizzes: GeminiQuizRaw[];
  };

  const quizPool: Quiz[] = parsed.quizzes.map((q) => ({
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
  apiKey = '',
  rawContent?: string
): Promise<GenerateDailyContentResult> {
  const prompt = `
당신은 학습 도우미입니다. 아래 주제를 ${totalDays}일에 걸쳐 단계적으로 학습하는 커리큘럼에서 오늘(${dayNum}일째) 배울 내용을 생성해주세요.

주제: ${topic}
오늘: ${dayNum}일째 / 전체 ${totalDays}일
${rawContent ? `참고 자료:\n${rawContent}\n` : ''}

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
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  }, apiKey);

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini 응답에서 JSON을 찾을 수 없습니다.');

  const parsed = JSON.parse(jsonMatch[0]) as {
    summary: string;
    quizzes: GeminiQuizRaw[];
  };

  const quizzes: Quiz[] = parsed.quizzes.map((q) => ({
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
