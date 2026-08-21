/* ============================================================
   Konstanta Aplikasi SIA SMK Muhammadiyah 04 Bangsri (Pure SIA)
   ============================================================ */

export const SCHOOL_INFO = {
  name: 'SMK Muhammadiyah 04 Bangsri',
  shortName: 'SIA SMK MU4RA',
  description: 'Sistem Informasi Akademik & Presensi Internal Sekolah',
  address: 'Bangsri, Jepara, Jawa Tengah',
  phone: '(0291) 000-000',
  email: 'info@smkmuh04bangsri.sch.id',
  website: 'https://smkmuh04bangsri.sch.id',
};

/* --- Koordinat GPS Lokasi Sekolah & Geofencing --- */
export const SCHOOL_GEOFENCE = {
  latitude: -6.5194526,   /* Koordinat resmi Dapodik SMK Muhammadiyah 04 Bangsri (Wedelan) */
  longitude: 110.7783316,
  radiusMeters: 250,      /* Radius 250 meter mencakup seluruh area gedung sekolah */
};

/* --- Definisi Role Pengguna --- */
export const USER_ROLES = {
  ADMIN: 'admin',
  GURU: 'guru',
  STAFF: 'staff',
  WALI_MURID: 'wali_murid',
};

export const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.GURU]: 'Guru',
  [USER_ROLES.STAFF]: 'Staff Tata Usaha',
  [USER_ROLES.WALI_MURID]: 'Wali Murid',
};

/* --- Menu Sidebar Dashboard — GROUPED --- */
export const DASHBOARD_NAV_ITEMS = [
  /* === MASTER DATA === */
  {
    label: 'Dashboard',
    path: '/dashboard/ringkasan',
    icon: 'layout-dashboard',
    group: 'Master Data',
    roles: [USER_ROLES.ADMIN, USER_ROLES.GURU, USER_ROLES.STAFF, USER_ROLES.WALI_MURID],
  },
  {
    label: 'Tahun Ajar',
    path: '/dashboard/tahun-ajar',
    icon: 'calendar-range',
    group: 'Master Data',
    roles: [USER_ROLES.ADMIN],
  },
  {
    label: 'Mata Pelajaran',
    path: '/dashboard/mata-pelajaran',
    icon: 'book-open',
    group: 'Master Data',
    roles: [USER_ROLES.ADMIN],
  },
  {
    label: 'Manajemen Jadwal',
    path: '/dashboard/manajemen-jadwal',
    icon: 'calendar-clock',
    group: 'Akademik',
    roles: [USER_ROLES.ADMIN],
  },
  {
    label: 'Data Siswa',
    path: '/dashboard/siswa',
    icon: 'user-graduate',
    group: 'Akademik',
    roles: [USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.GURU],
  },
  {
    label: 'Data Guru & Tugas',
    path: '/dashboard/guru',
    icon: 'user-tie',
    group: 'Akademik',
    roles: [USER_ROLES.ADMIN],
  },
  {
    label: 'Kelas & Wali Kelas',
    path: '/dashboard/wali-kelas',
    icon: 'school',
    group: 'Akademik',
    roles: [USER_ROLES.ADMIN, USER_ROLES.GURU],
  },
  {
    label: 'Lihat Jadwal Mengajar',
    path: '/dashboard/jadwal',
    icon: 'calendar-clock',
    group: 'Akademik',
    roles: [USER_ROLES.GURU],
  },

  /* === MONITORING === */
  {
    label: 'Absensi Siswa',
    path: '/dashboard/absensi',
    icon: 'clipboard-check',
    group: 'Monitoring',
    roles: [USER_ROLES.ADMIN, USER_ROLES.GURU],
  },
  {
    label: 'Absensi Guru',
    path: '/dashboard/absensi-guru',
    icon: 'clipboard-list',
    group: 'Monitoring',
    roles: [USER_ROLES.ADMIN],
  },
  {
    label: 'Nilai Siswa',
    path: '/dashboard/nilai',
    icon: 'chart-bar',
    group: 'Monitoring',
    roles: [USER_ROLES.ADMIN, USER_ROLES.GURU, USER_ROLES.WALI_MURID],
  },
  {
    label: 'Monitoring Kelas (CCTV)',
    path: '/dashboard/monitoring-mapel',
    icon: 'layout-dashboard',
    group: 'Monitoring',
    roles: [USER_ROLES.ADMIN, USER_ROLES.KEPSEK],
  },
  {
    label: 'Poin Sikap',
    path: '/dashboard/poin-sikap',
    icon: 'star',
    group: 'Monitoring',
    roles: [USER_ROLES.ADMIN, USER_ROLES.GURU],
  },

  /* === GURU TOOLS === */
  {
    label: 'Absen Guru (GPS)',
    path: '/dashboard/absen-guru',
    icon: 'map-pin',
    group: 'Guru',
    roles: [USER_ROLES.GURU, USER_ROLES.STAFF],
  },
  {
    label: 'Input Absen Piket',
    path: '/dashboard/guru-absen-piket',
    icon: 'clipboard-list',
    group: 'Guru',
    roles: [USER_ROLES.GURU, USER_ROLES.ADMIN],
  },
  {
    label: 'Input Absen Mapel',
    path: '/dashboard/guru-absen-mapel',
    icon: 'book-open-check',
    group: 'Guru',
    roles: [USER_ROLES.GURU, USER_ROLES.ADMIN],
  },

  /* === SISTEM === */
  {
    label: 'Pengaturan',
    path: '/dashboard/pengaturan',
    icon: 'settings',
    group: 'Sistem',
    roles: [USER_ROLES.ADMIN],
  },
];

export const ATTENDANCE_STATUS = {
  HADIR: 'hadir',
  IZIN: 'izin',
  SAKIT: 'sakit',
  ALPHA: 'alpha',
};

export const PAYMENT_STATUS = {
  LUNAS: 'lunas',
  CICILAN: 'cicilan',
  BELUM: 'belum',
};

export const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const SUBJECT_GROUPS = ['Normatif', 'Adaptif', 'Produktif'];

export const TEACHER_DUTY_TYPES = [
  { value: 'wali_kelas', label: 'Wali Kelas' },
  { value: 'piket', label: 'Piket' },
  { value: 'pembina', label: 'Pembina' },
];

export const TEACHER_ATTENDANCE_STATUS = [
  { value: 'hadir', label: 'Hadir', color: '#10B981' },
  { value: 'izin', label: 'Izin', color: '#3B82F6' },
  { value: 'sakit', label: 'Sakit', color: '#F59E0B' },
  { value: 'tugas_luar', label: 'Tugas Luar', color: '#8B5CF6' },
  { value: 'alpha', label: 'Alpha', color: '#EF4444' },
];
