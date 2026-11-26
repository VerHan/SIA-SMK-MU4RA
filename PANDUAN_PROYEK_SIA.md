# Panduan Proyek & Roadmap — SIA SMK Muhammadiyah 04 Bangsri (`sia-smk-mu4ra`)

Dokumen ini menjadi panduan utama bagi pengembang (lintas perangkat / multi-device), kontributor, dan pemangku kepentingan (*stakeholder*) sekolah agar pengembangan Sistem Informasi Akademik (SIA) tetap terarah, rapi, aman, dan bebas *bloat*.

---

## 1. Visi & Fokus Utama Aplikasi

SIA SMK Muhammadiyah 04 Bangsri dirancang sebagai satu sistem terpadu dengan **3 permukaan (*surface*)** yang memiliki peran tegas:

| Area | Rute Utama | Pengguna Sasaran | Fokus & Batasan |
| :--- | :--- | :--- | :--- |
| **Website Profil Publik** | `/`, `/profil`, `/kejuruan`, `/berita`, `/ppdb`, `/login` | Masyarakat umum, calon siswa, orang tua | Informasi sekolah, berita kegiatan, pendaftaran PPDB online. **Desain visual halaman profil dijaga konsisten.** |
| **Dashboard Admin (Desktop)** | `/dashboard/*` | Admin, Staff TU, Kepala Sekolah | Master data (Tahun Ajar, Kelas, Siswa, Guru, Mapel, Jadwal, Master Sesi, Kalender), Monitoring Kelas real-time, Rekap Absensi, Nilai, Sikap, Berita, Verifikasi PPDB, Manajemen Akun. |
| **Client Mobile PWA** | `/app/*` | Guru, Staff, Kepala Sekolah | Operasional harian cepat di ponsel: Absen GPS guru, Absen Mapel per jam pelajaran, Jadwal mengajar, input cepat Nilai & Poin Sikap. |

### Prinsip Pengembangan (*Anti-Bloat*)
1. **Siswa sebagai pusat relasi data**: Semua modul akademik (Absen Piket, Absen Mapel, Poin Sikap, Nilai, Riwayat Kelas) merujuk ke satu entitas `Siswa` berdasarkan `TahunAjar` aktif.
2. **Bertahap dari fitur inti**: Matangkan terlebih dahulu relasi dasar (**Siswa ↔ Absen Piket & Absen Mapel**) sebelum mengaktifkan elemen lanjutan (Sikap, Nilai terintegrasi, Portal Wali Murid).
3. **Jangan menambah tabel/kolom tanpa kebutuhan nyata**: Tabel *legacy* yang belum dipakai (`AbsensiSholat`, `Pembayaran`) dibiarkan pasif dan tidak perlu diperluas sebelum ada keputusan resmi sekolah.
4. **Satu sumber kebenaran API**: Semua data berjalan lewat endpoint `/api/*` — tidak ada lagi data bisnis yang disimpan permanen di `localStorage` browser.

---

## 2. Arsitektur Teknis

### Stack Utama
- **Frontend**: React 18, Vite 5, React Router v6, `@tanstack/react-query` v5 (caching & sinkronisasi otomatis), `xlsx` (Import/Export Excel), `leaflet` / `react-leaflet` (GPS geofencing absensi guru).
- **Backend API**: Express 5 (`server.js` untuk dev/Node & `api/[...path].js` untuk Vercel Serverless).
- **Database**: PostgreSQL (Supabase) melalui **Prisma ORM** (`backend/prisma/schema.prisma`).
- **Mode Dual-Engine (Ramah Multi-Device)**:
  - **Produksi / Saat `DATABASE_URL` terisi**: Seluruh `/api/*` berjalan langsung ke PostgreSQL (Supabase) via Prisma (`api/[...path].js` + `api/extraPrismaRoutes.js`).
  - **Development Lokal Tanpa DB**: Jika `DATABASE_URL` tidak disetel, server otomatis memakai `api/mockStore.js` (penyimpanan *in-memory* dengan kontrak API & RBAC yang identik) sehingga pengembang di perangkat lain tetap bisa menjalankan & menguji UI/API langsung tanpa menunggu kredensial database.

### Struktur Folder Ringkas
```text
/
├── api/
│   ├── [...path].js          # Entry Express API + rute utama Prisma (Auth, Siswa, Guru, Kelas, Absensi Mapel, Keep-Alive)
│   ├── extraPrismaRoutes.js  # Rute Prisma tambahan (Users, Jadwal, MasterSesi, Kalender, Absensi Piket, Monitoring, Nilai, Sikap, Berita, PPDB)
│   ├── mockStore.js          # Fallback in-memory dengan kontrak identik saat DATABASE_URL kosong
│   └── authUtils.js          # Hashing scrypt, JWT HS256, middleware RBAC, sanitasi URL, CORS
├── backend/prisma/
│   └── schema.prisma         # Skema database PostgreSQL resmi (Single Source of Truth)
├── public/
│   ├── manifest.json         # Manifest PWA
│   └── sw.js                 # Service Worker v4 (aktif hanya di production build, bypass /api/ & dev modules)
├── src/
│   ├── context/AuthContext.jsx
│   ├── services/             # api.js (client HTTP terpadu) & authToken.js (token di memori JS)
│   ├── components/           # layout/, mobile/, shared/, ui/
│   └── pages/                # public/, dashboard/, mobile/
├── server.js                 # Server lokal terpadu (API + Vite middleware di port 3000)
└── vite.config.js            # Konfigurasi Vite (dedupe React & pre-bundle dependensi)
```

---

## 3. Arsitektur Database & Perlindungan Data Siswa

Skema resmi berada di `backend/prisma/schema.prisma`.

### Relasi Inti Siswa (Fondasi Aktif)
```text
TahunAjar (isActive = true)
   ├── RiwayatKelas ──▶ Kelas (unique: [siswaId, tahunAjarId])
   ├── Absensi (Piket Pagi/Sore) ──▶ Siswa (unique: [studentId, date], index: [date], [studentId, date])
   ├── AbsensiMapel (Per Jam) ────▶ Siswa + MataPelajaran + Guru (unique: [studentId, mapelId, date, jamKe], index: [kelasName, date], [studentId, date], [date, jamKe])
   ├── PoinSikap (Tahap Lanjutan) ─▶ Siswa + AturanPoin (index: [siswaId, tanggal])
   └── Nilai (Tahap Lanjutan) ─────▶ Siswa + MataPelajaran (index: [siswaId, tahunAjarId])
```

### Pengaman Data & Anti-Bloat yang Sudah Diterapkan
1. **Status Siklus Hidup Siswa (`Siswa.status`)**:
   - Nilai valid: `aktif`, `lulus`, `pindah`, `nonaktif`.
   - Endpoint `GET /api/siswa` secara default **hanya menampilkan siswa `aktif`** agar form absensi piket & absensi mapel tidak tercampur alumni/siswa pindah.
   - Halaman Master Siswa mengirim `?includeInactive=true` agar admin tetap bisa melihat arsip siswa.
2. **Hapus Aman (*Safe Archive*)**:
   - `DELETE /api/siswa/:id` otomatis memeriksa apakah siswa memiliki riwayat di `Absensi` atau `AbsensiMapel`.
   - Jika sudah ada riwayat absensi, status siswa otomatis diubah menjadi `nonaktif` (arsip aman) sehingga histori kehadiran tetap utuh dan tidak memicu *foreign key error*. Jika siswa baru tanpa riwayat, data dihapus permanen.
3. **Anti-Duplikat & Transaksi Atomik**:
   - `POST /api/absensi` (piket) dan `POST /api/absensi-mapel` memakai operasi `upsert` di dalam `prisma.$transaction`, didukung *unique constraint* di level database.
4. **Sinkronisasi Ganti Nama Kelas**:
   - Saat nama kelas diubah lewat `PUT /api/kelas/:id`, kolom `className`/`kelasName` pada `Jadwal` dan `AbsensiMapel` otomatis ikut diperbarui.
5. **Retensi Log Anti-Bloat**:
   - Endpoint `/api/keep-alive/ping` otomatis memangkas baris `SystemHeartbeat` yang lebih lama dari **30 hari** agar kuota Supabase tidak membengkak.

---

## 4. Keamanan, Autentikasi & Hak Akses (RBAC)

- **Password**: Di-hash menggunakan `crypto.scrypt` dengan salt acak per akun. Akun lama dengan password teks biasa di database otomatis di-upgrade ke hash `scrypt` saat berhasil login pertama kali.
- **Sesi & Token**: Menggunakan JWT bertanda tangan (HS256) yang disimpan **hanya di memori JS/React** (`src/services/authToken.js`), tidak disimpan di `localStorage` atau `sessionStorage`.
- **Peran (*Role*) Resmi**:
  - `admin`: Akses penuh semua modul dashboard, master data, dan manajemen akun (`/dashboard/akun`).
  - `staff`: Kelola siswa, absensi piket/guru, publikasi berita (`/dashboard/berita`), verifikasi PPDB (`/dashboard/ppdb`), dan Mobile PWA.
  - `guru`: Akses Mobile PWA (`/app/*`), absensi GPS, absensi mapel, input nilai, dan pencatatan poin sikap.
  - `kepsek`: Monitoring laporan & ringkasan eksekutif (akses baca).
  - `wali_murid`: Disiapkan untuk portal pemantauan siswa (lihat Roadmap Fase 4).
- **Perlindungan Server**: Semua endpoint mutasi (`POST`, `PUT`, `DELETE`) dan endpoint sensitif (`GET /api/users`, `GET /api/ppdb`) dijaga langsung oleh middleware `requireAuth` / `requireRole(...)` di backend.

---

## 5. Daftar Fitur Saat Ini (Baseline)

### Publik (`/`)
- Beranda, Profil Sekolah, Program Kejuruan, Daftar & Detail Berita (terhubung ke API), Formulir PPDB Online (terhubung ke API).

### Dashboard Admin (`/dashboard/*`)
- **Ringkasan**: KPI real-time (siswa aktif, guru, kelas, jadwal hari ini, antrean PPDB).
- **Master Data**: Tahun Ajar, Jurusan & Kelas, Mata Pelajaran & Kelompok, Guru, Master Sesi Waktu, Manajemen Jadwal (Matriks), Kalender Akademik.
- **Siswa & Kehadiran Dasar**:
  - Data Siswa (`Aktif/Lulus/Pindah/Nonaktif`, Import/Export Excel, Edit kelas & status, Arsip aman, dan modal **Detail Riwayat Absen Piket & Absen Mapel per Siswa** via `GET /api/siswa/:id/absensi`).
  - Absensi Piket Siswa (Pagi & Sore), Absensi Mapel, Rekap Absensi, Monitoring Kelas Real-time, Absensi Guru (GPS & Manual).
- **Akademik & Publikasi**: Nilai Siswa (CRUD), Aturan Poin & Poin Sikap, Manajemen Berita, Verifikasi PPDB + Export Excel, Manajemen Akun Pengguna.

### Mobile PWA Guru (`/app/*`)
- Beranda jadwal hari ini berbasis Master Sesi, Absen GPS Geofencing, Absen Mapel per sesi, Jadwal Mengajar mingguan, input cepat Nilai & Poin Sikap, Profil & Pengaturan.

---

## 6. Roadmap Pengembangan Bertahap

Agar proyek tetap stabil dan tidak *over-engineered*, penambahan fitur berikutnya dianjurkan mengikuti urutan fase berikut:

### Fase 1 — Fondasi Siswa & Kehadiran Dasar *(Selesai)*
- [x] Constraint unik & index pada `Absensi` (piket) dan `AbsensiMapel`.
- [x] Status siswa (`aktif`, `lulus`, `pindah`, `nonaktif`) + arsip aman.
- [x] Sinkronisasi ubah nama kelas & retensi `SystemHeartbeat` 30 hari.
- [x] Profil riwayat absensi per siswa (`GET /api/siswa/:id/absensi` di halaman Data Siswa).

### Fase 2 — Master Pusat Kehadiran Admin (Base Semua Stakeholder) *(Prioritas Berikutnya)*
Halaman Absensi Admin (`/dashboard/absensi`) dijadikan **pusat data kehadiran resmi (*single source of truth*)** yang menjadi acuan semua *stakeholder* sekolah (Admin, Kepala Sekolah, Staff TU/BK, Wali Kelas, dan Guru — sesuai hak akses masing-masing) dengan menggabungkan **Absen Piket** dan **Absen Mapel** secara terpadu **tanpa menambah tabel database baru**:
- [ ] **Tampilan Master Terpadu (Absen Piket & Absen Mapel)**:
  - Filter periode (**Bulan** atau **Rentang Tanggal**), **Angkatan (X/XI/XII)**, **Kelas**, **Mata Pelajaran** (khusus Absen Mapel, termasuk opsi *Semua Mapel*), dan pencarian nama/NIS siswa.
  - Menampilkan hanya siswa berstatus `aktif` (dengan opsi melihat arsip bila dibutuhkan untuk audit historis).
- [ ] **Metrik & Persentase Kehadiran Lengkap (`H`, `I`, `S`, `A`, `Bolos`)**:
  - **Ringkasan Sekolah / Kelas**: Persentase kehadiran rata-rata, total hari/sesi tercatat, total & persentase **Hadir (`H`)**, **Izin (`I`)**, **Sakit (`S`)**, **Alpha (`A`)**, serta **Bolos** (khusus Piket: Pagi Hadir → Sore Alpha).
  - **Tabel Rekap Per Siswa**: Menampilkan jumlah dan persentase masing-masing status (`% H`, `% I`, `% S`, `% A`) dengan indikator warna ambang batas (misal kehadiran < 85% atau Alpha tinggi disorot otomatis agar BK & Wali Kelas cepat bertindak).
- [ ] **Perbandingan & Integrasi Dua Sumber**:
  - Tab **Master Absen Piket** (kehadiran gerbang/harian pagi & sore) dan Tab **Master Absen Mapel** (kehadiran per jam pelajaran beserta total sesi mengajar guru).
  - Klik nama siswa langsung membuka **Detail Riwayat Kehadiran Siswa** (`GET /api/siswa/:id/absensi`) untuk melihat log tanggal demi tanggal.
- [ ] **Siap Pakai untuk Stakeholder**:
  - Endpoint agregasi server terpusat (mendukung Prisma PostgreSQL & fallback mock lokal) agar perhitungan persentase konsisten di semua perangkat (Admin Desktop, Laporan Kepsek, hingga Portal Wali Kelas/Wali Murid nanti).
  - **Export Excel** rekap kehadiran (Piket & Mapel lengkap dengan kolom jumlah dan persentase H/I/S/A) untuk laporan rapat & arsip sekolah.

### Fase 3 — Memperkaya Profil Siswa (Relasi Sikap & Akademik)
- [ ] **Halaman / Drawer Profil Lengkap Siswa** berbasis tab modular (Tab 1: Absensi Piket & Mapel, Tab 2: Poin Sikap & Catatan BK, Tab 3: Ringkasan Nilai per Semester) — menarik data dari relasi `Siswa` yang sudah ada tanpa menambah tabel baru.
- [ ] **Peringatan Dini Terpadu**: Menggabungkan data Alpha/Bolos dari Master Kehadiran dengan Poin Sikap untuk tindak lanjut BK & Wali Kelas.

### Fase 4 — Siklus Tahun Ajar & Operasional Wali Kelas
- [ ] **Fitur Kenaikan Kelas / Promosi Massal**: Memindahkan siswa aktif dari `TahunAjar` lama ke `TahunAjar` baru (membuat baris `RiwayatKelas` baru, dan menandai kelas XII menjadi status `lulus`) tanpa menghapus histori tahun sebelumnya.
- [ ] **Dashboard Khusus Wali Kelas**: Tampilan fokus satu kelas binaan yang membaca langsung dari API Master Kehadiran (kehadiran harian, tren bolos, poin sikap kelas, kontak cepat WhatsApp orang tua).
- [ ] **Pemetaan Guru ↔ Mapel ke Database**: Memindahkan helper *in-memory* ringan (tugas tambahan / jadwal piket guru) ke tabel Prisma hanya jika sekolah memang aktif menggunakannya.

### Fase 5 — Portal Wali Murid & Notifikasi
- [ ] **Halaman Portal Wali Murid** (terhubung ke `User.studentId`): Orang tua hanya dapat melihat data milik anaknya sendiri (verifikasi kepemilikan ketat di server) mencakup Absen Piket, Absen Mapel, Poin Sikap, dan Nilai.
- [ ] **Notifikasi Ringkas**: Ringkasan harian/mingguan ketidakhadiran siswa untuk wali kelas atau orang tua (misal integrasi link/webhook WhatsApp opsional).

---

## 7. Panduan Setup Multi-Device & Deployment

### Persyaratan Lingkungan
- Node.js **v20+** (disarankan LTS)
- npm (atau bun)

### Menjalankan di Perangkat Baru (Mode Lokal Cepat — Tanpa Database)
```bash
git clone <url-repo>
cd <folder-proyek>
npm install
npm run dev
```
Server berjalan di `http://localhost:3000` menggunakan fallback *in-memory* dengan akun demo:
- Admin: `admin` / `admin123`
- Guru: `guru1` / `guru123`
- Staff: `staff1` / `staff123`

### Menghubungkan ke PostgreSQL / Supabase (Lokal & Vercel)
Siapkan variabel lingkungan di file `.env` lokal (jangan di-commit ke Git) atau di **Vercel Project Settings → Environment Variables**:
- `DATABASE_URL` — Connection string pooler Supabase (port `6543`, `?pgbouncer=true`)
- `DIRECT_URL` — Connection string langsung Supabase (port `5432`) untuk Prisma CLI
- `JWT_SECRET` — String acak panjang (min. 32 karakter) untuk penandatanganan token sesi
- `CRON_SECRET` — Token rahasia opsional untuk endpoint `/api/keep-alive/ping`
- `CORS_ALLOWED_ORIGINS` — Opsional, daftar domain produksi dipisah koma

Sinkronisasi skema database ke Supabase setiap kali `backend/prisma/schema.prisma` berubah:
```bash
npx prisma generate --schema=./backend/prisma/schema.prisma
npx prisma db push --schema=./backend/prisma/schema.prisma
```

Build produksi & verifikasi lokal:
```bash
npm run build
npm run start
```

---

## 8. Standar Menambah Fitur Baru (Checklist Pengembang & Stakeholder)

Setiap fitur baru yang diusulkan wajib melewati 6 pemeriksaan ini agar sistem tetap bersih dan tidak pecah antar perangkat:

1. **Cek Kebutuhan Data**: Apakah data sudah bisa memakai tabel yang ada (`Siswa`, `Absensi`, `AbsensiMapel`, `PoinSikap`, `Nilai`)? Hindari membuat tabel baru bila cukup relasi/query dari tabel yang sudah ada.
2. **Skema Prisma & Index**: Jika menambah kolom/tabel di `backend/prisma/schema.prisma`, pastikan sudah menetapkan `onDelete`, constraint unik yang relevan, dan index pada kolom filter utama, lalu jalankan `npx prisma validate`.
3. **Paritas Dual-Engine**: Setiap endpoint baru di `api/extraPrismaRoutes.js` (atau `api/[...path].js`) **wajib** memiliki padanan dengan format respons yang sama di `api/mockStore.js` agar pengujian lintas perangkat tanpa DB tetap berfungsi.
4. **Keamanan & RBAC**: Terapkan `requireAuth` / `requireRole(...)` pada semua rute mutasi & data sensitif, validasi input di server, dan jangan pernah menyimpan token/rahasia di `localStorage`.
5. **Frontend & Performa**: Gunakan helper `src/services/api.js` dan `@tanstack/react-query` (`useQuery` + `invalidateQueries` setelah mutasi), hindari `window.alert`/`window.confirm` (gunakan komponen `Toast` & `Modal`).
6. **Verifikasi Sebelum Merge/Deploy**: Pastikan `npm run build` lulus tanpa error, uji alur utama di desktop admin & mobile PWA, lalu jalankan `npx prisma db push` saat merilis ke Supabase.
