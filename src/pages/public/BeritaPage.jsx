/* ============================================================
   BeritaPage — Portal Berita & Informasi SMK MU4RA
   Desain: Clean, Direct, & Professional
   - Header ringkas "Berita Terkini" tanpa section jumbo yang memakan tempat
   - Filter pill kategori & pencarian cepat langsung di atas kartu
   - Grid kartu berita berfoto dengan efek hover & metadata SVG bersih
   ============================================================ */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNews } from '../../services/api';
import { formatDate } from '../../utils/helpers';
import ScrollReveal from '../../components/shared/ScrollReveal';

export default function BeritaPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Semua');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    getNews().then(data => {
      setNews(data);
      setLoading(false);
    });
  }, []);

  const categories = useMemo(() => {
    return ['Semua', ...new Set(news.map(n => n.category))];
  }, [news]);

  const filteredNews = useMemo(() => {
    return news.filter(item => {
      const matchCategory = filter === 'Semua' || item.category === filter;
      const matchSearch =
        searchTerm.trim() === '' ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.author && item.author.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [news, filter, searchTerm]);

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', padding: 'clamp(2rem, 4vw, 3rem) 0 var(--space-16)' }}>
      <div style={{
        maxWidth: 'var(--max-content-width)',
        margin: '0 auto',
        padding: '0 clamp(1rem, 3.5vw, 2rem)',
      }}>

        {/* =======================================================
            HEADER LANGSUNG: "BERITA TERKINI" & SEARCH
            ======================================================= */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}>
          <div>
            <span style={{
              display: 'inline-block',
              fontSize: '0.75rem',
              fontWeight: '700',
              color: '#0046FF',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}>
              INFORMASI & PUBLIKASI
            </span>
            <h1 style={{
              fontSize: 'clamp(1.85rem, 3.5vw, 2.5rem)',
              fontWeight: '900',
              color: '#0F172A',
              letterSpacing: '-0.02em',
              margin: '0 0 6px 0',
              lineHeight: 1.2,
            }}>
              Berita Terkini
            </h1>
            <p style={{
              color: '#64748B',
              fontSize: '0.95rem',
              margin: 0,
              maxWidth: '560px',
            }}>
              Informasi resmi seputar kegiatan akademik, prestasi siswa, dan agenda sekolah.
            </p>
          </div>

          {/* Compact Quick Search */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '300px',
          }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari berita atau agenda..."
              style={{
                width: '100%',
                padding: '10px 34px 10px 38px',
                borderRadius: '9999px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                color: '#0F172A',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0046FF';
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 70, 255, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#CBD5E1';
                e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Hapus pencarian"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* =======================================================
            CATEGORY FILTER PILLS BAR
            ======================================================= */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-8)',
          paddingBottom: 'var(--space-4)',
          borderBottom: '1px solid #E2E8F0',
        }}>
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            {categories.map(cat => {
              const count = cat === 'Semua' ? news.length : news.filter(n => n.category === cat).length;
              const isActive = filter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  style={{
                    padding: '7px 15px',
                    borderRadius: '9999px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: isActive ? '#0046FF' : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : '#475569',
                    border: isActive ? '1px solid #0046FF' : '1px solid #E2E8F0',
                    boxShadow: isActive ? '0 3px 10px rgba(0, 70, 255, 0.25)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = '#0046FF';
                      e.currentTarget.style.color = '#0046FF';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.color = '#475569';
                    }
                  }}
                >
                  <span>{cat}</span>
                  <span style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    background: isActive ? 'rgba(255, 255, 255, 0.25)' : '#F1F5F9',
                    color: isActive ? '#FFFFFF' : '#64748B',
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: '13px', color: '#64748B' }}>
            Menampilkan <strong style={{ color: '#0F172A' }}>{filteredNews.length}</strong> artikel
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: '#64748B' }}>
            <div style={{
              display: 'inline-block',
              width: '36px',
              height: '36px',
              border: '3px solid #E2E8F0',
              borderTopColor: '#0046FF',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginBottom: 'var(--space-3)',
            }} />
            <div>Memuat berita...</div>
          </div>
        )}

        {/* =======================================================
            NEWS CARDS GRID (DIRECT & CLEAN WITH PHOTOGRAPHY)
            ======================================================= */}
        {!loading && filteredNews.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 'clamp(1.25rem, 2.5vw, 1.75rem)',
          }}>
            {filteredNews.map((item, idx) => (
              <ScrollReveal key={item.id} animation="slide-up" delay={idx * 80} duration={1300}>
                <div
                  onClick={() => navigate(`/berita/${item.id}`)}
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
                    overflow: 'hidden',
                    background: '#FFFFFF',
                    transition: 'all 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px)';
                    e.currentTarget.style.boxShadow = '0 18px 30px -8px rgba(0, 70, 255, 0.16)';
                    const img = e.currentTarget.querySelector('.berita-grid-img');
                    if (img) img.style.transform = 'scale(1.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.05)';
                    const img = e.currentTarget.querySelector('.berita-grid-img');
                    if (img) img.style.transform = 'scale(1.0)';
                  }}
                >
                  {/* Photo Container */}
                  <div style={{
                    height: '210px',
                    position: 'relative',
                    overflow: 'hidden',
                    background: '#0B132B',
                  }}>
                    <img
                      className="berita-grid-img"
                      src={item.image || '/images/gedung_sekolah.jpg'}
                      alt={item.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    />
                    {/* Floating Category Badge */}
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

                  {/* Card Content */}
                  <div style={{
                    padding: 'var(--space-5)',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    justifyContent: 'space-between',
                  }}>
                    <div>
                      {/* Meta: Clean Date */}
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

                    {/* Card Footer: Author & Link */}
                    <div style={{
                      marginTop: 'var(--space-5)',
                      paddingTop: 'var(--space-3)',
                      borderTop: '1px solid #F1F5F9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#64748B',
                        fontWeight: '500',
                      }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <span>{item.author}</span>
                      </div>

                      <div style={{
                        color: '#0046FF',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}>
                        <span>Baca</span>
                        <span>→</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredNews.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-16) var(--space-6)',
            background: '#FFFFFF',
            borderRadius: '24px',
            border: '1px dashed #CBD5E1',
            maxWidth: '520px',
            margin: '0 auto',
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(0, 70, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)',
              color: '#0046FF',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '8px', color: '#0F172A' }}>
              Tidak Ada Berita Ditemukan
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: 'var(--space-6)' }}>
              Tidak ada artikel yang cocok dengan pencarian atau filter yang dipilih.
            </p>
            <button
              onClick={() => { setFilter('Semua'); setSearchTerm(''); }}
              style={{
                padding: '9px 20px',
                borderRadius: '9999px',
                background: '#0046FF',
                color: '#FFFFFF',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0, 70, 255, 0.25)',
              }}
            >
              Reset Filter
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
