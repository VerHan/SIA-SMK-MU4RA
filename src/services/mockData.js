/* ============================================================
   Mock Data — Data Dummy untuk Prototype
   
   Data ini digunakan selama fase prototype. Ketika backend
   sudah siap, data ini akan diganti dengan API call real.
   Struktur data ini menjadi kontrak/referensi untuk backend.
   ============================================================ */

/* --- Data Tahun Ajar --- */
export const MOCK_ACADEMIC_YEARS = [
  { id: 'ta001', nama: '2024/2025', semester: 1, isActive: true, startDate: '2024-07-15', endDate: '2024-12-20' },
  { id: 'ta002', nama: '2024/2025', semester: 2, isActive: false, startDate: '2025-01-06', endDate: '2025-06-20' },
  { id: 'ta003', nama: '2023/2024', semester: 1, isActive: false, startDate: '2023-07-17', endDate: '2023-12-22' },
  { id: 'ta004', nama: '2023/2024', semester: 2, isActive: false, startDate: '2024-01-08', endDate: '2024-06-21' },
];

/* --- Data Guru --- */
export const MOCK_TEACHERS = [
  { id: 'g001', nip: '198501012010011001', name: 'Ahmad Fauzi, S.Pd.', subject: 'Matematika', phone: '081234567890', role: 'guru' },
  { id: 'g002', nip: '198703152011012002', name: 'Siti Nurhaliza, S.Kom.', subject: 'Pemrograman Web', phone: '081234567891', role: 'guru' },
  { id: 'g003', nip: '199002202012011003', name: 'Budi Santoso, S.T.', subject: 'Jaringan Komputer', phone: '081234567892', role: 'guru' },
  { id: 'g004', nip: '198810102013012004', name: 'Dewi Rahmawati, S.Pd.', subject: 'Bahasa Indonesia', phone: '081234567893', role: 'guru' },
  { id: 'g005', nip: '199105052014011005', name: 'Eko Prasetyo, S.Pd.I.', subject: 'Pendidikan Agama Islam', phone: '081234567894', role: 'guru' },
  { id: 'g006', nip: '198612122015012006', name: 'Fitri Handayani, S.Pd.', subject: 'Bahasa Inggris', phone: '081234567895', role: 'guru' },
];

/* --- Data Siswa --- */
export const MOCK_STUDENTS = [
  { id: 's001', nis: '20240001', nisn: '0012345601', name: 'Muhammad Rizki', class: 'X TKJ 1', gender: 'L', phone_parent: '081345678901', alamat: 'Jl. Merdeka No. 1, Bangsri', sekolah_asal: 'SMPN 1 Bangsri' },
  { id: 's002', nis: '20240002', nisn: '0012345602', name: 'Aisyah Putri', class: 'X TKJ 1', gender: 'P', phone_parent: '081345678902', alamat: 'Desa Kepuk RT 02 RW 01', sekolah_asal: 'MTsN 1 Jepara' },
  { id: 's003', nis: '20240003', nisn: '0012345603', name: 'Dimas Aditya', class: 'X RPL 1', gender: 'L', phone_parent: '081345678903', alamat: 'Perumahan Griya Asri Blok B1', sekolah_asal: 'SMPN 2 Keling' },
  { id: 's004', nis: '20240004', nisn: '0012345604', name: 'Nadia Safitri', class: 'X RPL 1', gender: 'P', phone_parent: '081345678904', alamat: 'Jl. Pahlawan, Mlonggo', sekolah_asal: 'SMPN 1 Mlonggo' },
  { id: 's005', nis: '20240005', nisn: '0012345605', name: 'Fajar Nugroho', class: 'XI TKJ 1', gender: 'L', phone_parent: '081345678905', alamat: 'Desa Krasak RT 01 RW 02', sekolah_asal: 'SMP Muhammadiyah Bangsri' },
  { id: 's006', nis: '20240006', nisn: '0012345606', name: 'Laila Maghfiroh', class: 'XI TKJ 1', gender: 'P', phone_parent: '081345678906', alamat: 'Jl. Pemuda No. 45, Jepara', sekolah_asal: 'SMPN 3 Jepara' },
  { id: 's007', nis: '20240007', nisn: '0012345607', name: 'Rendi Kurniawan', class: 'XI RPL 1', gender: 'L', phone_parent: '081345678907', alamat: 'Desa Wedelan', sekolah_asal: 'SMPN 1 Bangsri' },
  { id: 's008', nis: '20240008', nisn: '0012345608', name: 'Salsabila Aulia', class: 'XI RPL 1', gender: 'P', phone_parent: '081345678908', alamat: 'Jl. Kenanga, Bangsri', sekolah_asal: 'MTs Hasyim Asyari' },
  { id: 's009', nis: '20240009', nisn: '0012345609', name: 'Andi Prasetya', class: 'XII TKJ 1', gender: 'L', phone_parent: '081345678909', alamat: 'Perum Bumi Indah', sekolah_asal: 'SMPN 1 Kembang' },
  { id: 's010', nis: '20240010', nisn: '0012345610', name: 'Zahra Amelia', class: 'XII RPL 1', gender: 'P', phone_parent: '081345678910', alamat: 'Desa Guyangan', sekolah_asal: 'SMPN 2 Bangsri' },
];

/* --- Data Kelas & Wali Kelas --- */
export const MOCK_CLASSES = [
  { id: 'c001', name: 'X TKJ 1', grade: 'X', major: 'TKJ', teacherId: 'g003', teacherName: 'Budi Santoso, S.T.', totalStudents: 32 },
  { id: 'c002', name: 'X RPL 1', grade: 'X', major: 'RPL', teacherId: 'g002', teacherName: 'Siti Nurhaliza, S.Kom.', totalStudents: 30 },
  { id: 'c003', name: 'XI TKJ 1', grade: 'XI', major: 'TKJ', teacherId: 'g001', teacherName: 'Ahmad Fauzi, S.Pd.', totalStudents: 28 },
  { id: 'c004', name: 'XI RPL 1', grade: 'XI', major: 'RPL', teacherId: 'g006', teacherName: 'Fitri Handayani, S.Pd.', totalStudents: 31 },
  { id: 'c005', name: 'XII TKJ 1', grade: 'XII', major: 'TKJ', teacherId: 'g005', teacherName: 'Eko Prasetyo, S.Pd.I.', totalStudents: 27 },
  { id: 'c006', name: 'XII RPL 1', grade: 'XII', major: 'RPL', teacherId: 'g004', teacherName: 'Dewi Rahmawati, S.Pd.', totalStudents: 29 },
];

/* --- Data Mata Pelajaran --- */
export const MOCK_SUBJECTS = [
  { id: 'mp001', kode: 'MTK', nama: 'Matematika', kelompok: 'Normatif' },
  { id: 'mp002', kode: 'BIN', nama: 'Bahasa Indonesia', kelompok: 'Normatif' },
  { id: 'mp003', kode: 'BIG', nama: 'Bahasa Inggris', kelompok: 'Adaptif' },
  { id: 'mp004', kode: 'PAI', nama: 'Pendidikan Agama Islam', kelompok: 'Normatif' },
  { id: 'mp005', kode: 'PW', nama: 'Pemrograman Web', kelompok: 'Produktif' },
  { id: 'mp006', kode: 'JK', nama: 'Jaringan Komputer', kelompok: 'Produktif' },
  { id: 'mp007', kode: 'PBO', nama: 'Pemrograman Berorientasi Objek', kelompok: 'Produktif' },
  { id: 'mp008', kode: 'BD', nama: 'Basis Data', kelompok: 'Produktif' },
  { id: 'mp009', kode: 'PPKN', nama: 'Pendidikan Pancasila', kelompok: 'Normatif' },
  { id: 'mp010', kode: 'SBD', nama: 'Seni Budaya', kelompok: 'Adaptif' },
];

/* --- Mapping Guru ↔ Mapel (1 guru bisa ≥2 mapel) --- */
export const MOCK_SUBJECT_TEACHERS = [
  { id: 'mg001', guruId: 'g001', mapelId: 'mp001' }, /* Ahmad Fauzi → Matematika */
  { id: 'mg002', guruId: 'g002', mapelId: 'mp005' }, /* Siti Nurhaliza → Pemrograman Web */
  { id: 'mg003', guruId: 'g002', mapelId: 'mp008' }, /* Siti Nurhaliza → Basis Data (2 mapel) */
  { id: 'mg004', guruId: 'g003', mapelId: 'mp006' }, /* Budi Santoso → Jaringan Komputer */
  { id: 'mg005', guruId: 'g004', mapelId: 'mp002' }, /* Dewi Rahmawati → Bahasa Indonesia */
  { id: 'mg006', guruId: 'g005', mapelId: 'mp004' }, /* Eko Prasetyo → PAI */
  { id: 'mg007', guruId: 'g006', mapelId: 'mp003' }, /* Fitri Handayani → Bahasa Inggris */
  { id: 'mg008', guruId: 'g003', mapelId: 'mp007' }, /* Budi Santoso → PBO (2 mapel) */
];

/* --- Tugas Guru (Wali Kelas, Piket, Pembina) --- */
export const MOCK_TEACHER_DUTIES = [
  { id: 'tg001', guruId: 'g001', jenis: 'wali_kelas', kelasId: 'c003', keterangan: 'Wali Kelas XI TKJ 1' },
  { id: 'tg002', guruId: 'g002', jenis: 'wali_kelas', kelasId: 'c002', keterangan: 'Wali Kelas X RPL 1' },
  { id: 'tg003', guruId: 'g003', jenis: 'wali_kelas', kelasId: 'c001', keterangan: 'Wali Kelas X TKJ 1' },
  { id: 'tg004', guruId: 'g004', jenis: 'wali_kelas', kelasId: 'c006', keterangan: 'Wali Kelas XII RPL 1' },
  { id: 'tg005', guruId: 'g005', jenis: 'wali_kelas', kelasId: 'c005', keterangan: 'Wali Kelas XII TKJ 1' },
  { id: 'tg006', guruId: 'g006', jenis: 'wali_kelas', kelasId: 'c004', keterangan: 'Wali Kelas XI RPL 1' },
  { id: 'tg007', guruId: 'g001', jenis: 'pembina', kelasId: null, keterangan: 'Pembina OSIS' },
  { id: 'tg008', guruId: 'g005', jenis: 'pembina', kelasId: null, keterangan: 'Pembina Rohis' },
];

/* --- Jadwal Piket Guru (per Hari) --- */
export const MOCK_DUTY_SCHEDULE = [
  { id: 'jp001', hari: 'Senin', guruId: 'g001', guruName: 'Ahmad Fauzi, S.Pd.', keterangan: 'Piket Pagi' },
  { id: 'jp002', hari: 'Senin', guruId: 'g004', guruName: 'Dewi Rahmawati, S.Pd.', keterangan: 'Piket Pagi' },
  { id: 'jp003', hari: 'Selasa', guruId: 'g002', guruName: 'Siti Nurhaliza, S.Kom.', keterangan: 'Piket Pagi' },
  { id: 'jp004', hari: 'Selasa', guruId: 'g005', guruName: 'Eko Prasetyo, S.Pd.I.', keterangan: 'Piket Pagi' },
  { id: 'jp005', hari: 'Rabu', guruId: 'g003', guruName: 'Budi Santoso, S.T.', keterangan: 'Piket Pagi' },
  { id: 'jp006', hari: 'Rabu', guruId: 'g006', guruName: 'Fitri Handayani, S.Pd.', keterangan: 'Piket Pagi' },
  { id: 'jp007', hari: 'Kamis', guruId: 'g001', guruName: 'Ahmad Fauzi, S.Pd.', keterangan: 'Piket Pagi' },
  { id: 'jp008', hari: 'Kamis', guruId: 'g003', guruName: 'Budi Santoso, S.T.', keterangan: 'Piket Pagi' },
  { id: 'jp009', hari: 'Jumat', guruId: 'g002', guruName: 'Siti Nurhaliza, S.Kom.', keterangan: 'Piket Pagi' },
  { id: 'jp010', hari: 'Jumat', guruId: 'g004', guruName: 'Dewi Rahmawati, S.Pd.', keterangan: 'Piket Pagi' },
];

/* --- Master Jam Pelajaran (Time Slots) --- */
export const MOCK_TIME_SLOTS = [
  { jamKe: 1, type: 'pelajaran', start: '07:00', end: '07:45' },
  { jamKe: 2, type: 'pelajaran', start: '07:45', end: '08:30' },
  { jamKe: null, type: 'istirahat', start: '08:30', end: '09:00', name: 'Istirahat 1' },
  { jamKe: 3, type: 'pelajaran', start: '09:00', end: '09:45' },
  { jamKe: 4, type: 'pelajaran', start: '09:45', end: '10:30' },
  { jamKe: null, type: 'istirahat', start: '10:30', end: '10:45', name: 'Istirahat 2' },
  { jamKe: 5, type: 'pelajaran', start: '10:45', end: '11:30' },
  { jamKe: 6, type: 'pelajaran', start: '11:30', end: '12:15' },
  { jamKe: null, type: 'istirahat', start: '12:15', end: '13:00', name: 'Sholat Dzuhur & Istirahat' },
  { jamKe: 7, type: 'pelajaran', start: '13:00', end: '13:45' },
  { jamKe: 8, type: 'pelajaran', start: '13:45', end: '14:30' },
  { jamKe: 9, type: 'pelajaran', start: '14:30', end: '15:15' },
  { jamKe: 10, type: 'pelajaran', start: '15:15', end: '16:00' },
];

/* --- Kalender Akademik --- */
export const MOCK_ACADEMIC_CALENDAR = [
  { id: 'kal001', tanggal: '2024-08-17', tipe: 'libur', judul: 'HUT RI', keterangan: 'Libur Nasional', jamMulai: null, jamSelesai: null, isFullDay: true },
  { id: 'kal002', tanggal: '2024-10-21', tipe: 'acara', judul: 'Sosialisasi Kampus', keterangan: 'Untuk kelas XII', jamMulai: 1, jamSelesai: 4, isFullDay: false },
];

/* --- Jadwal Pelajaran --- */
export const MOCK_SCHEDULE = [
  { id: 'j001', day: 'Senin', time: '07:00 - 08:30', jamKe: 1, subject: 'Matematika', subjectId: 'mp001', teacher: 'Ahmad Fauzi, S.Pd.', teacherId: 'g001', class: 'X TKJ 1', room: 'R.101' },
  { id: 'j002', day: 'Senin', time: '08:30 - 10:00', jamKe: 2, subject: 'Pemrograman Web', subjectId: 'mp005', teacher: 'Siti Nurhaliza, S.Kom.', teacherId: 'g002', class: 'X RPL 1', room: 'Lab Komputer 1' },
  { id: 'j003', day: 'Senin', time: '10:15 - 11:45', jamKe: 3, subject: 'Bahasa Indonesia', subjectId: 'mp002', teacher: 'Dewi Rahmawati, S.Pd.', teacherId: 'g004', class: 'XI TKJ 1', room: 'R.201' },
  { id: 'j004', day: 'Senin', time: '12:30 - 14:00', jamKe: 4, subject: 'Jaringan Komputer', subjectId: 'mp006', teacher: 'Budi Santoso, S.T.', teacherId: 'g003', class: 'XII TKJ 1', room: 'Lab Jaringan' },
  { id: 'j005', day: 'Selasa', time: '07:00 - 08:30', jamKe: 1, subject: 'Jaringan Komputer', subjectId: 'mp006', teacher: 'Budi Santoso, S.T.', teacherId: 'g003', class: 'X TKJ 1', room: 'Lab Jaringan' },
  { id: 'j006', day: 'Selasa', time: '08:30 - 10:00', jamKe: 2, subject: 'Bahasa Inggris', subjectId: 'mp003', teacher: 'Fitri Handayani, S.Pd.', teacherId: 'g006', class: 'X RPL 1', room: 'R.102' },
  { id: 'j007', day: 'Selasa', time: '10:15 - 11:45', jamKe: 3, subject: 'PAI', subjectId: 'mp004', teacher: 'Eko Prasetyo, S.Pd.I.', teacherId: 'g005', class: 'XII TKJ 1', room: 'Mushola' },
  { id: 'j008', day: 'Selasa', time: '12:30 - 14:00', jamKe: 4, subject: 'Basis Data', subjectId: 'mp008', teacher: 'Siti Nurhaliza, S.Kom.', teacherId: 'g002', class: 'XI RPL 1', room: 'Lab Komputer 2' },
  { id: 'j009', day: 'Rabu', time: '07:00 - 08:30', jamKe: 1, subject: 'Pemrograman Web', subjectId: 'mp005', teacher: 'Siti Nurhaliza, S.Kom.', teacherId: 'g002', class: 'XI RPL 1', room: 'Lab Komputer 2' },
  { id: 'j010', day: 'Rabu', time: '08:30 - 10:00', jamKe: 2, subject: 'Matematika', subjectId: 'mp001', teacher: 'Ahmad Fauzi, S.Pd.', teacherId: 'g001', class: 'XII TKJ 1', room: 'R.301' },
  { id: 'j011', day: 'Rabu', time: '10:15 - 11:45', jamKe: 3, subject: 'PBO', subjectId: 'mp007', teacher: 'Budi Santoso, S.T.', teacherId: 'g003', class: 'X RPL 1', room: 'Lab Komputer 1' },
  { id: 'j012', day: 'Kamis', time: '07:00 - 08:30', jamKe: 1, subject: 'Jaringan Komputer', subjectId: 'mp006', teacher: 'Budi Santoso, S.T.', teacherId: 'g003', class: 'XI TKJ 1', room: 'Lab Jaringan' },
  { id: 'j013', day: 'Kamis', time: '08:30 - 10:00', jamKe: 2, subject: 'Bahasa Inggris', subjectId: 'mp003', teacher: 'Fitri Handayani, S.Pd.', teacherId: 'g006', class: 'XI RPL 1', room: 'R.202' },
  { id: 'j014', day: 'Kamis', time: '10:15 - 11:45', jamKe: 3, subject: 'Matematika', subjectId: 'mp001', teacher: 'Ahmad Fauzi, S.Pd.', teacherId: 'g001', class: 'X RPL 1', room: 'R.102' },
  { id: 'j015', day: 'Jumat', time: '07:00 - 08:30', jamKe: 1, subject: 'PAI', subjectId: 'mp004', teacher: 'Eko Prasetyo, S.Pd.I.', teacherId: 'g005', class: 'X TKJ 1', room: 'Mushola' },
  { id: 'j016', day: 'Jumat', time: '08:30 - 10:00', jamKe: 2, subject: 'Bahasa Indonesia', subjectId: 'mp002', teacher: 'Dewi Rahmawati, S.Pd.', teacherId: 'g004', class: 'XII RPL 1', room: 'R.302' },
];

/* --- Data Absensi Harian Siswa (Pagi & Sore) --- */
export const MOCK_ATTENDANCE = [
  { id: 'a001', studentId: 's001', studentName: 'Muhammad Rizki', class: 'X TKJ 1', date: '2024-07-22', statusPagi: 'hadir', statusSore: 'hadir' },
  { id: 'a002', studentId: 's002', studentName: 'Aisyah Putri', class: 'X TKJ 1', date: '2024-07-22', statusPagi: 'hadir', statusSore: 'izin' },
  { id: 'a003', studentId: 's003', studentName: 'Dimas Aditya', class: 'X RPL 1', date: '2024-07-22', statusPagi: 'sakit', statusSore: 'sakit' },
  { id: 'a004', studentId: 's004', studentName: 'Nadia Safitri', class: 'X RPL 1', date: '2024-07-22', statusPagi: 'hadir', statusSore: 'hadir' },
  { id: 'a005', studentId: 's005', studentName: 'Fajar Nugroho', class: 'XI TKJ 1', date: '2024-07-22', statusPagi: 'alpha', statusSore: 'alpha' },
  { id: 'a006', studentId: 's006', studentName: 'Laila Maghfiroh', class: 'XI TKJ 1', date: '2024-07-22', statusPagi: 'hadir', statusSore: 'hadir' },
  { id: 'a007', studentId: 's007', studentName: 'Rendi Kurniawan', class: 'XI RPL 1', date: '2024-07-22', statusPagi: 'hadir', statusSore: 'alpha' }, /* Bolos sore! */
  { id: 'a008', studentId: 's008', studentName: 'Salsabila Aulia', class: 'XI RPL 1', date: '2024-07-22', statusPagi: 'hadir', statusSore: 'hadir' },
  { id: 'a009', studentId: 's009', studentName: 'Andi Prasetya', class: 'XII TKJ 1', date: '2024-07-22', statusPagi: 'izin', statusSore: 'izin' },
  { id: 'a010', studentId: 's010', studentName: 'Zahra Amelia', class: 'XII RPL 1', date: '2024-07-22', statusPagi: 'hadir', statusSore: 'hadir' },
];

/* --- Data Absensi Sholat (Contoh) --- */
export const MOCK_PRAYER_ATTENDANCE = [
  { id: 'p001', studentId: 's001', studentName: 'Muhammad Rizki', class: 'X TKJ 1', date: '2024-07-22', dzuhur: true, ashar: true },
  { id: 'p002', studentId: 's002', studentName: 'Aisyah Putri', class: 'X TKJ 1', date: '2024-07-22', dzuhur: true, ashar: false },
  { id: 'p003', studentId: 's003', studentName: 'Dimas Aditya', class: 'X RPL 1', date: '2024-07-22', dzuhur: false, ashar: false },
  { id: 'p004', studentId: 's004', studentName: 'Nadia Safitri', class: 'X RPL 1', date: '2024-07-22', dzuhur: true, ashar: true },
];

/* --- Data Absensi Guru (Rekap: GPS + Manual) --- */
export const MOCK_TEACHER_ATTENDANCE = [
  { id: 'ag001', guruId: 'g001', guruName: 'Ahmad Fauzi, S.Pd.', tanggal: '2024-07-22', status: 'hadir', sumber: 'gps', jamMasuk: '06:45', jamPulang: '14:00', jarakMeter: 12, keterangan: '' },
  { id: 'ag002', guruId: 'g002', guruName: 'Siti Nurhaliza, S.Kom.', tanggal: '2024-07-22', status: 'hadir', sumber: 'gps', jamMasuk: '06:52', jamPulang: '14:10', jarakMeter: 25, keterangan: '' },
  { id: 'ag003', guruId: 'g003', guruName: 'Budi Santoso, S.T.', tanggal: '2024-07-22', status: 'hadir', sumber: 'gps', jamMasuk: '06:58', jamPulang: '14:05', jarakMeter: 18, keterangan: '' },
  { id: 'ag004', guruId: 'g004', guruName: 'Dewi Rahmawati, S.Pd.', tanggal: '2024-07-22', status: 'izin', sumber: 'manual', jamMasuk: null, jamPulang: null, jarakMeter: null, keterangan: 'Izin keperluan keluarga' },
  { id: 'ag005', guruId: 'g005', guruName: 'Eko Prasetyo, S.Pd.I.', tanggal: '2024-07-22', status: 'hadir', sumber: 'gps', jamMasuk: '07:05', jamPulang: '14:15', jarakMeter: 8, keterangan: '' },
  { id: 'ag006', guruId: 'g006', guruName: 'Fitri Handayani, S.Pd.', tanggal: '2024-07-22', status: 'sakit', sumber: 'manual', jamMasuk: null, jamPulang: null, jarakMeter: null, keterangan: 'Sakit demam, surat dokter menyusul' },
];

/* --- Aturan Poin Sikap (Editable Admin) --- */
export const MOCK_BEHAVIOR_RULES = [
  /* Positif (+) */
  { id: 'ap001', kategori: 'positif', nama: 'Juara Kelas', poin: 10, deskripsi: 'Meraih peringkat 1-3 di kelas' },
  { id: 'ap002', kategori: 'positif', nama: 'Juara Lomba Sekolah', poin: 15, deskripsi: 'Memenangkan lomba tingkat sekolah' },
  { id: 'ap003', kategori: 'positif', nama: 'Juara Lomba Kabupaten', poin: 25, deskripsi: 'Memenangkan lomba tingkat kabupaten' },
  { id: 'ap004', kategori: 'positif', nama: 'Kegiatan Sosial', poin: 5, deskripsi: 'Aktif dalam kegiatan sosial/bakti sosial' },
  { id: 'ap005', kategori: 'positif', nama: 'Ketua OSIS/Organisasi', poin: 10, deskripsi: 'Menjadi pengurus organisasi sekolah' },
  /* Negatif (-) */
  { id: 'ap006', kategori: 'negatif', nama: 'Terlambat', poin: -2, deskripsi: 'Datang terlambat ke sekolah' },
  { id: 'ap007', kategori: 'negatif', nama: 'Bolos', poin: -5, deskripsi: 'Tidak masuk tanpa keterangan' },
  { id: 'ap008', kategori: 'negatif', nama: 'Tidak Berseragam Lengkap', poin: -3, deskripsi: 'Tidak memakai seragam sesuai ketentuan' },
  { id: 'ap009', kategori: 'negatif', nama: 'Merokok di Lingkungan Sekolah', poin: -15, deskripsi: 'Kedapatan merokok di area sekolah' },
  { id: 'ap010', kategori: 'negatif', nama: 'Berkelahi', poin: -20, deskripsi: 'Terlibat perkelahian di sekolah' },
  { id: 'ap011', kategori: 'negatif', nama: 'Membawa HP Saat Pelajaran', poin: -3, deskripsi: 'Menggunakan HP saat jam pelajaran tanpa izin' },
  { id: 'ap012', kategori: 'negatif', nama: 'Mencontek Saat Ujian', poin: -10, deskripsi: 'Kedapatan mencontek saat ujian' },
];

/* --- Catatan Poin Sikap Siswa --- */
export const MOCK_BEHAVIOR_POINTS = [
  { id: 'ps001', siswaId: 's001', siswaName: 'Muhammad Rizki', class: 'X TKJ 1', tanggal: '2024-07-20', aturanPoinId: 'ap001', aturanNama: 'Juara Kelas', poin: 10, keterangan: 'Peringkat 2 di kelas', pencatat: 'Ahmad Fauzi, S.Pd.' },
  { id: 'ps002', siswaId: 's003', siswaName: 'Dimas Aditya', class: 'X RPL 1', tanggal: '2024-07-18', aturanPoinId: 'ap003', aturanNama: 'Juara Lomba Kabupaten', poin: 25, keterangan: 'Juara 1 LKS Web Development Kab. Jepara', pencatat: 'Siti Nurhaliza, S.Kom.' },
  { id: 'ps003', siswaId: 's005', siswaName: 'Fajar Nugroho', class: 'XI TKJ 1', tanggal: '2024-07-22', aturanPoinId: 'ap007', aturanNama: 'Bolos', poin: -5, keterangan: 'Tidak masuk tanpa keterangan', pencatat: 'Ahmad Fauzi, S.Pd.' },
  { id: 'ps004', siswaId: 's007', siswaName: 'Rendi Kurniawan', class: 'XI RPL 1', tanggal: '2024-07-22', aturanPoinId: 'ap006', aturanNama: 'Terlambat', poin: -2, keterangan: 'Terlambat 15 menit', pencatat: 'Fitri Handayani, S.Pd.' },
  { id: 'ps005', siswaId: 's002', siswaName: 'Aisyah Putri', class: 'X TKJ 1', tanggal: '2024-07-19', aturanPoinId: 'ap004', aturanNama: 'Kegiatan Sosial', poin: 5, keterangan: 'Ikut bakti sosial di Desa Bangsri', pencatat: 'Eko Prasetyo, S.Pd.I.' },
  { id: 'ps006', siswaId: 's009', siswaName: 'Andi Prasetya', class: 'XII TKJ 1', tanggal: '2024-07-21', aturanPoinId: 'ap008', aturanNama: 'Tidak Berseragam Lengkap', poin: -3, keterangan: 'Tidak memakai dasi', pencatat: 'Dewi Rahmawati, S.Pd.' },
];

/* --- Data Pembayaran SPP --- */
export const MOCK_PAYMENTS = [
  { id: 'pay001', studentId: 's001', studentName: 'Muhammad Rizki', class: 'X TKJ 1', type: 'SPP', month: 'Juli 2024', amount: 350000, paid: 350000, status: 'lunas', date: '2024-07-05' },
  { id: 'pay002', studentId: 's001', studentName: 'Muhammad Rizki', class: 'X TKJ 1', type: 'SPP', month: 'Agustus 2024', amount: 350000, paid: 200000, status: 'cicilan', date: '2024-08-10' },
  { id: 'pay003', studentId: 's002', studentName: 'Aisyah Putri', class: 'X TKJ 1', type: 'SPP', month: 'Juli 2024', amount: 350000, paid: 350000, status: 'lunas', date: '2024-07-03' },
  { id: 'pay004', studentId: 's002', studentName: 'Aisyah Putri', class: 'X TKJ 1', type: 'SPP', month: 'Agustus 2024', amount: 350000, paid: 0, status: 'belum', date: null },
  { id: 'pay005', studentId: 's003', studentName: 'Dimas Aditya', class: 'X RPL 1', type: 'SPP', month: 'Juli 2024', amount: 350000, paid: 350000, status: 'lunas', date: '2024-07-01' },
  { id: 'pay006', studentId: 's003', studentName: 'Dimas Aditya', class: 'X RPL 1', type: 'SPP', month: 'Agustus 2024', amount: 350000, paid: 100000, status: 'cicilan', date: '2024-08-15' },
  { id: 'pay007', studentId: 's004', studentName: 'Nadia Safitri', class: 'X RPL 1', type: 'SPP', month: 'Juli 2024', amount: 350000, paid: 0, status: 'belum', date: null },
];

/* --- Data Nilai Siswa --- */
export const MOCK_GRADES = [
  { id: 'n001', studentId: 's001', studentName: 'Muhammad Rizki', class: 'X TKJ 1', subject: 'Matematika', type: 'Ulangan Harian 1', score: 85, maxScore: 100 },
  { id: 'n002', studentId: 's001', studentName: 'Muhammad Rizki', class: 'X TKJ 1', subject: 'Pemrograman Web', type: 'Praktikum 1', score: 92, maxScore: 100 },
  { id: 'n003', studentId: 's002', studentName: 'Aisyah Putri', class: 'X TKJ 1', subject: 'Matematika', type: 'Ulangan Harian 1', score: 78, maxScore: 100 },
  { id: 'n004', studentId: 's002', studentName: 'Aisyah Putri', class: 'X TKJ 1', subject: 'Pemrograman Web', type: 'Praktikum 1', score: 88, maxScore: 100 },
  { id: 'n005', studentId: 's003', studentName: 'Dimas Aditya', class: 'X RPL 1', subject: 'Matematika', type: 'Ulangan Harian 1', score: 72, maxScore: 100 },
  { id: 'n006', studentId: 's003', studentName: 'Dimas Aditya', class: 'X RPL 1', subject: 'Pemrograman Web', type: 'Praktikum 1', score: 95, maxScore: 100 },
];

/* --- Data Berita --- */
export const MOCK_NEWS = [
  {
    id: 'b001',
    title: 'Penerimaan Peserta Didik Baru Tahun Ajaran 2024/2025',
    excerpt: 'SMK Muhammadiyah 04 Bangsri membuka pendaftaran peserta didik baru untuk tahun ajaran 2024/2025 dengan berbagai program kejuruan unggulan.',
    content: 'SMK Muhammadiyah 04 Bangsri membuka pendaftaran peserta didik baru untuk tahun ajaran 2024/2025. Tersedia program kejuruan TKJ, RPL, TBSM, dan AKL. Pendaftaran dibuka mulai 1 Januari hingga 30 Juni 2024. Syarat dan ketentuan dapat dilihat di halaman pendaftaran atau datang langsung ke sekolah.',
    category: 'Pengumuman',
    date: '2024-07-01',
    author: 'Admin',
  },
  {
    id: 'b002',
    title: 'Juara 1 Lomba Kompetensi Siswa Tingkat Kabupaten',
    excerpt: 'Siswa jurusan RPL berhasil meraih juara 1 dalam LKS tingkat Kabupaten Jepara bidang Web Development.',
    content: 'Selamat kepada Dimas Aditya dari kelas X RPL 1 yang berhasil meraih Juara 1 dalam Lomba Kompetensi Siswa (LKS) tingkat Kabupaten Jepara bidang Web Development. Prestasi ini membuktikan kualitas pendidikan di SMK Muhammadiyah 04 Bangsri.',
    category: 'Prestasi',
    date: '2024-06-20',
    author: 'Humas',
  },
  {
    id: 'b003',
    title: 'Workshop Jaringan Komputer Bersama Praktisi Industri',
    excerpt: 'Kegiatan workshop jaringan komputer bekerja sama dengan PT Telkom Indonesia untuk siswa jurusan TKJ.',
    content: 'SMK Muhammadiyah 04 Bangsri menyelenggarakan workshop jaringan komputer bekerja sama dengan PT Telkom Indonesia. Kegiatan ini diikuti oleh seluruh siswa jurusan TKJ dari kelas X hingga XII.',
    category: 'Kegiatan',
    date: '2024-06-15',
    author: 'Humas',
  },
  {
    id: 'b004',
    title: 'Peringatan Milad Muhammadiyah ke-112',
    excerpt: 'Rangkaian kegiatan memperingati Milad Muhammadiyah ke-112 di lingkungan SMK Muhammadiyah 04 Bangsri.',
    content: 'Dalam rangka memperingati Milad Muhammadiyah ke-112, SMK Muhammadiyah 04 Bangsri mengadakan berbagai kegiatan termasuk lomba ceramah, pentas seni Islami, dan bakti sosial.',
    category: 'Kegiatan',
    date: '2024-06-08',
    author: 'Admin',
  },
];

/* --- Data User untuk Login Mock --- */
export const MOCK_USERS = [
  { id: 'u001', username: 'admin', password: 'admin123', name: 'Administrator', role: 'admin', avatar: null },
  { id: 'u002', username: 'guru1', password: 'guru123', name: 'Ahmad Fauzi, S.Pd.', role: 'guru', teacherId: 'g001', avatar: null },
  { id: 'u003', username: 'staff1', password: 'staff123', name: 'Rina Susanti', role: 'staff', avatar: null },
  { id: 'u004', username: 'wali1', password: 'wali123', name: 'Hj. Mariam', role: 'wali_murid', studentId: 's001', avatar: null },
  { id: 'u005', username: 'kepsek', password: 'kepsek123', name: 'Drs. H. Suharto, M.Pd.', role: 'kepsek', avatar: null },
];

/* --- Data Jurnal Sikap & Pelanggaran --- */
export const MOCK_STUDENT_ATTITUDE = [
  { id: 'att001', studentId: 's001', date: '2024-08-10', type: 'positif', note: 'Membantu merapikan lab komputer setelah praktik', teacherName: 'Budi Santoso, S.T.' },
  { id: 'att002', studentId: 's001', date: '2024-08-15', type: 'negatif', note: 'Terlambat masuk kelas setelah istirahat', teacherName: 'Ahmad Fauzi, S.Pd.' },
  { id: 'att003', studentId: 's002', date: '2024-08-12', type: 'positif', note: 'Aktif berdiskusi di kelas PAI', teacherName: 'Eko Prasetyo, S.Pd.I.' },
  { id: 'att004', studentId: 's003', date: '2024-08-14', type: 'negatif', note: 'Mengobrol saat guru menerangkan', teacherName: 'Siti Nurhaliza, S.Kom.' },
];
