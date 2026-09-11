import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, isClearing: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);

    const isChunkError =
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.message?.includes('error loading dynamically imported module') ||
      error?.name === 'ChunkLoadError';

    if (isChunkError) {
      const reloadKey = 'chunk_reload_timestamp';
      const lastReload = parseInt(sessionStorage.getItem(reloadKey) || '0', 10);
      const now = Date.now();

      // Jika belum pernah auto-reload dalam 10 detik terakhir, bersihkan cache dan reload otomatis
      if (now - lastReload > 10000) {
        sessionStorage.setItem(reloadKey, now.toString());
        this.handleHardReload();
      }
    }
  }

  handleHardReload = async () => {
    this.setState({ isClearing: true });
    try {
      sessionStorage.removeItem('chunk_reload_timestamp');
      sessionStorage.removeItem('chunk_reload_attempt');

      // 1. Bersihkan seluruh Cache Storage (PWA / Service Worker)
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(key => caches.delete(key)));
      }

      // 2. Unregister semua Service Worker aktif agar browser mengambil script JS baru
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }
    } catch (err) {
      console.warn('[ErrorBoundary] Cache clearing notice:', err);
    }

    // 3. Force reload dengan cache-buster timestamp query
    const targetUrl = new URL(window.location.href);
    targetUrl.searchParams.set('v', Date.now().toString());
    window.location.replace(targetUrl.toString());
  };

  handleGoHome = () => {
    sessionStorage.removeItem('chunk_reload_timestamp');
    const isAdmin = window.location.pathname.startsWith('/dashboard');
    window.location.href = isAdmin ? '/dashboard/ringkasan' : '/';
  };

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || this.state.error?.toString() || '';
      const isChunk =
        errorMsg.includes('Failed to fetch dynamically imported module') ||
        errorMsg.includes('Importing a module script failed') ||
        errorMsg.includes('error loading dynamically imported module') ||
        this.state.error?.name === 'ChunkLoadError';

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#F8FAFC',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          textAlign: 'center',
          color: '#0F172A',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: isChunk ? 'rgba(37, 99, 235, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            marginBottom: '16px',
          }}>
            {isChunk ? '🔄' : '⚠️'}
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>
            {isChunk ? 'Pembaruan Sistem Tersedia' : 'Terjadi Kendala Memuat Halaman'}
          </h2>

          <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '420px', margin: '0 0 24px', lineHeight: 1.6 }}>
            {isChunk
              ? 'Versi aplikasi terbaru telah dirilis di server. Klik tombol di bawah untuk membersihkan cache dan memuat berkas terbaru.'
              : 'Terjadi kendala saat memproses halaman ini. Silakan muat ulang atau kembali ke halaman beranda.'}
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={this.handleHardReload}
              disabled={this.state.isClearing}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                background: '#2563EB',
                color: 'white',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: this.state.isClearing ? 'wait' : 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                transition: 'all 0.2s',
                opacity: this.state.isClearing ? 0.7 : 1,
              }}
              onMouseOver={e => !this.state.isClearing && (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseOut={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {this.state.isClearing ? 'Membersihkan Cache...' : 'Muat Ulang & Perbarui'}
            </button>

            <button
              onClick={this.handleGoHome}
              style={{
                padding: '12px 20px',
                borderRadius: '12px',
                background: 'white',
                color: '#475569',
                border: '1px solid #E2E8F0',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#F1F5F9'}
              onMouseOut={e => e.currentTarget.style.background = 'white'}
            >
              {typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard') ? 'Kembali ke Dashboard Admin' : 'Kembali ke Beranda'}
            </button>
          </div>

          {!isChunk && errorMsg && (
            <details style={{
              marginTop: '28px',
              maxWidth: '480px',
              width: '100%',
              background: '#F1F5F9',
              borderRadius: '8px',
              padding: '10px 14px',
              textAlign: 'left',
              fontSize: '12px',
              color: '#475569',
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#334155' }}>
                Detail Kendala Teknis
              </summary>
              <pre style={{
                marginTop: '8px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#DC2626',
              }}>
                {errorMsg}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
