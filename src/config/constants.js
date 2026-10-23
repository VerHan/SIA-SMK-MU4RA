/* ============================================================
   Konstanta Aplikasi SIA SMK Muhammadiyah 04 Bangsri (Pure SIA)
   ============================================================ */

export const SCHOOL_INFO = {
  name: 'SMK Muhammadiyah 04 Bangsri',
  shortName: 'SMK MU4RA',
  description: 'Sistem Informasi Akademik & Media Resmi Sekolah',
  address: 'Wedelan, Kec. Bangsri, Kab. Jepara, Jawa Tengah 59453',
  phone: '(0291) 772-1044',
  email: 'info@smkmuh04bangsri.sch.id',
  website: 'https://smkmuh04bangsri.sch.id',
  visi: 'Menjadi SMK Unggul Berbasis Karakter Islami, Berjiwa Wirausaha, dan Berdaya Saing Global di Era Industri Modern.',
  misi: [
    'Menyelenggarakan pendidikan kejuruan berlandaskan nilai-nilai Al-Islam dan Kemuhammadiyahan.',
    'Menerapkan kurikulum berbasis industri dan teknologi terkini yang relevan dengan kebutuhan dunia kerja.',
    'Membina jiwa kewirausahaan (technopreneurship) yang mandiri, kreatif, dan inovatif.',
    'Mewujudkan iklim sekolah yang asri, disiplin, berakhlak mulia, dan berwawasan lingkungan.',
  ],
};

/* --- Navigasi Publik Website Profil --- */
export const PUBLIC_NAV_ITEMS = [
  { label: 'Beranda', path: '/' },
  { label: 'Profil', path: '/profil' },
  { label: 'Kejuruan', path: '/kejuruan' },
  { label: 'Berita', path: '/berita' },
  { label: 'Pendaftaran PPDB', path: '/ppdb' },
];

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
  KEPSEK: 'kepsek',
  WALI_MURID: 'wali_murid',
};

export const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.GURU]: 'Guru',
  [USER_ROLES.STAFF]: 'Staff Tata Usaha',
  [USER_ROLES.KEPSEK]: 'Kepala Sekolah',
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

export const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

export const SUBJECT_GROUPS = [];

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

export const JURUSAN_LIST = [
  {
    id: 'tkr',
    shortName: 'TKR',
    name: 'Teknik Kendaraan Ringan',
    description: 'Keahlian teknik diagnosis mesin mobil, transmisi, overhaul sistem injeksi, kelistrikan bodi, dan standarisasi manajemen bengkel resmi modern.',
    image: '/images/jurusan_tkr.jpg',
    badge: 'Otomotif Roda 4',
    icon: 'car',
    color: '#EF4444',
    certBadge: '🏆 Sertifikasi BNSP Otomotif',
    partnerBadge: '🚗 Rekanan Bengkel Resmi & ATPM',
    employmentRate: '96% Siap Kerja & Wirausaha',
    highlights: ['Diagnosis Mesin Mobil Injeksi', 'Overhaul Transmisi & Chasis', 'Kelistrikan Bodi & AC Mobil', 'Standarisasi Bengkel Resmi Astra/Daihatsu']
  },
  {
    id: 'tsm',
    shortName: 'TSM',
    name: 'Teknik Sepeda Motor',
    description: 'Kompetensi perawatan, tune-up, dan perbaikan mesin sepeda motor berteknologi injeksi (PGM-FI), rangka, kelistrikan, serta wirausaha bengkel mandiri.',
    image: '/images/jurusan_tsm.jpg',
    badge: 'Otomotif Roda 2',
    icon: 'wrench',
    color: '#F59E0B',
    certBadge: '🏍️ Uji Kompetensi Injeksi EFI',
    partnerBadge: '🛠️ Standar Servis Honda & Yamaha',
    employmentRate: '94% Siap Kerja & Wirausaha',
    highlights: ['Perawatan Mesin Injeksi (FI)', 'Bongkar Pasang Transmisi Matic & Manual', 'Troubleshooting Kelistrikan Motor', 'Kewirausahaan Bengkel Roda Dua']
  },
  {
    id: 'titl',
    shortName: 'TITL',
    name: 'Teknik Instalasi Tenaga Listrik',
    description: 'Penguasaan instalasi penerangan gedung bertingkat, perakitan panel distribusi daya 3 fasa, motor listrik industri, dan sistem otomasi kendali PLC.',
    image: '/images/jurusan_titl.jpg',
    badge: 'Kelistrikan & Otomasi',
    icon: 'zap',
    color: '#0284C7',
    certBadge: '⚡ Standar Sertifikasi PLN & K3',
    partnerBadge: '🏭 Panel Otomasi & PLC Pabrik',
    employmentRate: '95% Siap Kerja Industri & BUMN',
    highlights: ['Instalasi Penerangan Gedung', 'Perakitan Panel Daya 3 Fasa', 'Kontrol Motor Listrik Industri', 'Sistem Otomasi Kendali PLC & Smart Home']
  },
  {
    id: 'dkv',
    shortName: 'DKV',
    name: 'Desain Komunikasi Visual',
    description: 'Pengembangan kreativitas desain grafis, fotografi studio, videografi komersial, animasi digital, editing, dan periklanan media digital modern.',
    image: '/images/jurusan_dkv.jpg',
    badge: 'Kreatif & Multimedia',
    icon: 'camera',
    color: '#8B5CF6',
    certBadge: '🎨 Standar Industri Adobe Creative',
    partnerBadge: '💼 Kerjasama Agensi & Studio Desain',
    employmentRate: '93% Siap Kerja Agensi & Freelance',
    highlights: ['Desain Grafis & Digital Branding', 'Fotografi & Videografi Studio', 'Motion Graphic & Animasi 2D/3D', 'Desain Konten Media Sosial & UI/UX']
  }
];

