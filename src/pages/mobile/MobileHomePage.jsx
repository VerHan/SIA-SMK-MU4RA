/* ============================================================
   MobileHomePage.jsx — Beranda Mobile PWA Guru/Staff/Kepsek
   Tersinkronisasi dengan Master Sesi, Jadwal, dan Absensi API.
   ============================================================ */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import {
  getTeacherAttendance,
  getSchedule,
  getMasterTimeSlots,
  getCachedAttendance,
  setCachedAttendance,
  getJakartaToday,
} from '../../services/api';
import { DAYS } from '../../config/constants';
import NewsSlider from '../../components/mobile/NewsSlider';
import FeatureGrid from '../../components/mobile/FeatureGrid';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat Pagi';
  if (h < 15) return 'Selamat Siang';
  if (h < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function getRoleLabel(role) {
  const labels = {
    guru: 'Guru',
    staff: 'Staff TU',
    kepsek: 'Kepala Sekolah',
    admin: 'Administrator',
    wali_murid: 'Wali Murid',
  };
  return labels[role] || role;
}

function parseMinutes(hhmm, fallbackMinutes) {
  if (!hhmm || typeof hhmm !== 'string' || !hhmm.includes(':')) return fallbackMinutes;
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return fallbackMinutes;
  return h * 60 + m;
}

export default function MobileHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const now = new Date();
  const today = getJakartaToday();
  const todayName = DAYS[now.getDay() - 1] || '';
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const [absenRecord, setAbsenRecord] = useState(() => getCachedAttendance(user?.name, today));

  useEffect(() => {
    if (!user?.name) return;

    const cached = getCachedAttendance(user.name, today);
    if (cached) setAbsenRecord(cached);

    getTeacherAttendance(today, user.name, user.teacherId).then(data => {
      const rec = Array.isArray(data)
        ? data.find(
            r => (r.teacherId === user.teacherId || r.teacherName === user.name || r.guruName === user.name)
              && (r.date === today || r.tanggal === today)
          )
        : null;
      if (rec) {
        setAbsenRecord(rec);
        setCachedAttendance(user.name, today, rec);
      }
    }).catch(() => {});

    const handleUpdate = (e) => {
      if (e.detail?.teacherName === user.name && e.detail?.date === today) {
        setAbsenRecord(e.detail.record);
      }
    };
    window.addEventListener('sia-attendance-updated', handleUpdate);
    return () => window.removeEventListener('sia-attendance-updated', handleUpdate);
  }, [user?.name, user?.teacherId, today]);

  const { data: todaySchedules = [] } = useQuery({
    queryKey: ['mobile-schedule-today', todayName],
    queryFn: () => getSchedule(todayName),
    enabled: Boolean(todayName),
    staleTime: 60 * 1000,
  });

  const { data: timeSlots = [] } = useQuery({
    queryKey: ['master-sesi'],
    queryFn: getMasterTimeSlots,
    staleTime: 5 * 60 * 1000,
  });

  const nextClass = useMemo(() => {
    if (!user?.name || todaySchedules.length === 0) return null;
    const mySchedules = todaySchedules
      .filter(s => (user.teacherId && s.teacherId === user.teacherId) || s.teacher === user.name)
      .sort((a, b) => (a.jamKe || 0) - (b.jamKe || 0));

    if (mySchedules.length === 0) return null;

    const withTime = mySchedules.map(s => {
      const jamKe = Number(s.jamKe) || 1;
      const slot = timeSlots.find(t => t.type === 'pelajaran' && Number(t.jamKe) === jamKe);
      const fallbackStart = 7 * 60 + (jamKe - 1) * 45;
      const startMinute = parseMinutes(slot?.start, fallbackStart);
      const endMinute = parseMinutes(slot?.end, startMinute + 45);
      const timeLabel = slot?.start ? `${slot.start}–${slot.end}` : `Jam ${jamKe}`;
      return { ...s, startMinute, endMinute, timeLabel };
    });

    const ongoing = withTime.find(s => nowMinutes >= s.startMinute && nowMinutes < s.endMinute);
    if (ongoing) return { ...ongoing, status: 'ongoing' };

    const upcoming = withTime.find(s => s.startMinute > nowMinutes);
    if (upcoming) return { ...upcoming, status: 'upcoming' };

    return { ...withTime[withTime.length - 1], status: 'done' };
  }, [todaySchedules, timeSlots, user?.name, user?.teacherId, nowMinutes]);

  const absenStatus = absenRecord
    ? { label: 'Sudah Absen', sub: `Masuk ${absenRecord.timeIn || '--:--'}`, color: '#059669', border: '#A7F3D0', bg: '#ECFDF5' }
    : { label: 'Belum Absen', sub: 'Ketuk untuk absen GPS', color: '#B45309', border: '#FDE68A', bg: '#FFFBEB' };

  const classStatusLabel = {
    ongoing: { text: 'Sedang Berlangsung', color: '#059669' },
    upcoming: { text: 'Jadwal Berikutnya', color: '#2563EB' },
    done: { text: 'Selesai Hari Ini', color: '#64748B' },
  };

  return (
    <div style={{ paddingTop: '8px', paddingBottom: '20px', animation: 'fadeInUp 0.25s ease' }}>
      {/* Profil Ringkas */}
      <div style={{
        margin: '0 16px 14px',
        padding: '14px 16px',
        borderRadius: '16px',
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          flexShrink: 0,
          background: '#2563EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: 700,
          color: 'white',
        }}>
          {user?.avatar
            ? <img src={user.avatar} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }} />
            : getInitials(user?.name)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11px', color: '#64748B' }}>
            {getGreeting()} · {getRoleLabel(user?.role)}
          </div>
          <div style={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#0F172A',
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {user?.name?.split(',')[0] || 'Pengguna'}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
          <div style={{ fontSize: '11px', color: '#64748B' }}>
            {now.toLocaleDateString('id-ID', { weekday: 'long' })}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
            {now.getDate()}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8' }}>
            {now.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Slider Berita */}
      <div style={{ marginBottom: '14px' }}>
        <NewsSlider />
      </div>

      {/* Status Absen + Jam Mengajar (Interactive >= 44px touch targets) */}
      <div style={{ margin: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <button
          type="button"
          onClick={() => navigate('/app/absen-gps')}
          style={{
            textAlign: 'left',
            minHeight: '84px',
            padding: '12px 14px',
            borderRadius: '14px',
            background: absenStatus.bg,
            border: `1px solid ${absenStatus.border}`,
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>
            ABSENSI GPS
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: absenStatus.color }}>
            {absenStatus.label}
          </div>
          <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
            {absenStatus.sub}
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/app/jadwal')}
          style={{
            textAlign: 'left',
            minHeight: '84px',
            padding: '12px 14px',
            borderRadius: '14px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>
            JAM MENGAJAR
          </div>
          {nextClass ? (
            <>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
                {nextClass.class} · {nextClass.timeLabel}
              </div>
              <div style={{
                fontSize: '11px',
                marginTop: '2px',
                color: classStatusLabel[nextClass.status]?.color || '#64748B',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {nextClass.subject}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                Tidak ada jadwal
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                Ketuk lihat jadwal mingguan
              </div>
            </>
          )}
        </button>
      </div>

      {/* Grid Fitur */}
      <FeatureGrid />

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
