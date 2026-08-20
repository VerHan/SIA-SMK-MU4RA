/* BeritaPage — Daftar berita sekolah */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNews } from '../../services/api';
import { formatDate } from '../../utils/helpers';
import Card from '../../components/ui/Card';

export default function BeritaPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Semua');
  const navigate = useNavigate();

  useEffect(() => {
    getNews().then(data => { setNews(data); setLoading(false); });
  }, []);

  const categories = ['Semua', ...new Set(news.map(n => n.category))];
  const filteredNews = filter === 'Semua' ? news : news.filter(n => n.category === filter);

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
          Berita & Informasi
        </h1>
        <p style={{ opacity: 0.85 }}>Kabar terbaru dari sekolah kami</p>
      </section>

      <div style={{
        maxWidth: 'var(--max-content-width)',
        margin: '0 auto',
        padding: 'var(--space-8) var(--space-6)',
      }}>
        {/* Category Filter */}
        <div style={{
          display: 'flex',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-6)',
          flexWrap: 'wrap',
        }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                background: filter === cat ? 'var(--color-primary)' : 'var(--color-surface)',
                color: filter === cat ? 'white' : 'var(--color-text-secondary)',
                border: filter === cat ? 'none' : '1px solid var(--color-border)',
                transition: 'all var(--transition-fast)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* News Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}>
            Memuat berita...
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 'var(--space-6)',
          }}>
            {filteredNews.map(item => (
              <Card key={item.id} hover onClick={() => navigate(`/berita/${item.id}`)}>
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
                <p className="line-clamp-3" style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.6,
                  marginBottom: 'var(--space-4)',
                }}>
                  {item.excerpt}
                </p>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-muted)',
                }}>
                  <span>✍️ {item.author}</span>
                  <span>{formatDate(item.date)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {filteredNews.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}>
            Tidak ada berita untuk kategori ini.
          </div>
        )}
      </div>
    </div>
  );
}
