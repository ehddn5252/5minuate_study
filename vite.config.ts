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
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
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
