/* ============================================================
   NewsSlider.jsx — Auto-slide Berita / Pengumuman
   Card tinggi dengan dukungan gambar (Image Banner + Overlay)
   ============================================================ */

import { useState, useEffect, useRef, useCallback } from 'react';

const DUMMY_NEWS = [
  {
    id: 1,
    title: 'Pengumuman Jadwal UTS Semester Ganjil 2025/2026',
    category: 'Pengumuman',
    date: '18 Agustus 2025',
    accent: '#3B82F6',
    icon: '📋',
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
    summary: 'Jadwal pelaksanaan Ujian Tengah Semester (UTS) telah dirilis. Harap perhatikan jadwal dan tata tertib.',
  },
  {
    id: 2,
    title: 'Kegiatan Lomba Kompetensi Siswa (LKS) Tingkat Kabupaten',
    category: 'Kegiatan',
    date: '20 Agustus 2025',
    accent: '#6366F1',
    icon: '🏆',
    image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80',
    summary: 'Dukungan dan doa untuk kontingen SMK Muhammadiyah 04 dalam kompetisi LKS tingkat Kabupaten.',
  },
  {
    id: 3,
    title: 'Rapat Koordinasi Guru & Staf Pengajar Bulan Ini',
    category: 'Internal',
    date: '22 Agustus 2025',
    accent: '#0EA5E9',
    icon: '📌',
    image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80',
    summary: 'Agenda evaluasi KBM dan persiapan kurikulum bersama Kepala Sekolah dan jajaran manajemen.',
  },
  {
    id: 4,
    title: 'Pembagian Rapor Semester Genap — Harap Tepat Waktu',
    category: 'Pengumuman',
    date: '25 Agustus 2025',
    accent: '#8B5CF6',
    icon: '📄',
    image: 'https://images.unsplash.com/photo-1511629091441-ee46146481b6?w=800&auto=format&fit=crop&q=80',
    summary: 'Pengambilan buku rapor dan lembar hasil belajar oleh wali murid di ruang kelas masing-masing.',
  },
];

export default function NewsSlider({ news = DUMMY_NEWS }) {
  const [current, setCurrent] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(null);
  const autoRef = useRef(null);

  const activeNews = news && news.length > 0 ? news : DUMMY_NEWS;

  const goNext = useCallback(() => {
    setCurrent(prev => (prev + 1) % activeNews.length);
  }, [activeNews.length]);

  const goPrev = useCallback(() => {
    setCurrent(prev => (prev - 1 + activeNews.length) % activeNews.length);
  }, [activeNews.length]);

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

  const item = activeNews[current] || activeNews[0];

  return (
    <div style={{ padding: '0 16px', marginBottom: '4px' }}>
      {/* Header row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '10px', padding: '0 4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px' }}>📢</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            Berita & Pengumuman
          </span>
        </div>
        <span style={{
          fontSize: '11px', fontWeight: 600, color: '#64748B',
          background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: '12px',
        }}>
          {current + 1} / {activeNews.length}
        </span>
      </div>

      {/* Slide Card — Tinggi lebih besar (235px) untuk menampung gambar & teks */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        style={{
          width: '100%',
          height: '235px',
          borderRadius: '20px',
          background: '#FFFFFF',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
          border: '1px solid rgba(0, 0, 0, 0.07)',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'grab',
          userSelect: 'none',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {/* Banner Gambar Atas */}
        <div style={{
          width: '100%',
          height: '135px',
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${item.accent}33, ${item.accent}11)`,
        }}>
          {item.image ? (
            <img
              src={item.image}
              alt={item.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                transition: 'transform 0.4s ease',
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              background: `linear-gradient(135deg, ${item.accent}20, ${item.accent}05)`,
            }}>
              {item.icon || '📢'}
            </div>
          )}

          {/* Gradient Overlay bawah gambar */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '50px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 100%)',
            pointerEvents: 'none',
          }} />

          {/* Badge Kategori Floating */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '20px',
            background: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            fontSize: '11px',
            fontWeight: 700,
            color: item.accent,
          }}>
            <span>{item.icon}</span>
            <span>{item.category}</span>
          </div>

          {/* Badge Tanggal Floating */}
          <div style={{
            position: 'absolute',
            bottom: '8px',
            right: '12px',
            padding: '2px 8px',
            borderRadius: '10px',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            fontSize: '10px',
            fontWeight: 500,
            color: '#FFFFFF',
          }}>
            📅 {item.date}
          </div>
        </div>

        {/* Info Konten Bawah */}
        <div style={{
          flex: 1,
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#FFFFFF',
        }}>
          <div>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#0F172A',
              margin: '0 0 4px',
              lineHeight: 1.35,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {item.title}
            </h3>
            {item.summary && (
              <p style={{
                fontSize: '11px',
                color: '#64748B',
                margin: 0,
                lineHeight: 1.35,
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {item.summary}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <span style={{ fontSize: '10px', color: '#94A3B8' }}>
              Ketuk untuk detail
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color: item.accent,
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
            }}>
              Lihat →
            </span>
          </div>
        </div>
      </div>

      {/* Dot Indicators */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
        {activeNews.map((n, i) => (
          <button
            key={i}
            onClick={() => { setCurrent(i); resetAuto(); }}
            style={{
              width: i === current ? '22px' : '6px',
              height: '6px',
              borderRadius: '3px',
              background: i === current ? (n.accent || '#3B82F6') : 'rgba(0,0,0,0.12)',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
