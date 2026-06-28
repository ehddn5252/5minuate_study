import type { Quiz } from '../types';
import { generateId } from '../utils/id';

const GEMINI_MODEL = 'gemini-2.5-flash';

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

export async function generateGoalContent(
  goalId: string,
  topic: string,
  deadline: string,
  apiKey: string,
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

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API 오류: ${response.status} - ${err}`);
  }

  const data = await response.json() as {
    candidates: Array<{
      content: { parts: Array<{ text: string }> };
    }>;
  };

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
