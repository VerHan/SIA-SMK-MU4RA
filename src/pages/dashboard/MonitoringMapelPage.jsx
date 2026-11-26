/* ============================================================
   MonitoringMapelPage — Monitoring Kelas Real-time (API-backed)
   Menggantikan polling localStorage dengan endpoint /api/monitoring/kelas
   ============================================================ */

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMasterTimeSlots, getMonitoringClasses, getJakartaToday } from '../../services/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

function getCurrentSchoolDay() {
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const today = dayNames[new Date().getDay()];
  return DAYS.includes(today) ? today : 'Senin';
}

function detectCurrentJamKe(slots) {
  if (!slots || slots.length === 0) return 1;
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  for (const slot of slots) {
    if (slot.type !== 'pelajaran' || !slot.start || !slot.end) continue;
    const [sh, sm] = slot.start.split(':').map(Number);
    const [eh, em] = slot.end.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    if (currentMins >= startMins && currentMins <= endMins) {
      return Number(slot.jamKe) || 1;
    }
  }
  return Number(slots.find(s => s.type === 'pelajaran')?.jamKe) || 1;
}

const STATUS_META = {
  selesai: { label: 'Absen Selesai', variant: 'success', border: '#A7F3D0', bg: '#ECFDF5', text: '#065F46' },
  guru_hadir: { label: 'Guru Hadir · Belum Absen', variant: 'warning', border: '#FDE68A', bg: '#FFFBEB', text: '#92400E' },
  kosong: { label: 'Kelas Kosong · Menunggu Guru', variant: 'danger', border: '#FECACA', bg: '#FEF2F2', text: '#991B1B' },
  tidak_ada_jadwal: { label: 'Tidak Ada Jadwal', variant: 'default', border: 'var(--color-border)', bg: 'var(--color-surface)', text: 'var(--color-text-muted)' },
  jam_kosong: { label: 'Tidak Ada Jadwal', variant: 'default', border: 'var(--color-border)', bg: 'var(--color-surface)', text: 'var(--color-text-muted)' },
};

const cardStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-xl)',
};

export default function MonitoringMapelPage() {
  const [selectedDay, setSelectedDay] = useState(getCurrentSchoolDay);
  const [selectedJam, setSelectedJam] = useState(1);
  const [selectedDate, setSelectedDate] = useState(getJakartaToday);
  const [autoDetected, setAutoDetected] = useState(false);

  const { data: allSlots = [] } = useQuery({
    queryKey: ['master-sesi'],
    queryFn: getMasterTimeSlots,
  });

  const pelajaranSlots = useMemo(
    () => allSlots.filter(s => s.type === 'pelajaran'),
    [allSlots]
  );

  useEffect(() => {
    if (!autoDetected && pelajaranSlots.length > 0) {
      setSelectedJam(detectCurrentJamKe(pelajaranSlots));
      setAutoDetected(true);
    }
  }, [autoDetected, pelajaranSlots]);

  const { data: monitoring, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['monitoring-kelas', selectedDay, selectedJam, selectedDate],
    queryFn: () => getMonitoringClasses({ day: selectedDay, jamKe: selectedJam, date: selectedDate }),
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  const items = monitoring?.items || [];

  const summary = useMemo(() => ({
    selesai: items.filter(i => i.status === 'selesai').length,
    guruHadir: items.filter(i => i.status === 'guru_hadir').length,
    kosong: items.filter(i => i.status === 'kosong').length,
    jamKosong: items.filter(i => i.status === 'tidak_ada_jadwal' || i.status === 'jam_kosong').length,
  }), [items]);

  const handleSetRealtime = () => {
    setSelectedDay(getCurrentSchoolDay());
    setSelectedDate(getJakartaToday());
    setSelectedJam(detectCurrentJamKe(pelajaranSlots));
  };

  return (
    <div style={{ animation: 'fadeIn 250ms ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: '4px', color: 'var(--color-text)' }}>
            Monitoring Kelas Real-time
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Status kehadiran guru dan pengisian absensi mapel per jam pelajaran langsung dari server.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" onClick={handleSetRealtime}>
            Waktu Saat Ini
          </Button>
          <Button variant="outline" size="sm" loading={isFetching && !isLoading} onClick={() => refetch()}>
            Segarkan
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        {[
          { label: 'Absen Selesai', value: summary.selesai, color: '#059669' },
          { label: 'Guru Hadir (Belum Absen)', value: summary.guruHadir, color: '#D97706' },
          { label: 'Kelas Kosong', value: summary.kosong, color: '#DC2626' },
          { label: 'Tidak Ada Jadwal', value: summary.jamKosong, color: '#64748B' },
        ].map(stat => (
          <div key={stat.label} style={{ ...cardStyle, padding: 'var(--space-4)' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '6px' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: stat.color, fontVariantNumeric: 'tabular-nums' }}>
              {isLoading ? '—' : stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div style={{ ...cardStyle, padding: 'var(--space-4)', marginBottom: 'var(--space-6)', display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Tanggal
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)', background: 'var(--color-surface)' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Hari Jadwal
          </label>
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)', background: 'var(--color-surface)' }}
          >
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Jam Pelajaran
          </label>
          <select
            value={selectedJam}
            onChange={(e) => setSelectedJam(Number(e.target.value))}
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)', background: 'var(--color-surface)', fontVariantNumeric: 'tabular-nums' }}
          >
            {pelajaranSlots.length > 0 ? (
              pelajaranSlots.map(t => (
                <option key={t.jamKe} value={t.jamKe}>Jam {t.jamKe} ({t.start} – {t.end})</option>
              ))
            ) : (
              [1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>Jam ke-{n}</option>)
            )}
          </select>
        </div>
      </div>

      {/* Monitoring Grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 'var(--space-4)' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ ...cardStyle, padding: 'var(--space-5)', height: '132px', background: 'var(--color-border-light)' }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div style={{ ...cardStyle, padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
          Belum ada data kelas terdaftar untuk dipantau.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 'var(--space-4)' }}>
          {items.map((item) => {
            const meta = STATUS_META[item.status] || STATUS_META.tidak_ada_jadwal;
            const recordedCount = item.absenCount ?? item.absensiCount ?? 0;
            return (
              <div
                key={item.kelasId}
                style={{
                  background: meta.bg,
                  border: `1px solid ${meta.border}`,
                  borderRadius: 'var(--radius-xl)',
                  padding: 'var(--space-5)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 'var(--space-3)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800, color: 'var(--color-text)' }}>
                    {item.kelasName}
                  </div>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>

                {item.schedule ? (
                  <div>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: meta.text, marginBottom: '4px' }}>
                      {item.schedule.subject}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                      {item.schedule.teacher} · Ruang {item.schedule.room || '—'}
                      {recordedCount > 0 ? ` · ${recordedCount} siswa tercatat` : ''}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                    Tidak ada jadwal pelajaran pada jam ke-{selectedJam}.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
