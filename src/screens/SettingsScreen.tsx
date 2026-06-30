import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { requestPermission, scheduleLocalReminder, cancelReminder } from '../services/notification';
import BottomNav from '../components/BottomNav';

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { appState, updateAppState } = useAppStore();
  const [apiKey, setApiKey] = useState(appState.geminiApiKey);
  const [saved, setSaved] = useState(false);
  const [notifTime, setNotifTime] = useState(appState.notificationTime || '20:00');
  const [notifGranted, setNotifGranted] = useState(appState.notificationGranted);

  const handleSave = () => {
    updateAppState({ geminiApiKey: apiKey.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleNotifToggle = async () => {
    if (notifGranted) {
      cancelReminder();
      updateAppState({ notificationGranted: false });
      setNotifGranted(false);
    } else {
      const granted = await requestPermission();
      if (granted) {
        scheduleLocalReminder(notifTime);
        updateAppState({ notificationGranted: true, notificationTime: notifTime });
        setNotifGranted(true);
      } else {
        alert('알림 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.');
      }
    }
  };

  const handleNotifTimeSave = () => {
    updateAppState({ notificationTime: notifTime });
    if (notifGranted) {
      scheduleLocalReminder(notifTime);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
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

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">학습 알림</h2>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-700">알림 허용</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {notifGranted ? '알림이 활성화되어 있습니다' : '알림이 비활성화되어 있습니다'}
              </p>
            </div>
            <button
              onClick={handleNotifToggle}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
                notifGranted ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  notifGranted ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {notifGranted && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">알림 시각</label>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={notifTime}
                  onChange={(e) => setNotifTime(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                />
                <button
                  onClick={handleNotifTimeSave}
                  className="px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium min-h-[44px]"
                >
                  적용
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">학습 데이터</h2>
          <button
            onClick={() => navigate('/wrong-pool')}
            className="w-full flex items-center justify-between py-2 text-sm text-gray-700 hover:text-indigo-600 transition-colors"
          >
            <span>오답 목록 보기</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
          <p className="text-amber-700 text-sm">
            API 키는 이 기기의 localStorage에만 저장되며 서버로 전송되지 않습니다.
          </p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
