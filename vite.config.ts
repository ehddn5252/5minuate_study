import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: '5분 학습',
        short_name: '5분학습',
        description: '하루 5분, 목표를 향한 꾸준한 학습',
        theme_color: '#6366f1',
        background_color: '#6366f1',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        id: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        // F-64: 설치 배너에 스크린샷을 추가하면 Chrome이 일반 설치 프롬프트 대신 앱 화면을
        // 보여주는 "richer install UI"(바텀시트)를 띄운다 — 로그인 없이도 볼 수 있는 실제 화면
        // (미리보기 콘텐츠, /shorts/:id)을 그대로 캡처했다. 가짜 데이터를 지어내지 않기 위해
        // 로그인 후에만 보이는 화면은 쓰지 않았다.
        screenshots: [
          {
            src: '/screenshots/shorts-narrow.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: '로그인 없이 바로 체험하는 학습 콘텐츠 미리보기'
          },
          {
            src: '/screenshots/shorts-wide.png',
            sizes: '1280x800',
            type: 'image/png',
            form_factor: 'wide',
            label: '로그인 없이 바로 체험하는 학습 콘텐츠 미리보기'
          }
        ],
        // F-52: 앱 아이콘 길게 누르기(Android/데스크톱)로 홈 화면을 거치지 않고 바로
        // 복습/오답노트로 진입할 수 있게 하는 바로가기. start_url이 이미 "오늘의 학습"이라
        // 새 진입점을 만들기보다, start_url로는 안 가는 두 개(복습 섞어서/오답노트)만 추가한다.
        shortcuts: [
          {
            name: '복습 섞어서 풀기',
            short_name: '복습',
            url: '/mix-review',
            description: '여러 목표의 복습 문제를 한 번에 섞어서 풀기'
          },
          {
            name: '오답노트',
            short_name: '오답노트',
            url: '/wrong-pool',
            description: '틀렸던 문제 다시 풀기'
          }
        ],
        // F-76: 다른 앱(브라우저, 뉴스 앱 등)에서 "공유" 메뉴로 이 앱을 골라 텍스트/링크를
        // 바로 넘길 수 있게 한다. 공유된 제목은 목표 주제로, 본문/링크는 참고 자료로 이어진다.
        // GET 방식이라 서버 없이 클라이언트 라우팅(App.tsx)만으로 처리 가능 — 무료 티어 제약 안에 있음.
        share_target: {
          action: '/goals/create',
          method: 'GET',
          params: {
            title: 'topic',
            text: 'content',
            url: 'content'
          }
        }
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // F-64: 설치 UI 스크린샷은 앱 자체 렌더링에는 안 쓰이고 OS 설치 다이얼로그만 필요로 하니,
        // 오프라인 프리캐시(용량)에 넣지 않는다 — 실제 앱 사용 경험과는 무관한 파일이라서.
        globIgnores: ['screenshots/**'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/generativelanguage\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          }
        ]
      }
    })
  ],
})
