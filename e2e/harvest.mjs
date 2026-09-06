/**
 * 사용자 여정 하베스트 — 배포된 5분 학습 앱을 실제 브라우저로 훑으며
 * 단계별 스크린샷 + 콘솔/네트워크 에러를 모아 리포트로 남긴다.
 *
 *   node e2e/harvest.mjs                        # 배포 사이트 대상
 *   BASE_URL=http://localhost:5173 node e2e/harvest.mjs   # 로컬 dev 서버 대상
 *   HEADED=1 node e2e/harvest.mjs               # 브라우저 창 띄우고 실행
 *
 * 결과: e2e/out/<타임스탬프>/  (screenshots/*.png, report.md, events.json)
 */
import { chromium, devices } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE_URL = process.env.BASE_URL ?? 'https://5minuatestudy.ehddn5252.workers.dev';
const HEADED = !!process.env.HEADED;
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outDir = join('e2e', 'out', stamp);
const shotDir = join(outDir, 'screenshots');
mkdirSync(shotDir, { recursive: true });

/** @type {{type:string,step:string,text:string}[]} */
const events = [];
/** @type {{step:string,status:'ok'|'warn'|'fail',note:string,shot?:string}[]} */
const steps = [];
let currentStep = 'boot';

const iPhone = devices['iPhone 13'];

async function run() {
  const browser = await chromium.launch({ headless: !HEADED });
  const context = await browser.newContext({ ...iPhone, locale: 'ko-KR' });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      events.push({ type: `console.${msg.type()}`, step: currentStep, text: msg.text().slice(0, 500) });
    }
  });
  page.on('pageerror', (err) => {
    events.push({ type: 'pageerror', step: currentStep, text: String(err).slice(0, 500) });
  });
  page.on('requestfailed', (req) => {
    const f = req.failure();
    // ERR_ABORTED 는 대개 다음 page.goto() 가 이전 페이지의 in-flight 요청을 끊어서 나는
    // 테스트 아티팩트 — 앱 버그가 아니므로 제외한다.
    if (f?.errorText?.includes('ERR_ABORTED')) return;
    events.push({ type: 'requestfailed', step: currentStep, text: `${req.method()} ${req.url()} — ${f?.errorText ?? '?'}`.slice(0, 500) });
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      events.push({ type: `http.${res.status()}`, step: currentStep, text: `${res.request().method()} ${res.url()}`.slice(0, 500) });
    }
  });

  // 인증 응답은 성공/실패 모두 본문까지 기록 — dev 로그인 진단용
  page.on('response', async (res) => {
    if (res.url().includes('/auth/v1/token')) {
      let body = '';
      try { body = JSON.stringify(await res.json()).slice(0, 300); } catch { /* noop */ }
      events.push({ type: `auth.${res.status()}`, step: currentStep, text: `${res.url().split('?')[0]} → ${body}` });
    }
  });

  async function step(name, fn, { optional = false } = {}) {
    currentStep = name;
    const before = events.length;
    try {
      await fn();
      const shot = `${String(steps.length + 1).padStart(2, '0')}-${name}.png`;
      await page.screenshot({ path: join(shotDir, shot), fullPage: true }).catch(() => {});
      const newErrs = events.slice(before).filter((e) => /^(pageerror|console\.error|http\.[45]|auth\.[45]|requestfailed)/.test(e.type));
      steps.push({
        step: name,
        status: newErrs.length ? 'warn' : 'ok',
        note: newErrs.length ? `${newErrs.length}건의 에러/실패 이벤트 발생` : '정상',
        shot,
      });
    } catch (err) {
      const shot = `${String(steps.length + 1).padStart(2, '0')}-${name}-FAIL.png`;
      await page.screenshot({ path: join(shotDir, shot), fullPage: true }).catch(() => {});
      steps.push({ step: name, status: optional ? 'warn' : 'fail', note: String(err).split('\n')[0].slice(0, 300), shot });
    }
  }

  const goto = (path) => page.goto(BASE_URL + path, { waitUntil: 'networkidle', timeout: 30000 });

  // ── 여정 ────────────────────────────────────────────────────────────────────
  await step('01-landing-login', async () => {
    await goto('/');
    await page.getByRole('button', { name: /Google로 로그인/ }).waitFor({ timeout: 15000 });
  });

  let loggedIn = false;
  await step('02-dev-login', async () => {
    await page.getByRole('button', { name: /테스트 계정 1/ }).click();
    // 로그인 성공 시 하단 네비(홈/목표/친구/업적/설정)가 나타난다. 실패 시 에러 문구.
    const nav = page.getByRole('navigation');
    const err = page.locator('p.text-red-500');
    await Promise.race([
      nav.waitFor({ state: 'visible', timeout: 25000 }).then(() => { loggedIn = true; }),
      err.waitFor({ state: 'visible', timeout: 25000 }),
    ]);
    const authKey = await page.evaluate(() => Object.keys(localStorage).find((k) => k.includes('auth-token')) ?? null);
    events.push({ type: 'diag', step: currentStep, text: `loggedIn=${loggedIn} authTokenInLS=${!!authKey}` });
    if (!loggedIn) {
      const msg = await err.innerText().catch(() => '(에러 문구 못 읽음)');
      throw new Error(`dev 로그인 실패: ${msg.replace(/\s+/g, ' ').slice(0, 200)}`);
    }
  }, { optional: true });

  await step('03-home', async () => {
    await goto('/');
    await page.waitForTimeout(1500);
  });

  await step('04-goal-create-form', async () => {
    await goto('/goals/create');
    await page.locator('#goal-topic').waitFor({ timeout: 10000 });
  });

  await step('05-goal-create-submit', async () => {
    const unique = `E2E 테스트 주제 ${stamp}`;
    await page.locator('#goal-topic').fill(unique);
    const d = new Date();
    d.setDate(d.getDate() + 14);
    await page.locator('#goal-deadline').fill(d.toISOString().slice(0, 10));
    await page.getByRole('button', { name: '목표 만들기' }).click();
    // AI 생성 → 홈으로 navigate('/'). Gemini 호출이라 넉넉히 대기.
    await page.waitForURL((u) => new URL(u).pathname === '/', { timeout: 90000 });
    await page.waitForLoadState('networkidle');
  }, { optional: true });

  // 로그인 후 열람 가능한 주요 화면들
  const screens = [
    ['06-goals', '/goals'],
    ['07-calendar', '/calendar'],
    ['08-wrong-pool', '/wrong-pool'],
    ['09-mix-review', '/mix-review'],
    ['10-my-questions', '/my-questions'],
    ['11-friends', '/friends'],
    ['12-achievements', '/achievements'],
    ['13-language', '/language'],
    ['14-settings', '/settings'],
    ['15-shorts', '/shorts/english_grammar'],
  ];
  for (const [name, path] of screens) {
    await step(name, async () => {
      await goto(path);
      await page.waitForTimeout(1200);
      // 화면이 사실상 비어있으면(빈 div만) 경고
      const bodyText = (await page.locator('body').innerText().catch(() => '')).trim();
      if (bodyText.length < 10) throw new Error('화면이 비어 있음 (렌더 실패 의심)');
    }, { optional: true });
  }

  await browser.close();
}

function writeReport() {
  const byType = {};
  for (const e of events) byType[e.type] = (byType[e.type] ?? 0) + 1;

  const lines = [];
  lines.push(`# 사용자 여정 하베스트 리포트`);
  lines.push('');
  lines.push(`- 대상: ${BASE_URL}`);
  lines.push(`- 실행: ${stamp}`);
  lines.push(`- 단계: ${steps.length}개 (ok ${steps.filter((s) => s.status === 'ok').length} / warn ${steps.filter((s) => s.status === 'warn').length} / fail ${steps.filter((s) => s.status === 'fail').length})`);
  lines.push('');
  lines.push(`## 단계별 결과`);
  lines.push('');
  lines.push('| 단계 | 상태 | 비고 | 스크린샷 |');
  lines.push('|------|------|------|----------|');
  for (const s of steps) {
    const icon = s.status === 'ok' ? '✅' : s.status === 'warn' ? '⚠️' : '❌';
    lines.push(`| ${s.step} | ${icon} | ${s.note} | screenshots/${s.shot ?? '-'} |`);
  }
  lines.push('');
  lines.push(`## 에러/실패 이벤트 (${events.length}건)`);
  lines.push('');
  if (events.length === 0) {
    lines.push('_없음_');
  } else {
    lines.push('요약: ' + Object.entries(byType).map(([k, v]) => `${k} ×${v}`).join(', '));
    lines.push('');
    for (const e of events) {
      lines.push(`- \`[${e.step}]\` **${e.type}** — ${e.text}`);
    }
  }
  lines.push('');

  writeFileSync(join(outDir, 'report.md'), lines.join('\n'));
  writeFileSync(join(outDir, 'events.json'), JSON.stringify({ base: BASE_URL, stamp, steps, events }, null, 2));
  console.log(`\n리포트: ${join(outDir, 'report.md')}`);
  console.log(`단계 ${steps.length} / 이벤트 ${events.length}`);
}

run()
  .catch((e) => { console.error(e); })
  .finally(writeReport);
