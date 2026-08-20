/* BottomNav — Mobile bottom navigation untuk dashboard */

import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function BottomNav() {
  const { hasRole } = useAuth();

  const items = [
    { label: 'Dashboard', path: '/dashboard/ringkasan', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" />
      </svg>
    ), roles: ['admin', 'guru', 'staff', 'wali_murid'] },
    { label: 'Siswa', path: '/dashboard/siswa', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
      </svg>
    ), roles: ['admin', 'guru', 'staff'] },
    { label: 'Absensi', path: '/dashboard/absensi', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="2" width="12" height="4" rx="1" /><path d="M6 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1" /><polyline points="9 14 11 16 15 12" />
      </svg>
    ), roles: ['admin', 'guru'] },
    { label: 'Jadwal', path: '/dashboard/jadwal', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="13" y2="10" /><circle cx="17" cy="17" r="5" /><polyline points="17 14.5 17 17 18.5 18.5" />
      </svg>
    ), roles: ['admin', 'guru'] },
    { label: 'Absen GPS', path: '/dashboard/absen-guru', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
      </svg>
    ), roles: ['guru', 'staff'] },
  ].filter(item => hasRole(item.roles));

  const displayItems = items.slice(0, 5);

  return (
    <>
      <nav className="bottom-nav" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'var(--bottom-nav-height)',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--color-border-light)',
        display: 'none',
        zIndex: 'var(--z-navbar)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          height: '100%',
          maxWidth: '500px',
          margin: '0 auto',
        }}>
          {displayItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard/ringkasan'}
              style={({ isActive }) => ({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                padding: 'var(--space-1) var(--space-2)',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                transition: 'color var(--transition-fast)',
              })}
            >
              <span style={{ display: 'flex' }}>{item.icon}</span>
              <span style={{ fontSize: '10px', fontWeight: 'var(--font-weight-medium)' }}>
                {item.label}
              </span>
            </NavLink>
          ))}
        </div>
      </nav>

      <style>{`
        @media (max-width: 1024px) {
          .bottom-nav { display: block !important; }
        }
      `}</style>
    </>
  );
}
