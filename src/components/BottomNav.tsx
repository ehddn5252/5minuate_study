import { useNavigate, useLocation } from 'react-router-dom';

interface Tab {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const HOME_ICON = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7m-9 2v8m4-8v8m-4 0h4"
    />
  </svg>
);

const SETTINGS_ICON = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

interface BottomNavProps {
  // 교사 계정은 목표 개념이 없어 홈/설정 2개 탭만 노출한다
  variant?: 'student' | 'teacher';
}

export default function BottomNav({ variant = 'student' }: BottomNavProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const tabs: Tab[] =
    variant === 'teacher'
      ? [
          { path: '/', label: '홈', icon: HOME_ICON },
          { path: '/settings', label: '설정', icon: SETTINGS_ICON },
        ]
      : [
          { path: '/', label: '홈', icon: HOME_ICON },
          {
            path: '/goals',
            label: '목표',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
            ),
          },
          { path: '/settings', label: '설정', icon: SETTINGS_ICON },
        ];

  const isActive = (tabPath: string) => {
    if (tabPath === '/') return pathname === '/';
    return pathname.startsWith(tabPath);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around z-50">
      {tabs.map((tab) => {
        const active = isActive(tab.path);
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center justify-center flex-1 min-h-[44px] gap-0.5 transition-colors ${
              active ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.icon}
            <span className={`text-xs font-medium ${active ? 'text-indigo-600' : 'text-gray-400'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
