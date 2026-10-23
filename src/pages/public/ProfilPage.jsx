/* ============================================================
   ProfilPage.jsx — Laman Profil Resmi SMK Muhammadiyah 04 Bangsri
   Konsep: Intro Film/Gemini Glow -> Scroll Reveal Foto Sekolah -> Denah -> Visi Misi -> 4 Jurusan Zig-Zag
   ============================================================ */

import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SCHOOL_INFO, JURUSAN_LIST } from '../../config/constants';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ScrollReveal from '../../components/shared/ScrollReveal';
import SmkLogoEmblem from '../../components/shared/SmkLogoEmblem';

export default function ProfilPage() {
  const navigate = useNavigate();
  const contentStartRef = useRef(null);

  const scrollToContent = () => {
    contentStartRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ background: '#0F172A', color: '#F8FAFC', overflowX: 'hidden' }}>

      {/* =======================================================
          1. INTRO LAYAR PENUH (CINEMATIC / GOOGLE GEMINI VIBE)
          ======================================================= */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        padding: 'var(--space-8) var(--space-6)',
        textAlign: 'center',
        background: 'radial-gradient(ellipse at 50% 25%, rgba(0, 70, 255, 0.35) 0%, rgba(15, 23, 42, 0.96) 65%, #080D1A 100%)',
        overflow: 'hidden',
      }}>
        {/* Ambient Gemini-style Glow Aura with Electric Blue #0046FF */}
        <div className="animate-gemini-glow" style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '560px',
          height: '560px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 70, 255, 0.32) 0%, rgba(120, 50, 255, 0.15) 45%, transparent 75%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }} />

        {/* Content Box */}
        <div style={{ maxWidth: '860px', zIndex: 2 }}>
          {/* TAHAP 1: Logo SMK Muncul Pertama Kali (Paling Awal) */}
          <div className="intro-logo-anim" style={{ marginBottom: 'var(--space-6)' }}>
            <SmkLogoEmblem size="intro" withRing={true} />
          </div>

          {/* TAHAP 2: Heading Ucapan Selamat Datang Muncul */}
          <div className="intro-title-anim">
            <h1 style={{
              fontSize: 'clamp(2.4rem, 6vw, 4.2rem)',
              fontWeight: '900',
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              marginBottom: 'var(--space-5)',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #E0E8FF 35%, #A3BEFF 70%, #0046FF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 10px 30px rgba(0, 70, 255, 0.3)',
            }}>
              Selamat Datang di {SCHOOL_INFO.name}
            </h1>
          </div>

          {/* TAHAP 4: Ucapan Sambutan Hangat Muncul */}
          <div className="intro-desc-anim">
            <p style={{
              fontSize: 'clamp(1.05rem, 2.2vw, 1.25rem)',
              color: '#CBD5E1',
              maxWidth: '680px',
              margin: '0 auto var(--space-8)',
              lineHeight: 1.7,
              fontWeight: '400',
            }}>
              Membentuk generasi vokasi berakhlak mulia, menguasai keahlian teknologi industri mutakhir, dan siap bersaing di dunia kerja profesional.
            </p>
          </div>

          {/* TAHAP 5: Tombol Aksi Muncul */}
          <div className="intro-actions-anim">
            <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                size="lg"
                onClick={scrollToContent}
                style={{
                  background: 'linear-gradient(135deg, #0046FF 0%, #0036C8 100%)',
                  color: 'white',
                  fontWeight: 'var(--font-weight-bold)',
                  boxShadow: '0 0 30px rgba(0, 70, 255, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                }}
              >
                Mulai Jelajahi Sekolah ↓
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/login')}
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  color: '#F8FAFC',
                  backdropFilter: 'blur(8px)',
                }}
              >
                🔑 Portal Guru & Admin
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Wrapper (White & Slate Theme for Clarity) */}
      <div ref={contentStartRef} style={{ background: '#F8FAFC', color: '#0F172A', position: 'relative' }}>

        {/* =======================================================
            2. SECTION PROFIL & GAMBAR SEKOLAH (SCROLL REVEAL)
            ======================================================= */}
        <section style={{
          maxWidth: 'var(--max-content-width)',
          margin: '0 auto',
          padding: 'clamp(4.5rem, 7vw, 7rem) var(--space-6)',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'clamp(2.5rem, 5vw, 4.5rem)',
            alignItems: 'center',
          }}>
            {/* Foto Sekolah (Meluncur dari KIRI) dengan Human Proof Badges */}
            <ScrollReveal animation="slide-left" duration={1000}>
              <div
                className="card-interactive"
                style={{
                  position: 'relative',
                  borderRadius: 'var(--radius-2xl)',
                  overflow: 'hidden',
                  boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.18)',
                  border: '4px solid white',
                }}
              >
                {/* Floating Social Proof: Avatar Stack (Top-Left) */}
                <div className="floating-pill" style={{
                  position: 'absolute',
                  top: '1.25rem',
                  left: '1.25rem',
                  zIndex: 4,
                }}>
                  <div className="badge-trust">
                    <div className="avatar-stack">
                      <div className="avatar-stack-item">👨‍🎓</div>
                      <div className="avatar-stack-item">👩‍🎓</div>
                      <div className="avatar-stack-item">🧑‍🎓</div>
                    </div>
                    <div style={{ marginLeft: '4px', textAlign: 'left', lineHeight: 1.15 }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#0F172A' }}>1.200+ Siswa</div>
                      <div style={{ fontSize: '10px', color: '#0046FF', fontWeight: '700' }}>94% Bekerja</div>
                    </div>
                  </div>
                </div>

                {/* Floating Trust Badge: Akreditasi A (Top-Right) */}
                <div className="floating-pill-reverse" style={{
                  position: 'absolute',
                  top: '1.25rem',
                  right: '1.25rem',
                  zIndex: 4,
                }}>
                  <div className="badge-trust">
                    <span style={{ color: '#F59E0B', fontSize: '1.1rem' }}>★</span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#0F172A' }}>Akreditasi A</span>
                  </div>
                </div>

                <img
                  src="/images/gedung_sekolah.jpg"
                  alt="Gedung Kampus SMK Muhammadiyah 04 Bangsri"
                  style={{
                    width: '100%',
                    height: 'auto',
                    minHeight: '360px',
                    maxHeight: '460px',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                />

                {/* Floating Badge di bawah foto */}
                <div style={{
                  position: 'absolute',
                  bottom: '1.25rem',
                  left: '1.25rem',
                  right: '1.25rem',
                  background: 'rgba(15, 23, 42, 0.88)',
                  backdropFilter: 'blur(12px)',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-xl)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                }}>
                  <div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: '#93C5FD', fontWeight: 'bold', letterSpacing: '0.06em' }}>KAMPUS PUSAT KEUNGGULAN</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'bold' }}>Wedelan, Bangsri, Jepara</div>
                  </div>
                  <span style={{ fontSize: '1.35rem' }}>🏫</span>
                </div>
              </div>
            </ScrollReveal>

            {/* Ulasan Profil (Meluncur dari KANAN) */}
            <ScrollReveal animation="slide-right" duration={800}>
              <div>
                <span style={{
                  color: 'var(--color-primary)',
                  fontWeight: 'var(--font-weight-extrabold)',
                  fontSize: 'var(--font-size-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                }}>
                  PROFIL LEMBAGA
                </span>

                <h2 style={{
                  fontSize: 'clamp(1.85rem, 3.8vw, 2.6rem)',
                  fontWeight: '900',
                  lineHeight: 1.25,
                  margin: 'var(--space-2) 0 var(--space-4)',
                  color: '#0F172A',
                }}>
                  Membangun Kompetensi Nyata Berlandaskan Nilai Luhur
                </h2>

                <p style={{
                  fontSize: 'var(--font-size-base)',
                  lineHeight: 1.75,
                  color: '#475569',
                  marginBottom: 'var(--space-5)',
                }}>
                  <strong>{SCHOOL_INFO.name}</strong> (dikenal sebagai <em>SMK MU4RA</em>) adalah sekolah menengah kejuruan terkemuka di kawasan utara Jepara. Mengedepankan kurikulum berbasis industri dan pembinaan adab Islami, kami membekali setiap siswa dengan keterampilan teknis aplikatif siap kerja.
                </p>

                {/* 3 Keunggulan Mini */}
                <div style={{ display: 'grid', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                  {[
                    { title: 'Bengkel & Lab Berstandar Industri', desc: 'Fasilitas praktik memadai untuk mesin mobil, motor injeksi, panel listrik, dan studio DKV.' },
                    { title: 'Link & Match Dunia Usaha / Industri', desc: 'Bekerja sama erat dengan bengkel resmi, industri manufaktur, dan agensi kreatif.' },
                    { title: 'Penguatan Karakter & Disiplin Islami', desc: 'Pembiasaan sholat berjamaah, kejujuran, etos kerja tinggi, dan jiwa wirausaha.' },
                  ].map((feat, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-3)',
                      background: 'white',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--color-border-light)',
                    }}>
                      <span style={{ color: '#2563EB', fontSize: '1.2rem', lineHeight: 1 }}>✓</span>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: 'var(--font-size-sm)', color: '#0F172A' }}>{feat.title}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: '#64748B', lineHeight: 1.5 }}>{feat.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>


        {/* =======================================================
            3. SECTION DENAH & FASILITAS KAMPUS (SCROLL REVEAL)
            ======================================================= */}
        <section style={{
          background: 'linear-gradient(180deg, #F1F5F9 0%, #E2E8F0 100%)',
          padding: 'clamp(4.5rem, 7vw, 6.5rem) var(--space-6)',
          borderTop: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <div style={{ maxWidth: 'var(--max-content-width)', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
              <ScrollReveal animation="slide-up">
                <span style={{
                  color: 'var(--color-primary)',
                  fontWeight: 'var(--font-weight-extrabold)',
                  fontSize: 'var(--font-size-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                }}>
                  TATA RUANG & FASILITAS
                </span>
                <h2 style={{
                  fontSize: 'clamp(1.85rem, 3.8vw, 2.6rem)',
                  fontWeight: '900',
                  margin: 'var(--space-2) 0 var(--space-3)',
                }}>
                  Denah Kawasan Kampus SMK MU4RA
                </h2>
                <p style={{ color: '#475569', maxWidth: '580px', margin: '0 auto', fontSize: 'var(--font-size-base)' }}>
                  Tata letak gedung teori, bengkel kejuruan, studio kreatif, dan sarana ibadah tertata rapi mendukung kegiatan belajar mengajar yang kondusif.
                </p>
              </ScrollReveal>
            </div>

            {/* Interactive Campus Blueprint Map Representation */}
            <ScrollReveal animation="slide-up" duration={800} delay={150}>
              <div style={{
                background: 'white',
                borderRadius: 'var(--radius-2xl)',
                padding: 'clamp(1.5rem, 4vw, 2.5rem)',
                boxShadow: '0 20px 40px -10px rgba(0,0,0,0.08)',
                border: '1px solid #CBD5E1',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--space-6)',
                  flexWrap: 'wrap',
                  gap: 'var(--space-3)',
                  borderBottom: '2px solid #F1F5F9',
                  paddingBottom: 'var(--space-4)',
                }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold', margin: 0, color: '#1E293B' }}>
                      🗺️ Peta Blok Fasilitas Utama
                    </h3>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: '#64748B' }}>
                      Kawasan Terpadu SMK Muhammadiyah 04 Bangsri (Wedelan)
                    </span>
                  </div>
                  <span style={{
                    padding: 'var(--space-1) var(--space-3)',
                    background: '#EFF6FF',
                    color: '#2563EB',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'bold',
                  }}>
                    Area Bersih & Bebas Rokok 🚭
                  </span>
                </div>

                {/* Grid Denah Blok Ruangan */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 'var(--space-4)',
                }}>
                  {[
                    { code: 'BLOK A', name: 'Gedung Rektorat & Tata Usaha', desc: 'Ruang Kepala Sekolah, Guru, Administrasi, & Pelayanan Tamu', icon: '🏛️', color: '#3B82F6' },
                    { code: 'BLOK B', name: 'Bengkel Otomotif TKR', desc: 'Bengkel servis mobil, car lift, perbaikan transmisi & mesin roda 4', icon: '🚗', color: '#EF4444' },
                    { code: 'BLOK C', name: 'Bengkel Sepeda Motor TSM', desc: 'Simulator injeksi EFI, bike lift, tune-up & overhaul motor roda 2', icon: '🏍️', color: '#F59E0B' },
                    { code: 'BLOK D', name: 'Lab Kelistrikan TITL', desc: 'Papan instalasi penerangan, perakitan panel daya 3 fasa, & PLC', icon: '⚡', color: '#0284C7' },
                    { code: 'BLOK E', name: 'Studio Kreatif & Lab DKV', desc: 'Lab komputer desain grafis, editing video, & studio fotografi', icon: '🎨', color: '#8B5CF6' },
                    { code: 'BLOK F', name: 'Mushola Baiturrahman', desc: 'Pusat ibadah sholat dhuhur & ashar berjamaah seluruh warga sekolah', icon: '🕌', color: '#10B981' },
                    { code: 'BLOK G', name: 'Perpustakaan & Ruang Teori', desc: 'Ruang kelas ber-AC, proyektor interaktif, & koleksi literasi', icon: '📚', color: '#64748B' },
                    { code: 'BLOK H', name: 'Lapangan Serbaguna', desc: 'Upacara bendera, olahraga futsal/voli, & apel kedisiplinan', icon: '⚽', color: '#059669' },
                  ].map((zone, i) => (
                    <div
                      key={i}
                      style={{
                        padding: 'var(--space-4)',
                        background: '#F8FAFC',
                        borderRadius: 'var(--radius-xl)',
                        border: `1px solid #E2E8F0`,
                        borderLeft: `5px solid ${zone.color}`,
                        transition: 'all 0.25s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: zone.color, letterSpacing: '0.08em' }}>
                          {zone.code}
                        </span>
                        <span style={{ fontSize: '1.4rem' }}>{zone.icon}</span>
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: 'var(--font-size-sm)', color: '#0F172A', marginBottom: 'var(--space-1)' }}>
                        {zone.name}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: '#64748B', lineHeight: 1.5 }}>
                        {zone.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>


        {/* =======================================================
            4. SECTION VISI & MISI SEKOLAH (SCROLL REVEAL)
            ======================================================= */}
        <section style={{
          maxWidth: 'var(--max-content-width)',
          margin: '0 auto',
          padding: 'clamp(4.5rem, 7vw, 6.5rem) var(--space-6)',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'var(--space-8)',
            alignItems: 'stretch',
          }}>
            {/* Visi Sekolah (Slide Kiri) */}
            <ScrollReveal animation="slide-left" duration={800}>
              <div style={{
                background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)',
                color: 'white',
                borderRadius: 'var(--radius-2xl)',
                padding: 'clamp(2rem, 5vw, 3rem)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 20px 40px -10px rgba(30, 58, 138, 0.35)',
              }}>
                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    padding: 'var(--space-1) var(--space-3)',
                    background: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'bold',
                    marginBottom: 'var(--space-4)',
                  }}>
                    🎯 VISI SEKOLAH
                  </div>
                  <h3 style={{
                    fontSize: 'clamp(1.5rem, 3vw, 2.1rem)',
                    fontWeight: '900',
                    lineHeight: 1.3,
                    marginBottom: 'var(--space-4)',
                    color: '#FFFFFF',
                    textShadow: '0 2px 12px rgba(0, 0, 0, 0.45)',
                  }}>
                    "{SCHOOL_INFO.visi}"
                  </h3>
                </div>

                <div style={{
                  paddingTop: 'var(--space-4)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                  fontSize: 'var(--font-size-sm)',
                  opacity: 0.9,
                }}>
                  Landasan filosofis yang menjiwai seluruh proses pembelajaran dan tata kelola di SMK Muhammadiyah 04 Bangsri.
                </div>
              </div>
            </ScrollReveal>

            {/* Misi Sekolah (Slide Kanan) */}
            <ScrollReveal animation="slide-right" duration={800}>
              <div style={{
                background: 'white',
                borderRadius: 'var(--radius-2xl)',
                padding: 'clamp(2rem, 5vw, 3rem)',
                height: '100%',
                boxShadow: '0 15px 35px -10px rgba(0,0,0,0.08)',
                border: '1px solid var(--color-border-light)',
              }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-1) var(--space-3)',
                  background: 'var(--color-primary-subtle)',
                  color: 'var(--color-primary)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'bold',
                  marginBottom: 'var(--space-4)',
                }}>
                  🚀 MISI SEKOLAH
                </div>
                <h3 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', marginBottom: 'var(--space-4)', color: '#0F172A' }}>
                  4 Langkah Strategis Mewujudkan Visi
                </h3>

                <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                  {SCHOOL_INFO.misi.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                      <span style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: '#EFF6FF',
                        color: '#2563EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: 'var(--font-size-sm)',
                        flexShrink: 0,
                      }}>
                        {i + 1}
                      </span>
                      <p style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.6, color: '#334155', margin: 0, paddingTop: '3px' }}>
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>


        {/* =======================================================
            5. SECTION 4 JURUSAN ZIG-ZAG (FULL SCREEN MOTION SHOWCASE)
            TKR, TSM, TITL, DKV — Selang-seling Kiri & Kanan!
            ======================================================= */}
        <section style={{
          background: '#0B0F19',
          color: 'white',
          padding: 'clamp(5rem, 8vw, 8rem) var(--space-6)',
          borderTop: '1px solid #1E293B',
        }}>
          <div style={{ maxWidth: 'var(--max-content-width)', margin: '0 auto' }}>
            {/* Section Header */}
            <div style={{ textAlign: 'center', marginBottom: 'clamp(3.5rem, 6vw, 6rem)' }}>
              <ScrollReveal animation="slide-up">
                <span style={{
                  color: '#60A5FA',
                  fontWeight: '800',
                  fontSize: 'var(--font-size-xs)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}>
                  PROGRAM KEAHLIAN UNGGULAN
                </span>
                <h2 style={{
                  fontSize: 'clamp(2rem, 4.5vw, 3.2rem)',
                  fontWeight: '900',
                  margin: 'var(--space-2) 0 var(--space-3)',
                  letterSpacing: '-0.02em',
                }}>
                  4 Pilihan Jurusan Masa Depan
                </h2>
                <p style={{ color: '#94A3B8', maxWidth: '620px', margin: '0 auto', fontSize: 'var(--font-size-base)' }}>
                  Setiap jurusan dilengkapi bengkel praktik modern dengan instruktur berpengalaman, membekali siswa sertifikasi keahlian terstandarisasi.
                </p>
              </ScrollReveal>
            </div>

            {/* List 4 Jurusan Selang-Seling (Zig-Zag) */}
            <div style={{ display: 'grid', gap: 'clamp(4rem, 8vw, 7rem)' }}>
              {JURUSAN_LIST.map((jurusan, index) => {
                // Selang-seling: index genap (0, 2) = Teks KIRI, Gambar KANAN
                // index ganjil (1, 3) = Gambar KIRI, Teks KANAN
                const isImageLeft = index % 2 === 1;

                return (
                  <div
                    key={jurusan.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                      gap: 'clamp(2.5rem, 5vw, 4.5rem)',
                      alignItems: 'center',
                    }}
                  >
                    {/* BAGIAN TEKS PENJELASAN */}
                    <div style={{ order: isImageLeft ? 2 : 1 }}>
                      <ScrollReveal animation={isImageLeft ? 'slide-right' : 'slide-left'} duration={800}>
                        <div>
                          {/* Badge Jurusan */}
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            padding: 'var(--space-1) var(--space-3)',
                            background: `${jurusan.color}25`,
                            color: jurusan.color,
                            borderRadius: 'var(--radius-full)',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 'bold',
                            border: `1px solid ${jurusan.color}50`,
                            marginBottom: 'var(--space-3)',
                          }}>
                            <span>JURUSAN 0{index + 1}</span>
                            <span>•</span>
                            <span>{jurusan.badge}</span>
                          </div>

                          {/* Judul Jurusan */}
                          <h3 style={{
                            fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                            fontWeight: '900',
                            color: 'white',
                            lineHeight: 1.2,
                            marginBottom: 'var(--space-4)',
                          }}>
                            {jurusan.shortName} — {jurusan.name}
                          </h3>

                          {/* Deskripsi Apa Saja yang Dipelajari */}
                          <p style={{
                            fontSize: 'var(--font-size-base)',
                            lineHeight: 1.75,
                            color: '#94A3B8',
                            marginBottom: 'var(--space-6)',
                          }}>
                            {jurusan.description}
                          </p>

                          {/* Highlight Keahlian / Kompetensi */}
                          <div style={{ marginBottom: 'var(--space-6)' }}>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: '#CBD5E1', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-3)' }}>
                              Kompetensi Utama yang Dipelajari:
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-2)' }}>
                              {jurusan.highlights.map((h, hIdx) => (
                                <div key={hIdx} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  fontSize: 'var(--font-size-xs)',
                                  color: '#E2E8F0',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                }}>
                                  <span style={{ color: jurusan.color }}>⚡</span>
                                  <span>{h}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* CTA Tombol Daftar Jurusan Ini */}
                          <Button
                            onClick={() => navigate('/ppdb')}
                            style={{
                              background: jurusan.color,
                              color: 'white',
                              fontWeight: 'bold',
                              boxShadow: `0 8px 25px ${jurusan.color}40`,
                            }}
                          >
                            Pilih Jurusan {jurusan.shortName} di PPDB →
                          </Button>
                        </div>
                      </ScrollReveal>
                    </div>

                    {/* BAGIAN GAMBAR KEGIATAN PRAKTIK */}
                    <div style={{ order: isImageLeft ? 1 : 2 }}>
                      <ScrollReveal animation={isImageLeft ? 'slide-left' : 'slide-right'} duration={800}>
                        <div
                          className="card-interactive"
                          style={{
                            position: 'relative',
                            borderRadius: 'var(--radius-2xl)',
                            overflow: 'hidden',
                            boxShadow: `0 25px 50px -10px ${jurusan.color}25, 0 0 0 1px rgba(255, 255, 255, 0.12)`,
                            background: '#1E293B',
                          }}
                        >
                          {/* Floating Trust Badge: Sertifikasi Keahlian (Top-Left) */}
                          <div className="floating-pill" style={{
                            position: 'absolute',
                            top: '1rem',
                            left: '1rem',
                            zIndex: 3,
                          }}>
                            <div className="floating-sales-badge" style={{ borderLeft: `3px solid ${jurusan.color}` }}>
                              <span>{jurusan.certBadge || '✨ Standar BNSP'}</span>
                            </div>
                          </div>

                          {/* Floating Trust Badge: Siap Kerja / Kemitraan (Top-Right) */}
                          <div className="floating-pill-reverse" style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            zIndex: 3,
                          }}>
                            <div className="floating-sales-badge" style={{ background: 'rgba(0, 70, 255, 0.9)' }}>
                              <span style={{ color: '#FCD34D' }}>★</span>
                              <span>{jurusan.employmentRate || '94% Siap Kerja'}</span>
                            </div>
                          </div>

                          <img
                            src={jurusan.image}
                            alt={`Kegiatan Praktik Siswa ${jurusan.name}`}
                            style={{
                              width: '100%',
                              height: 'auto',
                              minHeight: '330px',
                              maxHeight: '440px',
                              objectFit: 'cover',
                              display: 'block',
                              transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          />

                          {/* Tag Overlay Keterangan Kegiatan */}
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: 'var(--space-4) var(--space-5)',
                            background: 'linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.95) 100%)',
                            color: 'white',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
                              <div style={{ fontSize: '11px', color: jurusan.color, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                DOKUMENTASI PRAKTIK SISWA
                              </div>
                              <div style={{ fontSize: '10px', color: '#CBD5E1', background: 'rgba(255, 255, 255, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                {jurusan.partnerBadge || 'Mitra DUDI'}
                              </div>
                            </div>
                            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'bold' }}>
                              Kegiatan Pembelajaran & Praktik Bengkel {jurusan.shortName}
                            </div>
                            <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>
                              * Fasilitas peralatan uji & instruktur berlisensi industri
                            </div>
                          </div>
                        </div>
                      </ScrollReveal>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>


        {/* =======================================================
            SECTION CAPAIAN & KREDIBILITAS SEKOLAH (KEY STATS)
            Ditaruh di bawah Section 4 Jurusan
            ======================================================= */}
        <section style={{
          background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
          padding: 'clamp(4.5rem, 6vw, 6.5rem) var(--space-6)',
          borderBottom: '1px solid #E2E8F0',
        }}>
          <div style={{ maxWidth: 'var(--max-content-width)', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
              <ScrollReveal animation="slide-up">
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  background: 'rgba(0, 70, 255, 0.08)',
                  borderRadius: 'var(--radius-full)',
                  marginBottom: 'var(--space-3)',
                }}>
                  <span style={{ color: '#0046FF', fontSize: '13px' }}>📊</span>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#0046FF' }}>CAPAIAN & INDIKATOR MUTU</span>
                </div>
                <h2 style={{
                  fontSize: 'clamp(1.85rem, 3.8vw, 2.6rem)',
                  fontWeight: '900',
                  color: '#0F172A',
                  letterSpacing: '-0.02em',
                  marginBottom: 'var(--space-3)',
                }}>
                  Keunggulan Nyata dalam Angka & Pengakuan Resmi
                </h2>
                <p style={{ color: '#64748B', maxWidth: '620px', margin: '0 auto', fontSize: 'var(--font-size-base)', lineHeight: 1.7 }}>
                  Komitmen kami dalam menghadirkan sarana praktik terbaik, tenaga pendidik berkompeten, dan kemitraan industri yang terpercaya.
                </p>
              </ScrollReveal>
            </div>

            {/* Grid 4 Kartu Statistik dengan Tinggi & Lebar Rapi Seimbang */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 'var(--space-6)',
              alignItems: 'stretch',
            }}>
              {[
                { stat: '94%', label: 'Keterserapan Lulusan', sub: 'Bekerja & Wirausaha Mandiri', icon: '🎓', color: '#0046FF' },
                { stat: '35+', label: 'Mitra DUDI & Industri', sub: 'Kerjasama Resmi Nasional', icon: '🤝', color: '#0284C7' },
                { stat: '48+', label: 'Pendidik & Instruktur', sub: 'Tersertifikasi Asesor BNSP', icon: '👨‍🏫', color: '#10B981' },
                { stat: 'Akreditasi A', label: 'Predikat Sekolah', sub: 'Unggul • BAN-SM Nasional', icon: '⭐', color: '#F59E0B' },
              ].map((m, i) => (
                <ScrollReveal key={i} animation="slide-up" delay={i * 100} duration={800}>
                  <div className="stat-card-sales card-interactive" style={{
                    minHeight: '220px',
                    width: '100%',
                    padding: 'clamp(1.5rem, 2.5vw, 2rem)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                      <span style={{ fontSize: '2rem' }}>{m.icon}</span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        letterSpacing: '0.04em',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        background: `${m.color}15`,
                        color: m.color,
                        border: `1px solid ${m.color}35`,
                      }}>
                        RESMI
                      </span>
                    </div>

                    <div>
                      <div style={{
                        fontSize: 'clamp(1.9rem, 2.8vw, 2.5rem)',
                        fontWeight: '900',
                        color: '#0F172A',
                        lineHeight: 1.15,
                        marginBottom: '6px',
                        letterSpacing: '-0.02em',
                      }}>
                        {m.stat}
                      </div>
                      <div style={{ fontWeight: '800', fontSize: 'var(--font-size-base)', color: '#0F172A', marginBottom: '4px' }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: '#64748B', lineHeight: 1.5, fontWeight: '500' }}>
                        {m.sub}
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>


        {/* =======================================================
            6. SECTION MITRA INDUSTRI & DUDI (LINK & MATCH RESMI)
            ======================================================= */}
        <section style={{
          background: '#FFFFFF',
          padding: 'clamp(4.5rem, 6vw, 6rem) var(--space-6)',
          borderTop: '1px solid #E2E8F0',
          borderBottom: '1px solid #E2E8F0',
        }}>
          <div style={{ maxWidth: 'var(--max-content-width)', margin: '0 auto', textAlign: 'center' }}>
            <ScrollReveal animation="slide-up">
              <span style={{
                color: '#0046FF',
                fontWeight: '800',
                fontSize: 'var(--font-size-xs)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}>
                LINK & MATCH DUNIA INDUSTRI
              </span>
              <h2 style={{
                fontSize: 'clamp(1.85rem, 3.8vw, 2.6rem)',
                fontWeight: '900',
                margin: 'var(--space-2) 0 var(--space-3)',
                color: '#0F172A',
                letterSpacing: '-0.02em',
              }}>
                Bekerjasama dengan 35+ Industri & Korporasi Terkemuka
              </h2>
              <p style={{
                color: '#64748B',
                maxWidth: '620px',
                margin: '0 auto var(--space-8)',
                fontSize: 'var(--font-size-base)',
                lineHeight: 1.7,
              }}>
                Siswa SMK MU4RA memperoleh hak istimewa magang kerja terstruktur, sertifikasi teknisi berskala nasional, dan prioritas rekrutmen kerja setelah lulus.
              </p>
            </ScrollReveal>

            {/* Grid Logo/Badge Mitra DUDI Interaktif */}
            <ScrollReveal animation="slide-up" delay={150}>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 'var(--space-3)',
                maxWidth: '960px',
                margin: '0 auto',
              }}>
                {[
                  { name: 'PT Astra International Tbk', category: 'Otomotif & Manufaktur', icon: '🚗' },
                  { name: 'PT Yamaha Indonesia Motor', category: 'Teknologi Roda 2', icon: '🏍️' },
                  { name: 'PT PLN (Persero) Rayon Bangsri', category: 'Ketenagalistrikan', icon: '⚡' },
                  { name: 'PT Telkom Indonesia Tbk', category: 'Telekomunikasi & Jaringan', icon: '🌐' },
                  { name: 'PT Astra Daihatsu Motor', category: 'Perakitan & Servis Mobil', icon: '🚗' },
                  { name: 'Jepara Creative Digital Hub', category: 'Studio Desain & Media', icon: '🎨' },
                  { name: 'PT Kayu Lapis Indonesia', category: 'Otomasi Industri Kayu', icon: '🏭' },
                  { name: 'Program Magang Kerja Jepang (IM Japan)', category: 'Peluang Karir Global', icon: '🇯🇵' },
                ].map((partner, idx) => (
                  <div key={idx} className="partner-chip">
                    <span style={{ fontSize: '1.25rem' }}>{partner.icon}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ color: '#0F172A', fontSize: '13px', fontWeight: '800' }}>{partner.name}</div>
                      <div style={{ color: '#64748B', fontSize: '11px', fontWeight: '500' }}>{partner.category}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>


        {/* =======================================================
            7. SECTION KISAH SUKSES ALUMNI & SUARA SISWA (HUMAN SOCIAL PROOF)
            ======================================================= */}
        <section style={{
          background: 'linear-gradient(180deg, #F8FAFC 0%, #EFF6FF 100%)',
          padding: 'clamp(5rem, 8vw, 7.5rem) var(--space-6)',
          borderBottom: '1px solid #E2E8F0',
        }}>
          <div style={{ maxWidth: 'var(--max-content-width)', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 'clamp(3rem, 5vw, 4.5rem)' }}>
              <ScrollReveal animation="slide-up">
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  background: 'rgba(0, 70, 255, 0.1)',
                  borderRadius: 'var(--radius-full)',
                  marginBottom: 'var(--space-3)',
                }}>
                  <span style={{ color: '#0046FF', fontSize: '13px' }}>★ ★ ★ ★ ★</span>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#0046FF' }}>TESTIMONI RESMI ALUMNI</span>
                </div>
                <h2 style={{
                  fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                  fontWeight: '900',
                  color: '#0F172A',
                  letterSpacing: '-0.02em',
                  marginBottom: 'var(--space-3)',
                }}>
                  Mencetak Generasi Siap Kerja & Berdaya Saing
                </h2>
                <p style={{ color: '#64748B', maxWidth: '620px', margin: '0 auto', fontSize: 'var(--font-size-base)', lineHeight: 1.7 }}>
                  Simak pengalaman nyata para alumni yang telah membuktikan kualitas pembelajaran aplikatif berstandar industri di SMK MU4RA.
                </p>
              </ScrollReveal>
            </div>

            {/* Grid 3 Human Testimonial Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 'var(--space-6)',
            }}>
              {[
                {
                  name: 'Agus Pratama',
                  role: 'Senior Diagnostic Technician',
                  company: 'Astra Motor Group',
                  jurusan: 'Alumni Teknik Kendaraan Ringan (TKR) 2023',
                  avatar: '/images/alumni_otomotif.jpg',
                  rating: 5,
                  tag: '🚗 Rekrutmen Langsung DUDI',
                  quote: 'Jam praktik bengkel yang dominan dan kedisiplinan guru di SMK MU4RA membuat saya percaya diri saat tes kerja. Lulus langsung diterima di jaringan bengkel resmi Astra!',
                },
                {
                  name: 'Nadia Khairunnisa',
                  role: 'Digital Branding & UI Designer',
                  company: 'Creative Media Studio',
                  jurusan: 'Alumni Desain Komunikasi Visual (DKV) 2024',
                  avatar: '/images/alumni_dkv.jpg',
                  rating: 5,
                  tag: '🎨 Industri Kreatif & Agensi',
                  quote: 'Fasilitas lab komputer iMac dan kamera studio sangat menunjang portofolio saya. Sejak semester 4 kami dibiasakan menangani pesanan klien nyata dengan standar agensi.',
                },
                {
                  name: 'Rizky Pratama',
                  role: 'Automation Control Specialist',
                  company: 'TechSol Industrial Automation',
                  jurusan: 'Alumni Teknik Instalasi Tenaga Listrik (TITL) 2023',
                  avatar: '/images/alumni_industri.jpg',
                  rating: 5,
                  tag: '⚡ Otomasi Panel Industri',
                  quote: 'Materi panel 3 fasa, motor industri, dan pemrograman PLC di SMK MU4RA sama persis dengan sistem otomatisasi di pabrik. Kurikulumnya benar-benar link & match!',
                },
              ].map((alumni, idx) => (
                <ScrollReveal key={idx} animation="slide-up" delay={idx * 150} duration={800}>
                  <div className="testimonial-card-sales">
                    <div>
                      {/* Top Bar Card: Stars & Tag */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                        <div style={{ color: '#F59E0B', fontSize: '14px', letterSpacing: '2px' }}>
                          {'★'.repeat(alumni.rating)}
                        </div>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '4px 10px',
                          background: 'rgba(0, 70, 255, 0.08)',
                          color: '#0046FF',
                          borderRadius: 'var(--radius-full)',
                        }}>
                          {alumni.tag}
                        </span>
                      </div>

                      {/* Kutipan Testimoni */}
                      <p style={{
                        fontSize: 'var(--font-size-base)',
                        lineHeight: 1.7,
                        color: '#334155',
                        marginBottom: 'var(--space-6)',
                        fontStyle: 'normal',
                      }}>
                        "{alumni.quote}"
                      </p>
                    </div>

                    {/* Human Profile Footer */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-4)',
                      paddingTop: 'var(--space-4)',
                      borderTop: '1px solid #F1F5F9',
                    }}>
                      <div style={{ position: 'relative' }}>
                        <img
                          src={alumni.avatar}
                          alt={alumni.name}
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2.5px solid #0046FF',
                            boxShadow: '0 4px 12px rgba(0, 70, 255, 0.2)',
                          }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: '2px',
                          right: '2px',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: '#10B981',
                          border: '2px solid white',
                        }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '800', fontSize: 'var(--font-size-base)', color: '#0F172A' }}>
                          {alumni.name}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: '#0046FF', fontWeight: '700' }}>
                          {alumni.role}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          {alumni.company} • <span style={{ color: '#475569' }}>{alumni.jurusan}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>


        {/* =======================================================
            8. SECTION PENUTUP & CTA DAFTAR PPDB (ELECTRIC BLUE ACCENTS)
            ======================================================= */}
        <section style={{
          maxWidth: 'var(--max-content-width)',
          margin: '0 auto',
          padding: 'clamp(4.5rem, 7vw, 6.5rem) var(--space-6)',
        }}>
          <ScrollReveal animation="zoom" duration={700}>
            <div style={{
              background: 'linear-gradient(135deg, #0A0F1D 0%, #001A66 45%, #0046FF 100%)',
              color: 'white',
              borderRadius: 'var(--radius-2xl)',
              padding: 'clamp(2.5rem, 5vw, 4.5rem) var(--space-8)',
              textAlign: 'center',
              boxShadow: '0 30px 60px -15px rgba(0, 70, 255, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Subtle ambient decorative circle */}
              <div style={{
                position: 'absolute',
                top: '-50%',
                right: '-20%',
                width: '450px',
                height: '450px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0, 70, 255, 0.4) 0%, transparent 70%)',
                filter: 'blur(60px)',
                pointerEvents: 'none',
              }} />

              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 16px',
                  background: 'rgba(255, 255, 255, 0.12)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: '800',
                  color: '#93C5FD',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  marginBottom: 'var(--space-4)',
                }}>
                  <span>🎓</span>
                  <span>PENERIMAAN PESERTA DIDIK BARU (PPDB) DIBUKA</span>
                </div>

                <h2 style={{
                  fontSize: 'clamp(2rem, 4.5vw, 3rem)',
                  fontWeight: '900',
                  marginBottom: 'var(--space-3)',
                  letterSpacing: '-0.02em',
                  color: '#FFFFFF',
                }}>
                  Siap Menjadi Bagian dari SMK MU4RA?
                </h2>
                <p style={{
                  opacity: 0.92,
                  maxWidth: '640px',
                  margin: '0 auto var(--space-8)',
                  fontSize: 'var(--font-size-base)',
                  lineHeight: 1.7,
                  color: '#E2E8F0',
                }}>
                  Pendaftaran dibuka untuk 4 program keahlian unggulan (TKR, TSM, TITL, dan DKV). Amankan kuota jurusan impian Anda melalui pendaftaran online yang cepat dan transparan.
                </p>

                <div style={{
                  display: 'flex',
                  gap: 'var(--space-4)',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  marginBottom: 'var(--space-8)',
                }}>
                  <Button
                    size="lg"
                    onClick={() => navigate('/ppdb')}
                    className="btn-electric"
                    style={{
                      background: '#FFFFFF',
                      color: '#0046FF',
                      fontWeight: '800',
                      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.25)',
                      padding: '14px 28px',
                    }}
                  >
                    📝 Isi Formulir PPDB Online Sekarang →
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate('/login')}
                    className="btn-electric-outline"
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.4)',
                      color: '#FFFFFF',
                      background: 'rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(8px)',
                      padding: '14px 28px',
                    }}
                  >
                    🔑 Masuk Portal SIA Guru / Admin
                  </Button>
                </div>

                {/* 3 Sales Guarantee Points */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 'var(--space-6)',
                  flexWrap: 'wrap',
                  fontSize: 'var(--font-size-xs)',
                  color: '#CBD5E1',
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#38BDF8' }}>✓</span> Biaya Terjangkau & Beasiswa Tersedia
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#38BDF8' }}>✓</span> Bursa Kerja Khusus (BKK) Lulusan
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#38BDF8' }}>✓</span> Sertifikasi Kompetensi Resmi BNSP
                  </span>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

      </div>
    </div>
  );
}
