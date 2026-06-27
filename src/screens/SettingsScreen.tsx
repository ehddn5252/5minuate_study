import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { appState, updateAppState } = useAppStore();
  const [apiKey, setApiKey] = useState(appState.geminiApiKey);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateAppState({ geminiApiKey: apiKey.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">설정</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-1">Gemini API 키</h2>
          <p className="text-gray-500 text-sm mb-4">
            Google AI Studio에서 무료로 발급받을 수 있습니다.
            <br />
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 underline"
            >
              API 키 발급하기 →
            </a>
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base mb-3"
          />
          <button
            onClick={handleSave}
            disabled={!apiKey.trim()}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold min-h-[44px] disabled:opacity-40"
          >
            {saved ? '저장됨!' : '저장'}
          </button>
        </div>

        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
          <p className="text-amber-700 text-sm">
            API 키는 이 기기의 localStorage에만 저장되며 서버로 전송되지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
