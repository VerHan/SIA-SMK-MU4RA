/* DashboardPage — Halaman ringkasan utama admin
   Redesign: Blue modern, SVG icons, professional widgets */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDashboardStats } from '../../services/api';
import { getGreeting, formatDate } from '../../utils/helpers';
import Card from '../../components/ui/Card';

/* === SVG Icons === */
const StatIcons = {
  students: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
    </svg>
  ),
  teachers: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" /><path d="M5.5 21a8.38 8.38 0 0 1 13 0" /><polyline points="12 14 10 17 12 21 14 17 12 14" />
    </svg>
  ),
  classes: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-4h6v4" /><circle cx="12" cy="11" r="1.5" />
    </svg>
  ),
  schedule: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="13" y2="10" /><circle cx="17" cy="17" r="5" /><polyline points="17 14.5 17 17 18.5 18.5" />
    </svg>
  ),
  arrow: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  event: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
};

/* Quick Actions config */
const quickActionsConfig = [
  {
    label: 'Absensi Siswa', path: '/dashboard/absensi', desc: 'Input absen pagi & sore',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2" width="12" height="4" rx="1" /><path d="M6 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1" /><polyline points="9 14 11 16 15 12" /></svg>,
    color: '#2563EB',
  },
  {
    label: 'Input Nilai', path: '/dashboard/nilai', desc: 'Kelola nilai siswa',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="3" y1="21" x2="21" y2="21" /></svg>,
    color: '#0891B2',
  },
  {
    label: 'Data Siswa', path: '/dashboard/siswa', desc: 'Kelola master data siswa',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" /></svg>,
    color: '#7C3AED',
  },
  {
    label: 'Jadwal', path: '/dashboard/jadwal', desc: 'Lihat jadwal pelajaran',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="13" y2="10" /><circle cx="17" cy="17" r="5" /><polyline points="17 14.5 17 17 18.5 18.5" /></svg>,
    color: '#059669',
  },
  {
    label: 'Poin Sikap', path: '/dashboard/poin-sikap', desc: 'Catatan perilaku siswa',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
    color: '#D97706',
  },
  {
    label: 'Kelas', path: '/dashboard/wali-kelas', desc: 'Data kelas & wali kelas',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-4h6v4" /><circle cx="12" cy="11" r="1.5" /></svg>,
    color: '#DC2626',
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getDashboardStats().then(setStats);
  }, []);

  const statCards = [
    { label: 'Total Siswa', value: stats?.totalStudents || '-', icon: StatIcons.students, gradient: 'linear-gradient(135deg, #2563EB, #3B82F6)', lightBg: '#EFF6FF', textColor: '#1E40AF', path: '/dashboard/siswa' },
    { label: 'Total Guru', value: stats?.totalTeachers || '-', icon: StatIcons.teachers, gradient: 'linear-gradient(135deg, #0891B2, #06B6D4)', lightBg: '#ECFEFF', textColor: '#155E75', path: '/dashboard/guru' },
    { label: 'Kelas Aktif', value: stats?.totalClasses || '-', icon: StatIcons.classes, gradient: 'linear-gradient(135deg, #7C3AED, #8B5CF6)', lightBg: '#F5F3FF', textColor: '#5B21B6', path: '/dashboard/wali-kelas' },
    { label: 'Jadwal Hari Ini', value: stats?.todayScheduleCount || '0', icon: StatIcons.schedule, gradient: 'linear-gradient(135deg, #059669, #10B981)', lightBg: '#ECFDF5', textColor: '#065F46', path: '/dashboard/jadwal' },
  ];

  const attendancePagi = stats?.studentAttendanceToday;
  const attendanceGuru = stats?.teacherAttendanceToday;
  const totalSiswaAbsen = attendancePagi ? (attendancePagi.hadir + attendancePagi.izin + attendancePagi.sakit + attendancePagi.alpha) : 0;
  const persentaseSiswa = totalSiswaAbsen > 0 ? Math.round((attendancePagi.hadir / totalSiswaAbsen) * 100) : 0;
  
  const totalGuruAbsen = attendanceGuru ? (attendanceGuru.hadir + attendanceGuru.izin + attendanceGuru.sakit + attendanceGuru.alpha) : 0;
  const persentaseGuru = totalGuruAbsen > 0 ? Math.round((attendanceGuru.hadir / totalGuruAbsen) * 100) : 0;

  // Simple Donut Chart Component
  const DonutChart = ({ percentage, color, label }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
        <div style={{ position: 'relative', width: '100px', height: '100px' }}>
          {/* Background circle */}
          <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r={radius} fill="transparent" stroke="var(--color-border-light)" strokeWidth="12" />
            {/* Progress circle */}
            <circle
              cx="50" cy="50" r={radius} fill="transparent"
              stroke={color} strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
            />
          </svg>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: 'var(--font-weight-extrabold)', color: 'var(--color-text)'
          }}>
            {percentage}%
          </div>
        </div>
        <div style={{ fontSize: '13px', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
          {label}
        </div>
      </div>
    );
  };

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      {/* Greeting + Date */}
      <div style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div>
          <h1 style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-extrabold)',
            marginBottom: '4px',
            color: 'var(--color-text)',
          }}>
            {getGreeting()}, {user?.name?.split(' ')[0]}!
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Ringkasan aktivitas sekolah hari ini
          </p>
        </div>
        <div style={{
          background: '#EFF6FF',
          border: '1px solid #DBEAFE',
          borderRadius: 'var(--radius-lg)',
          padding: '8px 16px',
          fontSize: 'var(--font-size-sm)',
          color: '#1E40AF',
          fontWeight: 'var(--font-weight-medium)',
        }}>
          {stats?.activeAcademicYear || 'Tahun Ajar -'}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)',
      }}>
        {statCards.map((stat, i) => (
          <div
            key={i}
            onClick={() => navigate(stat.path)}
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-5)',
              border: '1px solid var(--color-border-light)',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
              transition: 'all var(--transition-normal)',
              animation: `fadeInUp 400ms ease ${i * 80}ms both`,
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              e.currentTarget.style.transform = 'translateY(-3px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--color-text-muted)',
                  fontWeight: 'var(--font-weight-semibold)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '6px',
                }}>
                  {stat.label}
                </div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 'var(--font-weight-extrabold)',
                  color: stat.textColor,
                  lineHeight: 1,
                }}>
                  {stat.value}
                </div>
              </div>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-lg)',
                background: stat.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: `0 4px 12px ${stat.textColor}30`,
              }}>
                {stat.icon}
              </div>
            </div>
            {/* Subtle bottom accent */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: stat.gradient,
              opacity: 0.6,
            }} />
          </div>
        ))}
      </div>

      {/* Dua Diagram Pai (Donut Charts) untuk memantau Kehadiran */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)',
      }}>
        {/* Chart Siswa */}
        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' }}>
          <DonutChart percentage={persentaseSiswa} color="#2563EB" label="Kehadiran Siswa (Pagi)" />
          {attendancePagi && (
            <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-5)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#059669' }}>{attendancePagi.hadir}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Hadir</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#DC2626' }}>{attendancePagi.alpha}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Alpha</div>
              </div>
              {attendancePagi.bolos > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#991B1B' }}>{attendancePagi.bolos}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Bolos</div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Chart Guru */}
        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' }}>
          <DonutChart percentage={persentaseGuru} color="#0891B2" label="Kehadiran Guru (GPS)" />
          {attendanceGuru && (
            <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-5)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#059669' }}>{attendanceGuru.hadir}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Hadir</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#D97706' }}>{attendanceGuru.sakit + attendanceGuru.izin}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Sakit/Izin</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#DC2626' }}>{attendanceGuru.alpha}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Alpha</div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Two-Column Widget Row (Agenda & Piket) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)',
      }}>
        {/* Piket Hari Ini */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>
              Guru Piket Hari Ini
            </h3>
          </div>

          {/* Piket Hari Ini */}
          {stats?.todayDuty && stats.todayDuty.length > 0 && (
            <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-border-light)' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 'var(--font-weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Piket Hari Ini
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {stats.todayDuty.map((duty, i) => (
                  <span key={i} style={{
                    background: '#EFF6FF',
                    color: '#1E40AF',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '12px',
                    fontWeight: 'var(--font-weight-medium)',
                    border: '1px solid #DBEAFE',
                  }}>
                    {duty.guruName?.split(',')[0]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Upcoming Events Widget */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>
              Agenda & Pengumuman
            </h3>
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-muted)' }}>
              {StatIcons.event}
            </span>
          </div>
          {stats?.upcomingEvents && stats.upcomingEvents.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {stats.upcomingEvents.map((event, i) => (
                <div key={i} style={{
                  display: 'flex',
                  gap: 'var(--space-3)',
                  alignItems: 'flex-start',
                  padding: '10px 12px',
                  background: i === 0 ? '#EFF6FF' : 'var(--color-bg)',
                  borderRadius: 'var(--radius-lg)',
                  border: i === 0 ? '1px solid #DBEAFE' : '1px solid transparent',
                  transition: 'background var(--transition-fast)',
                }}>
                  <div style={{
                    width: '6px',
                    minHeight: '100%',
                    borderRadius: '3px',
                    background: i === 0 ? '#2563EB' : i === 1 ? '#0891B2' : '#94A3B8',
                    flexShrink: 0,
                    alignSelf: 'stretch',
                  }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-text)',
                      lineHeight: 1.3,
                      marginBottom: '2px',
                    }}>
                      {event.title}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '11px',
                        color: '#2563EB',
                        background: '#EFF6FF',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 'var(--font-weight-medium)',
                      }}>
                        {event.category}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {event.date}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Tidak ada agenda</div>
          )}
        </Card>
      </div>

      {/* End of Widgets */}

      {/* Quick Actions */}
      <div style={{ marginBottom: 'var(--space-2)' }}>
        <h3 style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text)',
          marginBottom: 'var(--space-4)',
        }}>
          Aksi Cepat
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
          gap: 'var(--space-3)',
        }}>
          {quickActionsConfig.map((action, i) => (
            <div
              key={i}
              onClick={() => navigate(action.path)}
              style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-4)',
                border: '1px solid var(--color-border-light)',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
                transition: 'all var(--transition-normal)',
                textAlign: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = `${action.color}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--color-border-light)';
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-lg)',
                background: `${action.color}10`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-2)',
                color: action.color,
              }}>
                {action.icon}
              </div>
              <div style={{
                fontWeight: 'var(--font-weight-semibold)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text)',
                marginBottom: '2px',
              }}>
                {action.label}
              </div>
              <div style={{
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                lineHeight: 1.3,
              }}>
                {action.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
