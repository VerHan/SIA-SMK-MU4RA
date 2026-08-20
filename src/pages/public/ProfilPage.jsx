/* ProfilPage — Profil sekolah: visi-misi, sejarah, fasilitas */

import { SCHOOL_INFO } from '../../config/constants';
import Card from '../../components/ui/Card';

export default function ProfilPage() {
  return (
    <div>
      {/* Header */}
      <section style={{
        background: 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))',
        color: 'white',
        padding: 'var(--space-12) var(--space-6)',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: 'var(--font-size-3xl)',
          fontWeight: 'var(--font-weight-extrabold)',
          marginBottom: 'var(--space-3)',
        }}>
          Profil Sekolah
        </h1>
        <p style={{ opacity: 0.85, maxWidth: '500px', margin: '0 auto' }}>
          Mengenal lebih dekat {SCHOOL_INFO.name}
        </p>
      </section>

      <div style={{
        maxWidth: 'var(--max-content-width)',
        margin: '0 auto',
        padding: 'var(--space-10) var(--space-6)',
        display: 'grid',
        gap: 'var(--space-8)',
      }}>
        {/* Visi */}
        <Card>
          <h2 style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-bold)',
            marginBottom: 'var(--space-4)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}>
            🎯 Visi
          </h2>
          <p style={{
            fontSize: 'var(--font-size-lg)',
            lineHeight: 1.8,
            color: 'var(--color-text)',
            fontStyle: 'italic',
            borderLeft: '4px solid var(--color-primary)',
            paddingLeft: 'var(--space-4)',
          }}>
            "{SCHOOL_INFO.visi}"
          </p>
        </Card>

        {/* Misi */}
        <Card>
          <h2 style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-bold)',
            marginBottom: 'var(--space-4)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}>
            🚀 Misi
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {SCHOOL_INFO.misi.map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: 'var(--space-3)',
                alignItems: 'flex-start',
              }}>
                <span style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-primary-subtle)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'var(--font-weight-bold)',
                  fontSize: 'var(--font-size-sm)',
                  flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <p style={{ fontSize: 'var(--font-size-base)', lineHeight: 1.6, paddingTop: '2px' }}>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Info Sekolah */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--space-4)',
        }}>
          {[
            { label: 'Alamat', value: SCHOOL_INFO.address, icon: '📍' },
            { label: 'Telepon', value: SCHOOL_INFO.phone, icon: '📞' },
            { label: 'Email', value: SCHOOL_INFO.email, icon: '📧' },
            { label: 'Website', value: SCHOOL_INFO.website, icon: '🌐' },
          ].map((info, i) => (
            <Card key={i} hover>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span style={{ fontSize: '1.5rem' }}>{info.icon}</span>
                <div>
                  <div style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-muted)',
                    fontWeight: 'var(--font-weight-medium)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {info.label}
                  </div>
                  <div style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text)',
                  }}>
                    {info.value}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Fasilitas */}
        <Card>
          <h2 style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-bold)',
            marginBottom: 'var(--space-6)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}>
            🏛️ Fasilitas
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 'var(--space-4)',
          }}>
            {[
              { name: 'Lab Komputer', icon: '💻', count: '3 ruang' },
              { name: 'Lab Jaringan', icon: '🌐', count: '1 ruang' },
              { name: 'Perpustakaan', icon: '📚', count: '1 ruang' },
              { name: 'Mushola', icon: '🕌', count: '1 unit' },
              { name: 'Bengkel TBSM', icon: '🔧', count: '1 unit' },
              { name: 'Lapangan', icon: '⚽', count: '1 area' },
              { name: 'Ruang Kelas', icon: '🏫', count: '12 ruang' },
              { name: 'WiFi Area', icon: '📶', count: 'Full area' },
            ].map((facility, i) => (
              <div key={i} style={{
                padding: 'var(--space-4)',
                background: 'var(--color-primary-surface)',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.75rem', marginBottom: 'var(--space-2)' }}>{facility.icon}</div>
                <div style={{
                  fontWeight: 'var(--font-weight-semibold)',
                  fontSize: 'var(--font-size-sm)',
                  marginBottom: '2px',
                }}>
                  {facility.name}
                </div>
                <div style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-muted)',
                }}>
                  {facility.count}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
