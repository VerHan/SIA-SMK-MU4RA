/* ============================================================
   BeritaDetailPage — Detail Artikel & Berita SMK MU4RA
   Desain: Clean Editorial dengan Hero Image & SVG Metadata
   ============================================================ */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getNewsById } from '../../services/api';
import { formatDate } from '../../utils/helpers';
import Button from '../../components/ui/Button';

export default function BeritaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    getNewsById(id).then(data => {
      setArticle(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div style={{
        textAlign: 'center',
        padding: 'var(--space-16) var(--space-6)',
        color: '#64748B',
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid #E2E8F0',
          borderTopColor: '#0046FF',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: 'var(--space-3)',
        }} />
        <div>Memuat artikel...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div style={{
        textAlign: 'center',
        padding: 'var(--space-16) var(--space-6)',
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#EF4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--space-4)',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: '800', marginBottom: 'var(--space-2)' }}>
          Artikel Tidak Ditemukan
        </h2>
        <p style={{ color: '#64748B', marginBottom: 'var(--space-6)' }}>
          Berita yang Anda cari mungkin telah dipindahkan atau tautan tidak valid.
        </p>
        <Button onClick={() => navigate('/berita')}>← Kembali ke Portal Berita</Button>
      </div>
    );
  }

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', padding: 'var(--space-8) var(--space-6) var(--space-16)' }}>
      <article style={{
        maxWidth: '820px',
        margin: '0 auto',
        background: '#FFFFFF',
        borderRadius: '24px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.06)',
        padding: 'clamp(1.5rem, 4vw, 3rem)',
      }}>

        {/* Breadcrumb Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: '#64748B',
          marginBottom: 'var(--space-6)',
          flexWrap: 'wrap',
        }}>
          <Link to="/" style={{ color: '#64748B', textDecoration: 'none' }}>Beranda</Link>
          <span>/</span>
          <Link to="/berita" style={{ color: '#64748B', textDecoration: 'none' }}>Berita</Link>
          <span>/</span>
          <span style={{ color: '#0046FF', fontWeight: '600' }}>{article.category}</span>
        </div>

        {/* Back Button */}
        <button
          onClick={() => navigate('/berita')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#F1F5F9',
            border: 'none',
            borderRadius: '9999px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '700',
            color: '#334155',
            cursor: 'pointer',
            marginBottom: 'var(--space-6)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#E2E8F0';
            e.currentTarget.style.color = '#0046FF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#F1F5F9';
            e.currentTarget.style.color = '#334155';
          }}
        >
          <span>←</span>
          <span>Kembali ke Berita</span>
        </button>

        {/* Category Pill */}
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <span style={{
            display: 'inline-block',
            padding: '4px 14px',
            background: 'rgba(0, 70, 255, 0.08)',
            color: '#0046FF',
            fontSize: '12px',
            fontWeight: '800',
            borderRadius: '9999px',
            border: '1px solid rgba(0, 70, 255, 0.2)',
            letterSpacing: '0.04em',
          }}>
            {article.category}
          </span>
        </div>

        {/* Article Headline */}
        <h1 style={{
          fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
          fontWeight: '900',
          lineHeight: 1.25,
          color: '#0F172A',
          letterSpacing: '-0.02em',
          marginBottom: 'var(--space-5)',
        }}>
          {article.title}
        </h1>

        {/* Author & Date Metadata with Clean SVG Icons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '13px',
          color: '#64748B',
          paddingBottom: 'var(--space-6)',
          borderBottom: '1px solid #F1F5F9',
          marginBottom: 'var(--space-6)',
          flexWrap: 'wrap',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0046FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {article.author}
          </span>

          <span style={{ color: '#CBD5E1' }}>•</span>

          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {formatDate(article.date)}
          </span>

          <span style={{ color: '#CBD5E1' }}>•</span>

          <span style={{ color: '#94A3B8' }}>3 Menit Baca</span>
        </div>

        {/* Hero Image */}
        {article.image && (
          <div style={{
            width: '100%',
            maxHeight: '440px',
            borderRadius: '16px',
            overflow: 'hidden',
            marginBottom: 'var(--space-8)',
            boxShadow: '0 12px 30px -10px rgba(0, 0, 0, 0.12)',
            background: '#0B132B',
          }}>
            <img
              src={article.image}
              alt={article.title}
              style={{
                width: '100%',
                height: '100%',
                maxHeight: '440px',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
        )}

        {/* Lead Excerpt */}
        {article.excerpt && (
          <div style={{
            fontSize: '1.1rem',
            lineHeight: 1.7,
            color: '#334155',
            fontWeight: '600',
            padding: 'var(--space-4) var(--space-5)',
            background: '#F8FAFC',
            borderRadius: '12px',
            borderLeft: '4px solid #0046FF',
            marginBottom: 'var(--space-6)',
          }}>
            {article.excerpt}
          </div>
        )}

        {/* Article Body Content */}
        <div style={{
          fontSize: '1rem',
          lineHeight: 1.85,
          color: '#334155',
        }}>
          {article.content.split('\n').map((paragraph, i) => (
            <p key={i} style={{ marginBottom: 'var(--space-5)' }}>
              {paragraph}
            </p>
          ))}
        </div>

        {/* Post Footer & School Info Banner */}
        <div style={{
          marginTop: 'var(--space-10)',
          paddingTop: 'var(--space-6)',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>
              SMK Muhammadiyah 04 Bangsri
            </div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>
              Pusat Keunggulan • Wedelan, Bangsri, Kabupaten Jepara
            </div>
          </div>

          <button
            onClick={() => navigate('/berita')}
            style={{
              padding: '10px 20px',
              borderRadius: '9999px',
              background: '#0046FF',
              color: '#FFFFFF',
              fontWeight: '700',
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 70, 255, 0.3)',
            }}
          >
            Lihat Berita Lainnya →
          </button>
        </div>

      </article>
    </div>
  );
}
