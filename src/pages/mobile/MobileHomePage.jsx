/* ============================================================
   MobileHomePage.jsx — Halaman Utama Mobile Client (v2)
   Layout: Profil (kiri: salam, kanan: tanggal) →
           Berita → Status Absen + Jam Ngajar → Grid Fitur
   ============================================================ */

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getTeacherAttendance, getSchedule } from '../../services/api';
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
    guru: 'Guru', staff: 'Staff TU', kepsek: 'Kepala Sekolah',
    admin: 'Administrator', wali_murid: 'Wali Murid',
  };
  return labels[role] || role;
}

export default function MobileHomePage() {
  const { user } = useAuth();
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const todayName = DAYS[now.getDay() - 1] || '';
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const dateLabel = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

  // Absen status
  const [absenRecord, setAbsenRecord] = useState(null);
  // Jadwal mengajar hari ini
  const [nextClass, setNextClass] = useState(null);

  useEffect(() => {
    // Fetch absen record hari ini
    if (user?.name) {
      getTeacherAttendance(today).then(data => {
        const rec = data.find(r => r.teacherName === user.name && r.date === today);
        setAbsenRecord(rec || null);
      });
    }

    // Fetch jadwal mengajar hari ini → cari kelas berikutnya / sedang berlangsung
    if (user?.name && todayName) {
      getSchedule(todayName).then(schedules => {
        const mySchedules = schedules
          .filter(s => s.teacher === user.name)
          .sort((a, b) => (a.jamKe || 0) - (b.jamKe || 0));

        if (mySchedules.length === 0) return;

        // Ambil jadwal berikutnya atau yang sedang berlangsung
        // Estimasi: jam ke-1 = 07:00, setiap jam = 45 menit
        const withTime = mySchedules.map(s => {
          const jamKe = s.jamKe || 1;
          const startMinute = 7 * 60 + (jamKe - 1) * 45; // 07:00 + (n-1)*45mnt
          const endMinute = startMinute + 45;
          return { ...s, startMinute, endMinute };
        });

        // Prioritas: yang sedang berlangsung dulu, lalu berikutnya
        const ongoing = withTime.find(s => nowMinutes >= s.startMinute && nowMinutes < s.endMinute);
        if (ongoing) { setNextClass({ ...ongoing, status: 'ongoing' }); return; }

        const upcoming = withTime.find(s => s.startMinute > nowMinutes);
        if (upcoming) { setNextClass({ ...upcoming, status: 'upcoming' }); return; }

        // Semua sudah selesai → tampilkan terakhir
        const last = withTime[withTime.length - 1];
        setNextClass({ ...last, status: 'done' });
      });
    }
  }, [user?.name, today, todayName, nowMinutes]);

  // Format start time dari jamKe
  function formatJamKe(jamKe) {
    const totalMinutes = 7 * 60 + ((jamKe || 1) - 1) * 45;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
  }

  const absenStatus = absenRecord
    ? { label: 'Sudah Absen', value: absenRecord.timeIn || '--:--', color: '#22D3EE', dotColor: '#22D3EE' }
    : { label: 'Belum Absen', value: 'Tap absen', color: '#F59E0B', dotColor: '#F59E0B' };

  const classStatusConfig = {
    ongoing: { badge: 'Sedang Mengajar', badgeColor: '#22D3EE' },
    upcoming: { badge: 'Berikutnya', badgeColor: '#818CF8' },
    done: { badge: 'Selesai', badgeColor: 'rgba(255,255,255,0.35)' },
  };

  return (
    <div style={{ paddingTop: '8px', paddingBottom: '20px', animation: 'fadeInUp 0.35s ease' }}>

      {/* ── PROFIL CARD ── */}
      <div style={{
        margin: '0 16px 14px',
        padding: '16px 18px',
        borderRadius: '18px',
        background: 'rgba(255,255,255,0.8)',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        display: 'flex',
        alignItems: 'center',
        gap: '13px',
      }}>
        {/* Avatar */}
        <div style={{
          width: '52px', height: '52px', borderRadius: '16px', flexShrink: 0,
          background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', fontWeight: 700, color: 'white',
        }}>
          {user?.avatar
            ? <img src={user.avatar} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} />
            : getInitials(user?.name)}
        </div>

        {/* Left: greeting + name + role */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '1px' }}>
            {getGreeting()}
          </div>
          <div style={{
            fontSize: '15px', fontWeight: 700, color: '#0F172A',
            lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {user?.name?.split(',')[0] || 'Pengguna'}
          </div>
          <span style={{
            display: 'inline-block', padding: '1px 8px', borderRadius: '20px',
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
            fontSize: '10px', fontWeight: 500, color: '#2563EB', marginTop: '3px',
          }}>
            {getRoleLabel(user?.role)}
          </span>
        </div>

        {/* Right: hari + tanggal */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '2px' }}>
            {now.toLocaleDateString('id-ID', { weekday: 'long' })}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
            {now.getDate()}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8' }}>
            {now.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ── SLIDER BERITA ── */}
      <div style={{ marginBottom: '14px' }}>
        <NewsSlider />
      </div>

      {/* ── STATUS ABSEN + JAM NGAJAR ── */}
      <div style={{ margin: '0 16px 16px', display: 'flex', gap: '10px' }}>

        {/* Status Absen */}
        <div style={{
          flex: 1,
          padding: '13px 14px',
          borderRadius: '14px',
          background: 'rgba(255, 255, 255, 0.8)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          border: `1px solid ${absenRecord ? 'rgba(34,211,238,0.4)' : 'rgba(245,158,11,0.4)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: absenStatus.dotColor,
              boxShadow: `0 0 6px ${absenStatus.dotColor}`,
            }} />
            <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 500, letterSpacing: '0.3px' }}>
              STATUS ABSEN
            </span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: absenStatus.color }}>
            {absenStatus.label}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
            {absenRecord ? `Masuk ${absenRecord.timeIn}` : 'Belum tercatat'}
          </div>
        </div>

        {/* Jam Ngajar Berikutnya */}
        <div style={{
          flex: 1,
          padding: '13px 14px',
          borderRadius: '14px',
          background: 'rgba(255, 255, 255, 0.8)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          border: nextClass
            ? `1px solid ${nextClass.status === 'ongoing' ? 'rgba(34,211,238,0.4)' : 'rgba(129,140,248,0.4)'}`
            : '1px solid rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: nextClass ? (nextClass.status === 'ongoing' ? '#22D3EE' : '#818CF8') : 'rgba(0,0,0,0.2)',
            }} />
            <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 500, letterSpacing: '0.3px' }}>
              JAM MENGAJAR
            </span>
          </div>
          {nextClass ? (
            <>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                {formatJamKe(nextClass.jamKe)} — {nextClass.class}
              </div>
              <div style={{
                fontSize: '10px', marginTop: '1px',
                color: classStatusConfig[nextClass.status]?.badgeColor || '#64748B',
                fontWeight: 500,
              }}>
                {nextClass.subject} · {classStatusConfig[nextClass.status]?.badge}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>
                Tidak ada
              </div>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '1px' }}>
                Jadwal hari ini kosong
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── GRID FITUR ── */}
      <FeatureGrid />

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
