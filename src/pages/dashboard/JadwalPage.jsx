/* JadwalPage — Jadwal mengajar */

import { useState, useEffect } from 'react';
import { getSchedule, getMasterTimeSlots } from '../../services/api';
import { DAYS } from '../../config/constants';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function JadwalPage() {
  const [schedule, setSchedule] = useState([]);
  const [selectedDay, setSelectedDay] = useState(getCurrentDay());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [scheduleData, timeSlotsData] = await Promise.all([
        getSchedule(selectedDay),
        getMasterTimeSlots()
      ]);
      
      const enrichedSchedule = scheduleData.map(item => {
        // Cari jam mulai dari jamKe
        const slotMatch = timeSlotsData.find(s => s.jamKe === item.jamKe);
        const timeDisplay = slotMatch ? `${slotMatch.start} - ${slotMatch.end}` : item.time;
        return {
          ...item,
          waktuDisplay: timeDisplay
        };
      });
      
      setSchedule(enrichedSchedule);
      setLoading(false);
    }
    loadData();
  }, [selectedDay]);

  const columns = [
    { key: 'waktu', label: 'Waktu', render: (_, row) => row.waktuDisplay, width: '150px' },
    { key: 'subject', label: 'Mata Pelajaran' },
    { key: 'teacher', label: 'Guru' },
    { key: 'class', label: 'Kelas' },
    { key: 'room', label: 'Ruang' },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: 'var(--space-6)' }}>
        📅 Jadwal Mengajar
      </h1>

      {/* Day selector */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        {DAYS.map(day => (
          <button
            key={day}
            onClick={() => { setLoading(true); setSelectedDay(day); }}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: selectedDay === day ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
              background: selectedDay === day ? 'var(--color-primary)' : 'var(--color-surface)',
              color: selectedDay === day ? 'white' : 'var(--color-text-secondary)',
              border: selectedDay === day ? 'none' : '1px solid var(--color-border)',
              transition: 'all var(--transition-fast)',
            }}
          >
            {day}
          </button>
        ))}
      </div>

      <Card padding="0">
        {loading ? (
          <LoadingSpinner message="Memuat jadwal..." />
        ) : (
          <Table
            columns={columns}
            data={schedule}
            emptyMessage={`Tidak ada jadwal untuk hari ${selectedDay}.`}
          />
        )}
      </Card>
    </div>
  );
}

function getCurrentDay() {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[new Date().getDay()] || 'Senin';
}
