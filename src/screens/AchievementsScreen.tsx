import { useNavigate } from 'react-router-dom';
import { BADGE_DEFS, getBadges } from '../utils/badges';
import BottomNav from '../components/BottomNav';

export default function AchievementsScreen() {
  const navigate = useNavigate();
  const unlocked = getBadges();
  const unlockedIds = new Set(unlocked.map((b) => b.id));

  const unlockedCount = unlocked.length;
  const total = BADGE_DEFS.length;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">업적</h1>
            <p className="text-xs text-gray-400 mt-0.5">{unlockedCount}/{total} 획득</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🏅</span>
            <div className="flex-1">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>달성률</span>
                <span>{Math.round((unlockedCount / total) * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${(unlockedCount / total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {BADGE_DEFS.map((def) => {
            const earned = unlockedIds.has(def.id);
            const badge = unlocked.find((b) => b.id === def.id);
            return (
              <div
                key={def.id}
                className={`bg-white rounded-2xl shadow-sm border p-4 flex items-center gap-4 transition-all ${
                  earned ? 'border-indigo-100' : 'border-gray-100 opacity-50'
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 ${
                    earned ? 'bg-indigo-50' : 'bg-gray-100'
                  }`}
                >
                  {earned ? def.icon : '🔒'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${earned ? 'text-gray-900' : 'text-gray-400'}`}>
                    {def.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{def.desc}</p>
                  {earned && badge && (
                    <p className="text-xs text-indigo-400 mt-1">
                      {new Date(badge.unlockedAt).toLocaleDateString('ko-KR', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })} 획득
                    </p>
                  )}
                </div>
                {earned && (
                  <span className="text-indigo-500 text-lg flex-shrink-0">✓</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
