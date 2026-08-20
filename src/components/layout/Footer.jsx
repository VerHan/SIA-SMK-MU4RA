/* Footer — Tampil di halaman publik */

import { Link } from 'react-router-dom';
import { SCHOOL_INFO } from '../../config/constants';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{
      background: 'var(--color-primary-darker)',
      color: 'rgba(255, 255, 255, 0.8)',
      padding: 'var(--space-12) var(--space-6) var(--space-6)',
    }}>
      <div style={{
        maxWidth: 'var(--max-content-width)',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 'var(--space-8)',
      }}>
        {/* Kolom 1: Info Sekolah */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-4)',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, var(--color-primary-light), #60A5FA)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'var(--font-weight-extrabold)',
              fontSize: 'var(--font-size-sm)',
              color: 'white',
            }}>
              SIA
            </div>
            <span style={{
              fontWeight: 'var(--font-weight-bold)',
              fontSize: 'var(--font-size-base)',
              color: 'white',
            }}>
              {SCHOOL_INFO.shortName}
            </span>
          </div>
          <p style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.7 }}>
            {SCHOOL_INFO.description}
          </p>
          <p style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>
            📍 {SCHOOL_INFO.address}
          </p>
        </div>

        {/* Kolom 2: Link Cepat */}
        <div>
          <h4 style={{
            color: 'white',
            fontWeight: 'var(--font-weight-semibold)',
            fontSize: 'var(--font-size-sm)',
            marginBottom: 'var(--space-4)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Link Cepat
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {[
              { label: 'Beranda', path: '/' },
              { label: 'Profil Sekolah', path: '/profil' },
              { label: 'Berita', path: '/berita' },
              { label: 'Kejuruan', path: '/kejuruan' },
            ].map(link => (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 'var(--font-size-sm)',
                  transition: 'color var(--transition-fast)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Kolom 3: Kontak */}
        <div>
          <h4 style={{
            color: 'white',
            fontWeight: 'var(--font-weight-semibold)',
            fontSize: 'var(--font-size-sm)',
            marginBottom: 'var(--space-4)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Kontak
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
            <p>📞 {SCHOOL_INFO.phone}</p>
            <p>📧 {SCHOOL_INFO.email}</p>
            <p>🌐 {SCHOOL_INFO.website}</p>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.1)',
        marginTop: 'var(--space-8)',
        paddingTop: 'var(--space-6)',
        textAlign: 'center',
        fontSize: 'var(--font-size-xs)',
        color: 'rgba(255,255,255,0.5)',
      }}>
        © {currentYear} {SCHOOL_INFO.name}. Hak Cipta Dilindungi.
      </div>
    </footer>
  );
}
