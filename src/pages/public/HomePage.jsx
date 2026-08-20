/* ============================================================
   HomePage — Landing page sekolah
   
   Tampilan utama website publik. Berisi hero section,
   statistik, berita terbaru, dan call-to-action.
   ============================================================ */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SCHOOL_INFO, JURUSAN_LIST } from '../../config/constants';
import { getNews, getDashboardStats } from '../../services/api';
import { formatDate } from '../../utils/helpers';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function HomePage() {
  const [news, setNews] = useState([]);
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getNews().then(data => setNews(data.slice(0, 3)));
    getDashboardStats().then(setStats);
  }, []);

  return (
    <div>
      {/* === HERO SECTION === */}
      <section style={{
        background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 50%, var(--color-primary-light) 100%)',
        color: 'white',
        padding: 'var(--space-20) var(--space-6) var(--space-16)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', left: '-60px',
          width: '200px', height: '200px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }} />

        <div style={{
          maxWidth: 'var(--max-content-width)',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
        }}>
          {/* Badge */}
          <div className="animate-fade-in" style={{
            display: 'inline-block',
            padding: 'var(--space-2) var(--space-4)',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)',
            marginBottom: 'var(--space-6)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            🏫 Sistem Informasi Akademik
          </div>

          <h1 className="animate-fade-in-up" style={{
            fontSize: 'clamp(2rem, 5vw, var(--font-size-5xl))',
            fontWeight: 'var(--font-weight-extrabold)',
            lineHeight: 1.1,
            marginBottom: 'var(--space-4)',
          }}>
            {SCHOOL_INFO.name}
          </h1>

          <p className="animate-fade-in-up stagger-2" style={{
            fontSize: 'clamp(1rem, 2vw, var(--font-size-lg))',
            maxWidth: '600px',
            margin: '0 auto var(--space-8)',
            opacity: 0.9,
            lineHeight: 1.6,
          }}>
            Menyelenggarakan pendidikan berkualitas dengan akhlak mulia, 
            kompetensi unggul, dan berdaya saing global.
          </p>

          <div className="animate-fade-in-up stagger-3" style={{
            display: 'flex',
            gap: 'var(--space-4)',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            <Button
              size="lg"
              onClick={() => navigate('/profil')}
              style={{
                background: 'white',
                color: 'var(--color-primary)',
                fontWeight: 'var(--font-weight-bold)',
              }}
            >
              Tentang Kami
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/login')}
              style={{
                borderColor: 'rgba(255,255,255,0.5)',
                color: 'white',
              }}
            >
              Login Portal →
            </Button>
          </div>
        </div>
      </section>

      {/* === STATISTIK SECTION === */}
      <section style={{
        maxWidth: 'var(--max-content-width)',
        margin: '-3rem auto 0',
        padding: '0 var(--space-6)',
        position: 'relative',
        zIndex: 2,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 'var(--space-4)',
        }}>
          {[
            { label: 'Total Siswa', value: stats?.totalStudents || '200+', icon: '🎓', color: '#3B82F6' },
            { label: 'Tenaga Pengajar', value: stats?.totalTeachers || '20+', icon: '👨‍🏫', color: '#10B981' },
            { label: 'Kelas Aktif', value: stats?.totalClasses || '12', icon: '🏫', color: '#F59E0B' },
            { label: 'Program Keahlian', value: JURUSAN_LIST.length, icon: '⚡', color: '#8B5CF6' },
          ].map((stat, i) => (
            <Card key={i} hover style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>{stat.icon}</div>
              <div style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-extrabold)',
                color: stat.color,
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                fontWeight: 'var(--font-weight-medium)',
              }}>
                {stat.label}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* === KEJURUAN SECTION === */}
      <section style={{
        maxWidth: 'var(--max-content-width)',
        margin: '0 auto',
        padding: 'var(--space-16) var(--space-6)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
          <h2 style={{
            fontSize: 'var(--font-size-3xl)',
            fontWeight: 'var(--font-weight-extrabold)',
            marginBottom: 'var(--space-3)',
          }}>
            Program Keahlian
          </h2>
          <p style={{
            color: 'var(--color-text-secondary)',
            maxWidth: '500px',
            margin: '0 auto',
          }}>
            Pilihan jurusan unggulan yang siap membekali siswa dengan kompetensi dunia kerja.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 'var(--space-6)',
        }}>
          {JURUSAN_LIST.map((jurusan, i) => (
            <Card key={jurusan.id} hover style={{ padding: 'var(--space-8)' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-lg)',
                background: `${jurusan.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: 'var(--space-4)',
              }}>
                {jurusan.icon === 'monitor' ? '🖥️' :
                 jurusan.icon === 'code-2' ? '💻' :
                 jurusan.icon === 'wrench' ? '🔧' : '📊'}
              </div>
              <h3 style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-bold)',
                marginBottom: 'var(--space-1)',
              }}>
                {jurusan.shortName}
              </h3>
              <p style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--space-2)',
              }}>
                {jurusan.name}
              </p>
              <p style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-muted)',
                lineHeight: 1.6,
              }}>
                {jurusan.description}
              </p>
            </Card>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
          <Button variant="outline" onClick={() => navigate('/kejuruan')}>
            Lihat Semua Kejuruan →
          </Button>
        </div>
      </section>

      {/* === BERITA SECTION === */}
      <section style={{
        background: 'var(--color-primary-surface)',
        padding: 'var(--space-16) var(--space-6)',
      }}>
        <div style={{
          maxWidth: 'var(--max-content-width)',
          margin: '0 auto',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-8)',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
          }}>
            <div>
              <h2 style={{
                fontSize: 'var(--font-size-3xl)',
                fontWeight: 'var(--font-weight-extrabold)',
                marginBottom: 'var(--space-2)',
              }}>
                Berita Terbaru
              </h2>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Informasi dan kegiatan terkini dari sekolah.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/berita')}>
              Lihat Semua →
            </Button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'var(--space-6)',
          }}>
            {news.map(item => (
              <Card key={item.id} hover onClick={() => navigate(`/berita/${item.id}`)}>
                {/* Colored top bar */}
                <div style={{
                  height: '4px',
                  background: 'linear-gradient(90deg, var(--color-primary), var(--color-primary-light))',
                  borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
                  margin: 'calc(-1 * var(--space-6)) calc(-1 * var(--space-6)) var(--space-4)',
                }} />
                <span style={{
                  display: 'inline-block',
                  padding: '0.15rem 0.5rem',
                  background: 'var(--color-primary-subtle)',
                  color: 'var(--color-primary)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  borderRadius: 'var(--radius-full)',
                  marginBottom: 'var(--space-3)',
                }}>
                  {item.category}
                </span>
                <h3 style={{
                  fontSize: 'var(--font-size-base)',
                  fontWeight: 'var(--font-weight-semibold)',
                  marginBottom: 'var(--space-2)',
                  lineHeight: 1.4,
                }}>
                  {item.title}
                </h3>
                <p className="line-clamp-2" style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--space-3)',
                  lineHeight: 1.6,
                }}>
                  {item.excerpt}
                </p>
                <div style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-muted)',
                }}>
                  {formatDate(item.date)}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* === CTA LOGIN SECTION === */}
      <section style={{
        maxWidth: 'var(--max-content-width)',
        margin: '0 auto',
        padding: 'var(--space-16) var(--space-6)',
      }}>
        <Card style={{
          background: 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))',
          color: 'white',
          textAlign: 'center',
          padding: 'var(--space-12) var(--space-8)',
          border: 'none',
        }}>
          <h2 style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-extrabold)',
            marginBottom: 'var(--space-3)',
          }}>
            Portal Guru & Karyawan
          </h2>
          <p style={{
            opacity: 0.85,
            maxWidth: '500px',
            margin: '0 auto var(--space-6)',
          }}>
            Akses jadwal mengajar, absensi, nilai siswa, dan kelola pembayaran 
            melalui portal yang terintegrasi.
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/login')}
            style={{
              background: 'white',
              color: 'var(--color-primary)',
              fontWeight: 'var(--font-weight-bold)',
            }}
          >
            Masuk ke Portal →
          </Button>
        </Card>
      </section>
    </div>
  );
}
