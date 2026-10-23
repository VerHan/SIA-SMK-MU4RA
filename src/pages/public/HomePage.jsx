/* ============================================================
   HomePage — Landing Page & Profil Sekolah SMK Muhammadiyah 04 Bangsri
   Dilengkapi:
   1. Intro Film / Google Gemini Vibe dengan Glowing Shimmer & Indikator Scroll
   2. Profil Foto Sekolah & Denah Kawasan Kampus
   3. Visi & Misi Sekolah
   4. 4 Program Keahlian (TKR, TSM, TITL, DKV) Format Selang-Seling (Zig-Zag)
   5. Media Informasi Berita (Fixed Card Layout)
   6. Pendaftaran Online (PPDB) & Portal SIA
   ============================================================ */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SCHOOL_INFO, JURUSAN_LIST } from '../../config/constants';
import { getNews, getDashboardStats } from '../../services/api';
import { formatDate } from '../../utils/helpers';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ScrollReveal from '../../components/shared/ScrollReveal';
import SmkLogoEmblem from '../../components/shared/SmkLogoEmblem';

export default function HomePage() {
  const [news, setNews] = useState([]);
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();
  const profileSectionRef = useRef(null);

  useEffect(() => {
    getNews().then(data => setNews(data.slice(0, 3)));
    getDashboardStats().then(setStats);
  }, []);

  const scrollToProfile = () => {
    profileSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ overflowX: 'hidden', background: '#0F172A', color: '#F8FAFC' }}>

      {/* =======================================================
          1. HERO SECTION — CLEAN & POWERFUL COPYWRITING
          ======================================================= */}
      <section style={{
        minHeight: 'calc(100vh - var(--navbar-height))',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        padding: 'var(--space-12) var(--space-6) var(--space-16)',
        textAlign: 'center',
        background: 'radial-gradient(ellipse at 50% 20%, rgba(0, 70, 255, 0.22) 0%, rgba(15, 23, 42, 0.98) 60%, #080D1A 100%)',
        overflow: 'hidden',
      }}>
        {/* Subtle ambient glow — cleaner, less aggressive */}
        <div className="animate-gemini-glow" style={{
          position: 'absolute',
          top: '18%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '480px',
          height: '480px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 70, 255, 0.2) 0%, rgba(100, 50, 255, 0.08) 50%, transparent 75%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }} />

        {/* Secondary soft glow accent */}
        <div style={{
          position: 'absolute',
          bottom: '10%',
          right: '15%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 70, 255, 0.1) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '920px', zIndex: 2 }}>
          {/* Logo — smaller and cleaner */}
          <div className="intro-logo-anim" style={{ marginBottom: 'var(--space-8)' }}>
            <SmkLogoEmblem size="lg" withRing={false} />
          </div>

          {/* Overline — simple, clean label */}
          <div className="intro-title-anim">
            <span style={{
              display: 'inline-block',
              fontSize: '0.8rem',
              fontWeight: '600',
              color: '#64748B',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginBottom: 'var(--space-4)',
            }}>
              SMK Muhammadiyah 04 Bangsri — Jepara
            </span>
          </div>

          {/* HEADLINE — Powerful copywriting with SVG highlight */}
          <div className="intro-title-anim">
            <h1 style={{
              fontSize: 'clamp(2.6rem, 6.5vw, 4.8rem)',
              fontWeight: '900',
              lineHeight: 1.08,
              letterSpacing: '-0.04em',
              marginBottom: 'var(--space-6)',
              color: '#FFFFFF',
            }}>
              Cetak{' '}
              <span style={{ position: 'relative', display: 'inline-block' }}>
                <span style={{
                  background: 'linear-gradient(135deg, #60A5FA 0%, #0046FF 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  Masa Depan
                </span>
                {/* SVG Hand-drawn underline accent */}
                <svg
                  viewBox="0 0 200 12"
                  fill="none"
                  style={{
                    position: 'absolute',
                    bottom: '-6px',
                    left: '-4%',
                    width: '108%',
                    height: '12px',
                    pointerEvents: 'none',
                  }}
                >
                  <path
                    d="M3 8C30 3 70 2 100 5C130 8 165 4 197 6"
                    stroke="#0046FF"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.7"
                    className="hero-underline-draw"
                  />
                </svg>
              </span>
              .<br />
              Mulai Dari Sini.
            </h1>
          </div>

          {/* Subheadline — clear value proposition */}
          <div className="intro-desc-anim">
            <p style={{
              fontSize: 'clamp(1.05rem, 2.2vw, 1.3rem)',
              color: '#94A3B8',
              maxWidth: '640px',
              margin: '0 auto var(--space-8)',
              lineHeight: 1.75,
              fontWeight: '400',
            }}>
              Pendidikan vokasi terakreditasi <strong style={{ color: '#CBD5E1', fontWeight: '600' }}>A</strong> yang memadukan
              karakter Islami, disiplin industri, dan penguasaan teknologi —
              mencetak <strong style={{ color: '#CBD5E1', fontWeight: '600' }}>94% lulusan siap kerja</strong>.
            </p>
          </div>

          {/* CTA Buttons — clean, no emoji */}
          <div className="intro-actions-anim">
            <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 'var(--space-10)' }}>
              <Button
                size="lg"
                onClick={scrollToProfile}
                style={{
                  background: '#0046FF',
                  color: 'white',
                  fontWeight: '700',
                  padding: '14px 32px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 24px rgba(0, 70, 255, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  fontSize: '0.95rem',
                }}
              >
                Jelajahi Sekolah
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/ppdb')}
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#E2E8F0',
                  padding: '14px 32px',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  background: 'rgba(255, 255, 255, 0.04)',
                }}
              >
                Daftar PPDB Online →
              </Button>
            </div>

            {/* Trust indicators — clean text badges, no floating emojis */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 'var(--space-8)',
              flexWrap: 'wrap',
              fontSize: '0.8rem',
              color: '#64748B',
              fontWeight: '500',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                Akreditasi A
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0046FF', display: 'inline-block' }} />
                4 Program Keahlian
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
                35+ Mitra Industri
              </span>
            </div>
          </div>
        </div>

        {/* Scroll indicator — subtle */}
        <div className="intro-scroll-anim" style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
        }}>
          <div style={{
            width: '24px',
            height: '40px',
            borderRadius: '12px',
            border: '2px solid rgba(255, 255, 255, 0.15)',
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '8px',
          }}>
            <div style={{
              width: '3px',
              height: '8px',
              borderRadius: '2px',
              background: 'rgba(255, 255, 255, 0.3)',
              animation: 'bounceSlow 2s ease-in-out infinite',
            }} />
          </div>
        </div>
      </section>


      {/* =======================================================
          KONTEN UTAMA (TRANSISI LATAR PUTIH & SLATE BERSIH)
          ======================================================= */}
      <div ref={profileSectionRef} style={{ background: '#F8FAFC', color: '#0F172A' }}>

        {/* =======================================================
            2. SECTION PROFIL & FOTO SEKOLAH (SCROLL REVEAL)
            ======================================================= */}
        <section style={{
          maxWidth: 'var(--max-content-width)',
          margin: '0 auto',
          padding: 'clamp(5rem, 8vw, 7.5rem) var(--space-6)',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'clamp(2.5rem, 5vw, 4.5rem)',
            alignItems: 'center',
          }}>
            {/* Foto Sekolah (Meluncur dari KIRI) dengan Tampilan Bersih & Elegan */}
            <ScrollReveal animation="slide-left" duration={1400}>
              <div
                className="card-interactive"
                style={{
                  position: 'relative',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.14)',
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  background: '#FFFFFF',
                }}
              >
                {/* Floating Clean Stat Badge (Top-Left) */}
                <div style={{
                  position: 'absolute',
                  top: '1.25rem',
                  left: '1.25rem',
                  zIndex: 4,
                  background: 'rgba(255, 255, 255, 0.94)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  padding: '0.65rem 1rem',
                  borderRadius: '14px',
                  boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#10B981',
                    display: 'inline-block',
                    boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.25)',
                  }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                      Akreditasi A Unggul
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '500' }}>
                      BAN-SM Nasional
                    </div>
                  </div>
                </div>

                <img
                  src="/images/gedung_sekolah.jpg"
                  alt="Gedung Kampus SMK Muhammadiyah 04 Bangsri"
                  style={{
                    width: '100%',
                    height: 'auto',
                    minHeight: '380px',
                    maxHeight: '480px',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
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
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '16px',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#93C5FD', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Kampus Pusat Keunggulan
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#FFFFFF' }}>
                      Wedelan, Bangsri, Jepara
                    </div>
                  </div>
                  <div style={{
                    fontSize: '0.72rem',
                    color: '#94A3B8',
                    background: 'rgba(255, 255, 255, 0.08)',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontWeight: '600',
                  }}>
                    Est. 1997
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Ulasan Profil (Meluncur dari KANAN) */}
            <ScrollReveal animation="slide-right" duration={1400} delay={120}>
              <div>
                <span className="section-overline">
                  PROFIL INSTITUSI
                </span>

                <h2 style={{
                  fontSize: 'clamp(1.85rem, 3.8vw, 2.75rem)',
                  fontWeight: '900',
                  lineHeight: 1.2,
                  letterSpacing: '-0.025em',
                  margin: '0.5rem 0 1.25rem',
                  color: '#0F172A',
                }}>
                  Membangun Kompetensi Nyata Berlandaskan <span style={{ color: '#0046FF' }}>Nilai Luhur</span>.
                </h2>

                <p style={{
                  fontSize: '1rem',
                  lineHeight: 1.75,
                  color: '#475569',
                  marginBottom: '1.75rem',
                }}>
                  <strong style={{ color: '#0F172A' }}>{SCHOOL_INFO.name}</strong> (dikenal sebagai <em>SMK MU4RA</em>) adalah sekolah menengah kejuruan pusat keunggulan di kawasan utara Jepara. Memadukan kurikulum berbasis industri modern dengan penanaman karakter Islami, kami membekali setiap lulusan dengan keterampilan teknis aplikatif siap kerja dan berdaya saing global.
                </p>

                {/* 3 Keunggulan — Clean Minimalist SVG Rows */}
                <div style={{ display: 'grid', gap: '0.85rem', marginBottom: '1.5rem' }}>
                  {[
                    {
                      title: 'Bengkel & Laboratorium Standar Industri',
                      desc: 'Fasilitas praktik komprehensif untuk mesin mobil, motor injeksi EFI, panel kelistrikan 3 fasa, dan studio komputer DKV modern.',
                    },
                    {
                      title: 'Link & Match Dunia Usaha / Industri (DUDI)',
                      desc: 'Kemitraan strategis dengan 35+ industri manufaktur ternama, bengkel resmi APM, dan agensi kreatif untuk PKL dan rekrutmen kerja.',
                    },
                    {
                      title: 'Penguatan Mentalitas & Karakter Islami',
                      desc: 'Pembiasaan ibadah berjamaah, etika profesional, kejujuran kerja, dan jiwa mandiri berwirausaha.',
                    },
                  ].map((feat, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      padding: '1rem 1.25rem',
                      background: 'white',
                      borderRadius: '16px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                      transition: 'all 0.3s ease',
                    }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'rgba(0, 70, 255, 0.08)',
                        color: '#0046FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.92rem', color: '#0F172A', marginBottom: '2px' }}>
                          {feat.title}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.55 }}>
                          {feat.desc}
                        </div>
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
          background: '#F1F5F9',
          padding: 'clamp(5rem, 8vw, 7.5rem) var(--space-6)',
          borderTop: '1px solid #E2E8F0',
          borderBottom: '1px solid #E2E8F0',
        }}>
          <div style={{ maxWidth: 'var(--max-content-width)', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 'clamp(3rem, 5vw, 4.5rem)' }}>
              <ScrollReveal animation="slide-up" duration={1400}>
                <span className="section-overline">
                  TATA RUANG & FASILITAS
                </span>
                <h2 className="section-headline">
                  Kawasan Kampus Terpadu untuk <span style={{ color: '#0046FF' }}>Praktik Nyata</span>.
                </h2>
                <p className="section-subtitle">
                  Tata letak laboratorium kejuruan, bengkel standar industri, studio kreatif, dan sarana ibadah terintegrasi seluas 1,5 hektar mendukung iklim belajar yang aktif dan kondusif.
                </p>
              </ScrollReveal>
            </div>

            {/* Peta Denah Fasilitas */}
            <ScrollReveal animation="slide-up" duration={1400} delay={120}>
              <div style={{
                background: 'white',
                borderRadius: '24px',
                padding: 'clamp(1.75rem, 4vw, 2.75rem)',
                boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.08)',
                border: '1px solid #E2E8F0',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '2rem',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  borderBottom: '1px solid #F1F5F9',
                  paddingBottom: '1.25rem',
                }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: '#0F172A', letterSpacing: '-0.02em' }}>
                      Direktori Zona & Gedung Kampus
                    </h3>
                    <span style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: '500' }}>
                      Kawasan Terpadu SMK Muhammadiyah 04 Bangsri (Wedelan)
                    </span>
                  </div>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0.4rem 0.9rem',
                    background: 'rgba(16, 185, 129, 0.08)',
                    color: '#059669',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                    Area Terpadu Bebas Rokok & Ramah Lingkungan
                  </span>
                </div>

                {/* Grid Denah Blok Ruangan — Clean SVG Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1.25rem',
                }}>
                  {[
                    {
                      code: 'BLOK A',
                      name: 'Gedung Rektorat & Tata Usaha',
                      desc: 'Ruang Kepala Sekolah, Guru, Administrasi, & Pelayanan Tamu',
                      color: '#0046FF',
                      svg: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" />
                        </svg>
                      ),
                    },
                    {
                      code: 'BLOK B',
                      name: 'Bengkel Otomotif TKR',
                      desc: 'Bengkel servis mobil, car lift, perbaikan transmisi & mesin roda 4',
                      color: '#EF4444',
                      svg: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2" />
                          <circle cx="7" cy="17" r="2" />
                          <path d="M9 17h6" />
                          <circle cx="17" cy="17" r="2" />
                        </svg>
                      ),
                    },
                    {
                      code: 'BLOK C',
                      name: 'Bengkel Sepeda Motor TSM',
                      desc: 'Simulator injeksi EFI, bike lift, tune-up & overhaul motor roda 2',
                      color: '#F59E0B',
                      svg: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                        </svg>
                      ),
                    },
                    {
                      code: 'BLOK D',
                      name: 'Lab Kelistrikan TITL',
                      desc: 'Papan instalasi penerangan, perakitan panel daya 3 fasa, & PLC',
                      color: '#0284C7',
                      svg: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                      ),
                    },
                    {
                      code: 'BLOK E',
                      name: 'Studio Kreatif & Lab DKV',
                      desc: 'Lab komputer desain grafis, editing video, & studio fotografi',
                      color: '#8B5CF6',
                      svg: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                          <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                        </svg>
                      ),
                    },
                    {
                      code: 'BLOK F',
                      name: 'Mushola Baiturrahman',
                      desc: 'Pusat ibadah sholat dhuhur & ashar berjamaah seluruh warga sekolah',
                      color: '#10B981',
                      svg: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                        </svg>
                      ),
                    },
                    {
                      code: 'BLOK G',
                      name: 'Perpustakaan & Ruang Teori',
                      desc: 'Ruang kelas ber-AC, proyektor interaktif, & koleksi literasi',
                      color: '#475569',
                      svg: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </svg>
                      ),
                    },
                    {
                      code: 'BLOK H',
                      name: 'Lapangan Serbaguna',
                      desc: 'Upacara bendera, olahraga futsal/voli, & apel kedisiplinan',
                      color: '#059669',
                      svg: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                          <path d="M2 12h20" />
                        </svg>
                      ),
                    },
                  ].map((zone, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '1.25rem',
                        background: '#FFFFFF',
                        borderRadius: '16px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
                        transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.borderColor = zone.color;
                        e.currentTarget.style.boxShadow = `0 12px 24px -6px ${zone.color}20`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = '#E2E8F0';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(15, 23, 42, 0.03)';
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: '800',
                            color: zone.color,
                            letterSpacing: '0.08em',
                            background: `${zone.color}14`,
                            padding: '2px 8px',
                            borderRadius: '6px',
                          }}>
                            {zone.code}
                          </span>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: `${zone.color}12`,
                            color: zone.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            {zone.svg}
                          </div>
                        </div>
                        <div style={{ fontWeight: '700', fontSize: '0.92rem', color: '#0F172A', marginBottom: '0.35rem' }}>
                          {zone.name}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.55, marginTop: '0.5rem' }}>
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
          padding: 'clamp(5rem, 8vw, 7.5rem) var(--space-6)',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'var(--space-8)',
            alignItems: 'stretch',
          }}>
            {/* Visi Sekolah (Slide Kiri) */}
            <ScrollReveal animation="slide-left" duration={1400}>
              <div style={{
                background: 'linear-gradient(135deg, #091E42 0%, #0046FF 100%)',
                color: 'white',
                borderRadius: '24px',
                padding: 'clamp(2.25rem, 5vw, 3.25rem)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 25px 50px -12px rgba(0, 70, 255, 0.28)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}>
                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0.35rem 0.85rem',
                    background: 'rgba(255, 255, 255, 0.12)',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#93C5FD',
                    marginBottom: '1.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#60A5FA' }} />
                    VISI INSTITUSI
                  </div>
                  <h3 style={{
                    fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
                    fontWeight: '800',
                    lineHeight: 1.35,
                    marginBottom: '1.5rem',
                    color: '#FFFFFF',
                    letterSpacing: '-0.02em',
                  }}>
                    "{SCHOOL_INFO.visi}"
                  </h3>
                </div>

                <div style={{
                  paddingTop: '1.5rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                  fontSize: '0.88rem',
                  color: 'rgba(255, 255, 255, 0.85)',
                  lineHeight: 1.65,
                  fontWeight: '400',
                }}>
                  Landasan filosofis yang menjiwai seluruh proses pembelajaran, keteladanan moral, dan tata kelola di SMK Muhammadiyah 04 Bangsri.
                </div>
              </div>
            </ScrollReveal>

            {/* Misi Sekolah (Slide Kanan) */}
            <ScrollReveal animation="slide-right" duration={1400} delay={120}>
              <div style={{
                background: 'white',
                borderRadius: '24px',
                padding: 'clamp(2.25rem, 5vw, 3.25rem)',
                height: '100%',
                boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.06)',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0.35rem 0.85rem',
                    background: 'rgba(0, 70, 255, 0.08)',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#0046FF',
                    marginBottom: '1rem',
                    border: '1px solid rgba(0, 70, 255, 0.18)',
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0046FF' }} />
                    MISI STRATEGIS
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '1.5rem', color: '#0F172A', letterSpacing: '-0.02em' }}>
                    4 Pilar Langkah Aksi Nyata
                  </h3>

                  <div style={{ display: 'grid', gap: '0.9rem' }}>
                    {SCHOOL_INFO.misi.map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <span style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '8px',
                          background: '#EFF6FF',
                          color: '#0046FF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '0.78rem',
                          flexShrink: 0,
                          border: '1px solid rgba(0, 70, 255, 0.2)',
                          marginTop: '2px',
                        }}>
                          0{i + 1}
                        </span>
                        <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: '#334155', margin: 0, fontWeight: '500' }}>
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>


        {/* =======================================================
            5. SECTION 4 JURUSAN ZIG-ZAG (FULL SCREEN MOTION SHOWCASE)
            TKR, TSM, TITL, DKV — Selang-seling Kiri & Kanan!
            Latar Belakang Bersih & Terang dengan Teks Gelap Kontras Tinggi
            ============================        {/* =======================================================
            5. SECTION 4 JURUSAN ZIG-ZAG (MOTION SHOWCASE)
            TKR, TSM, TITL, DKV — Clean, Concise & High Contrast
            ======================================================= */}
        <section style={{
          background: '#FFFFFF',
          color: '#0F172A',
          padding: 'clamp(5rem, 8vw, 7.5rem) var(--space-6)',
          borderTop: '1px solid #E2E8F0',
        }}>
          <div style={{ maxWidth: 'var(--max-content-width)', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 'clamp(3.5rem, 6vw, 5.5rem)' }}>
              <ScrollReveal animation="slide-up" duration={1400}>
                <span className="section-overline">
                  PROGRAM KEAHLIAN
                </span>
                <h2 className="section-headline">
                  Keahlian Presisi untuk <span style={{ color: '#0046FF' }}>Masa Depan Industri</span>.
                </h2>
                <p className="section-subtitle">
                  4 bidang kejuruan unggulan dengan kurikulum berbasis industri modern, fasilitas bengkel standar APM, dan sertifikasi BNSP nasional.
                </p>
              </ScrollReveal>
            </div>

            {/* List 4 Jurusan Selang-Seling (Zig-Zag) */}
            <div style={{ display: 'grid', gap: 'clamp(4.5rem, 8vw, 7rem)' }}>
              {JURUSAN_LIST.map((jurusan, index) => {
                const isImageLeft = index % 2 === 1;

                return (
                  <div
                    key={jurusan.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                      gap: 'clamp(2.5rem, 5vw, 5rem)',
                      alignItems: 'center',
                    }}
                  >
                    {/* BAGIAN TEKS PENJELASAN */}
                    <div style={{ order: isImageLeft ? 2 : 1 }}>
                      <ScrollReveal animation={isImageLeft ? 'slide-right' : 'slide-left'} duration={1400}>
                        <div>
                          {/* Clean Overline Tag */}
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '0.35rem 0.85rem',
                            background: `${jurusan.color}10`,
                            color: jurusan.color,
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            border: `1px solid ${jurusan.color}25`,
                            marginBottom: '1rem',
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: jurusan.color }} />
                            <span>0{index + 1} / {jurusan.badge}</span>
                          </div>

                          <h3 style={{
                            fontSize: 'clamp(1.75rem, 3.2vw, 2.35rem)',
                            fontWeight: '900',
                            color: '#0F172A',
                            lineHeight: 1.2,
                            letterSpacing: '-0.025em',
                            marginBottom: '1rem',
                          }}>
                            {jurusan.name} <span style={{ color: jurusan.color }}>({jurusan.shortName})</span>
                          </h3>

                          <p style={{
                            fontSize: '0.98rem',
                            lineHeight: 1.7,
                            color: '#475569',
                            marginBottom: '1.75rem',
                            fontWeight: '400',
                          }}>
                            {jurusan.description}
                          </p>

                          {/* Highlight Keahlian — Clean Minimalist Tags without Emojis */}
                          <div style={{ marginBottom: '2rem' }}>
                            <div style={{
                              fontSize: '0.72rem',
                              color: '#64748B',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              marginBottom: '0.75rem',
                            }}>
                              Fokus Kompetensi
                            </div>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                              gap: '0.65rem',
                            }}>
                              {jurusan.highlights.map((h, hIdx) => (
                                <div
                                  key={hIdx}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    fontSize: '0.82rem',
                                    color: '#0F172A',
                                    fontWeight: '600',
                                    background: '#F8FAFC',
                                    padding: '0.65rem 0.95rem',
                                    borderRadius: '12px',
                                    border: '1px solid #E2E8F0',
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  <span style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: jurusan.color,
                                    flexShrink: 0,
                                  }} />
                                  <span>{h}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Clean CTA Button */}
                          <Button
                            onClick={() => navigate('/ppdb')}
                            style={{
                              background: '#0F172A',
                              color: '#FFFFFF',
                              fontWeight: '700',
                              fontSize: '0.88rem',
                              padding: '0.75rem 1.5rem',
                              borderRadius: '12px',
                              border: '1px solid #1E293B',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.08)',
                              transition: 'all 0.25s ease',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = jurusan.color;
                              e.currentTarget.style.borderColor = jurusan.color;
                              e.currentTarget.style.boxShadow = `0 8px 20px ${jurusan.color}40`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#0F172A';
                              e.currentTarget.style.borderColor = '#1E293B';
                              e.currentTarget.style.boxShadow = '0 4px 14px rgba(15, 23, 42, 0.08)';
                            }}
                          >
                            <span>Daftar Jurusan {jurusan.shortName}</span>
                            <span>→</span>
                          </Button>
                        </div>
                      </ScrollReveal>
                    </div>

                    {/* BAGIAN GAMBAR KEGIATAN PRAKTIK */}
                    <div style={{ order: isImageLeft ? 1 : 2 }}>
                      <ScrollReveal animation={isImageLeft ? 'slide-left' : 'slide-right'} duration={1400}>
                        <div
                          className="card-interactive"
                          style={{
                            position: 'relative',
                            borderRadius: '24px',
                            overflow: 'hidden',
                            boxShadow: '0 20px 45px -12px rgba(15, 23, 42, 0.12)',
                            background: '#FFFFFF',
                            border: '1px solid rgba(226, 232, 240, 0.8)',
                          }}
                        >
                          {/* Clean Frosted Badge (Top-Left) */}
                          <div style={{
                            position: 'absolute',
                            top: '1rem',
                            left: '1rem',
                            zIndex: 3,
                            background: 'rgba(255, 255, 255, 0.94)',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            padding: '0.45rem 0.85rem',
                            borderRadius: '10px',
                            boxShadow: '0 8px 20px -4px rgba(15, 23, 42, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.8)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            color: '#0F172A',
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: jurusan.color }} />
                            <span>Standar Kompetensi BNSP</span>
                          </div>

                          <img
                            src={jurusan.image}
                            alt={`Kegiatan Praktik Siswa ${jurusan.name}`}
                            style={{
                              width: '100%',
                              height: 'auto',
                              minHeight: '360px',
                              maxHeight: '460px',
                              objectFit: 'cover',
                              display: 'block',
                              transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          />

                          {/* Clean Bottom Overlay */}
                          <div style={{
                            position: 'absolute',
                            bottom: '1rem',
                            left: '1rem',
                            right: '1rem',
                            padding: '0.75rem 1rem',
                            background: 'rgba(15, 23, 42, 0.82)',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            borderRadius: '14px',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                          }}>
                            <div>
                              <div style={{ fontSize: '0.68rem', color: '#93C5FD', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                Fasilitas Praktik
                              </div>
                              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#FFFFFF' }}>
                                Laboratorium & Bengkel {jurusan.shortName}
                              </div>
                            </div>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              color: '#E2E8F0',
                              background: 'rgba(255, 255, 255, 0.1)',
                              padding: '3px 9px',
                              borderRadius: '6px',
                            }}>
                              94% Serapan
                            </span>
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
            ======================================================= */}
        <section style={{
          background: '#F8FAFC',
          padding: 'clamp(5rem, 7vw, 7rem) var(--space-6)',
          borderBottom: '1px solid #E2E8F0',
        }}>
          <div style={{ maxWidth: 'var(--max-content-width)', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 'clamp(3rem, 5vw, 4.5rem)' }}>
              <ScrollReveal animation="slide-up" duration={1400}>
                <span className="section-overline">
                  INDIKATOR KREDIBILITAS
                </span>
                <h2 className="section-headline">
                  Hasil Nyata Terukur dalam <span style={{ color: '#0046FF' }}>Angka & Legalitas</span>.
                </h2>
                <p className="section-subtitle">
                  Standar mutu pendidikan kejuruan yang teruji dan diakui secara resmi oleh BAN-SM Nasional serta jejaring industri terkemuka.
                </p>
              </ScrollReveal>
            </div>

            {/* Grid 4 Kartu Statistik — Clean, High-Contrast Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.5rem',
              alignItems: 'stretch',
            }}>
              {[
                {
                  stat: '94%',
                  label: 'Keterserapan Lulusan',
                  sub: 'Bekerja langsung & wirausaha mandiri',
                  color: '#0046FF',
                  svg: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c3 3 9 3 12 0v-5" />
                    </svg>
                  ),
                },
                {
                  stat: '35+',
                  label: 'Mitra DUDI & Industri',
                  sub: 'Kerjasama resmi skala nasional & global',
                  color: '#0284C7',
                  svg: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  ),
                },
                {
                  stat: '48+',
                  label: 'Pendidik & Instruktur',
                  sub: 'Tersertifikasi Asesor BNSP resmi',
                  color: '#10B981',
                  svg: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                      <path d="m9 14 2 2 4-4" />
                    </svg>
                  ),
                },
                {
                  stat: 'Akreditasi A',
                  label: 'Predikat Sekolah',
                  sub: 'Predikat Unggul • BAN-SM Nasional',
                  color: '#F59E0B',
                  svg: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ),
                },
              ].map((m, i) => (
                <ScrollReveal key={i} animation="slide-up" delay={i * 120} duration={1350}>
                  <div
                    style={{
                      minHeight: '220px',
                      height: '100%',
                      background: '#FFFFFF',
                      borderRadius: '20px',
                      padding: 'clamp(1.75rem, 3vw, 2.25rem)',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = m.color;
                      e.currentTarget.style.boxShadow = `0 16px 32px -8px ${m.color}20`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.boxShadow = '0 4px 14px rgba(15, 23, 42, 0.04)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: `${m.color}12`,
                        color: m.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {m.svg}
                      </div>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: '700',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        background: `${m.color}10`,
                        color: m.color,
                        border: `1px solid ${m.color}25`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: m.color }} />
                        Terverifikasi
                      </span>
                    </div>

                    <div>
                      <div style={{
                        fontSize: 'clamp(2.2rem, 3.6vw, 3rem)',
                        fontWeight: '900',
                        color: '#0F172A',
                        lineHeight: 1.1,
                        letterSpacing: '-0.03em',
                        margin: '1.25rem 0 0.5rem',
                      }}>
                        {m.stat}
                      </div>
                      <div style={{ fontWeight: '700', fontSize: '1rem', color: '#0F172A', marginBottom: '4px' }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.5 }}>
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
            MITRA INDUSTRI & DUDI (LINK & MATCH RESMI)
            ======================================================= */}
        <section style={{
          background: '#FFFFFF',
          padding: 'clamp(5rem, 7vw, 7rem) var(--space-6)',
          borderTop: '1px solid #E2E8F0',
          borderBottom: '1px solid #E2E8F0',
        }}>
          <div style={{ maxWidth: 'var(--max-content-width)', margin: '0 auto', textAlign: 'center' }}>
            <ScrollReveal animation="slide-up" duration={1400}>
              <span className="section-overline">
                JARINGAN INDUSTRI
              </span>
              <h2 className="section-headline">
                Kemitraan Strategis Bersama <span style={{ color: '#0046FF' }}>35+ Industri Nasional</span>.
              </h2>
              <p className="section-subtitle">
                Membuka akses magang kerja terstruktur, sinkronisasi kurikulum APM, sertifikasi teknisi berstandar, dan prioritas rekrutmen kerja bagi lulusan.
              </p>
            </ScrollReveal>

            {/* Grid Logo/Badge Mitra DUDI — Clean Corporate Cards */}
            <ScrollReveal animation="slide-up" delay={120} duration={1400}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
                marginTop: 'clamp(2.5rem, 4vw, 3.5rem)',
              }}>
                {[
                  {
                    name: 'PT Astra International Tbk',
                    category: 'Otomotif & Manufaktur Nasional',
                    svg: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                    ),
                  },
                  {
                    name: 'PT Yamaha Indonesia Motor',
                    category: 'Teknologi Otomotif Roda 2',
                    svg: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                      </svg>
                    ),
                  },
                  {
                    name: 'PT PLN (Persero) Rayon Bangsri',
                    category: 'Ketenagalistrikan & Distribusi',
                    svg: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                    ),
                  },
                  {
                    name: 'PT Telkom Indonesia Tbk',
                    category: 'Infrastruktur Jaringan & Digital',
                    svg: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                    ),
                  },
                  {
                    name: 'PT Astra Daihatsu Motor',
                    category: 'Perakitan & Bengkel Resmi Mobil',
                    svg: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2" />
                        <circle cx="7" cy="17" r="2" />
                        <path d="M9 17h6" />
                        <circle cx="17" cy="17" r="2" />
                      </svg>
                    ),
                  },
                  {
                    name: 'Jepara Creative Digital Hub',
                    category: 'Studio Kreatif & Media Agency',
                    svg: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    ),
                  },
                  {
                    name: 'PT Kayu Lapis Indonesia',
                    category: 'Otomasi Pabrik Manufaktur',
                    svg: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                      </svg>
                    ),
                  },
                  {
                    name: 'Program IM Japan',
                    category: 'Magang Kerja Industri Jepang',
                    svg: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
                      </svg>
                    ),
                  },
                ].map((partner, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '1rem 1.25rem',
                      background: '#F8FAFC',
                      borderRadius: '16px',
                      border: '1px solid #E2E8F0',
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#0046FF';
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 70, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'rgba(0, 70, 255, 0.08)',
                      color: '#0046FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {partner.svg}
                    </div>
                    <div>
                      <div style={{ color: '#0F172A', fontSize: '0.88rem', fontWeight: '700', lineHeight: 1.3, marginBottom: '2px' }}>
                        {partner.name}
                      </div>
                      <div style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: '500' }}>
                        {partner.category}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>


        {/* =======================================================
            KISAH SUKSES ALUMNI & SUARA SISWA (HUMAN SOCIAL PROOF)
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
                <ScrollReveal key={idx} animation="slide-up" delay={idx * 160} duration={1350}>
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
            6. SECTION MEDIA BERITA TERBARU (FIXED CARD LAYOUT)
            ======================================================= */}
        <section style={{
          maxWidth: 'var(--max-content-width)',
          margin: '0 auto',
          padding: 'clamp(4.5rem, 7vw, 6.5rem) var(--space-6)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-8)',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
          }}>
            <ScrollReveal animation="slide-left" duration={1300}>
              <div>
                <span className="section-overline" style={{ color: '#38BDF8' }}>
                  KABAR & AGENDA RESMI
                </span>
                <h2 style={{
                  fontSize: 'clamp(1.75rem, 3.5vw, 2.4rem)',
                  fontWeight: '900',
                  margin: 'var(--space-1) 0 var(--space-2)',
                  color: '#FFFFFF',
                  letterSpacing: '-0.02em',
                }}>
                  Berita & Agenda Terkini
                </h2>
                <p style={{ color: '#94A3B8', margin: 0, fontSize: 'var(--font-size-sm)', maxWidth: '520px' }}>
                  Pembaruan resmi seputar inovasi akademik, agenda UKK, prestasi siswa, dan sinergi industri.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="slide-right" duration={1300}>
              <Button
                variant="outline"
                onClick={() => navigate('/berita')}
                style={{
                  color: '#FFFFFF',
                  borderColor: 'rgba(255, 255, 255, 0.25)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                Lihat Semua Berita →
              </Button>
            </ScrollReveal>
          </div>

          {/* Fixed Card Layout Grid with Photography */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'var(--space-6)',
          }}>
            {news.map((item, idx) => (
              <ScrollReveal key={item.id} animation="slide-up" delay={idx * 140} duration={1350}>
                <div
                  onClick={() => navigate(`/berita/${item.id}`)}
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
                    overflow: 'hidden',
                    background: '#FFFFFF',
                    transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px)';
                    e.currentTarget.style.boxShadow = '0 20px 35px -8px rgba(0, 70, 255, 0.25)';
                    const img = e.currentTarget.querySelector('.home-news-img');
                    if (img) img.style.transform = 'scale(1.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 10px 30px -10px rgba(0, 0, 0, 0.5)';
                    const img = e.currentTarget.querySelector('.home-news-img');
                    if (img) img.style.transform = 'scale(1.0)';
                  }}
                >
                  {/* Image Container with category pill badge */}
                  <div style={{
                    height: '195px',
                    position: 'relative',
                    overflow: 'hidden',
                    background: '#0B132B',
                  }}>
                    <img
                      className="home-news-img"
                      src={item.image || '/images/gedung_sekolah.jpg'}
                      alt={item.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      padding: '4px 12px',
                      background: 'rgba(15, 23, 42, 0.82)',
                      backdropFilter: 'blur(8px)',
                      color: '#60A5FA',
                      fontSize: '11px',
                      fontWeight: '700',
                      borderRadius: '9999px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      letterSpacing: '0.04em',
                    }}>
                      {item.category}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div style={{
                    padding: 'var(--space-5)',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    justifyContent: 'space-between',
                  }}>
                    <div>
                      {/* Meta: Clean Calendar Icon + Date */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: '#64748B',
                        marginBottom: 'var(--space-2)',
                        fontWeight: '600',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0046FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span>{formatDate(item.date)}</span>
                      </div>

                      {/* Title */}
                      <h3 style={{
                        fontSize: '1.05rem',
                        fontWeight: '800',
                        marginBottom: 'var(--space-2)',
                        lineHeight: 1.45,
                        color: '#0F172A',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {item.title}
                      </h3>

                      {/* Excerpt */}
                      <p style={{
                        fontSize: 'var(--font-size-sm)',
                        color: '#64748B',
                        lineHeight: 1.6,
                        margin: 0,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {item.excerpt}
                      </p>
                    </div>

                    {/* Footer link */}
                    <div style={{
                      marginTop: 'var(--space-4)',
                      paddingTop: 'var(--space-3)',
                      borderTop: '1px solid #F1F5F9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '13px',
                      color: '#0046FF',
                      fontWeight: '700',
                    }}>
                      <span>Baca Selengkapnya</span>
                      <span style={{ transition: 'transform 0.2s ease' }}>→</span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>


        {/* =======================================================
            7. SECTION PENUTUP & CTA DAFTAR PPDB (ELECTRIC BLUE ACCENTS)
            ======================================================= */}
        <section style={{
          maxWidth: 'var(--max-content-width)',
          margin: '0 auto',
          padding: '0 var(--space-6) var(--space-16)',
        }}>
          <ScrollReveal animation="zoom" duration={1400}>
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
