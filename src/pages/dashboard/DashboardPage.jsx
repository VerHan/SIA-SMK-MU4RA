/* ============================================================
   DashboardPage — Ringkasan Utama Admin (React Query Powered)
   Single-elevation surfaces, tabular-nums, skeleton loading.
   ============================================================ */

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { getDashboardStats } from '../../services/api';
import { getGreeting } from '../../utils/helpers';
import Card from '../../components/ui/Card';

const Icons = {
  students: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
    </svg>
  ),
  teachers: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" /><path d="M5.5 21a8.38 8.38 0 0 1 13 0" />
    </svg>
  ),
  classes: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-4h6v4" />
    </svg>
  ),
  ppdb: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="m9 15 2 2 4-4" />
    </svg>
  ),
  schedule: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
};

const QUICK_ACTIONS = [
  { label: 'Monitoring Kelas', desc: 'Status KBM real-time', path: '/dashboard/monitoring-mapel', color: '#2563EB', roles: ['admin', 'kepsek'] },
  { label: 'Absensi Siswa', desc: 'Rekap piket & mapel', path: '/dashboard/absensi', color: '#0891B2', roles: ['admin', 'guru'] },
  { label: 'Nilai Siswa', desc: 'Input & kelola nilai', path: '/dashboard/nilai', color: '#059669', roles: ['admin', 'guru', 'wali_murid'] },
  { label: 'Verifikasi PPDB', desc: 'Seleksi pendaftar baru', path: '/dashboard/ppdb', color: '#D97706', roles: ['admin', 'staff'] },
  { label: 'Manajemen Berita', desc: 'Publikasi website sekolah', path: '/dashboard/berita', color: '#7C3AED', roles: ['admin', 'staff'] },
  { label: 'Manajemen Akun', desc: 'Kelola user & RBAC', path: '/dashboard/akun', color: '#DC2626', roles: ['admin'] },
];

function DonutChart({ percentage, color, label }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
      <div style={{ position: 'relative', width: '96px', height: '96px' }}>
        <svg width="96" height="96" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r={radius} fill="transparent" stroke="var(--color-border-light)" strokeWidth="10" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 600ms ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '19px',
          fontWeight: 'var(--font-weight-extrabold)',
          color: 'var(--color-text)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {percentage}%
        </div>
      </div>
      <div style={{ fontSize: '13px', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
        {label}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 30 * 1000,
  });

  const statCards = [
    { label: 'Total Siswa', value: stats?.totalStudents ?? 0, icon: Icons.students, tint: '#EFF6FF', color: '#1D4ED8', path: '/dashboard/siswa' },
    { label: 'Total Guru', value: stats?.totalTeachers ?? 0, icon: Icons.teachers, tint: '#ECFEFF', color: '#0E7490', path: '/dashboard/guru' },
    { label: 'Kelas Aktif', value: stats?.totalClasses ?? 0, icon: Icons.classes, tint: '#F5F3FF', color: '#6D28D9', path: '/dashboard/wali-kelas' },
    { label: 'Jadwal Hari Ini', value: stats?.todayScheduleCount ?? 0, icon: Icons.schedule, tint: '#ECFDF5', color: '#047857', path: '/dashboard/manajemen-jadwal' },
    {
      label: 'PPDB Menunggu',
      value: stats?.pendingPpdb ?? 0,
      sub: `dari ${stats?.totalPpdb ?? 0} pendaftar`,
      icon: Icons.ppdb,
      tint: '#FFFBEB',
      color: '#B45309',
      path: '/dashboard/ppdb',
    },
  ];

  const attendancePagi = stats?.studentAttendanceToday;
  const attendanceGuru = stats?.teacherAttendanceToday;
  const totalSiswaAbsen = attendancePagi ? (attendancePagi.hadir + attendancePagi.izin + attendancePagi.sakit + attendancePagi.alpha) : 0;
  const persentaseSiswa = totalSiswaAbsen > 0 ? Math.round((attendancePagi.hadir / totalSiswaAbsen) * 100) : 0;

  const totalGuruAbsen = attendanceGuru ? (attendanceGuru.hadir + attendanceGuru.izin + attendanceGuru.sakit + attendanceGuru.alpha) : 0;
  const persentaseGuru = totalGuruAbsen > 0 ? Math.round((attendanceGuru.hadir / totalGuruAbsen) * 100) : 0;

  const visibleActions = QUICK_ACTIONS.filter(a => hasRole(a.roles));

  return (
    <div style={{ animation: 'fadeIn 250ms ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: '4px', color: 'var(--color-text)' }}>
            {getGreeting()}, {user?.name?.split(' ')[0]}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Ringkasan akademik, kehadiran, dan publikasi SMK Muhammadiyah 04 Bangsri.
          </p>
        </div>
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '8px 14px',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-secondary)',
          fontWeight: 'var(--font-weight-semibold)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          Tahun Ajar Aktif: <strong style={{ color: 'var(--color-primary)' }}>{stats?.activeAcademicYear || '—'}</strong>
        </div>
      </div>

      {/* KPI Strip — Single Elevation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {statCards.map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={() => navigate(stat.path)}
            style={{
              textAlign: 'left',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-5)',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
              transition: 'border-color 150ms ease, transform 150ms ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = stat.color;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                {stat.label}
              </div>
              {isLoading ? (
                <div style={{ height: '28px', width: '56px', borderRadius: '6px', background: 'var(--color-border-light)' }} />
              ) : (
                <div style={{ fontSize: '28px', fontWeight: 800, color: stat.color, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
                  {stat.value}
                </div>
              )}
              {stat.sub && !isLoading && (
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
                  {stat.sub}
                </div>
              )}
            </div>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-lg)',
              background: stat.tint,
              color: stat.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {stat.icon}
            </div>
          </button>
        ))}
      </div>

      {/* Attendance Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' }}>
          <DonutChart percentage={persentaseSiswa} color="#2563EB" label="Kehadiran Siswa Hari Ini (Pagi)" />
          <div style={{ display: 'flex', gap: 'var(--space-5)', marginTop: 'var(--space-5)', flexWrap: 'wrap', justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#059669' }}>{attendancePagi?.hadir ?? 0}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Hadir</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#D97706' }}>{(attendancePagi?.izin ?? 0) + (attendancePagi?.sakit ?? 0)}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Izin / Sakit</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#DC2626' }}>{attendancePagi?.alpha ?? 0}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Alpha</div>
            </div>
            {(attendancePagi?.bolos ?? 0) > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#991B1B' }}>{attendancePagi.bolos}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Bolos</div>
              </div>
            )}
          </div>
        </Card>

        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' }}>
          <DonutChart percentage={persentaseGuru} color="#0891B2" label="Kehadiran Guru Hari Ini" />
          <div style={{ display: 'flex', gap: 'var(--space-5)', marginTop: 'var(--space-5)', flexWrap: 'wrap', justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#059669' }}>{attendanceGuru?.hadir ?? 0}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Hadir</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#D97706' }}>{(attendanceGuru?.sakit ?? 0) + (attendanceGuru?.izin ?? 0)}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Izin / Sakit</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#DC2626' }}>{attendanceGuru?.alpha ?? 0}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Belum Hadir</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Two-Column Detail Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text)' }}>
              Jadwal KBM Hari Ini ({stats?.today || 'Hari Ini'})
            </h3>
            <button
              type="button"
              onClick={() => navigate('/dashboard/manajemen-jadwal')}
              style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600 }}
            >
              Kelola →
            </button>
          </div>
          {isLoading ? (
            <div style={{ height: '100px', borderRadius: '8px', background: 'var(--color-border-light)' }} />
          ) : stats?.todaySchedule?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stats.todaySchedule.map((item) => (
                <div key={item.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-bg)',
                  fontSize: 'var(--font-size-xs)',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{item.subject}</div>
                    <div style={{ color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      {item.class} · {item.teacher}
                    </div>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    Jam {item.jamKe}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
              Tidak ada jadwal pelajaran untuk hari ini.
            </div>
          )}
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text)' }}>
              Berita & Pengumuman Terbaru
            </h3>
            {hasRole(['admin', 'staff']) && (
              <button
                type="button"
                onClick={() => navigate('/dashboard/berita')}
                style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600 }}
              >
                Kelola →
              </button>
            )}
          </div>
          {isLoading ? (
            <div style={{ height: '100px', borderRadius: '8px', background: 'var(--color-border-light)' }} />
          ) : stats?.upcomingEvents?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stats.upcomingEvents.map((event) => (
                <div key={event.id} style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-bg)',
                }}>
                  <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>
                    {event.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {event.category} · {event.date}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
              Belum ada pengumuman aktif.
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      {visibleActions.length > 0 && (
        <div>
          <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
            Akses Cepat Modul
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: 'var(--space-3)' }}>
            {visibleActions.map((action) => (
              <button
                key={action.path}
                type="button"
                onClick={() => navigate(action.path)}
                style={{
                  textAlign: 'left',
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 'var(--space-4)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'border-color 150ms ease, transform 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = action.color;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: action.color, marginBottom: '3px' }}>
                  {action.label}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {action.desc}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
