/* ============================================================
   MobileBottomNav.jsx — Bottom Navigation Bar Mobile
   ============================================================ */

import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  {
    key: 'home',
    label: 'Beranda',
    path: '/app/home',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#2563EB' : 'none'}
        stroke={active ? '#2563EB' : '#94A3B8'} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    key: 'absen',
    label: 'Absen',
    path: '/app/absen-gps',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#2563EB' : 'none'}
        stroke={active ? '#2563EB' : '#94A3B8'} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    ),
  },
  {
    key: 'jadwal',
    label: 'Jadwal',
    path: '/app/jadwal',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#2563EB' : 'none'}
        stroke={active ? '#2563EB' : '#94A3B8'} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    key: 'profil',
    label: 'Profil',
    path: '/app/profil',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#2563EB' : 'none'}
        stroke={active ? '#2563EB' : '#94A3B8'} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '480px',
      zIndex: 100,
      background: 'rgba(255, 255, 255, 0.92)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderTop: '1px solid rgba(0,0,0,0.06)',
      padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
    }}>
      {NAV_ITEMS.map(item => {
        const isActive = location.pathname === item.path ||
          (item.path !== '/app/home' && location.pathname.startsWith(item.path));

        return (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 16px',
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              position: 'relative',
            }}
          >
            {/* Active indicator pip */}
            {isActive && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '24px',
                height: '3px',
                borderRadius: '0 0 3px 3px',
                background: 'linear-gradient(90deg, #7C3AED, #3B82F6)',
              }} />
            )}

            {/* Icon with glow when active */}
            <span style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '42px',
              height: '32px',
              borderRadius: '10px',
              background: isActive
                ? 'rgba(37,99,235,0.1)'
                : 'transparent',
              boxShadow: 'none',
              transition: 'all 0.2s ease',
            }}>
              {item.icon(isActive)}
            </span>

            {/* Label */}
            <span style={{
              fontSize: '10px',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#2563EB' : '#64748B',
              letterSpacing: '0.2px',
              transition: 'all 0.2s ease',
            }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
