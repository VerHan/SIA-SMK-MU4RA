/* KejuruanPage — Profil program keahlian/jurusan */

import { JURUSAN_LIST } from '../../config/constants';
import Card from '../../components/ui/Card';

export default function KejuruanPage() {
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
          Program Keahlian
        </h1>
        <p style={{ opacity: 0.85, maxWidth: '500px', margin: '0 auto' }}>
          Pilihan jurusan unggulan yang membekali siswa dengan kompetensi dunia kerja dan industri.
        </p>
      </section>

      <div style={{
        maxWidth: 'var(--max-content-width)',
        margin: '0 auto',
        padding: 'var(--space-10) var(--space-6)',
        display: 'grid',
        gap: 'var(--space-8)',
      }}>
        {JURUSAN_LIST.map((jurusan, i) => (
          <Card key={jurusan.id} style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth > 768 ? '200px 1fr' : '1fr',
            gap: 'var(--space-6)',
            overflow: 'hidden',
          }}>
            {/* Icon/Visual Side */}
            <div style={{
              background: `linear-gradient(135deg, ${jurusan.color}20, ${jurusan.color}10)`,
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--space-8)',
              minHeight: '160px',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-2)' }}>
                  {jurusan.icon === 'monitor' ? '🖥️' :
                   jurusan.icon === 'code-2' ? '💻' :
                   jurusan.icon === 'wrench' ? '🔧' : '📊'}
                </div>
                <div style={{
                  fontWeight: 'var(--font-weight-extrabold)',
                  fontSize: 'var(--font-size-2xl)',
                  color: jurusan.color,
                }}>
                  {jurusan.shortName}
                </div>
              </div>
            </div>

            {/* Content Side */}
            <div style={{ padding: 'var(--space-2) 0' }}>
              <h2 style={{
                fontSize: 'var(--font-size-xl)',
                fontWeight: 'var(--font-weight-bold)',
                marginBottom: 'var(--space-2)',
              }}>
                {jurusan.name}
              </h2>
              <p style={{
                color: 'var(--color-text-secondary)',
                lineHeight: 1.7,
                marginBottom: 'var(--space-4)',
              }}>
                {jurusan.description}
              </p>

              {/* Skill badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {getSkillsForMajor(jurusan.id).map((skill, j) => (
                  <span key={j} style={{
                    padding: '0.2rem 0.6rem',
                    background: `${jurusan.color}15`,
                    color: jurusan.color,
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'var(--font-weight-medium)',
                    borderRadius: 'var(--radius-full)',
                  }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* Helper: keahlian yang dipelajari per jurusan */
function getSkillsForMajor(majorId) {
  const skills = {
    tkj: ['Cisco Networking', 'MikroTik', 'Windows Server', 'Linux', 'Fiber Optic'],
    rpl: ['HTML/CSS/JS', 'React', 'PHP/Laravel', 'MySQL', 'UI/UX Design'],
    tbsm: ['Engine Overhaul', 'Fuel Injection', 'Kelistrikan', 'Suspensi', 'Bisnis Otomotif'],
    akl: ['MYOB', 'Spreadsheet', 'Perpajakan', 'Perbankan', 'Laporan Keuangan'],
  };
  return skills[majorId] || [];
}
