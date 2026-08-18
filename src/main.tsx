import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { getAppState } from './utils/storage'

// 렌더 전에 저장된 스킨(포인트 컬러 + 배경)을 먼저 적용 — App.tsx의 useEffect를 기다리면
// 기본값으로 잠깐 그려졌다가 바뀌는 깜빡임(FOUC)이 생긴다.
const savedAppState = getAppState()
document.documentElement.dataset.theme = savedAppState.accentTheme
document.documentElement.dataset.bg = savedAppState.bgTheme
document.documentElement.dataset.bgPattern = savedAppState.bgPattern

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
