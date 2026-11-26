/* ============================================================
   PWAInstallButton.jsx — Tombol Install Aplikasi SIA (Android/Desktop/iOS)
   Otomatis tersembunyi jika sudah berjalan di mode aplikasi ter-install.
   ============================================================ */

import { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export default function PWAInstallButton({ fullWidth = false, compact = false }) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const buttonStyle = {
    width: fullWidth ? '100%' : 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: compact ? '8px 12px' : '11px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(30, 64, 175, 0.2)',
    background: 'rgba(30, 64, 175, 0.08)',
    color: '#1E40AF',
    fontSize: compact ? '12px' : '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };

  if (isInstallable) {
    return (
      <button type="button" onClick={install} style={buttonStyle}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Install Aplikasi SIA di Perangkat Ini
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button type="button" onClick={() => setShowIOSGuide(true)} style={buttonStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Install Aplikasi SIA di iPhone / iPad
        </button>

        {showIOSGuide && (
          <div
            onClick={() => setShowIOSGuide(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '360px',
                background: '#FFFFFF',
                borderRadius: '18px',
                padding: '22px',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
                textAlign: 'left',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 10px' }}>
                Pasang SIA MU4RA di Layar Utama
              </h3>
              <ol style={{ margin: '0 0 16px', paddingLeft: '18px', fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                <li>Ketuk ikon <strong>Bagikan (Share)</strong> di bagian bawah Safari.</li>
                <li>Gulir ke bawah lalu pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.</li>
                <li>Buka ikon <strong>SIA MU4RA</strong> dari layar utama agar langsung masuk ke aplikasi SIA.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#1E40AF',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
