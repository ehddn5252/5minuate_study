#!/usr/bin/env node
// Stop hook: 매 턴이 끝날 때 이 세션의 transcript를 두 군데에 남긴다.
//   1) docs/sessions/raw/<session_id>.jsonl — 원본 그대로(생각 과정 포함). .gitignore로 로컬 전용.
//   2) docs/sessions/<session_id>.md — 사람이 읽을 프롬프트+최종 응답만 추린 요약. git으로 공유.
// LLM 요약이 아니라 "도구 호출/생각(thinking) 블록을 뺀 대화 로그"에 가깝다 —
// Stop 이벤트에는 LLM을 부르는 hook 타입(prompt/agent)이 지원되지 않아 이게 자동화로 갈 수 있는 최대치다.
const fs = require('fs');
const path = require('path');

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
  });
}

function extractText(blocks) {
  return (blocks || [])
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text.trim())
    .filter(Boolean)
    .join('\n\n');
}

function buildSummary(transcriptPath) {
  const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean);
  const turns = [];
  for (const line of lines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    // 서브에이전트 사이드체인은 메인 대화 흐름이 아니라 요약에서 뺀다.
    if (entry.isSidechain) continue;

    if (entry.type === 'user' && !entry.toolUseResult) {
      const text = extractText(entry.message && entry.message.content);
      if (text) turns.push({ role: 'user', text, ts: entry.timestamp });
    } else if (entry.type === 'assistant') {
      const text = extractText(entry.message && entry.message.content);
      if (text) turns.push({ role: 'assistant', text, ts: entry.timestamp });
    }
  }

  const parts = turns.map((t) => {
    const label = t.role === 'user' ? '## 사용자' : '## Claude';
    const ts = t.ts ? ` (${t.ts})` : '';
    return `${label}${ts}\n\n${t.text}`;
  });

  const header = `# 세션 요약 (자동 추출 — 프롬프트/최종 응답만, 도구 호출·생각 과정은 제외)\n\n` +
    `전체 기록(도구 호출·생각 과정 포함)은 로컬의 \`docs/sessions/raw/\` 아래 같은 세션 id 파일에 있습니다.\n\n---\n\n`;

  return header + parts.join('\n\n---\n\n') + '\n';
}

(async () => {
  try {
    const raw = await readStdin();
    const input = JSON.parse(raw);
    const sessionId = input.session_id;
    const transcriptPath = input.transcript_path;
    if (!sessionId || !transcriptPath || !fs.existsSync(transcriptPath)) return;

    const cwd = process.cwd();
    const rawDir = path.join(cwd, 'docs', 'sessions', 'raw');
    const summaryDir = path.join(cwd, 'docs', 'sessions');
    fs.mkdirSync(rawDir, { recursive: true });
    fs.mkdirSync(summaryDir, { recursive: true });

    fs.copyFileSync(transcriptPath, path.join(rawDir, `${sessionId}.jsonl`));

    const summary = buildSummary(transcriptPath);
    fs.writeFileSync(path.join(summaryDir, `${sessionId}.md`), summary, 'utf8');
  } catch {
    // 백업 실패가 세션 진행을 막으면 안 되므로 조용히 무시한다.
  }
})();
