/* ============================================================
   MobileBottomNav.jsx — Bottom Navigation Bar Mobile
   Touch targets >= 44x44px, compact height, clear active state.
   ============================================================ */

import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  {
    key: 'home',
    label: 'Beranda',
    path: '/app/home',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? '#2563EB' : 'none'}
        stroke={active ? '#2563EB' : '#64748B'} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    key: 'absen',
    label: 'Absen',
    path: '/app/absen-gps',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? '#2563EB' : 'none'}
        stroke={active ? '#2563EB' : '#64748B'} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    key: 'jadwal',
    label: 'Jadwal',
    path: '/app/jadwal',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? '#2563EB' : 'none'}
        stroke={active ? '#2563EB' : '#64748B'} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    key: 'profil',
    label: 'Profil',
    path: '/app/profil',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? '#2563EB' : 'none'}
        stroke={active ? '#2563EB' : '#64748B'} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      aria-label="Navigasi utama mobile"
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        zIndex: 100,
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid #E2E8F0',
        padding: '4px 8px max(6px, env(safe-area-inset-bottom))',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
      }}
    >
      {NAV_ITEMS.map(item => {
        const isActive = location.pathname === item.path ||
          (item.path !== '/app/home' && location.pathname.startsWith(item.path));

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => navigate(item.path)}
            aria-current={isActive ? 'page' : undefined}
            style={{
              minWidth: '64px',
              minHeight: '48px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              background: isActive ? '#EFF6FF' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 10px',
              borderRadius: '12px',
              transition: 'background 150ms ease, color 150ms ease',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {item.icon(isActive)}
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#2563EB' : '#64748B',
              lineHeight: 1.1,
            }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
