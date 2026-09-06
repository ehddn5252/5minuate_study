/**
 * 5minuate_study Cloudflare Worker
 *
 * 역할 1: Gemini API 프록시 (POST /api/generate)
 *   - GEMINI_API_KEY 시크릿으로 서버 측 Gemini 호출
 *   - RATE_LIMIT KV로 IP당 하루 20회 제한
 *   - RELAY_URL/RELAY_SECRET이 설정되어 있으면, Cloudflare 엣지가 아니라 지역이 고정된
 *     중계 서버(cloud-run-gemini-relay/)를 우선 거쳐 "User location is not supported" 지역
 *     차단을 원천적으로 피한다. 중계 서버 연결 자체가 실패할 때만 기존 직접 호출로 폴백한다.
 *
 * 역할 2: Telegram → GitHub Actions 브릿지 (그 외 POST)
 *   Worker 환경 변수:
 *   TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID / GITHUB_TOKEN / GITHUB_REPO / GEMINI_API_KEY /
 *   RELAY_URL(선택) / RELAY_SECRET(선택)
 */

const GEMINI_MODEL = 'gemini-2.5-flash';
const DAILY_LIMIT = 40;
const GEMINI_MAX_ATTEMPTS = 3;

// Gemini API가 이 요청을 처리한 Cloudflare 엣지 콜로의 지역을 근거로 거부할 때가 있다
// ("User location is not supported for the API use.", FAILED_PRECONDITION). 콜로마다
// 결과가 달라질 수 있어 짧은 지연을 두고 재시도한다.
function isLocationRestrictedError(text) {
  return text.includes('FAILED_PRECONDITION') || text.includes('User location is not supported');
}

async function fetchGeminiWithRetry(body, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  let lastRes;
  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt++) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    if (res.status !== 400) return res;
    const text = await res.clone().text();
    if (!isLocationRestrictedError(text)) return res;
    lastRes = res;
    if (attempt < GEMINI_MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }
  return lastRes;
}

// 지역 고정 중계 서버를 통해 호출한다. 중계 서버 자체(네트워크 연결)가 실패한 경우에만
// null을 돌려줘 호출부가 기존 직접 호출로 폴백하게 한다 — Gemini가 준 응답(설령 오류여도)은
// 그대로 신뢰한다(중계 서버는 지역이 고정돼 있어 지역 차단 자체가 애초에 거의 발생하지 않는다).
async function fetchGeminiViaRelay(body, env) {
  if (!env.RELAY_URL || !env.RELAY_SECRET) return null;
  try {
    return await fetch(env.RELAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Relay-Secret': env.RELAY_SECRET },
      body,
    });
  } catch {
    return null;
  }
}

async function handleGenerate(request, env) {
  // IP 기반 레이트 리밋
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const today = new Date().toISOString().split('T')[0];
  const rlKey = `${ip}:${today}`;

  if (env.RATE_LIMIT) {
    const val = await env.RATE_LIMIT.get(rlKey);
    const count = val ? parseInt(val, 10) : 0;
    if (count >= DAILY_LIMIT) {
      return Response.json(
        { error: `하루 무료 생성 한도(${DAILY_LIMIT}회)를 초과했습니다. 내일 다시 이용할 수 있어요.` },
        { status: 429 }
      );
    }
    await env.RATE_LIMIT.put(rlKey, String(count + 1), { expirationTtl: 86400 });
  }

  if (!env.GEMINI_API_KEY) {
    return Response.json({ error: '서버 API 키가 설정되지 않았습니다.' }, { status: 500 });
  }

  // Gemini로 그대로 전달 — 지역 고정 중계 서버가 설정돼 있으면 우선 사용
  const body = await request.text();
  const geminiRes = (await fetchGeminiViaRelay(body, env)) ?? (await fetchGeminiWithRetry(body, env.GEMINI_API_KEY));

  const data = await geminiRes.text();
  return new Response(data, {
    status: geminiRes.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Gemini 프록시
    if (url.pathname === '/api/generate' && request.method === 'POST') {
      return handleGenerate(request, env);
    }

    // POST가 아닌 요청(브라우저 페이지 로드 등)은 정적 자산 + SPA 폴백에 위임한다.
    // 이게 없으면 /goals/create 같은 하위 경로를 직접 열거나 새로고침할 때 이 Worker가
    // "OK"만 돌려줘 앱이 안 뜬다(서비스워커 캐시가 없는 첫 방문·공유 링크·share_target).
    if (request.method !== 'POST') {
      return env.ASSETS ? env.ASSETS.fetch(request) : new Response('OK');
    }

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response('OK');
    }

    const msg = update.message || update.edited_message;
    if (!msg) return new Response('OK');

    const chatId = String(msg.chat?.id ?? '');
    const text = (msg.text ?? '').trim();
    if (!text) return new Response('OK');

    // 권한 체크
    if (chatId !== env.TELEGRAM_CHAT_ID) {
      await tgSend(env.TELEGRAM_BOT_TOKEN, chatId, '⛔ 권한 없음');
      return new Response('OK');
    }

    // 로컬 처리 명령
    if (text === '/ping') {
      await tgSend(env.TELEGRAM_BOT_TOKEN, chatId, `🏓 pong — ${new Date().toISOString()}`);
      return new Response('OK');
    }

    if (text === '/help' || text === '/start') {
      await tgSend(env.TELEGRAM_BOT_TOKEN, chatId, HELP_TEXT);
      return new Response('OK');
    }

    // 명령 파싱
    let cmdType = 'task';
    let taskPayload = text;

    if (text === '/git' || text === '/git status' || text === '/git st') {
      cmdType = 'git_status';
      taskPayload = '';
    } else if (text === '/git log' || text === '/git l') {
      cmdType = 'git_log';
      taskPayload = '';
    } else if (text === '/git diff' || text === '/git d') {
      cmdType = 'git_diff';
      taskPayload = '';
    } else if (text.startsWith('/commit ')) {
      cmdType = 'git_commit';
      taskPayload = text.slice(8).trim();
    } else if (text === '/push') {
      cmdType = 'git_push';
      taskPayload = '';
    } else if (text.startsWith('/task ')) {
      cmdType = 'task';
      taskPayload = text.slice(6).trim();
    } else if (text.startsWith('/')) {
      await tgSend(env.TELEGRAM_BOT_TOKEN, chatId, `알 수 없는 명령: ${text}\n/help 참고`);
      return new Response('OK');
    }

    // 접수 알림
    const preview = taskPayload ? taskPayload.slice(0, 60) : cmdType;
    await tgSend(env.TELEGRAM_BOT_TOKEN, chatId, `⏳ GitHub Actions 트리거 중...\n📝 ${preview}`);

    // GitHub Actions repository_dispatch 트리거
    const resp = await fetch(
      `https://api.github.com/repos/${env.GITHUB_REPO}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `token ${env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'telegram-dev-bot',
        },
        body: JSON.stringify({
          event_type: 'telegram-task',
          client_payload: {
            task: taskPayload,
            cmd_type: cmdType,
            chat_id: chatId,
          },
        }),
      }
    );

    if (!resp.ok) {
      const err = await resp.text();
      await tgSend(env.TELEGRAM_BOT_TOKEN, chatId, `⚠️ Actions 트리거 실패 (${resp.status})\n${err.slice(0, 200)}`);
    }

    return new Response('OK');
  },
};

async function tgSend(token, chatId, text) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 4000),
      disable_web_page_preview: true,
    }),
  });
}

const HELP_TEXT = `🤖 5minuate_study 개발 봇 (GitHub Actions)

텍스트 입력 → Claude Code 실행 (약 1~2분 소요)

[작업]
/task <내용> — Claude Code 명시적 실행

[Git]
/git — git status + 최근 커밋
/git diff — 변경 파일 목록
/commit <메시지> — 전체 스테이지 후 커밋
/push — 원격 push

[기타]
/ping — 헬스체크 (즉시 응답)
/help — 이 메시지`;
