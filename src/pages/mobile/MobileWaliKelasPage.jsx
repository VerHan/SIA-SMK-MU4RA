/* ============================================================
   MobileWaliKelasPage.jsx — Monitoring Kelas Wali Kelas (PWA)
   Menampilkan kondisi kehadiran tiap siswa (Hijau/Kuning/Merah)
   khusus kelas binaan Wali Kelas yang sedang login.
   ============================================================ */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getHomeroomMonitoring } from '../../services/api';

const TIER_META = {
  merah: { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', badge: '#EF4444', label: 'Perlu Konseling' },
  kuning: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', badge: '#F59E0B', label: 'Pantau' },
  hijau: { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', badge: '#10B981', label: 'Baik' },
};

export default function MobileWaliKelasPage() {
  const [selectedClass, setSelectedClass] = useState('');
  const [month, setMonth] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['homeroom-monitoring', selectedClass, month],
    queryFn: () => getHomeroomMonitoring(selectedClass || undefined, month),
  });

  const classes = data?.classes || [];
  const students = data?.students || [];
  const summary = data?.summary || { total: 0, hijau: 0, kuning: 0, merah: 0 };
  const activeClass = data?.selectedClass || selectedClass || classes[0]?.name || '-';

  return (
    <div style={{ padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)',
        borderRadius: '18px',
        padding: '16px 18px',
        color: 'white',
      }}>
        <div style={{ fontSize: '11px', opacity: 0.9, fontWeight: 600, textTransform: 'uppercase' }}>
          Monitoring Wali Kelas
        </div>
        <h1 style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px' }}>
          Kondisi Kehadiran {activeClass !== '-' ? `Kelas ${activeClass}` : 'Kelas Binaan'}
        </h1>
        <p style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px', lineHeight: 1.4 }}>
          Siswa dengan status merah atau kuning otomatis ditampilkan di urutan teratas untuk tindak lanjut cepat.
        </p>
      </div>

      {/* Filters */}
      <div style={{
        background: 'white',
        borderRadius: '14px',
        padding: '12px',
        border: '1px solid #E2E8F0',
        display: 'grid',
        gridTemplateColumns: classes.length > 1 ? '1fr 1fr' : '1fr',
        gap: '10px',
      }}>
        {classes.length > 1 && (
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
              PILIH KELAS
            </label>
            <select
              value={activeClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
            PERIODE BULAN
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="month"
              value={month === 'all' ? '' : month}
              onChange={(e) => setMonth(e.target.value || 'all')}
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
              }}
            />
            {month !== 'all' && (
              <button
                type="button"
                onClick={() => setMonth('all')}
                style={{
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Semua
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tier Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {[
          { key: 'merah', label: 'Perlu Konseling', value: summary.merah, color: '#DC2626', bg: '#FEF2F2' },
          { key: 'kuning', label: 'Pemantauan', value: summary.kuning, color: '#D97706', bg: '#FFFBEB' },
          { key: 'hijau', label: 'Kondisi Baik', value: summary.hijau, color: '#059669', bg: '#ECFDF5' },
        ].map(stat => (
          <div key={stat.key} style={{
            background: stat.bg,
            borderRadius: '14px',
            padding: '12px 10px',
            textAlign: 'center',
            border: `1px solid ${stat.color}25`,
          }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: stat.color, fontVariantNumeric: 'tabular-nums' }}>
              {isLoading ? '—' : stat.value}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginTop: '2px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Student Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {isLoading ? (
          <div style={{ background: 'white', borderRadius: '14px', padding: '24px', textAlign: 'center', fontSize: '13px', color: '#64748B' }}>
            Memuat data kehadiran siswa...
          </div>
        ) : students.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '14px', padding: '24px', textAlign: 'center', fontSize: '13px', color: '#64748B', border: '1px solid #E2E8F0' }}>
            Belum ada siswa aktif di kelas binaan Anda.
          </div>
        ) : (
          students.map((st) => {
            const meta = TIER_META[st.riskStatus?.tier] || TIER_META.hijau;
            return (
              <div
                key={st.id}
                style={{
                  background: 'white',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  border: `1px solid ${st.riskStatus?.tier === 'hijau' ? '#E2E8F0' : meta.border}`,
                  borderLeft: `4px solid ${meta.badge}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{st.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      NIS {st.nomor} • Ortu: {st.phone_parent}
                    </div>
                  </div>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '8px',
                    background: meta.bg,
                    color: meta.text,
                    fontSize: '11px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}>
                    {st.riskStatus?.rate ?? 100}% • {meta.label}
                  </span>
                </div>

                <div style={{
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid #F1F5F9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '6px',
                  fontSize: '11px',
                  color: '#475569',
                }}>
                  <span>Piket: H {st.piket.hadir} | I {st.piket.izin} | S {st.piket.sakit} | A {st.piket.alpha}</span>
                  <span>Mapel: {st.mapel.persentase}% ({st.mapel.totalSesi} sesi)</span>
                </div>
                {st.riskStatus?.tier !== 'hijau' && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: meta.text, fontWeight: 600 }}>
                    {st.riskStatus.reason}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
