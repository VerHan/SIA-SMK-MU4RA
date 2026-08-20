/* ============================================================
   MobileJadwalPage.jsx — Jadwal Mengajar (Mobile)
   ============================================================ */

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getSchedule, getSubjectTeachers } from '../../services/api';
import { DAYS } from '../../config/constants';

const DAY_SHORT = { Senin: 'Sen', Selasa: 'Sel', Rabu: 'Rab', Kamis: 'Kam', Jumat: 'Jum', Sabtu: 'Sab' };

export default function MobileJadwalPage() {
  const { user } = useAuth();
  const todayName = DAYS[new Date().getDay() - 1] || 'Senin';
  const [activeDay, setActiveDay] = useState(todayName);
  const [allSchedule, setAllSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSchedule().then(data => {
      setAllSchedule(data);
      setLoading(false);
    });
  }, []);

  const mySchedule = allSchedule.filter(s =>
    s.day === activeDay && s.teacher === user?.name
  ).sort((a, b) => (a.jamKe || 0) - (b.jamKe || 0));

  const dayColors = ['#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626', '#6366F1'];

  return (
    <div style={{ padding: '16px 20px', animation: 'fadeInUp 0.4s ease' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Jadwal Mengajar</h2>
      <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px' }}>
        {user?.name?.split(',')[0]}
      </p>

      {/* Day Selector */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '20px', scrollbarWidth: 'none' }}>
        {DAYS.map((day, i) => {
          const isActive = day === activeDay;
          const isToday = day === todayName;
          return (
            <button key={day} onClick={() => setActiveDay(day)} style={{
              flexShrink: 0,
              padding: '8px 16px',
              borderRadius: '12px',
              border: isActive ? 'none' : `1px solid ${isToday ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)'}`,
              background: isActive
                ? `linear-gradient(135deg, ${dayColors[i]}, ${dayColors[(i + 1) % dayColors.length]})`
                : isToday ? 'rgba(0,0,0,0.04)' : 'transparent',
              color: isActive ? 'white' : isToday ? '#0F172A' : '#64748B',
              fontSize: '13px', fontWeight: isActive ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isActive ? `0 4px 12px ${dayColors[i]}44` : 'none',
            }}>
              {DAY_SHORT[day] || day}
              {isToday && !isActive && (
                <span style={{ display: 'block', width: '4px', height: '4px', borderRadius: '50%', background: '#7C3AED', margin: '2px auto 0' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Schedule List */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#64748B', padding: '40px 0', fontSize: '14px' }}>
          Memuat jadwal...
        </div>
      ) : mySchedule.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '40px 20px',
          borderRadius: '16px', background: 'rgba(255,255,255,0.8)',
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📅</div>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>
            Tidak ada jadwal mengajar hari {activeDay}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {mySchedule.map((sched, i) => (
            <div key={sched.id || i} style={{
              padding: '16px',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}>
              {/* Jam ke badge */}
              <div style={{
                width: '44px', height: '44px', borderRadius: '13px',
                background: `linear-gradient(135deg, ${dayColors[i % dayColors.length]}, ${dayColors[(i + 1) % dayColors.length]})`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, boxShadow: `0 4px 12px ${dayColors[i % dayColors.length]}44`,
              }}>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>Jam</span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'white', lineHeight: 1 }}>{sched.jamKe || i + 1}</span>
              </div>

              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: '0 0 3px' }}>
                  {sched.subject || 'Mata Pelajaran'}
                </p>
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                  Kelas {sched.class} {sched.room ? `· ${sched.room}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
