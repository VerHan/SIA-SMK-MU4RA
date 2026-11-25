/* ============================================================
   MobileLayout.jsx — Shell Layout untuk Mobile PWA Client
   Compact chrome (<=15% height), clean surface, responsive frame.
   ============================================================ */

import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';

export default function MobileLayout() {
  return (
    <div style={{
      minHeight: '100dvh',
      width: '100%',
      background: '#EEF2F6',
      display: 'flex',
      justifyContent: 'center',
    }}>
      <div style={{
        minHeight: '100dvh',
        width: '100%',
        maxWidth: '480px',
        background: '#F8FAFC',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        boxShadow: '0 0 0 1px rgba(15, 23, 42, 0.06)',
      }}>
        {/* Header */}
        <MobileHeader />

        {/* Page Content */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingBottom: '76px',
          position: 'relative',
          zIndex: 1,
        }}>
          <Suspense fallback={
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '40vh',
              color: '#64748B',
              fontSize: '14px',
            }}>
              Memuat...
            </div>
          }>
            <Outlet />
          </Suspense>
        </main>

        {/* Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
