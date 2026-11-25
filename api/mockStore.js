import express from 'express';
import crypto from 'crypto';
import {
  MOCK_ACADEMIC_YEARS,
  MOCK_TEACHERS,
  MOCK_STUDENTS,
  MOCK_CLASSES,
  MOCK_SUBJECTS,
  MOCK_TEACHER_ATTENDANCE,
  MOCK_NEWS,
  MOCK_USERS,
  MOCK_TIME_SLOTS,
  MOCK_ACADEMIC_CALENDAR,
  MOCK_SCHEDULE,
  MOCK_ATTENDANCE,
  MOCK_GRADES,
  MOCK_BEHAVIOR_RULES,
  MOCK_BEHAVIOR_POINTS,
  MOCK_DUTY_SCHEDULE,
} from '../src/services/mockData.js';
import {
  hashPassword,
  verifyPassword,
  signToken,
  isValidRole,
  requireAuth,
  requireRole,
  sanitizeSafeUrl,
} from './authUtils.js';

const newId = () => crypto.randomUUID();
const VALID_PPDB_STATUSES = new Set(['Menunggu Verifikasi', 'Diterima', 'Cadangan', 'Ditolak']);

export function createMockApiRouter() {
  const router = express.Router();

  // Seed users with scrypt-hashed passwords (zero plaintext in memory)
  let users = MOCK_USERS.map(u => ({
    id: u.id,
    username: u.username,
    password: hashPassword(u.password),
    name: u.name,
    role: u.role,
    teacherId: u.teacherId || null,
    studentId: u.studentId || null,
    createdAt: new Date().toISOString(),
  }));

  let tahunAjarList = MOCK_ACADEMIC_YEARS.map(t => ({ ...t }));
  let guruList = MOCK_TEACHERS.map(g => ({ ...g }));
  let siswaList = MOCK_STUDENTS.map(s => ({
    ...s,
    nomor: s.nomor || s.nis || null,
    nis: s.nis || s.nomor || '-',
    phone: s.phone || '-',
    phone_parent: s.phone_parent || '-',
    pekerjaan_ortu: s.pekerjaan_ortu || '-',
    alamat: s.alamat || '-',
    sekolah_asal: s.sekolah_asal || '-',
  }));
  let kelasList = MOCK_CLASSES.map(k => ({ ...k }));
  let mapelList = MOCK_SUBJECTS.map(m => ({ ...m }));
  let kelompokMapelList = ['Normatif', 'Adaptif', 'Produktif'];
  let jurusanList = [
    { id: 'jur-tkr', kode: 'TKR', nama: 'Teknik Kendaraan Ringan', color: '#EF4444', deskripsi: 'Diagnosis mesin mobil, transmisi, kelistrikan bodi, dan bengkel resmi modern' },
    { id: 'jur-tsm', kode: 'TSM', nama: 'Teknik Sepeda Motor', color: '#F59E0B', deskripsi: 'Perawatan, tune-up, dan perbaikan sepeda motor injeksi modern' },
    { id: 'jur-titl', kode: 'TITL', nama: 'Teknik Instalasi Tenaga Listrik', color: '#0284C7', deskripsi: 'Instalasi gedung, panel daya 3 fasa, dan sistem otomasi PLC' },
    { id: 'jur-dkv', kode: 'DKV', nama: 'Desain Komunikasi Visual', color: '#8B5CF6', deskripsi: 'Desain grafis, fotografi, videografi, animasi, dan media kreatif' },
    { id: 'jur-tkj', kode: 'TKJ', nama: 'Teknik Komputer & Jaringan', color: '#3B82F6', deskripsi: 'Jaringan komputer, server, dan infrastruktur IT' },
    { id: 'jur-rpl', kode: 'RPL', nama: 'Rekayasa Perangkat Lunak', color: '#10B981', deskripsi: 'Pemrograman software, aplikasi web & mobile' },
  ];
  let masterSesiList = MOCK_TIME_SLOTS.map((s, idx) => ({ id: `sesi-${idx + 1}`, order: idx, ...s }));
  let kalenderList = MOCK_ACADEMIC_CALENDAR.map(k => ({ ...k }));
  let jadwalList = MOCK_SCHEDULE.map(j => ({ ...j }));
  let absensiPiketList = MOCK_ATTENDANCE.map(a => ({ ...a }));
  let absensiGuruList = MOCK_TEACHER_ATTENDANCE.map(a => ({ ...a }));
  let absensiMapelList = [];
  let nilaiList = MOCK_GRADES.map(g => {
    const mapel = MOCK_SUBJECTS.find(m => m.nama === g.subject);
    return { ...g, mapelId: mapel?.id || 'mp001' };
  });
  let aturanPoinList = MOCK_BEHAVIOR_RULES.map(r => ({ ...r }));
  let poinSikapList = MOCK_BEHAVIOR_POINTS.map(p => ({ ...p }));
  let beritaList = MOCK_NEWS.map(n => ({ ...n, isPublished: true }));
  let ppdbList = [
    {
      id: 'ppdb-seed-1',
      regNumber: 'PPDB-2026-1042',
      name: 'Bagas Pratama Putra',
      nisn: '0098745120',
      gender: 'L',
      schoolOrigin: 'SMPN 1 Bangsri',
      majorChoice: 'TKR',
      phoneStudent: '085712340001',
      phoneParent: '081228901122',
      email: 'bagas.pratama@email.com',
      address: 'Desa Wedelan RT 03 RW 02, Kec. Bangsri, Jepara',
      track: 'Reguler',
      status: 'Menunggu Verifikasi',
      notes: '',
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'ppdb-seed-2',
      regNumber: 'PPDB-2026-1043',
      name: 'Naila Rahma Azzahra',
      nisn: '0098745121',
      gender: 'P',
      schoolOrigin: 'MTsN 1 Jepara',
      majorChoice: 'DKV',
      phoneStudent: '085712340002',
      phoneParent: '081325678910',
      email: 'naila.rahma@email.com',
      address: 'Desa Guyangan RT 01 RW 04, Kec. Bangsri, Jepara',
      track: 'Prestasi',
      status: 'Diterima',
      notes: 'Juara 2 Lomba Poster Kabupaten',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
  ];
  let heartbeats = [
    {
      id: 'hb-init',
      pingType: 'AUTO_BOT',
      triggeredBy: 'In-Memory Runtime',
      note: 'Server SIA SMK MU4RA aktif (mode in-memory)',
      createdAt: new Date().toISOString(),
    },
  ];

  const getJakartaNow = () => {
    const now = new Date();
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
    const timeStr = now.toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return { dateStr, timeStr };
  };

  // --- Health & Keep-Alive ---
  router.get('/health', (req, res) => {
    res.json({ ok: true, mode: 'memory', message: 'Server SIA SMK MU4RA Berjalan!' });
  });

  router.get('/ping', (req, res) => {
    res.status(200).json({ message: 'Pong! Server is awake.' });
  });

  router.all('/keep-alive/ping', (req, res) => {
    const isGet = req.method === 'GET';
    const record = {
      id: 'hb_' + Date.now(),
      pingType: isGet ? (req.query.pingType || 'AUTO_BOT') : (req.body?.pingType || 'MANUAL_ADMIN'),
      triggeredBy: isGet ? (req.query.triggeredBy || 'CRON_BOT') : (req.body?.triggeredBy || 'Admin (Manual)'),
      note: isGet ? (req.query.note || 'Automated Keep-Alive Ping') : (req.body?.note || 'Manual ping from Settings UI'),
      createdAt: new Date().toISOString(),
    };
    heartbeats.unshift(record);
    heartbeats = heartbeats.slice(0, 20);
    res.status(200).json({
      success: true,
      message: 'Server SIA aktif & terhubung!',
      timestamp: record.createdAt,
      record,
    });
  });

  router.get('/keep-alive/status', (req, res) => {
    res.status(200).json({ success: true, history: heartbeats.slice(0, 5) });
  });

  // --- Auth & User Management ---
  router.post('/auth/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username dan password wajib diisi' });
    }
    const cleanUsername = String(username).trim().toLowerCase();
    const user = users.find(u => u.username.toLowerCase() === cleanUsername);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Username atau password salah' });
    }
    const { valid } = verifyPassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Username atau password salah' });
    }
    const safeUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      teacherId: user.teacherId || null,
      studentId: user.studentId || null,
    };
    const token = signToken(safeUser);
    return res.json({ success: true, token, user: safeUser });
  });

  router.get('/auth/me', requireAuth, (req, res) => {
    const user = users.find(u => u.id === req.authUser.id);
    if (!user) return res.status(401).json({ success: false, error: 'Akun tidak ditemukan' });
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        teacherId: user.teacherId || null,
        studentId: user.studentId || null,
      },
    });
  });

  router.get('/users', requireRole('admin'), (req, res) => {
    res.json(users.map(u => {
      const guru = u.teacherId ? guruList.find(g => g.id === u.teacherId) : null;
      const siswa = u.studentId ? siswaList.find(s => s.id === u.studentId) : null;
      return {
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        teacherId: u.teacherId || null,
        teacherName: guru?.name || null,
        studentId: u.studentId || null,
        studentName: siswa?.name || null,
        createdAt: u.createdAt,
      };
    }));
  });

  router.post('/users', requireRole('admin'), (req, res) => {
    const { username, password, name, role, teacherId, studentId } = req.body || {};
    const cleanUsername = String(username || '').trim();
    const cleanName = String(name || '').trim();
    if (!cleanUsername || !cleanName || !password || String(password).length < 6) {
      return res.status(400).json({ success: false, error: 'Username, nama, dan password (min. 6 karakter) wajib diisi.' });
    }
    if (!isValidRole(role)) {
      return res.status(400).json({ success: false, error: 'Role tidak valid.' });
    }
    if (users.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
      return res.status(400).json({ success: false, error: `Username "${cleanUsername}" sudah digunakan.` });
    }
    const created = {
      id: newId(),
      username: cleanUsername,
      password: hashPassword(password),
      name: cleanName,
      role,
      teacherId: teacherId ? String(teacherId).trim() : null,
      studentId: studentId ? String(studentId).trim() : null,
      createdAt: new Date().toISOString(),
    };
    users.push(created);
    const { password: _, ...safe } = created;
    res.json({ success: true, data: safe, message: 'Akun pengguna berhasil dibuat.' });
  });

  router.put('/users/:id', requireRole('admin'), (req, res) => {
    const idx = users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Akun tidak ditemukan.' });
    const { name, role, password, teacherId, studentId } = req.body || {};
    if (role !== undefined && !isValidRole(role)) {
      return res.status(400).json({ success: false, error: 'Role tidak valid.' });
    }
    if (password && String(password).trim() && String(password).length < 6) {
      return res.status(400).json({ success: false, error: 'Password minimal 6 karakter.' });
    }
    users[idx] = {
      ...users[idx],
      ...(name && String(name).trim() ? { name: String(name).trim() } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(password && String(password).trim() ? { password: hashPassword(password) } : {}),
      ...(teacherId !== undefined ? { teacherId: teacherId ? String(teacherId).trim() : null } : {}),
      ...(studentId !== undefined ? { studentId: studentId ? String(studentId).trim() : null } : {}),
    };
    const { password: _, ...safe } = users[idx];
    res.json({ success: true, data: safe, message: 'Akun pengguna berhasil diperbarui.' });
  });

  router.delete('/users/:id', requireRole('admin'), (req, res) => {
    if (req.params.id === req.authUser.id) {
      return res.status(400).json({ success: false, error: 'Anda tidak dapat menghapus akun yang sedang aktif digunakan.' });
    }
    users = users.filter(u => u.id !== req.params.id);
    res.json({ success: true, message: 'Akun pengguna berhasil dihapus.' });
  });

  // --- Berita ---
  router.get('/berita', (req, res) => {
    res.json([...beritaList].sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  });

  router.get('/berita/:id', (req, res) => {
    const found = beritaList.find(b => b.id === req.params.id);
    if (!found) return res.status(404).json({ error: 'Berita tidak ditemukan' });
    res.json(found);
  });

  router.post('/berita', requireRole('admin', 'staff'), (req, res) => {
    const { title, excerpt, content, category, author, date, image, isPublished } = req.body || {};
    if (!title || !content) return res.status(400).json({ success: false, error: 'Judul dan isi berita wajib diisi.' });
    const created = {
      id: newId(),
      title: String(title).trim(),
      excerpt: String(excerpt || content.slice(0, 150)).trim(),
      content: String(content).trim(),
      category: category || 'Pengumuman',
      author: author || req.authUser?.name || 'Admin',
      date: date || new Date().toISOString().split('T')[0],
      image: sanitizeSafeUrl(image),
      isPublished: isPublished !== false,
    };
    beritaList.unshift(created);
    res.json({ success: true, data: created, message: 'Berita berhasil diterbitkan!' });
  });

  router.put('/berita/:id', requireRole('admin', 'staff'), (req, res) => {
    const idx = beritaList.findIndex(b => b.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Berita tidak ditemukan.' });
    const { title, excerpt, content, category, author, date, image, isPublished } = req.body || {};
    beritaList[idx] = {
      ...beritaList[idx],
      ...(title ? { title: String(title).trim() } : {}),
      ...(excerpt !== undefined ? { excerpt: String(excerpt).trim() } : {}),
      ...(content ? { content: String(content).trim() } : {}),
      ...(category ? { category } : {}),
      ...(author ? { author } : {}),
      ...(date ? { date } : {}),
      ...(image !== undefined ? { image: sanitizeSafeUrl(image) } : {}),
      ...(isPublished !== undefined ? { isPublished: Boolean(isPublished) } : {}),
    };
    res.json({ success: true, data: beritaList[idx], message: 'Berita berhasil diperbarui.' });
  });

  router.delete('/berita/:id', requireRole('admin', 'staff'), (req, res) => {
    beritaList = beritaList.filter(b => b.id !== req.params.id);
    res.json({ success: true, message: 'Berita berhasil dihapus.' });
  });

  // --- PPDB ---
  router.post('/ppdb', (req, res) => {
    const { name, nisn, gender, schoolOrigin, majorChoice, phoneStudent, phoneParent, email, address, track } = req.body || {};
    if (!name || !String(name).trim() || !phoneStudent || !String(phoneStudent).trim()) {
      return res.status(400).json({ success: false, error: 'Nama lengkap dan nomor WhatsApp siswa wajib diisi.' });
    }
    const now = new Date();
    const regNumber = `PPDB-${now.getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const created = {
      id: newId(),
      regNumber,
      name: String(name).trim(),
      nisn: nisn ? String(nisn).trim() : '',
      gender: gender === 'P' ? 'P' : 'L',
      schoolOrigin: schoolOrigin ? String(schoolOrigin).trim() : '-',
      majorChoice: majorChoice ? String(majorChoice).trim() : 'TKR',
      phoneStudent: String(phoneStudent).trim(),
      phoneParent: phoneParent ? String(phoneParent).trim() : '-',
      email: email ? String(email).trim() : '',
      address: address ? String(address).trim() : '-',
      track: track || 'Reguler',
      status: 'Menunggu Verifikasi',
      notes: '',
      timestamp: now.toISOString(),
    };
    ppdbList.unshift(created);
    res.json({
      success: true,
      data: created,
      message: 'Pendaftaran Anda berhasil dikirim! Silakan simpan nomor pendaftaran Anda.',
    });
  });

  router.get('/ppdb', requireRole('admin', 'staff', 'kepsek'), (req, res) => {
    res.json([...ppdbList]);
  });

  router.put('/ppdb/:id/status', requireRole('admin', 'staff'), (req, res) => {
    const idx = ppdbList.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Data pendaftar tidak ditemukan.' });
    const { status, notes } = req.body || {};
    if (!VALID_PPDB_STATUSES.has(status)) {
      return res.status(400).json({ success: false, error: 'Status verifikasi PPDB tidak valid.' });
    }
    ppdbList[idx] = {
      ...ppdbList[idx],
      status,
      ...(notes !== undefined ? { notes: String(notes || '').trim() } : {}),
    };
    res.json({ success: true, data: ppdbList[idx], message: `Status pendaftar diperbarui menjadi "${status}".` });
  });

  router.delete('/ppdb/:id', requireRole('admin'), (req, res) => {
    ppdbList = ppdbList.filter(p => p.id !== req.params.id);
    res.json({ success: true, message: 'Data pendaftar PPDB berhasil dihapus.' });
  });

  // --- Master Sesi Waktu ---
  router.get('/master-sesi', (req, res) => {
    res.json([...masterSesiList]);
  });

  router.put('/master-sesi', requireRole('admin'), (req, res) => {
    const list = Array.isArray(req.body?.slots) ? req.body.slots : (Array.isArray(req.body) ? req.body : null);
    if (!list) return res.status(400).json({ success: false, error: 'Format sesi tidak valid.' });
    masterSesiList = list.map((s, idx) => ({
      id: s.id || `sesi-${idx + 1}`,
      order: idx,
      jamKe: s.jamKe ? Number(s.jamKe) : null,
      type: s.type === 'istirahat' ? 'istirahat' : 'pelajaran',
      start: String(s.start || '07:00'),
      end: String(s.end || '07:45'),
      name: s.name ? String(s.name).trim() : '',
    }));
    res.json({ success: true, data: masterSesiList, message: 'Master Sesi Waktu berhasil diperbarui.' });
  });

  // --- Kalender Akademik ---
  router.get('/kalender', (req, res) => {
    const { date } = req.query;
    let list = [...kalenderList];
    if (date) list = list.filter(k => k.tanggal === date);
    list.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
    res.json(list);
  });

  router.post('/kalender', requireRole('admin'), (req, res) => {
    const { tanggal, tipe, judul, keterangan, jamMulai, jamSelesai, isFullDay } = req.body || {};
    if (!tanggal || !judul) return res.status(400).json({ success: false, error: 'Tanggal dan judul wajib diisi.' });
    const created = {
      id: newId(),
      tanggal,
      tipe: tipe || 'acara',
      judul: String(judul).trim(),
      keterangan: keterangan ? String(keterangan).trim() : '',
      isFullDay: isFullDay !== false,
      jamMulai: isFullDay !== false ? null : (jamMulai ? Number(jamMulai) : null),
      jamSelesai: isFullDay !== false ? null : (jamSelesai ? Number(jamSelesai) : null),
    };
    kalenderList.push(created);
    res.json({ success: true, data: created, message: 'Agenda kalender berhasil ditambahkan.' });
  });

  router.delete('/kalender/:id', requireRole('admin'), (req, res) => {
    kalenderList = kalenderList.filter(k => k.id !== req.params.id);
    res.json({ success: true, message: 'Agenda kalender berhasil dihapus.' });
  });

  // --- Jadwal Pelajaran ---
  router.get('/jadwal', (req, res) => {
    const { day, kelas, teacherId } = req.query;
    let list = [...jadwalList];
    if (day) list = list.filter(j => j.day === day);
    if (kelas) list = list.filter(j => j.class === kelas);
    if (teacherId) list = list.filter(j => j.teacherId === teacherId);
    res.json(list);
  });

  router.post('/jadwal', requireRole('admin'), (req, res) => {
    const { day, time, jamKe, subjectId, teacherId, class: className, room } = req.body || {};
    if (!day || !subjectId || !teacherId || !className) {
      return res.status(400).json({ success: false, error: 'Hari, kelas, mapel, dan guru wajib diisi.' });
    }
    const guru = guruList.find(g => g.id === teacherId);
    const mapel = mapelList.find(m => m.id === subjectId);
    const slot = masterSesiList.find(s => s.jamKe === Number(jamKe));
    const created = {
      id: newId(),
      day,
      jamKe: jamKe ? Number(jamKe) : 1,
      time: time || (slot ? `${slot.start} - ${slot.end}` : `Jam ${jamKe || 1}`),
      subjectId,
      subject: mapel?.nama || '-',
      teacherId,
      teacher: guru?.name || '-',
      class: className,
      room: room || '-',
    };
    jadwalList.push(created);
    res.json({ success: true, data: created, message: 'Jadwal berhasil ditambahkan.' });
  });

  router.post('/jadwal/matrix', requireRole('admin'), (req, res) => {
    const { day, records } = req.body || {};
    if (!day || !Array.isArray(records)) {
      return res.status(400).json({ success: false, error: 'Parameter day dan records wajib diisi.' });
    }
    const classesToUpdate = [...new Set(records.map(r => r.class).filter(Boolean))];
    if (classesToUpdate.length > 0) {
      jadwalList = jadwalList.filter(s => !(s.day === day && classesToUpdate.includes(s.class)));
    } else {
      jadwalList = jadwalList.filter(s => s.day !== day);
    }
    records.forEach(r => {
      if (r.subjectId && r.teacherId && r.class) {
        const guru = guruList.find(g => g.id === r.teacherId);
        const mapel = mapelList.find(m => m.id === r.subjectId);
        const slot = masterSesiList.find(s => s.jamKe === Number(r.jamKe));
        jadwalList.push({
          id: newId(),
          day,
          jamKe: Number(r.jamKe) || 1,
          time: slot ? `${slot.start} - ${slot.end}` : `Jam ${r.jamKe || 1}`,
          class: r.class,
          subjectId: r.subjectId,
          subject: mapel?.nama || '-',
          teacherId: r.teacherId,
          teacher: guru?.name || '-',
          room: r.room || '-',
        });
      }
    });
    res.json({ success: true, message: 'Matriks jadwal berhasil disimpan.' });
  });

  router.delete('/jadwal/:id', requireRole('admin'), (req, res) => {
    jadwalList = jadwalList.filter(j => j.id !== req.params.id);
    res.json({ success: true, message: 'Jadwal berhasil dihapus.' });
  });

  // --- Absensi Piket Siswa ---
  router.get('/absensi', (req, res) => {
    const { kelas, date, month } = req.query;
    let list = [...absensiPiketList];
    if (kelas) list = list.filter(a => a.class === kelas);
    if (date) list = list.filter(a => a.date === date);
    if (month) list = list.filter(a => (a.date || '').startsWith(month));
    res.json(list);
  });

  router.post('/absensi', requireRole('admin', 'guru', 'staff'), (req, res) => {
    const { records } = req.body || {};
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: 'Data absensi kosong.' });
    }
    records.forEach(record => {
      if (!record.studentId || !record.date) return;
      const idx = absensiPiketList.findIndex(a => a.studentId === record.studentId && a.date === record.date);
      const student = siswaList.find(s => s.id === record.studentId);
      if (idx !== -1) {
        absensiPiketList[idx] = { ...absensiPiketList[idx], ...record };
      } else {
        absensiPiketList.push({
          id: newId(),
          studentName: student?.name || record.studentName || '-',
          class: student?.class || record.class || '-',
          ...record,
        });
      }
    });
    res.json({ success: true, message: 'Absensi piket berhasil disimpan.' });
  });

  // --- Monitoring Kelas (CCTV Real-time) ---
  router.get('/monitoring/kelas', (req, res) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const { dateStr } = getJakartaNow();
    const day = req.query.day || days[new Date().getDay()] || 'Senin';
    const jamKe = Number(req.query.jamKe) || 1;
    const date = req.query.date || dateStr;

    const guruPresentSet = new Set(
      absensiGuruList
        .filter(a => (a.tanggal === date || a.tanggal === '2024-07-22') && (a.status === 'hadir' || a.jamMasuk))
        .map(a => a.guruId)
    );

    const items = kelasList.map(k => {
      const sched = jadwalList.find(j => j.day === day && j.jamKe === jamKe && j.class === k.name);
      if (!sched) {
        return {
          kelasId: k.id,
          kelasName: k.name,
          major: k.major,
          status: 'tidak_ada_jadwal',
          schedule: null,
          absenCount: 0,
        };
      }
      const mapelEntries = absensiMapelList.filter(
        a => a.class === k.name && a.date === date && Number(a.jamKe) === jamKe && (a.mapelId === sched.subjectId || a.subject === sched.subject)
      );
      let status = 'kosong';
      if (mapelEntries.length > 0) status = 'selesai';
      else if (guruPresentSet.has(sched.teacherId)) status = 'guru_hadir';

      return {
        kelasId: k.id,
        kelasName: k.name,
        major: k.major,
        status,
        absenCount: mapelEntries.length,
        schedule: {
          id: sched.id,
          subjectId: sched.subjectId,
          subject: sched.subject,
          teacherId: sched.teacherId,
          teacher: sched.teacher,
          room: sched.room || '-',
          jamKe: sched.jamKe,
        },
      };
    });

    res.json({ day, jamKe, date, updatedAt: new Date().toISOString(), items });
  });

  // --- Nilai Siswa ---
  router.get('/nilai', (req, res) => {
    const { studentId, mapelId, kelas, subject, type } = req.query;
    let list = [...nilaiList];
    if (studentId) list = list.filter(n => n.studentId === studentId);
    if (mapelId) list = list.filter(n => n.mapelId === mapelId);
    if (kelas) list = list.filter(n => n.class === kelas);
    if (subject) list = list.filter(n => n.subject === subject);
    if (type) list = list.filter(n => n.type === type);
    res.json(list);
  });

  router.post('/nilai', requireRole('admin', 'guru'), (req, res) => {
    const { studentId, mapelId, subject, type, score, maxScore, semester } = req.body || {};
    const numScore = Number(score);
    const mapel = mapelList.find(m => (mapelId && m.id === mapelId) || (subject && m.nama === subject));
    const resolvedMapelId = mapel?.id || mapelId || (subject ? `m-${String(subject).toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : '');
    const resolvedSubject = mapel?.nama || (subject ? String(subject).trim() : '');
    if (!studentId || !resolvedSubject || !type || Number.isNaN(numScore) || numScore < 0 || numScore > 100) {
      return res.status(400).json({ success: false, error: 'Siswa, mapel, jenis, dan nilai (0–100) wajib diisi dengan benar.' });
    }
    const student = siswaList.find(s => s.id === studentId);
    const created = {
      id: newId(),
      studentId,
      studentName: student?.name || '-',
      class: student?.class || '-',
      mapelId: resolvedMapelId,
      subject: resolvedSubject,
      type: String(type).trim(),
      score: Math.round(numScore),
      maxScore: Number(maxScore) || 100,
      semester: Number(semester) || 1,
    };
    nilaiList.unshift(created);
    res.json({ success: true, data: created, message: 'Nilai siswa berhasil disimpan.' });
  });

  router.put('/nilai/:id', requireRole('admin', 'guru'), (req, res) => {
    const idx = nilaiList.findIndex(n => n.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Data nilai tidak ditemukan.' });
    const { mapelId, subject, type, score, maxScore, semester } = req.body || {};
    const numScore = Number(score);
    if (Number.isNaN(numScore) || numScore < 0 || numScore > 100) {
      return res.status(400).json({ success: false, error: 'Nilai harus berada di rentang 0–100.' });
    }
    const mapel = (mapelId || subject)
      ? mapelList.find(m => (mapelId && m.id === mapelId) || (subject && m.nama === subject))
      : null;
    nilaiList[idx] = {
      ...nilaiList[idx],
      ...(mapel ? { mapelId: mapel.id, subject: mapel.nama } : {}),
      ...(!mapel && subject ? { subject: String(subject).trim() } : {}),
      ...(type ? { type: String(type).trim() } : {}),
      score: Math.round(numScore),
      ...(maxScore ? { maxScore: Number(maxScore) } : {}),
      ...(semester ? { semester: Number(semester) } : {}),
    };
    res.json({ success: true, data: nilaiList[idx], message: 'Nilai siswa berhasil diperbarui.' });
  });

  router.delete('/nilai/:id', requireRole('admin', 'guru'), (req, res) => {
    nilaiList = nilaiList.filter(n => n.id !== req.params.id);
    res.json({ success: true, message: 'Data nilai berhasil dihapus.' });
  });

  // --- Aturan Poin & Poin Sikap ---
  router.get('/aturan-poin', (req, res) => {
    res.json([...aturanPoinList]);
  });

  router.post('/aturan-poin', requireRole('admin'), (req, res) => {
    const { kategori, nama, poin, deskripsi } = req.body || {};
    if (!nama || poin === undefined) return res.status(400).json({ success: false, error: 'Nama aturan dan poin wajib diisi.' });
    const created = {
      id: newId(),
      kategori: kategori === 'negatif' ? 'negatif' : 'positif',
      nama: String(nama).trim(),
      poin: Number(poin),
      deskripsi: deskripsi ? String(deskripsi).trim() : '',
    };
    aturanPoinList.push(created);
    res.json({ success: true, data: created, message: 'Aturan poin berhasil ditambahkan.' });
  });

  router.put('/aturan-poin/:id', requireRole('admin'), (req, res) => {
    const idx = aturanPoinList.findIndex(r => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Aturan tidak ditemukan.' });
    aturanPoinList[idx] = { ...aturanPoinList[idx], ...req.body, poin: Number(req.body?.poin ?? aturanPoinList[idx].poin) };
    res.json({ success: true, message: 'Aturan poin berhasil diperbarui.' });
  });

  router.delete('/aturan-poin/:id', requireRole('admin'), (req, res) => {
    aturanPoinList = aturanPoinList.filter(r => r.id !== req.params.id);
    res.json({ success: true, message: 'Aturan poin berhasil dihapus.' });
  });

  router.get('/poin-sikap', (req, res) => {
    const { siswaId } = req.query;
    let list = [...poinSikapList];
    if (siswaId) list = list.filter(p => p.siswaId === siswaId);
    res.json(list);
  });

  router.post('/poin-sikap', requireRole('admin', 'guru'), (req, res) => {
    const { siswaId, aturanPoinId, tanggal, keterangan, pencatat } = req.body || {};
    const siswa = siswaList.find(s => s.id === siswaId);
    const aturan = aturanPoinList.find(r => r.id === aturanPoinId);
    if (!siswa || !aturan) return res.status(400).json({ success: false, error: 'Siswa dan aturan poin wajib valid.' });
    const created = {
      id: newId(),
      siswaId,
      siswaName: siswa.name,
      class: siswa.class || '-',
      tanggal: tanggal || new Date().toISOString().split('T')[0],
      aturanPoinId,
      aturanNama: aturan.nama,
      poin: aturan.poin,
      keterangan: keterangan ? String(keterangan).trim() : '',
      pencatat: pencatat || req.authUser?.name || 'Admin',
    };
    poinSikapList.unshift(created);
    res.json({ success: true, data: created, message: 'Poin sikap berhasil dicatat.' });
  });

  router.delete('/poin-sikap/:id', requireRole('admin', 'guru'), (req, res) => {
    poinSikapList = poinSikapList.filter(p => p.id !== req.params.id);
    res.json({ success: true, message: 'Catatan poin berhasil dihapus.' });
  });

  // --- Guru Absensi ---
  router.get('/guru/absen', (req, res) => {
    const { date, teacherName, guruId, teacherId } = req.query;
    const targetGuruId = teacherId || guruId;
    let list = [...absensiGuruList];
    if (date) list = list.filter(a => a.tanggal === date);
    if (targetGuruId) list = list.filter(a => a.guruId === targetGuruId);
    else if (teacherName) list = list.filter(a => a.guruName === teacherName);

    res.json(list.map(a => ({
      id: a.id,
      teacherId: a.guruId,
      guruId: a.guruId,
      guruName: a.guruName,
      teacherName: a.guruName,
      date: a.tanggal,
      tanggal: a.tanggal,
      status: a.status,
      timeIn: a.jamMasuk,
      jamMasuk: a.jamMasuk,
      timeOut: a.jamPulang,
      jamPulang: a.jamPulang,
      source: a.sumber,
      sumber: a.sumber,
      distanceMeters: a.jarakMeter,
      jarakMeter: a.jarakMeter,
      keterangan: a.keterangan || '',
    })));
  });

  router.post('/guru/absen', requireAuth, (req, res) => {
    const { teacherName, teacherId, guruId, type, distanceMeters, isWithinGeofence } = req.body || {};
    const targetGuruId = teacherId || guruId || req.authUser?.teacherId;
    const targetName = teacherName || req.authUser?.name;
    let guru = guruList.find(g => (targetGuruId && g.id === targetGuruId) || (targetName && g.name === targetName));
    if (!guru && targetName) {
      guru = { id: targetGuruId || newId(), name: targetName };
    }
    if (!guru) return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });

    const { dateStr, timeStr } = getJakartaNow();
    let idx = absensiGuruList.findIndex(a => a.guruId === guru.id && a.tanggal === dateStr);

    const toRecord = (a) => ({
      id: a.id,
      teacherId: a.guruId,
      guruId: a.guruId,
      teacherName: a.guruName,
      guruName: a.guruName,
      date: a.tanggal,
      tanggal: a.tanggal,
      status: a.status,
      timeIn: a.jamMasuk,
      jamMasuk: a.jamMasuk,
      timeOut: a.jamPulang,
      jamPulang: a.jamPulang,
      distanceMeters: a.jarakMeter,
      jarakMeter: a.jarakMeter,
      source: a.sumber,
      sumber: a.sumber,
    });

    if (type === 'in') {
      if (idx !== -1 && absensiGuruList[idx].jamMasuk) {
        return res.json({ success: false, message: 'Anda sudah absen masuk hari ini', record: toRecord(absensiGuruList[idx]) });
      }
      const rec = {
        id: idx !== -1 ? absensiGuruList[idx].id : newId(),
        guruId: guru.id,
        guruName: guru.name,
        tanggal: dateStr,
        status: isWithinGeofence ? 'hadir' : 'luar_radius',
        sumber: 'gps',
        jamMasuk: timeStr,
        jamPulang: idx !== -1 ? absensiGuruList[idx].jamPulang : null,
        jarakMeter: distanceMeters ?? null,
        keterangan: '',
      };
      if (idx !== -1) absensiGuruList[idx] = rec;
      else absensiGuruList.unshift(rec);
      return res.json({ success: true, message: 'Berhasil Absen Masuk!', record: toRecord(rec) });
    }

    if (type === 'out') {
      if (idx === -1 || !absensiGuruList[idx].jamMasuk) {
        return res.json({ success: false, message: 'Anda belum absen masuk' });
      }
      if (absensiGuruList[idx].jamPulang) {
        return res.json({ success: false, message: 'Anda sudah absen pulang hari ini', record: toRecord(absensiGuruList[idx]) });
      }
      absensiGuruList[idx] = { ...absensiGuruList[idx], jamPulang: timeStr };
      return res.json({ success: true, message: 'Berhasil Absen Pulang!', record: toRecord(absensiGuruList[idx]) });
    }

    return res.status(400).json({ success: false, message: 'Tipe absen tidak valid' });
  });

  router.post('/guru/absen/manual', requireRole('admin', 'staff'), (req, res) => {
    const { guruId, tanggal, status, jamMasuk, jamPulang, keterangan } = req.body || {};
    const guru = guruList.find(g => g.id === guruId);
    if (!guru) return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });

    const idx = absensiGuruList.findIndex(a => a.guruId === guruId && a.tanggal === tanggal);
    if (idx !== -1) {
      absensiGuruList[idx] = {
        ...absensiGuruList[idx],
        status: status || 'hadir',
        sumber: 'manual',
        jamMasuk: jamMasuk || absensiGuruList[idx].jamMasuk,
        jamPulang: jamPulang || absensiGuruList[idx].jamPulang,
        keterangan: keterangan || '',
      };
    } else {
      absensiGuruList.unshift({
        id: newId(),
        guruId,
        guruName: guru.name,
        tanggal,
        status: status || 'hadir',
        sumber: 'manual',
        jamMasuk: jamMasuk || null,
        jamPulang: jamPulang || null,
        jarakMeter: null,
        keterangan: keterangan || '',
      });
    }
    res.json({ success: true, message: 'Absensi guru berhasil dicatat.' });
  });

  // --- Kelompok Mapel ---
  router.get('/mapel/kelompok', (req, res) => {
    res.json([...kelompokMapelList]);
  });

  router.post('/mapel/kelompok', requireRole('admin'), (req, res) => {
    const { name } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: 'Nama kelompok wajib diisi' });
    const clean = String(name).trim();
    if (kelompokMapelList.includes(clean)) return res.json({ success: false, error: 'Kelompok sudah ada' });
    kelompokMapelList.push(clean);
    res.json({ success: true, message: 'Kelompok berhasil ditambahkan' });
  });

  router.put('/mapel/kelompok/:oldName', requireRole('admin'), (req, res) => {
    const { oldName } = req.params;
    const { newName } = req.body || {};
    const idx = kelompokMapelList.indexOf(oldName);
    if (idx === -1) return res.json({ success: false, error: 'Kelompok tidak ditemukan' });
    if (oldName !== newName && kelompokMapelList.includes(newName)) {
      return res.json({ success: false, error: 'Nama kelompok sudah digunakan' });
    }
    kelompokMapelList[idx] = newName;
    mapelList = mapelList.map(m => (m.kelompok === oldName ? { ...m, kelompok: newName } : m));
    res.json({ success: true, message: 'Kelompok berhasil diperbarui' });
  });

  router.delete('/mapel/kelompok/:name', requireRole('admin'), (req, res) => {
    kelompokMapelList = kelompokMapelList.filter(k => k !== req.params.name);
    res.json({ success: true, message: 'Kelompok berhasil dihapus' });
  });

  // --- Mata Pelajaran ---
  router.get('/mapel', (req, res) => {
    res.json([...mapelList].sort((a, b) => (a.kode || '').localeCompare(b.kode || '')));
  });

  router.post('/mapel', requireRole('admin'), (req, res) => {
    const created = { id: newId(), ...req.body };
    mapelList.push(created);
    res.json({ success: true, data: created, message: 'Mata pelajaran berhasil ditambahkan' });
  });

  router.put('/mapel/:id', requireRole('admin'), (req, res) => {
    const idx = mapelList.findIndex(m => m.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Mata pelajaran tidak ditemukan' });
    mapelList[idx] = { ...mapelList[idx], ...req.body };
    res.json({ success: true, message: 'Mata pelajaran berhasil diperbarui' });
  });

  router.delete('/mapel/:id', requireRole('admin'), (req, res) => {
    mapelList = mapelList.filter(m => m.id !== req.params.id);
    res.json({ success: true, message: 'Mata pelajaran berhasil dihapus' });
  });

  // --- Guru ---
  router.get('/guru', (req, res) => {
    res.json([...guruList].sort((a, b) => a.name.localeCompare(b.name)).map(g => ({
      id: g.id,
      nip: g.nip || '-',
      name: g.name,
      subject: g.subject || '-',
      phone: g.phone || '-',
      role: g.role || 'guru',
    })));
  });

  router.post('/guru', requireRole('admin'), (req, res) => {
    const { nip, name, subject, phone } = req.body || {};
    const guru = { id: newId(), nip: nip || null, name, subject: subject || null, phone: phone || null, role: 'guru' };
    guruList.push(guru);
    res.json({ success: true, data: guru, message: 'Guru berhasil ditambahkan' });
  });

  router.put('/guru/:id', requireRole('admin'), (req, res) => {
    const idx = guruList.findIndex(g => g.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Guru tidak ditemukan' });
    const { nip, name, subject, phone } = req.body || {};
    guruList[idx] = { ...guruList[idx], nip: nip || null, name, subject: subject || null, phone: phone || null };
    res.json({ success: true, message: 'Data guru berhasil diperbarui' });
  });

  router.delete('/guru/:id', requireRole('admin'), (req, res) => {
    guruList = guruList.filter(g => g.id !== req.params.id);
    res.json({ success: true, message: 'Guru berhasil dihapus' });
  });

  // --- Siswa ---
  router.get('/siswa', (req, res) => {
    const { kelas } = req.query;
    let list = [...siswaList];
    if (kelas) list = list.filter(s => s.class === kelas);
    list.sort((a, b) => a.name.localeCompare(b.name));
    res.json(list.map(s => ({
      id: s.id,
      nomor: s.nomor || s.nis || '-',
      nis: s.nis || s.nomor || '-',
      name: s.name,
      class: s.class || '-',
      gender: s.gender || 'L',
      phone: s.phone || '-',
      phone_parent: s.phone_parent || '-',
      pekerjaan_ortu: s.pekerjaan_ortu || '-',
      alamat: s.alamat || '-',
      sekolah_asal: s.sekolah_asal || '-',
    })));
  });

  router.post('/siswa', requireRole('admin', 'staff'), (req, res) => {
    const { nomor, nis, name, gender, phone, phone_parent, pekerjaan_ortu, alamat, sekolah_asal, class: kelasName } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'Nama Siswa wajib diisi' });
    }
    const finalNomor = nomor || nis ? String(nomor || nis).trim() : null;
    const siswa = {
      id: newId(),
      nomor: finalNomor,
      nis: finalNomor || '-',
      name: String(name).trim(),
      class: kelasName || '-',
      gender: gender || 'L',
      phone: phone ? String(phone).trim() : '-',
      phone_parent: phone_parent ? String(phone_parent).trim() : '-',
      pekerjaan_ortu: pekerjaan_ortu ? String(pekerjaan_ortu).trim() : '-',
      alamat: alamat ? String(alamat).trim() : '-',
      sekolah_asal: sekolah_asal ? String(sekolah_asal).trim() : '-',
    };
    siswaList.push(siswa);
    res.json({ success: true, student: siswa, message: 'Siswa berhasil ditambahkan' });
  });

  router.post('/siswa/import', requireRole('admin', 'staff'), (req, res) => {
    const { data: dataArray } = req.body || {};
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      return res.json({ success: false, error: 'Data kosong atau format tidak valid.' });
    }
    let successCount = 0;
    for (const item of dataArray) {
      if (!item.name) continue;
      const itemNomor = item.nomor || item.nis ? String(item.nomor || item.nis).trim() : null;
      if (itemNomor && siswaList.some(s => s.nomor === itemNomor)) continue;
      siswaList.push({
        id: newId(),
        nomor: itemNomor,
        nis: itemNomor || '-',
        name: String(item.name).trim(),
        class: item.class || '-',
        gender: item.gender || 'L',
        phone: item.phone ? String(item.phone) : '-',
        phone_parent: item.phone_parent ? String(item.phone_parent) : '-',
        pekerjaan_ortu: item.pekerjaan_ortu ? String(item.pekerjaan_ortu) : '-',
        alamat: item.alamat || '-',
        sekolah_asal: item.sekolah_asal || '-',
      });
      successCount++;
    }
    res.json({ success: true, message: `${successCount} data siswa berhasil diimpor.` });
  });

  router.put('/siswa/:id', requireRole('admin', 'staff'), (req, res) => {
    const idx = siswaList.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Siswa tidak ditemukan' });
    const { nomor, nis, name, gender, phone, phone_parent, pekerjaan_ortu, alamat, sekolah_asal, class: kelasName } = req.body || {};
    const finalNomor = nomor !== undefined ? (nomor ? String(nomor).trim() : null) : siswaList[idx].nomor;
    siswaList[idx] = {
      ...siswaList[idx],
      nomor: finalNomor,
      nis: finalNomor || nis || siswaList[idx].nis,
      name: name ?? siswaList[idx].name,
      class: kelasName ?? siswaList[idx].class,
      gender: gender || siswaList[idx].gender,
      phone: phone !== undefined ? (phone ? String(phone).trim() : '-') : siswaList[idx].phone,
      phone_parent: phone_parent !== undefined ? (phone_parent ? String(phone_parent).trim() : '-') : siswaList[idx].phone_parent,
      pekerjaan_ortu: pekerjaan_ortu !== undefined ? (pekerjaan_ortu ? String(pekerjaan_ortu).trim() : '-') : siswaList[idx].pekerjaan_ortu,
      alamat: alamat !== undefined ? (alamat ? String(alamat).trim() : '-') : siswaList[idx].alamat,
      sekolah_asal: sekolah_asal !== undefined ? (sekolah_asal ? String(sekolah_asal).trim() : '-') : siswaList[idx].sekolah_asal,
    };
    res.json({ success: true, message: 'Data siswa berhasil diperbarui' });
  });

  router.delete('/siswa/:id', requireRole('admin', 'staff'), (req, res) => {
    siswaList = siswaList.filter(s => s.id !== req.params.id);
    res.json({ success: true, message: 'Siswa berhasil dihapus' });
  });

  // --- Kelas ---
  const detectMajor = (trimmedName, major) => {
    let finalMajor = (major || '').trim();
    if (!finalMajor) {
      const upper = trimmedName.toUpperCase();
      if (upper.includes('TKJ')) finalMajor = 'TKJ';
      else if (upper.includes('RPL')) finalMajor = 'RPL';
      else if (upper.includes('TBSM') || upper.includes('TSM')) finalMajor = 'TSM';
      else if (upper.includes('TKR')) finalMajor = 'TKR';
      else if (upper.includes('TITL')) finalMajor = 'TITL';
      else if (upper.includes('AKL') || upper.includes('AK')) finalMajor = 'AKL';
      else if (upper.includes('DKV')) finalMajor = 'DKV';
      else finalMajor = 'Umum';
    }
    return finalMajor;
  };

  router.get('/kelas', (req, res) => {
    res.json([...kelasList].sort((a, b) => a.name.localeCompare(b.name)));
  });

  router.post('/kelas', requireRole('admin'), (req, res) => {
    const { name, grade, major, teacherId } = req.body || {};
    const trimmedName = (name || '').trim();
    if (!trimmedName) return res.status(400).json({ success: false, error: 'Nama kelas wajib diisi' });
    if (kelasList.some(k => k.name === trimmedName)) {
      return res.status(400).json({ success: false, error: `Kelas "${trimmedName}" sudah ada.` });
    }
    const teacher = teacherId ? guruList.find(g => g.id === teacherId) : null;
    const created = {
      id: newId(),
      name: trimmedName,
      grade: (grade || 'X').trim(),
      major: detectMajor(trimmedName, major),
      totalStudents: siswaList.filter(s => s.class === trimmedName).length,
      teacherId: teacher ? teacher.id : null,
      teacherName: teacher ? teacher.name : '-',
    };
    kelasList.push(created);
    res.json({ success: true, data: created, message: 'Kelas berhasil ditambahkan' });
  });

  router.put('/kelas/:id', requireRole('admin'), (req, res) => {
    const idx = kelasList.findIndex(k => k.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Kelas tidak ditemukan' });
    const { name, grade, major, teacherId } = req.body || {};
    const trimmedName = (name || '').trim();
    if (!trimmedName) return res.status(400).json({ success: false, error: 'Nama kelas wajib diisi' });
    const teacher = teacherId ? guruList.find(g => g.id === teacherId) : null;
    const updated = {
      ...kelasList[idx],
      name: trimmedName,
      grade: (grade || 'X').trim(),
      major: detectMajor(trimmedName, major),
      teacherId: teacher ? teacher.id : null,
      teacherName: teacher ? teacher.name : '-',
    };
    kelasList[idx] = updated;
    res.json({ success: true, data: updated, message: 'Kelas berhasil diperbarui' });
  });

  router.delete('/kelas/:id', requireRole('admin'), (req, res) => {
    kelasList = kelasList.filter(k => k.id !== req.params.id);
    res.json({ success: true, message: 'Kelas berhasil dihapus' });
  });

  // --- Jurusan ---
  router.get('/jurusan', (req, res) => {
    res.json([...jurusanList].sort((a, b) => a.kode.localeCompare(b.kode)));
  });

  router.post('/jurusan', requireRole('admin'), (req, res) => {
    const { kode, nama, deskripsi, color } = req.body || {};
    const cleanKode = (kode || '').trim().toUpperCase();
    const cleanNama = (nama || '').trim();
    if (!cleanKode || !cleanNama) {
      return res.status(400).json({ success: false, error: 'Kode dan Nama Jurusan wajib diisi' });
    }
    if (jurusanList.some(j => j.kode === cleanKode)) {
      return res.status(400).json({ success: false, error: `Jurusan dengan kode "${cleanKode}" sudah ada.` });
    }
    const created = { id: newId(), kode: cleanKode, nama: cleanNama, deskripsi: deskripsi ? deskripsi.trim() : null, color: color || '#3B82F6' };
    jurusanList.push(created);
    res.json({ success: true, data: created, message: 'Jurusan berhasil ditambahkan' });
  });

  router.put('/jurusan/:id', requireRole('admin'), (req, res) => {
    const idx = jurusanList.findIndex(j => j.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Jurusan tidak ditemukan' });
    const { kode, nama, deskripsi, color } = req.body || {};
    const cleanKode = (kode || '').trim().toUpperCase();
    const cleanNama = (nama || '').trim();
    if (!cleanKode || !cleanNama) {
      return res.status(400).json({ success: false, error: 'Kode dan Nama Jurusan wajib diisi' });
    }
    if (jurusanList.some(j => j.kode === cleanKode && j.id !== req.params.id)) {
      return res.status(400).json({ success: false, error: `Kode jurusan "${cleanKode}" sudah digunakan oleh jurusan lain.` });
    }
    const oldKode = jurusanList[idx].kode;
    jurusanList[idx] = { ...jurusanList[idx], kode: cleanKode, nama: cleanNama, deskripsi: deskripsi ? deskripsi.trim() : null, color: color || '#3B82F6' };
    if (oldKode !== cleanKode) {
      kelasList = kelasList.map(k => (k.major === oldKode ? { ...k, major: cleanKode } : k));
    }
    res.json({ success: true, data: jurusanList[idx], message: 'Jurusan berhasil diperbarui' });
  });

  router.delete('/jurusan/:id', requireRole('admin'), (req, res) => {
    const target = jurusanList.find(j => j.id === req.params.id);
    if (!target) return res.status(404).json({ success: false, error: 'Jurusan tidak ditemukan' });
    const classCount = kelasList.filter(k => k.major === target.kode).length;
    if (classCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Jurusan "${target.kode}" tidak dapat dihapus karena masih digunakan oleh ${classCount} kelas.`,
      });
    }
    jurusanList = jurusanList.filter(j => j.id !== req.params.id);
    res.json({ success: true, message: 'Jurusan berhasil dihapus' });
  });

  // --- Tahun Ajar ---
  router.get('/tahun-ajar', (req, res) => {
    const sorted = [...tahunAjarList].sort((a, b) => Number(b.isActive) - Number(a.isActive) || (b.startDate || '').localeCompare(a.startDate || ''));
    res.json(sorted);
  });

  router.post('/tahun-ajar', requireRole('admin'), (req, res) => {
    const { nama, semester, startDate, endDate, isActive } = req.body || {};
    const shouldBeActive = Boolean(isActive);
    if (shouldBeActive) {
      tahunAjarList = tahunAjarList.map(t => ({ ...t, isActive: false }));
    }
    const created = {
      id: newId(),
      nama: (nama || '').trim(),
      semester: Number(semester) || 1,
      isActive: shouldBeActive,
      startDate: startDate || '',
      endDate: endDate || '',
    };
    tahunAjarList.unshift(created);
    res.json({ success: true, data: created, message: 'Tahun ajar berhasil ditambahkan' });
  });

  router.put('/tahun-ajar/:id', requireRole('admin'), (req, res) => {
    const idx = tahunAjarList.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Tahun ajar tidak ditemukan' });
    const { nama, semester, startDate, endDate, isActive } = req.body || {};
    if (isActive) {
      tahunAjarList = tahunAjarList.map(t => ({ ...t, isActive: false }));
    }
    tahunAjarList[idx] = {
      ...tahunAjarList[idx],
      ...(nama ? { nama: nama.trim() } : {}),
      ...(semester !== undefined ? { semester: Number(semester) } : {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
    };
    res.json({ success: true, data: tahunAjarList[idx], message: 'Tahun ajar berhasil diperbarui' });
  });

  router.delete('/tahun-ajar/:id', requireRole('admin'), (req, res) => {
    tahunAjarList = tahunAjarList.filter(t => t.id !== req.params.id);
    res.json({ success: true, message: 'Tahun ajar berhasil dihapus' });
  });

  router.put('/tahun-ajar/:id/activate', requireRole('admin'), (req, res) => {
    const target = tahunAjarList.find(t => t.id === req.params.id);
    if (!target) return res.status(404).json({ success: false, error: 'Tahun ajar tidak ditemukan' });
    tahunAjarList = tahunAjarList.map(t => ({ ...t, isActive: t.id === req.params.id }));
    const activated = tahunAjarList.find(t => t.id === req.params.id);
    res.json({ success: true, data: activated, message: 'Tahun ajar aktif berhasil diubah' });
  });

  // --- Absensi Mapel ---
  router.post('/absensi-mapel', requireRole('admin', 'guru'), (req, res) => {
    const { records } = req.body || {};
    if (!Array.isArray(records) || records.length === 0) {
      return res.json({ success: false, error: 'Data absensi kosong' });
    }
    for (const record of records) {
      const mapelId = record.mapelId || record.subjectId;
      const guruId = record.guruId || record.teacherId || req.authUser?.teacherId || 'g001';
      const kelasName = record.class || record.kelasName || '-';
      const idx = absensiMapelList.findIndex(
        a => a.studentId === record.studentId && a.mapelId === mapelId && a.date === record.date && Number(a.jamKe) === Number(record.jamKe)
      );
      const student = siswaList.find(s => s.id === record.studentId);
      const mapel = mapelList.find(m => m.id === mapelId || m.nama === record.subject);
      const guru = guruList.find(g => g.id === guruId);
      const item = {
        id: idx !== -1 ? absensiMapelList[idx].id : newId(),
        studentId: record.studentId,
        studentName: student?.name || record.studentName || '-',
        mapelId: mapel?.id || mapelId,
        subject: mapel?.nama || record.subject || '-',
        guruId,
        teacherName: guru?.name || record.teacherName || req.authUser?.name || '-',
        class: kelasName,
        date: record.date,
        jamKe: Number(record.jamKe) || 1,
        status: record.status,
      };
      if (idx !== -1) absensiMapelList[idx] = item;
      else absensiMapelList.push(item);
    }
    res.json({ success: true, message: 'Absensi mapel berhasil disimpan.' });
  });

  router.get('/absensi-mapel', (req, res) => {
    const { kelas, mapel, date, month } = req.query;
    let list = [...absensiMapelList];
    if (kelas) list = list.filter(a => a.class === kelas);
    if (mapel) list = list.filter(a => a.mapelId === mapel || a.subject === mapel);
    if (date) list = list.filter(a => a.date === date);
    if (month) list = list.filter(a => (a.date || '').startsWith(month));
    list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (a.jamKe || 0) - (b.jamKe || 0));
    res.json(list);
  });

  router.get('/absensi-mapel/rekap', (req, res) => {
    const { kelas, mapel, month } = req.query;
    if (!kelas || !month) {
      return res.json({ success: false, error: 'Parameter kelas dan month wajib' });
    }
    let list = absensiMapelList.filter(a => a.class === kelas && (a.date || '').startsWith(month));
    if (mapel) list = list.filter(a => a.mapelId === mapel || a.subject === mapel);

    const sesiSet = new Set();
    list.forEach(a => sesiSet.add(`${a.date}_${a.jamKe}_${a.mapelId}`));

    const studentMap = {};
    list.forEach(a => {
      if (!studentMap[a.studentId]) {
        studentMap[a.studentId] = {
          studentId: a.studentId,
          studentName: a.studentName,
          class: a.class,
          hadir: 0,
          izin: 0,
          sakit: 0,
          alpha: 0,
        };
      }
      const s = studentMap[a.studentId];
      if (a.status === 'hadir') s.hadir++;
      else if (a.status === 'izin') s.izin++;
      else if (a.status === 'sakit') s.sakit++;
      else if (a.status === 'alpha') s.alpha++;
    });

    const rekap = Object.values(studentMap)
      .map(s => {
        const totalSesi = s.hadir + s.izin + s.sakit + s.alpha;
        return { ...s, totalSesi, persentase: totalSesi > 0 ? Math.round((s.hadir / totalSesi) * 100) : 0 };
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName));

    res.json({
      success: true,
      totalSesiGuru: sesiSet.size,
      kelas,
      bulan: month,
      mapelId: mapel || 'semua',
      rekap,
    });
  });

  // --- Dashboard Stats ---
  router.get('/dashboard/stats', (req, res) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const todayName = days[new Date().getDay()];
    const todaySchedule = jadwalList.filter(s => s.day === todayName);
    const activeYear = tahunAjarList.find(y => y.isActive);

    const guruHadir = absensiGuruList.filter(a => a.status === 'hadir').length;
    const guruIzin = absensiGuruList.filter(a => a.status === 'izin').length;
    const guruSakit = absensiGuruList.filter(a => a.status === 'sakit').length;
    const guruAlpha = Math.max(0, guruList.length - guruHadir - guruIzin - guruSakit);

    const siswaHadir = absensiPiketList.filter(a => a.statusPagi === 'hadir').length;
    const siswaIzin = absensiPiketList.filter(a => a.statusPagi === 'izin').length;
    const siswaSakit = absensiPiketList.filter(a => a.statusPagi === 'sakit').length;
    const siswaAlpha = absensiPiketList.filter(a => a.statusPagi === 'alpha').length;
    const siswaBolos = absensiPiketList.filter(a => a.statusPagi === 'hadir' && a.statusSore === 'alpha').length;

    res.json({
      totalStudents: siswaList.length,
      totalTeachers: guruList.length,
      totalClasses: kelasList.length,
      todayScheduleCount: todaySchedule.length,
      activeAcademicYear: activeYear ? `${activeYear.nama} Smt ${activeYear.semester}` : '-',
      teacherAttendanceToday: { hadir: guruHadir, izin: guruIzin, sakit: guruSakit, alpha: guruAlpha },
      studentAttendanceToday: { hadir: siswaHadir, izin: siswaIzin, sakit: siswaSakit, alpha: siswaAlpha, bolos: siswaBolos },
      upcomingEvents: beritaList.slice(0, 3),
      todayDuty: MOCK_DUTY_SCHEDULE.filter(d => d.hari === todayName),
      todaySchedule: todaySchedule.slice(0, 5),
      ppdbPendingCount: ppdbList.filter(p => p.status === 'Menunggu Verifikasi').length,
      totalUsers: users.length,
    });
  });

  return router;
}
