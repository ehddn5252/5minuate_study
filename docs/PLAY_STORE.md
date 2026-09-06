# Google Play 스토어 등록 (TWA / Android 앱)

이 앱은 PWA다. Play 스토어에는 **TWA(Trusted Web Activity)** 로 감싸서 올린다.
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) 이 배포된 PWA
(`https://5minuatestudy.ehddn5252.workers.dev`) 를 감싼 Android 프로젝트를 만들고,
스토어에 올릴 `.aab` 와 기기 테스트용 `.apk` 를 뽑아준다.

> **웹 코드를 바꿔도 앱을 다시 제출할 필요 없다.** 앱은 배포된 사이트를 그대로 띄우는
> 껍데기라서, `npm run build && npx wrangler deploy` 만 하면 앱에도 반영된다.
> 앱을 다시 빌드/업로드해야 하는 경우는 아이콘·이름·패키지·최소 SDK 등 네이티브 설정이
> 바뀔 때뿐이다.

---

## 0. 준비물

| 항목 | 비고 |
|------|------|
| Node 18+ | 이미 설치됨 |
| JDK 17 | 없으면 `bubblewrap` 첫 실행 시 자동 다운로드 여부를 물어봄 (`~/.bubblewrap` 에 설치) |
| Android SDK | 위와 동일하게 자동 설치 가능 |
| Google Play Console 계정 | 최초 1회 **$25** 등록비 |
| `@bubblewrap/cli` | `npm install` 하면 devDependency 로 설치됨 |

---

## 1. 프로젝트에 이미 추가된 것

| 파일 | 역할 |
|------|------|
| `twa-manifest.json` | TWA 설정의 **단일 원본**. 패키지명·아이콘·색·바로가기·버전. 커밋 대상 |
| `cloudflare_worker.js` 의 `assetLinksResponse()` | `/.well-known/assetlinks.json` 을 서빙해 도메인 소유를 증명 |
| `wrangler.toml` 의 `run_worker_first` | 위 경로가 SPA 폴백보다 먼저 Worker 로 가도록 강제 |
| `package.json` 의 `android:*` 스크립트 | 아래 참고 |
| `.gitignore` | `android/`, `*.keystore`, `*.aab`, `*.apk` 제외 (**서명 키는 절대 커밋 금지**) |

```
npm run android:build       # twa-manifest 동기화 → 프로젝트 갱신 → AAB+APK 빌드 (버전 유지)
npm run android:release     # 위와 동일하되 버전 코드 자동 +1 (스토어 업데이트용)
npm run android:fingerprint # 로컬 서명 키의 SHA-256 지문 출력
npm run android:install     # 연결된 기기/에뮬레이터에 APK 설치
```

모든 스크립트는 `android/` 하위에서 bubblewrap 을 돌린다. 생성되는 gradle 프로젝트와
서명 키는 전부 `android/` 안에 있고 git 에서 제외된다.

---

## 2. 최초 1회 셋업

### 2-1. 패키지명 확정 (⚠️ 영구, 변경 불가)

`twa-manifest.json` 의 `packageId` 와 `cloudflare_worker.js` 의 `ANDROID_PACKAGE_NAME`
이 **정확히 같아야** 한다. 현재 기본값:

```
com.ehddn5252.study5min
```

스토어 등록 후에는 절대 못 바꾼다. 다른 이름을 원하면 지금 두 파일에서 함께 바꾼다.

### 2-2. Android 프로젝트 생성 + 서명 키 만들기

```bash
npm install
mkdir -p android
cp twa-manifest.json android/
cd android
npx @bubblewrap/cli init --manifest ./twa-manifest.json
```

- JDK/Android SDK 자동 설치 여부를 물으면 `Yes`.
- 대부분 값은 `twa-manifest.json` 에서 채워지므로 엔터로 넘긴다.
- **Signing key** 단계에서 새 키를 만든다:
  - 경로: `./signing.keystore` (twa-manifest 의 `signingKey.path` 와 일치)
  - alias: `study5min`
  - **키스토어 비밀번호와 키 비밀번호를 안전한 곳에 기록**한다.

> 🔐 **`android/signing.keystore` 와 두 비밀번호를 반드시 백업**한다 (비밀번호 관리자 등).
> 분실하면 같은 앱의 업데이트를 영원히 올릴 수 없다. git 에는 올리지 않는다.

### 2-3. 로컬 서명 키 지문을 Worker 에 등록

```bash
cd android
npx @bubblewrap/cli fingerprint list
```

출력된 `SHA-256` 값을 `cloudflare_worker.js` 의 `ANDROID_SHA256_FINGERPRINTS` 배열에 추가:

```js
const ANDROID_SHA256_FINGERPRINTS = [
  'AB:CD:EF:...:12',  // ← fingerprint list 결과
];
```

배포:

```bash
npm run build && npx wrangler deploy
```

확인:

```bash
curl https://5minuatestudy.ehddn5252.workers.dev/.well-known/assetlinks.json
```

`package_name` 과 지문이 보이면 OK.

### 2-4. AAB / APK 빌드

```bash
npm run android:build
```

산출물 (`android/` 안):

| 파일 | 용도 |
|------|------|
| `app-release-bundle.aab` | **Play Console 업로드용** (신규 앱은 AAB 필수) |
| `app-release-signed.apk` | 로컬 기기 테스트용 (스토어엔 안 씀) |

기기에서 먼저 확인:

```bash
npm run android:install     # 또는 apk 파일을 폰에 옮겨 설치
```

주소창 없이 전체화면으로 뜨면 asset links 검증 성공. 상단에 URL 바가 보이면
2-3 의 지문/배포를 다시 확인한다 (반영에 몇 분 걸릴 수 있음).

---

## 3. Play Console 등록

1. [Play Console](https://play.google.com/console) → **앱 만들기**.
2. **앱 서명(Play App Signing)** 은 기본값(사용)으로 둔다.
3. 비공개 테스트(내부 테스트) 트랙 생성 → `app-release-bundle.aab` 업로드.
4. 업로드 후 **앱 무결성 → 앱 서명** 에서 **"앱 서명 키 인증서"의 SHA-256** 을 복사한다.
   (Play 가 재서명하므로 로컬 키와 지문이 다르다.)
5. 이 지문을 `cloudflare_worker.js` 의 `ANDROID_SHA256_FINGERPRINTS` 에 **추가**
   (로컬 지문과 둘 다 유지) 후 `npm run build && npx wrangler deploy`.
6. 스토어 등록정보(설명, 스크린샷, 개인정보처리방침 URL 등) 작성.
   - 스크린샷은 `public/screenshots/` 것을 재활용하거나 실기기 캡처.
7. 심사 제출.

> 4-5 를 건너뛰면 스토어에서 받은 앱이 URL 바가 보이는 상태로 열린다. 반드시 Play
> 서명 지문까지 넣어야 한다.

---

## 4. 앱 업데이트 (네이티브 설정 변경 시에만)

웹 콘텐츠 변경은 재배포로 끝. 아이콘/이름/권한 등 네이티브 변경이 있을 때만:

1. `twa-manifest.json` 에서 값 수정. `appVersionCode` 는 `android:release` 가 자동 +1.
2. `npm run android:release`
3. 새 `app-release-bundle.aab` 를 Play Console 에 업로드.

---

## 5. 대안 — Capacitor

네이티브 플러그인(정밀한 푸시, 인앱결제, 파일 접근 등)이 필요해지면 Capacitor 로
전환할 수 있다. 단일 코드베이스는 유지되지만 웹 변경마다 앱 자산 동기화가 필요하고
빌드가 무거워진다. 현재 요구사항(단순 래핑 + 자동 반영)에는 TWA 가 맞다.

---

## 6. 자주 겪는 문제

| 증상 | 원인 / 해결 |
|------|-------------|
| 앱에 URL 주소창이 보임 | asset links 지문 불일치. 로컬 + Play 서명 지문 둘 다 Worker 에 넣고 재배포. `curl .../.well-known/assetlinks.json` 확인 |
| `bubblewrap` 빌드 시 JDK/SDK 오류 | `cd android && npx @bubblewrap/cli doctor` 로 점검, 경로 재설정 |
| Play 업로드 시 "APK 는 안 됨" | AAB(`.aab`) 를 올려야 함. `.apk` 는 로컬 테스트 전용 |
| 서명 키 분실 | 복구 불가. 백업 필수. (Play 앱 서명 사용 시 업로드 키는 Console 에서 재설정 가능) |
| manifest 스키마 경고 | `cd android && npx @bubblewrap/cli init --manifest ./twa-manifest.json` 로 재생성 후 값 확인 |
