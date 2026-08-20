/* ============================================================
   NewsSlider.jsx — Auto-slide Berita / Pengumuman
   Fixed: konsisten height, full-width, cleaner styling
   ============================================================ */

import { useState, useEffect, useRef, useCallback } from 'react';

const DUMMY_NEWS = [
  {
    id: 1,
    title: 'Pengumuman Jadwal UTS Semester Ganjil 2024/2025',
    category: 'Pengumuman',
    date: '18 Agustus 2024',
    accent: '#3B82F6',
    icon: '📋',
  },
  {
    id: 2,
    title: 'Kegiatan Lomba Kompetensi Siswa (LKS) Tingkat Kabupaten',
    category: 'Kegiatan',
    date: '20 Agustus 2024',
    accent: '#6366F1',
    icon: '🏆',
  },
  {
    id: 3,
    title: 'Rapat Koordinasi Guru & Staf Bulan Agustus',
    category: 'Internal',
    date: '22 Agustus 2024',
    accent: '#0EA5E9',
    icon: '📌',
  },
  {
    id: 4,
    title: 'Pembagian Rapor Semester Genap — Harap Tepat Waktu',
    category: 'Pengumuman',
    date: '25 Agustus 2024',
    accent: '#8B5CF6',
    icon: '📄',
  },
];

export default function NewsSlider({ news = DUMMY_NEWS }) {
  const [current, setCurrent] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(null);
  const autoRef = useRef(null);

  const goNext = useCallback(() => {
    setCurrent(prev => (prev + 1) % news.length);
  }, [news.length]);

  const goPrev = useCallback(() => {
    setCurrent(prev => (prev - 1 + news.length) % news.length);
  }, [news.length]);

  useEffect(() => {
    autoRef.current = setInterval(goNext, 5000);
    return () => clearInterval(autoRef.current);
  }, [goNext]);

  const resetAuto = () => {
    clearInterval(autoRef.current);
    autoRef.current = setInterval(goNext, 5000);
  };

  const handleTouchStart = (e) => {
    startX.current = e.touches ? e.touches[0].clientX : e.clientX;
    setIsDragging(true);
  };

  const handleTouchEnd = (e) => {
    if (!isDragging || startX.current === null) return;
    const endX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const diff = startX.current - endX;
    if (Math.abs(diff) > 40) {
      diff > 0 ? goNext() : goPrev();
      resetAuto();
    }
    startX.current = null;
    setIsDragging(false);
  };

  const item = news[current];

  return (
    <div style={{ padding: '0 16px' }}>
      {/* Header row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '10px', padding: '0 4px',
      }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
          Berita & Pengumuman
        </span>
        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
          {current + 1}/{news.length}
        </span>
      </div>

      {/* Slide Card — fixed height so layout is always consistent */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        style={{
          width: '100%',
          height: '110px',
          borderRadius: '16px',
          background: 'rgba(255,255,255,0.8)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
          border: `1px solid ${item.accent}33`,
          padding: '16px',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'grab',
          userSelect: 'none',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          animation: 'slideIn 0.3s ease',
        }}
      >
        {/* Colored left accent bar */}
        <div style={{
          position: 'absolute', left: 0, top: '16px', bottom: '16px',
          width: '3px', borderRadius: '0 3px 3px 0',
          background: item.accent,
          boxShadow: `0 0 8px ${item.accent}88`,
        }} />

        {/* Decorative circle */}
        <div style={{
          position: 'absolute', right: '-20px', top: '-20px',
          width: '80px', height: '80px', borderRadius: '50%',
          background: `${item.accent}15`,
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', paddingLeft: '10px' }}>
          {/* Category badge */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '2px 8px', borderRadius: '20px',
            background: `${item.accent}20`,
            border: `1px solid ${item.accent}44`,
            fontSize: '10px', fontWeight: 600, color: item.accent,
            flexShrink: 0,
          }}>
            {item.icon} {item.category}
          </span>
        </div>

        <div style={{ paddingLeft: '10px' }}>
          <p style={{
            fontSize: '13px', fontWeight: 600, color: '#0F172A',
            margin: '0 0 4px', lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {item.title}
          </p>
          <span style={{ fontSize: '11px', color: '#64748B' }}>
            {item.date}
          </span>
        </div>
      </div>

      {/* Dot Indicators */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginTop: '10px' }}>
        {news.map((_, i) => (
          <button
            key={i}
            onClick={() => { setCurrent(i); resetAuto(); }}
            style={{
              width: i === current ? '18px' : '5px',
              height: '5px',
              borderRadius: '3px',
              background: i === current ? item.accent : 'rgba(0,0,0,0.1)',
              border: 'none', cursor: 'pointer', padding: 0,
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0.5; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
