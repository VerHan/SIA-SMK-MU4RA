import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    
    // Auto-reload on dynamic import / chunk failure after a new deployment
    const isChunkError = 
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.name === 'ChunkLoadError';

    if (isChunkError) {
      const reloaded = sessionStorage.getItem('chunk_reload_attempt');
      if (!reloaded) {
        sessionStorage.setItem('chunk_reload_attempt', 'true');
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    sessionStorage.removeItem('chunk_reload_attempt');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#F8FAFC',
          fontFamily: "'Inter', sans-serif",
          textAlign: 'center',
          color: '#0F172A',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            marginBottom: '16px',
          }}>
            ⚠️
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>
            Terjadi Pembaruan Sistem
          </h2>
          <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '360px', margin: '0 0 24px', lineHeight: 1.5 }}>
            Versi aplikasi terbaru telah dirilis. Silakan muat ulang halaman untuk mendapatkan pembaruan.
          </p>

          <button
            onClick={this.handleReload}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              background: '#2563EB',
              color: 'white',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            🔄 Muat Ulang Halaman
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
