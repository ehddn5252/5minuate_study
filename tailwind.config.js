/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // 2026-09-27 "등산로" 리브랜딩: 표지판/포스터 느낌의 압축 서체. 한글 글리프가 없어
        // 한글 텍스트는 기존 시스템 폰트로 자연스럽게 대체된다 — 영문/숫자(D-7, Lv.3 등)에서만
        // 실제로 눈에 띈다.
        display: ['"Big Shoulders Display"', 'sans-serif'],
      },
      keyframes: {
        'feedback-pop': {
          '0%': { transform: 'scale(0.92)', opacity: '0' },
          '60%': { transform: 'scale(1.03)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'feedback-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(5px)' },
          '60%': { transform: 'translateX(-3px)' },
          '80%': { transform: 'translateX(2px)' },
        },
        'count-up-pop': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'page-enter': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'feedback-pop': 'feedback-pop 0.35s ease-out',
        'feedback-shake': 'feedback-shake 0.4s ease-in-out',
        'count-up-pop': 'count-up-pop 0.3s ease-out',
        'page-enter': 'page-enter 0.22s ease-out',
      },
    },
  },
  plugins: [],
}
