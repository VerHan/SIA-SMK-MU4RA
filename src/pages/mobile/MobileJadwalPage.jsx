/* ============================================================
   MobileJadwalPage.jsx — Jadwal Mengajar Mobile PWA
   Tersinkronisasi dengan /api/jadwal & /api/master-sesi
   ============================================================ */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { getSchedule, getMasterTimeSlots } from '../../services/api';
import { DAYS } from '../../config/constants';

const DAY_SHORT = { Senin: 'Sen', Selasa: 'Sel', Rabu: 'Rab', Kamis: 'Kam', Jumat: 'Jum', Sabtu: 'Sab' };

export default function MobileJadwalPage() {
  const { user } = useAuth();
  const todayName = DAYS[new Date().getDay() - 1] || 'Senin';
  const [activeDay, setActiveDay] = useState(todayName);

  const { data: allSchedule = [], isLoading } = useQuery({
    queryKey: ['mobile-jadwal-all'],
    queryFn: () => getSchedule(),
    staleTime: 60 * 1000,
  });

  const { data: timeSlots = [] } = useQuery({
    queryKey: ['master-sesi'],
    queryFn: getMasterTimeSlots,
    staleTime: 5 * 60 * 1000,
  });

  const mySchedule = useMemo(() => {
    return allSchedule
      .filter(s => s.day === activeDay && ((user?.teacherId && s.teacherId === user.teacherId) || s.teacher === user?.name))
      .sort((a, b) => (a.jamKe || 0) - (b.jamKe || 0));
  }, [allSchedule, activeDay, user?.teacherId, user?.name]);

  const getSlotTime = (jamKe) => {
    const slot = timeSlots.find(t => t.type === 'pelajaran' && Number(t.jamKe) === Number(jamKe));
    return slot ? `${slot.start} – ${slot.end}` : `Jam ke-${jamKe}`;
  };

  return (
    <div style={{ padding: '16px', animation: 'fadeInUp 0.25s ease' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 2px' }}>Jadwal Mengajar</h2>
      <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px' }}>
        {user?.name?.split(',')[0]}
      </p>

      {/* Day Selector (>= 44px touch targets) */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${DAYS.length}, 1fr)`, gap: '6px', marginBottom: '18px' }}>
        {DAYS.map((day) => {
          const isActive = day === activeDay;
          const isToday = day === todayName;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setActiveDay(day)}
              style={{
                minHeight: '44px',
                borderRadius: '12px',
                border: isActive ? '1px solid #2563EB' : '1px solid #E2E8F0',
                background: isActive ? '#2563EB' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : isToday ? '#2563EB' : '#475569',
                fontSize: '13px',
                fontWeight: isActive || isToday ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {DAY_SHORT[day] || day}
            </button>
          );
        })}
      </div>

      {/* Schedule List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', color: '#64748B', padding: '40px 0', fontSize: '14px' }}>
          Memuat jadwal...
        </div>
      ) : mySchedule.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '36px 20px',
          borderRadius: '16px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
        }}>
          <p style={{ color: '#475569', fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>
            Tidak ada jadwal mengajar
          </p>
          <p style={{ color: '#94A3B8', fontSize: '12px', margin: 0 }}>
            Hari {activeDay} belum ada sesi pelajaran yang ditugaskan.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {mySchedule.map((sched, i) => (
            <div key={sched.id || i} style={{
              padding: '14px 16px',
              borderRadius: '14px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontVariantNumeric: 'tabular-nums',
              }}>
                <span style={{ fontSize: '10px', color: '#1D4ED8', fontWeight: 600, lineHeight: 1 }}>Jam</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#1D4ED8', lineHeight: 1.1 }}>{sched.jamKe || i + 1}</span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 3px' }}>
                  {sched.subject || 'Mata Pelajaran'}
                </p>
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {sched.class} · {getSlotTime(sched.jamKe)} {sched.room ? `· ${sched.room}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
