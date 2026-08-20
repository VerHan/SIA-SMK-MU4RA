/* MonitoringMapelPage — CCTV Kelas Real-time untuk Admin */

import { useState, useEffect } from 'react';
import { getClasses, getSchedule, getMasterTimeSlots } from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

export default function MonitoringMapelPage() {
  const [classes, setClasses] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  
  const [selectedDay, setSelectedDay] = useState(getCurrentDay());
  const [selectedJam, setSelectedJam] = useState(1);
  const [cctvState, setCctvState] = useState({});

  useEffect(() => {
    // Muat referensi dasar
    getClasses().then(setClasses);
    getMasterTimeSlots().then(slots => {
      const pelajaranSlots = slots.filter(s => s.type === 'pelajaran');
      setTimeSlots(pelajaranSlots);
    });
  }, []);

  useEffect(() => {
    // Muat jadwal untuk hari yang dipilih
    getSchedule(selectedDay).then(setSchedule);
  }, [selectedDay]);

  useEffect(() => {
    // Polling CCTV State dari LocalStorage setiap 2 detik (mock realtime)
    const loadCCTV = () => {
      const state = JSON.parse(localStorage.getItem('cctv_state') || '{}');
      setCctvState(state);
    };
    loadCCTV();
    const interval = setInterval(loadCCTV, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSetRealtime = () => {
    setSelectedDay(getCurrentDay());
    // In real app, calculate current jamKe based on clock
    setSelectedJam(1);
  };

  const getStatusVisual = (status) => {
    if (status === 'selesai') {
      return { color: '#059669', bg: '#ECFDF5', text: 'Absen Selesai', icon: '🟢' };
    }
    if (status === 'guru_hadir') {
      return { color: '#D97706', bg: '#FFFBEB', text: 'Guru Hadir (Belum Absen)', icon: '🟡' };
    }
    return { color: '#DC2626', bg: '#FEF2F2', text: 'Kelas Kosong (Menunggu Guru)', icon: '🔴' };
  };

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: '4px' }}>
            CCTV Kelas (Monitoring Real-time)
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Pantau kehadiran guru dan aktivitas belajar di setiap kelas secara langsung.
          </p>
        </div>
        <Button onClick={handleSetRealtime} variant="outline" size="sm">
          ⏱️ Kembali ke Waktu Saat Ini
        </Button>
      </div>

      {/* Filter Waktu */}
      <Card style={{ marginBottom: 'var(--space-6)', display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '4px' }}>HARI</label>
          <select 
            value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '14px' }}
          >
            {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '4px' }}>JAM KE-</label>
          <select 
            value={selectedJam} onChange={(e) => setSelectedJam(Number(e.target.value))}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '14px' }}
          >
            {timeSlots.map(t => (
              <option key={t.jamKe} value={t.jamKe}>Jam {t.jamKe} ({t.start} - {t.end})</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Grid CCTV Kelas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 'var(--space-4)'
      }}>
        {classes.map(kelas => {
          // Cari apakah kelas ini ada jadwalnya di hari & jam terpilih
          const kelasSchedule = schedule.find(s => s.class === kelas.name && s.jamKe === selectedJam);
          
          let statusVisual = getStatusVisual('kosong');
          
          if (!kelasSchedule) {
            // Jam Kosong / Tidak ada jadwal
            statusVisual = { color: 'var(--color-text-muted)', bg: 'var(--color-surface)', text: 'Jam Kosong / Istirahat', icon: '⚪' };
          } else {
            // Cek di CCTV State
            const state = cctvState[kelasSchedule.id];
            if (state) statusVisual = getStatusVisual(state);
          }

          return (
            <div key={kelas.id} style={{
              background: statusVisual.bg,
              border: `1px solid ${statusVisual.color}40`,
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              transition: 'all var(--transition-fast)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text)' }}>
                  {kelas.name}
                </div>
                <div title={statusVisual.text} style={{ fontSize: '20px' }}>
                  {statusVisual.icon}
                </div>
              </div>

              {kelasSchedule ? (
                <>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: statusVisual.color, marginBottom: '2px' }}>
                    {kelasSchedule.subject}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
                    👨‍🏫 {kelasSchedule.teacher}
                  </div>
                  
                  <div style={{ 
                    fontSize: '11px', 
                    fontWeight: 'bold', 
                    color: statusVisual.color,
                    padding: '4px 8px',
                    background: 'white',
                    borderRadius: '4px',
                    display: 'inline-block',
                    border: `1px solid ${statusVisual.color}20`
                  }}>
                    {statusVisual.text}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                  Tidak ada jadwal pelajaran saat ini.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getCurrentDay() {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[new Date().getDay()] || 'Senin';
}
