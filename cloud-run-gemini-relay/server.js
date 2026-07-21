// Gemini API 지역 차단 우회용 중계 서버.
//
// 문제: Cloudflare Workers 무료 플랜은 요청이 어느 나라 엣지 서버에서 처리될지 고정할 수 없어서,
// 가끔 Google이 막아둔 지역의 서버가 배정되면 Gemini가 "User location is not supported"로 거부한다.
// 이 서버는 특정 지역(예: us-central1)에 고정 배포해서, Cloudflare Worker가 Gemini를 직접 부르는
// 대신 항상 이 서버를 거치게 하면 지역이 항상 고정되어 그 문제를 원천적으로 피할 수 있다.
//
// 인증: 아무나 이 URL을 알아내 무료 Gemini 할당량을 축내지 못하도록, Cloudflare Worker만 아는
// 공유 비밀(X-Relay-Secret 헤더)을 확인한다.

import http from 'node:http';

const PORT = process.env.PORT || 8080;
const GEMINI_MODEL = 'gemini-2.5-flash';

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  if (!process.env.RELAY_SECRET || req.headers['x-relay-secret'] !== process.env.RELAY_SECRET) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'GEMINI_API_KEY not set' }));
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
    );
    const text = await geminiRes.text();
    res.writeHead(geminiRes.status, { 'Content-Type': 'application/json' });
    res.end(text);
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err) }));
  }
});

server.listen(PORT, () => {
  console.log(`gemini relay listening on ${PORT}`);
});
