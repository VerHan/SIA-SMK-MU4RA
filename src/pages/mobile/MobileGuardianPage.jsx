/* ============================================================
   MobileGuardianPage.jsx — Portal Monitoring Kehadiran Anak
   Khusus Role Wali Murid (Read-Only, strictly scoped to child)
   ============================================================ */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGuardianOverview } from '../../services/api';

const TIER_STYLES = {
  hijau: { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', dot: '#10B981' },
  kuning: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', dot: '#F59E0B' },
  merah: { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', dot: '#EF4444' },
};

const STATUS_BADGE = {
  hadir: { bg: '#DCFCE7', color: '#166534', label: 'Hadir' },
  izin: { bg: '#DBEAFE', color: '#1E40AF', label: 'Izin' },
  sakit: { bg: '#FEF3C7', color: '#92400E', label: 'Sakit' },
  alpha: { bg: '#FEE2E2', color: '#991B1B', label: 'Alpha' },
};

function StatusTag({ value }) {
  const meta = STATUS_BADGE[value];
  if (!meta) {
    return <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>—</span>;
  }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: 700,
      background: meta.bg,
      color: meta.color,
    }}>
      {meta.label}
    </span>
  );
}

export default function MobileGuardianPage() {
  const [month, setMonth] = useState('all');
  const [activeTab, setActiveTab] = useState('piket'); // 'piket' | 'mapel'

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['guardian-overview', month],
    queryFn: () => getGuardianOverview(month),
    placeholderData: (prev) => prev,
  });

  if (isLoading) {
    return (
      <div style={{ padding: '24px 16px' }}>
        <div style={{ height: '110px', borderRadius: '18px', background: '#E2E8F0', marginBottom: '12px' }} />
        <div style={{ height: '90px', borderRadius: '18px', background: '#E2E8F0', marginBottom: '12px' }} />
        <div style={{ height: '180px', borderRadius: '18px', background: '#E2E8F0' }} />
      </div>
    );
  }

  if (!data?.success) {
    return (
      <div style={{ padding: '24px 16px' }}>
        <div style={{
          background: 'white',
          borderRadius: '18px',
          padding: '24px 20px',
          border: '1px solid #E2E8F0',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>👨‍👩‍👧</div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
            Data Anak Belum Terhubung
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, marginBottom: '16px' }}>
            {data?.error || 'Akun wali murid Anda belum dihubungkan ke data siswa. Silakan hubungi admin sekolah.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              background: '#2563EB',
              color: 'white',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  const { student, homeroomTeacher, summary, riskStatus, piketRecords = [], mapelRecords = [] } = data;
  const tier = TIER_STYLES[riskStatus?.tier] || TIER_STYLES.hijau;

  return (
    <div style={{ padding: '16px 16px 28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Child Identity Card */}
      <div style={{
        background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
        borderRadius: '20px',
        padding: '18px 18px',
        color: 'white',
        boxShadow: '0 8px 24px rgba(37, 99, 235, 0.22)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', opacity: 0.85, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              Portal Pantau Wali Murid
            </div>
            <h1 style={{ fontSize: '19px', fontWeight: 800, marginTop: '4px', lineHeight: 1.25, color: '#FFFFFF' }}>
              {student.name}
            </h1>
            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
              Kelas {student.class} • NIS {student.nomor}
            </div>
          </div>
          <span style={{
            padding: '4px 10px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.16)',
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}>
            Read-Only
          </span>
        </div>

        {homeroomTeacher && (
          <div style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(255,255,255,0.18)',
            fontSize: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ opacity: 0.85 }}>Wali Kelas:</span>
            <strong>{homeroomTeacher.name}</strong>
          </div>
        )}
      </div>

      {/* Attendance Status / Early Warning Card */}
      <div style={{
        background: tier.bg,
        border: `1px solid ${tier.border}`,
        borderRadius: '16px',
        padding: '14px 16px',
        color: tier.text,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: tier.dot,
              display: 'inline-block',
              flexShrink: 0,
            }} />
            <strong style={{ fontSize: '14px' }}>{riskStatus?.label || 'Kondisi Baik'}</strong>
          </div>
          <span style={{ fontSize: '16px', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
            {riskStatus?.rate ?? 100}%
          </span>
        </div>
        <p style={{ fontSize: '12px', marginTop: '6px', lineHeight: 1.45, opacity: 0.92 }}>
          {riskStatus?.reason}
        </p>
      </div>

      {/* Period Filter */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '10px',
        background: 'white',
        borderRadius: '14px',
        padding: '10px 14px',
        border: '1px solid #E2E8F0',
      }}>
        <label htmlFor="guardian-month" style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
          Periode Data
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            id="guardian-month"
            type="month"
            value={month === 'all' ? '' : month}
            onChange={(e) => setMonth(e.target.value || 'all')}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '12px',
              color: '#0F172A',
              background: '#F8FAFC',
            }}
          />
          {month !== 'all' && (
            <button
              type="button"
              onClick={() => setMonth('all')}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: 'white',
                fontSize: '11px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Semua
            </button>
          )}
        </div>
      </div>

      {/* Summary Grid: Piket & Mapel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '14px',
          border: '1px solid #E2E8F0',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Absen Piket Harian
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
            {summary?.piket?.hadir || 0} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>/ {summary?.piket?.totalHari || 0} hari</span>
          </div>
          <div style={{ fontSize: '11px', color: '#475569', marginTop: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span>I: <strong>{summary?.piket?.izin || 0}</strong></span>
            <span>S: <strong>{summary?.piket?.sakit || 0}</strong></span>
            <span style={{ color: '#DC2626' }}>A: <strong>{summary?.piket?.alpha || 0}</strong></span>
            {(summary?.piket?.bolos || 0) > 0 && (
              <span style={{ color: '#DC2626' }}>Bolos: <strong>{summary.piket.bolos}</strong></span>
            )}
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '14px',
          border: '1px solid #E2E8F0',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Absen Mapel
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
            {summary?.mapel?.persentase || 0}%
          </div>
          <div style={{ fontSize: '11px', color: '#475569', marginTop: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span>Sesi: <strong>{summary?.mapel?.totalSesi || 0}</strong></span>
            <span>H: <strong>{summary?.mapel?.hadir || 0}</strong></span>
            <span style={{ color: '#DC2626' }}>A: <strong>{summary?.mapel?.alpha || 0}</strong></span>
          </div>
        </div>
      </div>

      {/* Tabbed Attendance History */}
      <div style={{
        background: 'white',
        borderRadius: '18px',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderBottom: '1px solid #E2E8F0',
          background: '#F8FAFC',
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('piket')}
            style={{
              padding: '12px 10px',
              border: 'none',
              background: activeTab === 'piket' ? 'white' : 'transparent',
              borderBottom: activeTab === 'piket' ? '2px solid #2563EB' : '2px solid transparent',
              fontSize: '13px',
              fontWeight: activeTab === 'piket' ? 700 : 500,
              color: activeTab === 'piket' ? '#2563EB' : '#64748B',
              cursor: 'pointer',
            }}
          >
            Riwayat Piket ({piketRecords.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mapel')}
            style={{
              padding: '12px 10px',
              border: 'none',
              background: activeTab === 'mapel' ? 'white' : 'transparent',
              borderBottom: activeTab === 'mapel' ? '2px solid #2563EB' : '2px solid transparent',
              fontSize: '13px',
              fontWeight: activeTab === 'mapel' ? 700 : 500,
              color: activeTab === 'mapel' ? '#2563EB' : '#64748B',
              cursor: 'pointer',
            }}
          >
            Riwayat Mapel ({mapelRecords.length})
          </button>
        </div>

        <div style={{ padding: '12px 14px' }}>
          {isFetching && (
            <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px' }}>Menyegarkan data...</div>
          )}

          {activeTab === 'piket' ? (
            piketRecords.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: '13px', color: '#94A3B8', padding: '18px 0' }}>
                Belum ada catatan absen piket pada periode ini.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {piketRecords.slice(0, 30).map((rec) => (
                  <div
                    key={rec.id || rec.date}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      background: '#F8FAFC',
                      border: '1px solid #F1F5F9',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{rec.date}</span>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '11px', color: '#64748B' }}>
                      <span>Pagi: <StatusTag value={rec.statusPagi} /></span>
                      <span>Sore: <StatusTag value={rec.statusSore} /></span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : mapelRecords.length === 0 ? (
            <p style={{ textAlign: 'center', fontSize: '13px', color: '#94A3B8', padding: '18px 0' }}>
              Belum ada catatan absen mapel pada periode ini.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {mapelRecords.slice(0, 40).map((rec) => (
                <div
                  key={rec.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: '#F8FAFC',
                    border: '1px solid #F1F5F9',
                    gap: '10px',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {rec.subject}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      {rec.date} • Jam ke-{rec.jamKe} • {rec.teacherName}
                    </div>
                  </div>
                  <StatusTag value={rec.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
