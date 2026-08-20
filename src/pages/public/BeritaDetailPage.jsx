/* BeritaDetailPage — Detail satu berita */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getNewsById } from '../../services/api';
import { formatDate } from '../../utils/helpers';
import Button from '../../components/ui/Button';

export default function BeritaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNewsById(id).then(data => { setArticle(data); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--color-text-muted)' }}>
        Memuat artikel...
      </div>
    );
  }

  if (!article) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
        <h2 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-4)' }}>
          Artikel tidak ditemukan
        </h2>
        <Button onClick={() => navigate('/berita')}>← Kembali ke Berita</Button>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '720px',
      margin: '0 auto',
      padding: 'var(--space-10) var(--space-6)',
    }}>
      <Button variant="ghost" onClick={() => navigate('/berita')} style={{ marginBottom: 'var(--space-6)' }}>
        ← Kembali
      </Button>

      <span style={{
        display: 'inline-block',
        padding: '0.2rem 0.6rem',
        background: 'var(--color-primary-subtle)',
        color: 'var(--color-primary)',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-semibold)',
        borderRadius: 'var(--radius-full)',
        marginBottom: 'var(--space-4)',
      }}>
        {article.category}
      </span>

      <h1 style={{
        fontSize: 'var(--font-size-3xl)',
        fontWeight: 'var(--font-weight-extrabold)',
        lineHeight: 1.3,
        marginBottom: 'var(--space-4)',
      }}>
        {article.title}
      </h1>

      <div style={{
        display: 'flex',
        gap: 'var(--space-4)',
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-muted)',
        marginBottom: 'var(--space-8)',
        paddingBottom: 'var(--space-6)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <span>✍️ {article.author}</span>
        <span>📅 {formatDate(article.date)}</span>
      </div>

      <div style={{
        fontSize: 'var(--font-size-base)',
        lineHeight: 1.8,
        color: 'var(--color-text)',
      }}>
        {article.content.split('\n').map((paragraph, i) => (
          <p key={i} style={{ marginBottom: 'var(--space-4)' }}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
