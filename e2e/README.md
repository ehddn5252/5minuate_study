# E2E 사용자 여정 하베스트

배포된 앱을 실제 브라우저(Chromium, iPhone 13 에뮬레이션)로 훑으며 단계별 스크린샷과
콘솔/네트워크 에러를 모아 리포트로 남긴다. "사용자 입장에서 테스트 → 문제 발견 → 수정"
루프의 관찰 단계.

```bash
node e2e/harvest.mjs                                  # 배포 사이트
BASE_URL=http://localhost:5173 node e2e/harvest.mjs   # 로컬 dev 서버
HEADED=1 node e2e/harvest.mjs                         # 브라우저 창 띄우기
```

결과: `e2e/out/<타임스탬프>/` — `report.md`, `events.json`, `screenshots/*.png` (git 제외).

## 여정 (15단계)

로그인 화면 → 테스트 계정 로그인 → 홈 → 목표 만들기(폼 + AI 생성 제출) →
목표목록 / 캘린더 / 오답노트 / 복습믹스 / 내문제집 / 친구 / 업적 / 언어허브 /
설정 / 쇼츠 미리보기.

## 판정

각 단계 후 새로 발생한 `pageerror` · `console.error` · HTTP 4xx/5xx · `auth` 실패 ·
`requestfailed`(ERR_ABORTED 제외 — 테스트의 하드 네비게이션 아티팩트)를 세어
`⚠️`/`❌` 로 표시한다. `auth.200`·`diag` 는 진단용 기록일 뿐 실패가 아니다.

## 알려진 후속 과제

- `BottomNav` 가 화면마다 언마운트/리마운트되며 `friendships`/`study_shares` 배지
  카운트를 매번 재요청한다(화면 전환마다 HEAD 2건). 기능 문제는 아니나 낭비.
- 홈 헤더의 아이콘 5개 중 목표/친구는 하단 탭과 중복 — UX 정리 여지.
