import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { getAppState } from './utils/storage'

// 렌더 전에 저장된 스킨(포인트 컬러)을 먼저 적용 — App.tsx의 useEffect를 기다리면
// 기본 indigo로 잠깐 그려졌다가 바뀌는 깜빡임(FOUC)이 생긴다.
document.documentElement.dataset.theme = getAppState().accentTheme

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
