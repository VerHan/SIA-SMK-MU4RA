/* Toast Notification Component */

import { useState, useEffect } from 'react';

/**
 * Toast notification — tampil di pojok kanan atas lalu hilang otomatis
 */
export default function Toast({ message, type = 'success', duration = 3000, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); /* Tunggu animasi fadeOut selesai */
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const types = {
    success: { bg: 'var(--color-success)', icon: '✓' },
    error: { bg: 'var(--color-danger)', icon: '✕' },
    warning: { bg: 'var(--color-warning)', icon: '⚠' },
    info: { bg: 'var(--color-info)', icon: 'ℹ' },
  };

  const t = types[type] || types.success;

  return (
    <div style={{
      position: 'fixed',
      top: 'var(--space-4)',
      right: 'var(--space-4)',
      zIndex: 'var(--z-toast)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-3) var(--space-5)',
      background: t.bg,
      color: 'var(--color-white)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)',
      fontSize: 'var(--font-size-sm)',
      fontWeight: 'var(--font-weight-medium)',
      animation: visible ? 'slideInRight 300ms ease' : 'fadeIn 300ms ease reverse',
      opacity: visible ? 1 : 0,
      transition: 'opacity 300ms ease',
    }}>
      <span style={{ fontSize: 'var(--font-size-lg)' }}>{t.icon}</span>
      <span>{message}</span>
      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 100); }}
        style={{
          color: 'rgba(255,255,255,0.8)',
          marginLeft: 'var(--space-2)',
          fontSize: 'var(--font-size-lg)',
        }}
        aria-label="Tutup notifikasi"
      >
        ×
      </button>
    </div>
  );
}
