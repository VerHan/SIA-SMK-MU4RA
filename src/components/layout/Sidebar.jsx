/* ============================================================
   Sidebar — Navigasi dashboard (setelah login)
   
   Menampilkan menu berdasarkan role pengguna.
   Grouped menu dengan SVG icons.
   Collapsible di desktop, overlay di mobile.
   ============================================================ */

import { NavLink, useNavigate } from 'react-router-dom';
import { SCHOOL_INFO, DASHBOARD_NAV_ITEMS } from '../../config/constants';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../config/constants';
import { getInitials } from '../../utils/helpers';

/* SVG Icon Components — Clean, Monoline */
const icons = {
  'layout-dashboard': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" />
    </svg>
  ),
  'calendar-range': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="14" x2="16" y2="14" /><line x1="8" y1="18" x2="12" y2="18" />
    </svg>
  ),
  'book-open': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  'user-graduate': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
    </svg>
  ),
  'user-tie': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" /><path d="M5.5 21a8.38 8.38 0 0 1 13 0" /><polyline points="12 14 10 17 12 21 14 17 12 14" />
    </svg>
  ),
  'school': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-4h6v4" /><circle cx="12" cy="11" r="1.5" />
    </svg>
  ),
  'calendar-clock': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="13" y2="10" /><circle cx="17" cy="17" r="5" /><polyline points="17 14.5 17 17 18.5 18.5" />
    </svg>
  ),
  'clipboard-check': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="2" width="12" height="4" rx="1" /><path d="M6 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1" /><polyline points="9 14 11 16 15 12" />
    </svg>
  ),
  'clipboard-list': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="2" width="12" height="4" rx="1" /><path d="M6 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="16" x2="13" y2="16" />
    </svg>
  ),
  'chart-bar': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="3" y1="21" x2="21" y2="21" />
    </svg>
  ),
  'star': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  'map-pin': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  'settings': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  'logout': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

function SvgIcon({ name }) {
  return icons[name] || icons['layout-dashboard'];
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  /* Filter menu berdasarkan role user */
  const visibleMenuItems = DASHBOARD_NAV_ITEMS.filter(item =>
    hasRole(item.roles)
  );

  /* Group menu items */
  const groupedItems = {};
  visibleMenuItems.forEach(item => {
    const group = item.group || 'Lainnya';
    if (!groupedItems[group]) groupedItems[group] = [];
    groupedItems[group].push(item);
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: 'var(--sidebar-width)',
    background: 'linear-gradient(180deg, #0F1729 0%, #162032 50%, #1A2540 100%)',
    color: 'var(--color-white)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 'var(--z-sidebar)',
    transition: 'transform var(--transition-normal)',
    overflowY: 'auto',
  };

  const linkBaseStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: '10px var(--space-4)',
    borderRadius: 'var(--radius-md)',
    color: 'rgba(255, 255, 255, 0.6)',
    textDecoration: 'none',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    transition: 'all var(--transition-fast)',
    margin: '1px var(--space-3)',
  };

  const activeLinkStyle = {
    ...linkBaseStyle,
    background: 'rgba(59, 130, 246, 0.2)',
    color: '#93C5FD',
    fontWeight: 'var(--font-weight-semibold)',
    borderLeft: '3px solid #3B82F6',
    padding: '10px var(--space-4) 10px calc(var(--space-4) - 3px)',
  };

  return (
    <>
      {/* Overlay (mobile) */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 'calc(var(--z-sidebar) - 1)',
            animation: 'fadeIn 200ms ease',
          }}
          className="sidebar-overlay"
        />
      )}

      <aside style={sidebarStyle} className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* School Logo Section */}
        <div style={{
          padding: 'var(--space-5) var(--space-5)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #2563EB, #60A5FA)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'var(--font-weight-extrabold)',
              fontSize: '11px',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
            }}>
              SIA
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontWeight: 'var(--font-weight-bold)',
                fontSize: 'var(--font-size-sm)',
                lineHeight: 1.2,
                color: '#E2E8F0',
              }}>
                {SCHOOL_INFO.shortName}
              </div>
              <div style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.35)',
                lineHeight: 1.2,
              }}>
                Sistem Informasi Akademik
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links — Grouped */}
        <nav style={{
          flex: 1,
          padding: 'var(--space-3) 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>
          {Object.entries(groupedItems).map(([group, items]) => (
            <div key={group} style={{ marginBottom: 'var(--space-1)' }}>
              {/* Group Header */}
              <div style={{
                fontSize: '10px',
                color: 'rgba(255,255,255,0.3)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                padding: 'var(--space-2) var(--space-6) var(--space-1)',
                fontWeight: 'var(--font-weight-semibold)',
                marginTop: 'var(--space-2)',
              }}>
                {group}
              </div>

              {/* Menu Items in Group */}
              {items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/dashboard/ringkasan'}
                  onClick={onClose}
                  style={({ isActive }) => isActive ? activeLinkStyle : linkBaseStyle}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.style.borderLeft || e.currentTarget.style.borderLeft === '') {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.style.borderLeft || e.currentTarget.style.borderLeft === '') {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                    }
                  }}
                >
                  <span style={{ display: 'flex', opacity: 0.85, flexShrink: 0 }}>
                    <SvgIcon name={item.icon} />
                  </span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User Profile Section (bottom) */}
        <div style={{
          padding: 'var(--space-4) var(--space-5)',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-3)',
          }}>
            {/* Avatar */}
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'var(--font-weight-bold)',
              fontSize: '11px',
              flexShrink: 0,
            }}>
              {getInitials(user?.name)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontWeight: 'var(--font-weight-semibold)',
                fontSize: 'var(--font-size-sm)',
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: '#E2E8F0',
              }}>
                {user?.name}
              </div>
              <div style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.4)',
                lineHeight: 1.2,
              }}>
                {ROLE_LABELS[user?.role] || user?.role}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
              e.currentTarget.style.color = '#FCA5A5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
            }}
          >
            <SvgIcon name="logout" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Responsive styles */}
      <style>{`
        .sidebar {
          transform: translateX(0);
        }
        @media (max-width: 1024px) {
          .sidebar {
            transform: translateX(-100%);
          }
          .sidebar.sidebar-open {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
