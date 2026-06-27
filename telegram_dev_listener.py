"""Claude Code 개발 전용 Telegram 봇 리스너 — 5minuate_study 프로젝트

환경 변수 (.env):
    TELEGRAM_DEV_BOT_TOKEN   — BotFather에서 발급한 개발 봇 토큰
    TELEGRAM_DEV_CHAT_ID     — 허용할 chat_id (본인 ID)
    CLAUDE_DEV_TIMEOUT       — claude 실행 타임아웃(초), 기본 무제한

사용법:
    python telegram_dev_listener.py

텔레그램 명령:
    일반 텍스트     — Claude Code 작업 (큐에 추가)
    /task <내용>   — 동일 (명시적 형태)
    /cancel        — 실행 중 작업 취소 + 대기 큐 비우기
    /git [sub]     — git 정보 (status/log/diff)
    /commit <msg>  — 전체 변경사항 스테이지 후 커밋
    /push          — 원격 저장소에 push
    /status        — 봇 상태 / 환경 정보
    /reset         — 대화 세션 초기화
    /ping          — 헬스체크
    /help          — 사용법
"""

from __future__ import annotations

import json
import os
import queue
import re
import shutil
import subprocess
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime
from typing import Dict, Optional

# 스크립트 위치 기준 .env 로드
try:
    from dotenv import load_dotenv as _load_dotenv
    _load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
except ImportError:
    pass

_API_BASE = "https://api.telegram.org"
_POLL_TIMEOUT = 30
_HTTP_TIMEOUT = _POLL_TIMEOUT + 10

_PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
_ANSI_RE = re.compile(r"\x1b\[[0-9;]*[mGKHFJA-Za-z]")
_DEV_TIMEOUT_RAW = os.getenv("CLAUDE_DEV_TIMEOUT", "")
_DEV_TIMEOUT: int | None = int(_DEV_TIMEOUT_RAW) if _DEV_TIMEOUT_RAW else None


def _esc(s: object) -> str:
    import html
    return html.escape(str(s), quote=False)


def _strip_ansi(text: str) -> str:
    return _ANSI_RE.sub("", text)


class DevListener:
    """Claude Code 개발 전용 Telegram 롱폴링 리스너."""

    def __init__(self):
        self.token = os.getenv("TELEGRAM_DEV_BOT_TOKEN", "").strip()
        self.allowed_chat_id = os.getenv("TELEGRAM_DEV_CHAT_ID", "").strip()
        self._offset = 0
        self._stop = threading.Event()

        self._task_queue: queue.Queue[tuple[str, str]] = queue.Queue()
        self._current_proc: Optional[subprocess.Popen] = None
        self._proc_lock = threading.Lock()
        self._cancelled = threading.Event()

        # 같은 chat_id는 동일 Claude 세션을 재사용해 문맥 유지
        self._chat_sessions: Dict[str, str] = {}

        self._poll_thread: Optional[threading.Thread] = None
        self._worker_thread: Optional[threading.Thread] = None

    def is_configured(self) -> bool:
        return bool(self.token and self.allowed_chat_id)

    # ── lifecycle ────────────────────────────────────────────────
    def start(self, blocking: bool = True) -> bool:
        if not self.is_configured():
            print("[dev-bot] TELEGRAM_DEV_BOT_TOKEN / TELEGRAM_DEV_CHAT_ID 미설정 — .env 확인")
            return False

        self._stop.clear()

        self._worker_thread = threading.Thread(
            target=self._worker, name="dev-worker", daemon=True
        )
        self._worker_thread.start()

        self._poll_thread = threading.Thread(
            target=self._run, name="dev-listener", daemon=True
        )
        self._poll_thread.start()

        timeout_str = f"{_DEV_TIMEOUT}s" if _DEV_TIMEOUT else "무제한"
        print(f"[dev-bot] 시작 | 프로젝트: {_PROJECT_ROOT} | 타임아웃: {timeout_str}")

        if blocking:
            try:
                self._poll_thread.join()
            except KeyboardInterrupt:
                print("\n[dev-bot] 종료 요청")
                self._stop.set()

        return True

    def stop(self) -> None:
        self._stop.set()

    # ── poll loop ────────────────────────────────────────────────
    def _run(self) -> None:
        try:
            self._offset = self._drain_pending() + 1
        except Exception as e:
            print(f"[dev-bot] 초기 offset 오류: {e}")

        backoff = 1
        while not self._stop.is_set():
            try:
                updates = self._get_updates(self._offset, _POLL_TIMEOUT)
                backoff = 1
                for upd in updates:
                    self._offset = max(self._offset, upd.get("update_id", 0) + 1)
                    try:
                        self._handle_update(upd)
                    except Exception as e:
                        print(f"[dev-bot] update 처리 오류: {e}")
            except (urllib.error.URLError, TimeoutError) as e:
                print(f"[dev-bot] 네트워크 오류: {e}")
                time.sleep(backoff)
                backoff = min(backoff * 2, 60)
            except Exception as e:
                print(f"[dev-bot] 루프 오류: {e}")
                time.sleep(backoff)
                backoff = min(backoff * 2, 60)

    def _drain_pending(self) -> int:
        url = f"{_API_BASE}/bot{self.token}/getUpdates"
        params = urllib.parse.urlencode({"timeout": 0, "offset": -1})
        with urllib.request.urlopen(f"{url}?{params}", timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
        results = data.get("result", [])
        return results[-1].get("update_id", 0) if results else 0

    def _get_updates(self, offset: int, timeout: int) -> list[dict]:
        url = f"{_API_BASE}/bot{self.token}/getUpdates"
        params = urllib.parse.urlencode({
            "offset": offset,
            "timeout": timeout,
            "allowed_updates": json.dumps(["message"]),
        })
        with urllib.request.urlopen(f"{url}?{params}", timeout=_HTTP_TIMEOUT) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
        return data.get("result", []) if data.get("ok") else []

    # ── dispatch ─────────────────────────────────────────────────
    def _handle_update(self, upd: dict) -> None:
        msg = upd.get("message") or upd.get("edited_message")
        if not msg:
            return
        chat_id = str((msg.get("chat") or {}).get("id", ""))
        text = (msg.get("text") or "").strip()

        if not text:
            return

        if not self.allowed_chat_id or chat_id != self.allowed_chat_id:
            self._reply(chat_id, "⛔ 권한 없음")
            return

        if text.startswith("/"):
            parts = text.split(maxsplit=1)
            cmd = parts[0].split("@", 1)[0].lower()
            args = parts[1].strip() if len(parts) > 1 else ""

            if cmd in ("/start", "/help"):
                self._reply(chat_id, self._help_text())
            elif cmd == "/ping":
                self._reply(chat_id, f"🏓 pong — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            elif cmd == "/status":
                self._reply(chat_id, self._status_text())
            elif cmd == "/cancel":
                self._cmd_cancel(chat_id)
            elif cmd == "/git":
                self._reply(chat_id, self._cmd_git(args))
            elif cmd == "/commit":
                self._reply(chat_id, self._cmd_commit(args))
            elif cmd == "/push":
                self._reply(chat_id, "⏳ push 중...")
                threading.Thread(
                    target=lambda: self._reply(chat_id, self._cmd_push()),
                    daemon=True, name="dev-push",
                ).start()
            elif cmd == "/task":
                if not args:
                    self._reply(chat_id, "⚠️ 사용법: /task <작업 내용>")
                else:
                    self._enqueue_task(chat_id, args)
            elif cmd == "/reset":
                self._chat_sessions.pop(chat_id, None)
                self._reply(chat_id, "🔄 대화 세션 초기화 완료 — 다음 메시지부터 새 대화로 시작합니다.")
            else:
                self._reply(chat_id, f"알 수 없는 명령: {_esc(cmd)}\n/help 참고")
        else:
            self._enqueue_task(chat_id, text)

    # ── 작업 큐 ──────────────────────────────────────────────────
    def _enqueue_task(self, chat_id: str, task: str) -> None:
        preview = task[:80] + ("..." if len(task) > 80 else "")
        with self._proc_lock:
            is_busy = self._current_proc is not None
        pending = self._task_queue.qsize() + (1 if is_busy else 0)

        if pending > 0:
            self._reply(chat_id, f"📥 대기 큐 추가 (앞에 {pending}개)\n📝 {_esc(preview)}")
        else:
            self._reply(chat_id, f"⏳ Claude Code 작업 시작...\n📝 {_esc(preview)}")

        self._task_queue.put((chat_id, task))

    def _worker(self) -> None:
        while not self._stop.is_set():
            try:
                chat_id, task = self._task_queue.get(timeout=1)
                self._run_task(chat_id, task)
                self._task_queue.task_done()
            except queue.Empty:
                continue
            except Exception as e:
                print(f"[dev-bot] worker 오류: {e}")

    # ── Claude Code 실행 ─────────────────────────────────────────
    def _run_task(self, chat_id: str, task: str) -> None:
        claude_bin = shutil.which("claude") or "claude"
        self._cancelled.clear()
        start = time.time()
        try:
            if chat_id not in self._chat_sessions:
                self._chat_sessions[chat_id] = str(uuid.uuid4())
            session_id = self._chat_sessions[chat_id]

            proc = subprocess.Popen(
                [claude_bin, "--dangerously-skip-permissions", "--session-id", session_id, "-p", task],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                errors="replace",
                cwd=_PROJECT_ROOT,
            )
            with self._proc_lock:
                self._current_proc = proc

            try:
                stdout, stderr = proc.communicate(timeout=_DEV_TIMEOUT)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.communicate()
                self._reply(chat_id, f"⏰ 타임아웃 ({_DEV_TIMEOUT}초 초과)")
                return

            if self._cancelled.is_set():
                return

            elapsed = time.time() - start
            output = stdout or ""
            if proc.returncode != 0 and stderr:
                output += f"\n\n[stderr]\n{stderr[:500]}"
            output = _strip_ansi(output).strip() or "(출력 없음)"
            self._send_chunked(chat_id, f"✅ 완료 ({elapsed:.1f}s)\n\n{output}")

        except FileNotFoundError:
            self._reply(chat_id, "⚠️ claude 명령을 찾을 수 없습니다.\nPATH에 claude가 있는지 확인하세요.")
        except Exception as e:
            self._reply(chat_id, f"⚠️ 오류: {_esc(str(e))[:300]}")
        finally:
            with self._proc_lock:
                self._current_proc = None

    # ── /cancel ──────────────────────────────────────────────────
    def _cmd_cancel(self, chat_id: str) -> None:
        killed = False
        with self._proc_lock:
            if self._current_proc:
                self._cancelled.set()
                self._current_proc.kill()
                killed = True

        drained = 0
        while True:
            try:
                self._task_queue.get_nowait()
                drained += 1
            except queue.Empty:
                break

        if killed or drained:
            parts = ["🛑 취소 완료"]
            if killed:
                parts.append("실행 중 작업 중단")
            if drained:
                parts.append(f"대기 {drained}개 제거")
            self._reply(chat_id, " | ".join(parts))
        else:
            self._reply(chat_id, "실행 중인 작업이 없습니다.")

    # ── /git ─────────────────────────────────────────────────────
    def _cmd_git(self, args: str) -> str:
        sub = args.strip().lower() or "status"
        try:
            if sub in ("status", "st", ""):
                r_st = subprocess.run(
                    ["git", "status", "--short"],
                    capture_output=True, text=True, timeout=10, cwd=_PROJECT_ROOT,
                )
                r_log = subprocess.run(
                    ["git", "log", "--oneline", "-5"],
                    capture_output=True, text=True, timeout=10, cwd=_PROJECT_ROOT,
                )
                status = r_st.stdout.strip() or "(변경 없음)"
                log = r_log.stdout.strip() or ""
                lines = ["📁 <b>git status</b>", f"<code>{_esc(status)}</code>"]
                if log:
                    lines += ["", "📜 <b>최근 커밋</b>", f"<code>{_esc(log)}</code>"]
                return "\n".join(lines)

            elif sub in ("log", "l"):
                r = subprocess.run(
                    ["git", "log", "--oneline", "-15"],
                    capture_output=True, text=True, timeout=10, cwd=_PROJECT_ROOT,
                )
                return f"📜 <b>git log</b>\n<code>{_esc(r.stdout.strip())}</code>"

            elif sub in ("diff", "d"):
                r = subprocess.run(
                    ["git", "diff", "--stat"],
                    capture_output=True, text=True, timeout=10, cwd=_PROJECT_ROOT,
                )
                out = r.stdout.strip() or "(변경 없음)"
                return f"📊 <b>git diff --stat</b>\n<code>{_esc(out)}</code>"

            else:
                return "⚠️ 사용법: /git [status|log|diff]"

        except Exception as e:
            return f"⚠️ git 오류: {_esc(str(e))[:200]}"

    # ── /commit ──────────────────────────────────────────────────
    def _cmd_commit(self, args: str) -> str:
        msg = args.strip()
        if not msg:
            return "⚠️ 사용법: /commit <커밋 메시지>"
        try:
            r_st = subprocess.run(
                ["git", "status", "--short"],
                capture_output=True, text=True, timeout=10, cwd=_PROJECT_ROOT,
            )
            if not r_st.stdout.strip():
                return "📭 커밋할 변경사항 없음"

            subprocess.run(
                ["git", "add", "-A"],
                capture_output=True, timeout=10, cwd=_PROJECT_ROOT, check=True,
            )
            r_cm = subprocess.run(
                ["git", "commit", "-m", msg],
                capture_output=True, text=True, timeout=15, cwd=_PROJECT_ROOT,
            )
            if r_cm.returncode != 0:
                err = (r_cm.stderr or r_cm.stdout or "").strip()
                return f"⚠️ 커밋 실패\n<code>{_esc(err[:500])}</code>"

            r_hash = subprocess.run(
                ["git", "log", "--oneline", "-1"],
                capture_output=True, text=True, timeout=5, cwd=_PROJECT_ROOT,
            )
            return (
                f"✅ <b>커밋 완료</b>\n"
                f"<code>{_esc(r_hash.stdout.strip())}</code>\n\n"
                f"변경 파일:\n<code>{_esc(r_st.stdout.strip()[:800])}</code>"
            )
        except subprocess.CalledProcessError as e:
            return f"⚠️ git add 실패: {_esc(str(e))[:200]}"
        except Exception as e:
            return f"⚠️ 오류: {_esc(str(e))[:200]}"

    # ── /push ────────────────────────────────────────────────────
    def _cmd_push(self) -> str:
        try:
            r = subprocess.run(
                ["git", "push"],
                capture_output=True, text=True, timeout=30, cwd=_PROJECT_ROOT,
            )
            out = (r.stdout + r.stderr).strip()
            if r.returncode == 0:
                return f"✅ push 완료\n<code>{_esc(out[:500])}</code>"
            return f"⚠️ push 실패\n<code>{_esc(out[:500])}</code>"
        except Exception as e:
            return f"⚠️ 오류: {_esc(str(e))[:200]}"

    # ── helpers ──────────────────────────────────────────────────
    def _help_text(self) -> str:
        return (
            "🤖 <b>5minuate_study 개발 봇</b>\n\n"
            "텍스트를 그냥 입력하면 Claude Code가 실행됩니다.\n"
            "여러 작업은 자동으로 큐에 쌓여 순서대로 처리됩니다.\n\n"
            "<b>작업</b>\n"
            "/task &lt;내용&gt; — Claude Code 작업 실행\n"
            "/cancel — 실행 중 작업 취소 + 대기 큐 비우기\n\n"
            "<b>Git</b>\n"
            "/git [status|log|diff] — git 정보\n"
            "/commit &lt;메시지&gt; — 전체 변경사항 스테이지 후 커밋\n"
            "/push — 원격 저장소에 push\n\n"
            "<b>봇 관리</b>\n"
            "/reset — 대화 세션 초기화 (문맥 리셋)\n"
            "/status — 봇 상태 / 환경 정보\n"
            "/ping — 헬스체크\n"
            "/help — 이 메시지\n\n"
            f"<b>프로젝트</b>: <code>{_esc(_PROJECT_ROOT)}</code>\n"
            f"<b>타임아웃</b>: {f'{_DEV_TIMEOUT}s' if _DEV_TIMEOUT else '무제한'}"
        )

    def _status_text(self) -> str:
        claude_bin = shutil.which("claude") or "(없음)"
        with self._proc_lock:
            is_busy = self._current_proc is not None
        pending = self._task_queue.qsize()

        lines = [
            "📊 <b>개발 봇 상태</b>",
            f"프로젝트: <code>{_esc(_PROJECT_ROOT)}</code>",
            f"claude: <code>{_esc(claude_bin)}</code>",
            f"타임아웃: {f'{_DEV_TIMEOUT}s' if _DEV_TIMEOUT else '무제한'}",
            f"작업: {'⚙️ 실행 중' if is_busy else '💤 대기'}",
        ]
        if pending:
            lines.append(f"큐 대기: {pending}개")

        try:
            r = subprocess.run(
                [claude_bin, "--version"],
                capture_output=True, text=True, timeout=5,
            )
            version = (r.stdout or r.stderr or "").strip().splitlines()[0]
            lines.append(f"버전: {_esc(version)}")
        except Exception:
            pass

        return "\n".join(lines)

    def _send_chunked(self, chat_id: str, text: str, chunk: int = 3800) -> None:
        for i in range(0, len(text), chunk):
            self._reply(chat_id, text[i:i + chunk])
            if i + chunk < len(text):
                time.sleep(0.3)

    def _reply(self, chat_id: str, text: str) -> None:
        url = f"{_API_BASE}/bot{self.token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text[:4000],
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url, data=data,
            headers={"Content-Type": "application/json; charset=utf-8"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                resp.read()
        except Exception as e:
            print(f"[dev-bot] 메시지 발송 실패: {e}")


if __name__ == "__main__":
    DevListener().start()
