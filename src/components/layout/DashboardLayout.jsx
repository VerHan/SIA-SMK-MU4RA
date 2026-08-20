/* DashboardLayout — Wrapper untuk halaman dashboard (Sidebar + content + BottomNav) */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../config/constants';
import { getInitials } from '../../utils/helpers';
import TeacherPopups from '../TeacherPopups';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="dashboard-content" style={{
        flex: 1,
        marginLeft: 'var(--sidebar-width)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>
        {/* Top Bar */}
        <header style={{
          height: 'var(--navbar-height)',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 var(--space-6)',
          position: 'sticky',
          top: 0,
          zIndex: 'var(--z-sticky)',
        }}>
          {/* Mobile hamburger */}
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(true)}
            style={{
              display: 'none',
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text)',
              fontSize: '20px',
            }}
            aria-label="Open sidebar"
          >
            ☰
          </button>

          {/* Search placeholder (Dihapus sesuai request) */}
          <div style={{ flex: 1 }}></div>

          {/* User info (desktop) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}>
            {/* Notification bell */}
            <button style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              fontSize: '16px',
              position: 'relative',
              transition: 'all var(--transition-fast)',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-primary-surface)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-bg)'; }}
            >
              🔔
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--color-danger)',
                border: '2px solid white',
              }} />
            </button>

            {/* User avatar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-1) var(--space-3) var(--space-1) var(--space-1)',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
            }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'var(--font-weight-bold)',
                fontSize: 'var(--font-size-xs)',
              }}>
                {getInitials(user?.name)}
              </div>
              <div className="user-info-text">
                <div style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  lineHeight: 1.2,
                }}>
                  {user?.name?.split(' ').slice(0, 2).join(' ')}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.2,
                }}>
                  {ROLE_LABELS[user?.role]}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{
          flex: 1,
          padding: 'var(--space-6)',
          paddingBottom: 'calc(var(--space-6) + var(--bottom-nav-height))',
        }}>
          <Outlet />
        </main>
      </div>

      {/* Global Modals for Teachers */}
      <TeacherPopups />

      {/* Mobile Bottom Nav */}
      <BottomNav />

      {/* Responsive: remove sidebar margin on mobile */}
      <style>{`
        @media (max-width: 1024px) {
          .dashboard-content { margin-left: 0 !important; }
          .sidebar-toggle { display: flex !important; }
          .user-info-text { display: none; }
        }
      `}</style>
    </div>
  );
}
