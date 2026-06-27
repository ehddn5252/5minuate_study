/**
 * 5minuate_study Telegram → GitHub Actions 브릿지
 *
 * Cloudflare Worker 환경 변수 (대시보드 > Settings > Variables):
 *   TELEGRAM_BOT_TOKEN  — TELEGRAM_DEV_BOT_TOKEN 값
 *   TELEGRAM_CHAT_ID    — TELEGRAM_DEV_CHAT_ID 값
 *   GITHUB_TOKEN        — GitHub PAT (repo + workflow 권한)
 *   GITHUB_REPO         — "ehddn5252/5minuate_study"
 */

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('OK');

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
