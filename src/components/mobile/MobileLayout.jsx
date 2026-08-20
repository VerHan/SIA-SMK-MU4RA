/* ============================================================
   MobileLayout.jsx — Shell Layout untuk Mobile PWA Client
   Digunakan oleh semua halaman /app/*
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
      maxWidth: '480px',
      margin: '0 auto',
      background: 'linear-gradient(180deg, #F8FAFC 0%, #EFF6FF 60%, #F1F5F9 100%)',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden',
    }}>
      {/* Decorative background orbs */}
      <div style={{
        position: 'fixed',
        top: '-80px',
        right: '-80px',
        width: '280px',
        height: '280px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      <div style={{
        position: 'fixed',
        bottom: '80px',
        left: '-60px',
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Header */}
      <MobileHeader />

      {/* Page Content */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingBottom: '80px', /* space for bottom nav */
        position: 'relative',
        zIndex: 1,
      }}>
        <Suspense fallback={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '40vh',
            color: 'rgba(0,0,0,0.4)',
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
  );
}
