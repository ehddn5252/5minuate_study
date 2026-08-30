import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { countPendingFriendRequests } from '../services/social';

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
  // 교사 계정은 목표/업적 개념이 없어 홈/설정 2개 탭만 노출한다
  variant?: 'student' | 'teacher';
}

export default function BottomNav({ variant = 'student' }: BottomNavProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [friendRequestCount, setFriendRequestCount] = useState(0);

  useEffect(() => {
    const refreshBadge = async () => {
      const count = await countPendingFriendRequests();
      setFriendRequestCount(count);
    };

    refreshBadge();
    const handleRefresh = () => refreshBadge();
    window.addEventListener('friendRequestsChanged', handleRefresh);
    return () => window.removeEventListener('friendRequestsChanged', handleRefresh);
  }, []);

  const tabs: Tab[] =
    variant === 'teacher'
      ? [
          { path: '/', label: '홈', icon: HOME_ICON },
          {
            path: '/friends',
            label: '친구',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 19v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1M12 11a3 3 0 100-6 3 3 0 000 6zm8 8v-1a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            ),
          },
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
          {
            path: '/friends',
            label: '친구',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 19v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1M12 11a3 3 0 100-6 3 3 0 000 6zm8 8v-1a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            ),
          },
          {
            path: '/achievements',
            label: '업적',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
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
        const isFriendTab = tab.path === '/friends';
        const badgeVisible = isFriendTab && friendRequestCount > 0;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            aria-current={active ? 'page' : undefined}
            className={`relative flex flex-col items-center justify-center flex-1 min-h-[44px] gap-0.5 transition-colors ${
              active ? 'text-[var(--accent-600)]' : 'text-gray-500 hover:text-gray-600'
            }`}
          >
            {badgeVisible && (
              <span className="absolute -top-1 right-3 inline-flex min-w-4 h-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                {friendRequestCount > 9 ? '9+' : friendRequestCount}
              </span>
            )}
            {tab.icon}
            <span className={`text-xs font-medium ${active ? 'text-[var(--accent-600)]' : 'text-gray-500'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
