/* ============================================================
   Navbar — Navigasi publik (header utama website)
   
   Tampil di halaman publik (beranda, profil, berita, kejuruan).
   Responsive: hamburger menu di mobile.
   ============================================================ */

import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { SCHOOL_INFO, PUBLIC_NAV_ITEMS } from '../../config/constants';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';
import SmkLogoEmblem from '../shared/SmkLogoEmblem';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const getPortalDestination = () => {
    if (!isAuthenticated) return '/login';
    if (user?.role === 'admin') return '/dashboard/ringkasan';
    return '/app/home';
  };

  const getPortalLabel = () => {
    if (!isAuthenticated) return '🔑 Login SIA';
    if (user?.role === 'admin') return '⚙️ Dashboard';
    return '📱 Portal Guru';
  };

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 'var(--z-navbar)',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--color-border-light)',
      height: 'var(--navbar-height)',
    }}>
      <div style={{
        maxWidth: 'var(--max-content-width)',
        margin: '0 auto',
        padding: '0 var(--space-6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '100%',
      }}>
        {/* Logo & School Name */}
        <Link to="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          textDecoration: 'none',
          color: 'var(--color-text)',
        }}>
          <SmkLogoEmblem size="sm" />
          <div>
            <div style={{
              fontWeight: 'var(--font-weight-bold)',
              fontSize: 'var(--font-size-base)',
              lineHeight: 1.2,
            }}>
              {SCHOOL_INFO.shortName}
            </div>
            <div style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-muted)',
              lineHeight: 1.2,
            }}>
              Sistem Informasi Akademik
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
        }}
          className="desktop-nav"
        >
          {PUBLIC_NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-desktop-link ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}

          <div style={{ width: '1px', height: '24px', background: 'var(--color-border)', margin: '0 var(--space-3)' }} />

          {/* Bubble Login SIA — Selalu Berwarna Biru & Menonjol */}
          <button
            type="button"
            onClick={() => navigate(getPortalDestination())}
            className="nav-login-bubble"
          >
            {getPortalLabel()}
          </button>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: 'none',
            flexDirection: 'column',
            gap: '5px',
            padding: 'var(--space-2)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label="Toggle menu"
        >
          <span style={{
            width: '22px', height: '2px',
            background: 'var(--color-text)',
            borderRadius: '2px',
            transition: 'all var(--transition-fast)',
            transform: mobileMenuOpen ? 'rotate(45deg) translateY(7px)' : 'none',
          }} />
          <span style={{
            width: '22px', height: '2px',
            background: 'var(--color-text)',
            borderRadius: '2px',
            transition: 'all var(--transition-fast)',
            opacity: mobileMenuOpen ? 0 : 1,
          }} />
          <span style={{
            width: '22px', height: '2px',
            background: 'var(--color-text)',
            borderRadius: '2px',
            transition: 'all var(--transition-fast)',
            transform: mobileMenuOpen ? 'rotate(-45deg) translateY(-7px)' : 'none',
          }} />
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu"
          style={{
            position: 'absolute',
            top: 'var(--navbar-height)',
            left: 0,
            right: 0,
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)',
            padding: 'var(--space-4) var(--space-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            animation: 'fadeInDown 200ms ease',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {PUBLIC_NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => `nav-mobile-link ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              navigate(getPortalDestination());
            }}
            className="nav-login-bubble"
            style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-2)' }}
          >
            {getPortalLabel()}
          </button>
        </div>
      )}

      {/* Responsive CSS for hamburger */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}
