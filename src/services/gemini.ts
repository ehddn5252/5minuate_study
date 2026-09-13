import type { Quiz, QuizLevel, MateTone } from '../types';
import { generateId } from '../utils/id';
import { sanitizeQuizzes } from '../utils/quizValidation';

// AI가 문제를 충분히·제대로 만들지 못했을 때(형식 오류, 정답-선택지 불일치 등)를 대비한 최소 유효 문항 수.
// 요청한 개수(quizCount)의 최소 1/3은 유효해야 하며, 최소 3개는 확보되어야 한다.
function minValidGoalQuizzes(quizCount: number): number {
  return Math.max(3, Math.ceil(quizCount / 3));
}
const MIN_VALID_DAILY_QUIZZES = 3; // 8개 요청

// F-44(감사 후 개정): 문제 수는 사용자가 직접 고르지 않고 utils/quizCount.ts가 참고 자료
// 분량·기한을 보고 자동으로 정한다(F-02 "분량을 직접 늘리거나 줄이는 설정 제공 안 함" 원칙 유지).
// 여기서는 정해진 개수를 객관식:단답형 비율로 나누기만 한다.
//
// F-85: 단답형은 인출 강도가 세지만(testing effect) 실패 시 내재적 부하·좌절도 크고,
// 객관식은 반대다(인지부하이론, Sweller). 레벨과 무관한 고정 비율은 이 상충을 무시한
// 설계였다 — intermediate 값은 기존 2:1 그대로 유지해 레벨 미지정/레거시 데이터에서
// 회귀가 없게 한다.
const GOAL_SA_SHARE: Record<QuizLevel, number> = {
  beginner: 1 / 4,
  intermediate: 1 / 3,
  advanced: 2 / 5,
};

function splitQuizCount(quizCount: number, level: QuizLevel = 'intermediate'): { mc: number; sa: number } {
  const saShare = GOAL_SA_SHARE[level] ?? GOAL_SA_SHARE.intermediate;
  const mc = Math.round(quizCount * (1 - saShare));
  return { mc, sa: quizCount - mc };
}

// F-85: generateDailyContent(실제 매일 학습 흐름)는 별도로 문항 수(8개)를 프롬프트에
// 하드코딩하므로 같은 원칙을 적용하되 별개 테이블로 둔다 — intermediate=6:2는 기존과
// 동일(회귀 없음), goal 생성 시점의 비율표와 통일하면 둘 중 하나가 조용히 바뀌게 된다.
const DAILY_SA_SHARE: Record<QuizLevel, number> = {
  beginner: 1 / 8,
  intermediate: 1 / 4,
  advanced: 3 / 8,
};
const DAILY_QUIZ_COUNT = 8;

function splitDailyQuizCount(level: QuizLevel = 'intermediate'): { mc: number; sa: number } {
  const sa = Math.round(DAILY_QUIZ_COUNT * (DAILY_SA_SHARE[level] ?? DAILY_SA_SHARE.intermediate));
  return { mc: DAILY_QUIZ_COUNT - sa, sa };
}

const LEVEL_DESC: Record<QuizLevel, string> = {
  beginner: '초급 — 기초 개념 위주로 쉬운 어휘와 단순한 문장 구조로 설명하고 출제하세요.',
  intermediate: '중급 — 표준적인 난이도로 핵심 개념과 응용을 균형 있게 다루세요.',
  advanced: '고급 — 심화 개념과 실전 수준의 응용 문제를 포함하고, 헷갈리기 쉬운 선택지를 활용하세요.',
};

const PRACTICAL_MODE_INSTRUCTION =
  '각 요약 항목 또는 퀴즈 해설 중 적절한 곳에, 실무에서 어떻게 적용되는지 보여주는 예시를 1줄 이내로 자연스럽게 포함하세요. 항목 수나 분량 제한은 그대로 지키세요.';

// 앱 화면은 서식(굵게/밑줄/색 표시) 없이 순수 텍스트로만 문제를 렌더링한다. "밑줄 친 부분",
// "굵게 표시된 단어"처럼 실제로는 존재하지 않는 시각적 표시를 가리키는 문제를 내면 학생이
// 답할 수 없는 문제가 되므로, 특정 단어·구절을 가리킬 때는 반드시 그 표현을 문제 텍스트
// 안에 직접 인용부호로 명시하도록 지시한다.
const NO_VISUAL_FORMATTING_INSTRUCTION =
  '문제나 선택지에서 "밑줄 친", "굵게 표시된", "색칠된" 등 실제로 표시되지 않는 시각적 서식에 의존하는 표현은 쓰지 마세요. 특정 단어나 구절을 가리켜야 할 때는 그 표현을 문제 텍스트 안에 따옴표로 직접 인용해서 명확히 하세요(예: "밑줄 친 부사가 나타내는 것은?" (X) → "다음 문장에서 \'quickly\'가 나타내는 것은?" (O)).';

// "다음 중 ~가 아닌 것은?"류 문제에서 정답만 겉모습(철자·형태 패턴)이 달라 내용을 몰라도
// 눈으로 보기만 하고 찍을 수 있는 경우가 자주 생긴다(예: 접미사 -tion 문제인데 보기 4개 중
// 3개만 실제로 -tion으로 끝나고 나머지 1개는 아예 다른 형태라 지식 없이도 소거가 가능한 경우).
// 오답 선택지도 정답과 겉보기 패턴(어미·길이·형식)을 맞춰서, 실제 개념을 알아야만 구별되게 한다.
const NO_SURFACE_PATTERN_GIVEAWAY_INSTRUCTION =
  '"다음 중 ~이 아닌 것은?"처럼 예외를 고르는 문제에서, 오답(예시에 해당하는 선택지)들과 정답(예외)이 철자·어미·형태 등 겉모습만으로 구별되지 않게 하세요. 예를 들어 접미사 "-tion"이 붙어 명사가 되는 경우가 아닌 것을 고르는 문제라면, 정답 선택지도 "-tion"으로 끝나되 실제로는 그 접미사 규칙이 적용되지 않는 단어를 써야 합니다(예: 나머지 3개가 "creation, action, information"처럼 동사+"-tion" 구조인데 정답은 "nation"처럼 겉보기엔 "-tion"으로 끝나지만 "nat-"이라는 독립된 어근이 없어 접미사 결합으로 볼 수 없는 단어). 겉모양만 보고 소거할 수 있는 선택지 구성은 금지합니다.';

// 버그: 주제가 "영어 단어 1000개 완성"처럼 구체적인 지식 항목(단어, 사실, 공식 등)을 익히는
// 것인데도, AI가 실제 항목 대신 "왜 복습이 중요한가", "이 학습법이 효과적인 이유는?" 같은
// 학습법 자체에 대한 메타 질문만 채워서 내는 경우가 있었다(사용자가 실제로 배워야 할 단어는
// 하나도 안 나오고, 공부 방법에 대한 문제만 나옴). 주제 자체가 "공부법/학습 습관"이 아닌 한,
// 반드시 그 주제의 실제 지식 항목을 묻도록 명시적으로 금지·지시한다.
const CONCRETE_SUBJECT_CONTENT_INSTRUCTION =
  '요약과 퀴즈는 반드시 주제 자체가 다루는 구체적인 지식(예: 실제 단어와 뜻·예문, 실제 개념의 정의, 실제 공식, 실제 역사적 사실 등)을 다뤄야 합니다. "복습이 왜 중요한가", "이 방법이 효과적인 이유는?", "장기 기억으로 전환하려면?"처럼 학습 방법론·공부 습관 자체를 묻는 메타 문제로 채우지 마세요 — 주제 자체가 "공부법", "학습 습관"처럼 학습 방법론을 다루는 경우가 아니라면 이런 메타 문제는 전부 금지합니다. 예를 들어 주제가 "영어 단어 1000개 완성"이라면 퀴즈는 실제 영단어(예: enhance, abandon)의 뜻·유의어·용법을 물어야지, "어휘 학습 시 문맥이 왜 중요한가" 같은 질문을 내면 안 됩니다.';

// F-83: 해설이 "정답은 이거다"로 끝나면 오개념이 왜 틀렸는지 스스로 정정할 기회가 없다.
// 형성적 피드백(formative feedback, Hattie & Timperley) 구조 — (1) 정답 근거 (2) 가장
// 헷갈리는 오답이 왜 틀렸는지 — 를 명시적으로 요구해 "정답만 알고 넘어가는" 얕은 학습을 막는다.
// NO_SURFACE_PATTERN_GIVEAWAY_INSTRUCTION이 이미 오답을 "실제 오개념을 담은 그럴듯한 함정"으로
// 만들도록 강제하는데, 정작 해설에서 그 오개념을 왜 틀렸는지 설명 안 하면 애써 설계한 함정의
// 교육적 가치를 버리게 된다.
const FORMATIVE_EXPLANATION_INSTRUCTION =
  '"explanation" 필드는 정답만 알려주고 끝내지 마세요. 반드시 다음을 포함하세요: (1) 정답이 왜 맞는지 근거나 원리, (2) 객관식이라면 오답 선택지 중 학생이 가장 헷갈릴 만한(정답과 개념이 가장 가까운) 선택지 하나를 콕 집어 그것이 왜 틀렸는지(단답형이면 이 항목 생략). 전체 해설은 2~3문장 이내로 간결하게 유지하세요.';

// F-27: AI 케미 학습메이트 — 말투 프리셋. 'plain'은 기존과 동일한 중립 톤(기본값, 회귀 없음)이라 지시문을 추가하지 않는다.
const TONE_INSTRUCTION: Record<MateTone, string> = {
  friendly: '설명 말투는 다정한 친구처럼 편안하고 다정하게 써주세요. 존댓말은 유지하되 따뜻하고 친근한 어조로 작성하세요.',
  hype: '설명 말투는 텐션 높은 예능 자막체처럼 재미있고 리듬감 있게 써주세요. 과하지 않은 선에서 유행어·감탄사를 섞어도 좋습니다.',
  plain: '',
};

interface GeminiResponse {
  candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
}

// 서버가 응답을 아예 안 주고 연결만 유지하는 "행(hang)" 상황을 대비한 타임아웃 — 이게 없으면
// fetch의 Promise가 영원히 pending 상태로 남아 로딩 화면에서 빠져나올 방법이 없어진다.
const REQUEST_TIMEOUT_MS = 40000;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('서버 응답이 너무 오래 걸려요. 네트워크 상태를 확인하고 다시 시도해주세요.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// CF Worker가 Gemini API 키를 대신 보관하는 프록시를 통해서만 호출한다(사용자가 직접 키를 넣는 경로는 없음)
async function callGemini(body: object): Promise<GeminiResponse> {
  const url = '/api/generate';
  const maxAttempts = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      const err = await response.json() as { error: string };
      throw new Error(err.error ?? '일일 생성 한도를 초과했습니다.');
    }

    if (response.ok) {
      return response.json() as Promise<GeminiResponse>;
    }

    const errText = await response.text();
    // Gemini API가 요청을 처리한 Cloudflare 엣지 콜로의 지역을 근거로 거부할 때가 있다
    // (간헐적 — 콜로마다 다름). 서버(Worker)에서도 재시도하지만, 클라이언트에서 새로
    // 요청을 보내면 다른 콜로로 라우팅될 가능성이 있어 한 번 더 시도한다.
    const isLocationRestricted =
      errText.includes('FAILED_PRECONDITION') || errText.includes('User location is not supported');
    if (isLocationRestricted) {
      lastError = new Error('일시적인 서버 지역 문제로 생성에 실패했어요. 잠시 후 다시 시도해주세요.');
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        continue;
      }
    } else {
      throw new Error(`생성 오류: ${response.status} — ${errText.slice(0, 200)}`);
    }
  }

  throw lastError ?? new Error('생성에 실패했습니다. 다시 시도해주세요.');
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
  const { mc: mcCount, sa: saCount } = splitQuizCount(quizCount, level);

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
  "summary": "주제에 대한 핵심 내용을 3~7개의 불릿 포인트로 정리. 각 항목은 '• ' 으로 시작하고 줄바꿈으로 구분. 각 항목에서 가장 중요한 핵심어/핵심 문구 딱 1개만 **이렇게** 마크다운 굵게 표시(과하게 여러 개 표시하지 말 것)",
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
${CONCRETE_SUBJECT_CONTENT_INSTRUCTION}
${NO_VISUAL_FORMATTING_INSTRUCTION}
${NO_SURFACE_PATTERN_GIVEAWAY_INSTRUCTION}
${FORMATIVE_EXPLANATION_INSTRUCTION}
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
  });

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
  rawContent?: string,
  practicalMode = false,
  mateTone: MateTone = 'plain',
  previousSummary?: string
): Promise<GenerateDailyContentResult> {
  const { mc: dailyMc, sa: dailySa } = splitDailyQuizCount(level);
  const prompt = `
당신은 학습 도우미입니다. 아래 주제를 ${totalDays}일에 걸쳐 단계적으로 학습하는 커리큘럼에서 오늘(${dayNum}일째) 배울 내용을 생성해주세요.

주제: ${topic}
난이도: ${LEVEL_DESC[level]}
오늘: ${dayNum}일째 / 전체 ${totalDays}일
${rawContent ? `참고 자료:\n${rawContent}\n` : ''}
${practicalMode ? PRACTICAL_MODE_INSTRUCTION : ''}
${TONE_INSTRUCTION[mateTone]}
${previousSummary ? `
직전 학습 세션에서 다룬 내용(참고용):
${previousSummary}
위 내용은 이미 학습을 마친 것으로 간주하고, 오늘 콘텐츠는 이 내용 위에서 자연스럽게 다음 단계로 이어지도록 구성하세요. 직전 내용을 그대로 반복하지 마세요.
` : ''}

규칙:
- 전체 ${totalDays}일을 균등하게 나눠 각 날짜마다 새로운 내용을 다룹니다.
- ${dayNum}일째에 해당하는 진도(앞 날들과 겹치지 않는 새 내용)를 다루세요.
- 초반(1~${Math.ceil(totalDays * 0.3)}일): 기초 개념, 중반(${Math.ceil(totalDays * 0.3) + 1}~${Math.ceil(totalDays * 0.7)}일): 핵심 내용, 후반(${Math.ceil(totalDays * 0.7) + 1}~${totalDays}일): 심화/응용.

다음 JSON 형식으로만 응답하세요:
{
  "summary": "오늘(${dayNum}일째) 배울 핵심 내용을 3~5개 불릿 포인트로 정리. 각 항목은 '• '으로 시작하고 줄바꿈으로 구분. 각 항목에서 가장 중요한 핵심어/핵심 문구 딱 1개만 **이렇게** 마크다운 굵게 표시(과하게 여러 개 표시하지 말 것)",
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

퀴즈는 정확히 ${DAILY_QUIZ_COUNT}개. multiple_choice ${dailyMc}개, short_answer ${dailySa}개. 오늘 배운 내용 기반으로 출제.
${CONCRETE_SUBJECT_CONTENT_INSTRUCTION}
${NO_VISUAL_FORMATTING_INSTRUCTION}
${NO_SURFACE_PATTERN_GIVEAWAY_INSTRUCTION}
${FORMATIVE_EXPLANATION_INSTRUCTION}
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
  });

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

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // data:audio/webm;base64,XXXX 형태이므로 콤마 뒤 순수 base64만 취한다
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Loora 등 AI 회화 코칭 앱 오마주 — 녹음한 음성을 Gemini의 오디오 이해 기능(inline_data)에
// 그대로 넣어 듣고 피드백을 준다. 과목을 가리지 않는 범용 퀴즈 녹음이라 "발음 교정" 전용이
// 아니라 "답변 내용이 적절한지 + (외국어라면) 표현" 정도로 넓게 잡는다.
export async function getSpeakingFeedback(
  audioBlob: Blob,
  mimeType: string,
  questionText: string
): Promise<string> {
  const base64Audio = await blobToBase64(audioBlob);

  const prompt = `
당신은 다정한 학습 코치입니다. 학생이 아래 문제에 대해 음성으로 답한 녹음을 듣고 피드백을 주세요.

문제: ${questionText}

한국어로 3~4문장 이내로 간결하게:
1. 학생이 말한 내용을 한 줄로 요약
2. 문제에 대한 답변으로 적절한지, 부족하거나 틀린 부분이 있다면 무엇인지
3. 외국어로 답했다면 발음·표현 중 개선하면 좋을 점 한 가지 (한국어로 답했다면 이 항목은 생략)

격려하는 톤을 유지하고, 음성만으로 판단하는 것이니 발음을 너무 단정적으로 지적하지 마세요.
`.trim();

  const data = await callGemini({
    contents: [
      {
        parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Audio } }],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 400,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text.trim()) throw new Error('AI가 피드백을 만들지 못했습니다. 다시 시도해주세요.');
  return text.trim();
}
