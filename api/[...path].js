import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());

// Vercel Serverless-safe body parser (avoids 400 Bad Request when req.body is already parsed)
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    return next();
  }
  express.json({ limit: '10mb' })(req, res, (err) => {
    if (err) {
      console.warn('express.json parser ignored error:', err.message);
      return next();
    }
    next();
  });
});

app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    return next();
  }
  express.urlencoded({ extended: true, limit: '10mb' })(req, res, (err) => {
    if (err) return next();
    next();
  });
});

// Endpoint untuk cek server jalan atau tidak
app.get('/', (req, res) => {
  res.send('Server SIA SMK MU4RA Berjalan!');
});

// Endpoint Anti-Sleep untuk Bot (cron-job.org)
app.get('/api/ping', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ message: 'Pong! Database is awake.' });
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// --- KEEP ALIVE BOT ENDPOINTS ---
app.post('/api/keep-alive/ping', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { pingType, triggeredBy, note } = req.body;
    
    // Simple verification for CRON bot
    if (pingType === 'AUTO_BOT') {
      const cronSecret = process.env.CRON_SECRET;
      if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized CRON request' });
      }
    }

    // Insert heartbeat record
    const record = await prisma.systemHeartbeat.create({
      data: {
        pingType: pingType || 'MANUAL_ADMIN',
        triggeredBy: triggeredBy || 'Admin',
        note: note || 'Database ping'
      }
    });

    res.status(200).json({ success: true, record });
  } catch (error) {
    console.error('Keep-Alive Ping Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/keep-alive/status', async (req, res) => {
  try {
    const history = await prisma.systemHeartbeat.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    res.status(200).json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- API ROUTES ---

// 1. Auth Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username dan password wajib diisi' });
    }

    const user = await prisma.user.findUnique({ where: { username: username.trim() } });
    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, error: 'Username atau password salah' });
    }
    return res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('API /api/auth/login error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Database error' });
  }
});

// 2. Guru Absensi (GET)
app.get('/api/guru/absen', async (req, res) => {
  const { date } = req.query; // YYYY-MM-DD
  try {
    let where = {};
    if (date) {
      where.tanggal = new Date(date);
    }
    const absensi = await prisma.absensiGuru.findMany({
      where,
      include: { guru: true }
    });
    
    const mapped = absensi.map(a => ({
      id: a.id,
      teacherId: a.guruId,
      teacherName: a.guru.name,
      date: a.tanggal.toISOString().split('T')[0],
      status: a.status,
      timeIn: a.jamMasuk,
      timeOut: a.jamPulang,
      source: a.sumber,
      distanceMeters: a.jarakMeter
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Guru Absensi (POST)
app.post('/api/guru/absen', async (req, res) => {
  const { teacherName, type, distanceMeters, isWithinGeofence } = req.body;
  try {
    const guru = await prisma.guru.findFirst({ where: { name: teacherName } });
    if (!guru) return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });

    const now = new Date();
    const jktDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
    const today = new Date(`${jktDateStr}T00:00:00.000Z`);
    const currentTime = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });

    let absensi = await prisma.absensiGuru.findFirst({
      where: { guruId: guru.id, tanggal: today }
    });

    if (type === 'in') {
      if (absensi && absensi.jamMasuk) return res.json({ success: false, message: 'Anda sudah absen masuk hari ini' });
      
      if (!absensi) {
        absensi = await prisma.absensiGuru.create({
          data: {
            guruId: guru.id,
            tanggal: today,
            status: isWithinGeofence ? 'hadir' : 'luar_radius',
            sumber: 'gps',
            jamMasuk: currentTime,
            jarakMeter: distanceMeters
          }
        });
      } else {
        absensi = await prisma.absensiGuru.update({
          where: { id: absensi.id },
          data: { jamMasuk: currentTime, sumber: 'gps', jarakMeter: distanceMeters, status: isWithinGeofence ? 'hadir' : 'luar_radius' }
        });
      }
      return res.json({ success: true, message: 'Berhasil Absen Masuk!' });
    } else if (type === 'out') {
      if (!absensi || !absensi.jamMasuk) return res.json({ success: false, message: 'Anda belum absen masuk' });
      if (absensi.jamPulang) return res.json({ success: false, message: 'Anda sudah absen pulang hari ini' });
      
      await prisma.absensiGuru.update({
        where: { id: absensi.id },
        data: { jamPulang: currentTime }
      });
      return res.json({ success: true, message: 'Berhasil Absen Pulang!' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 4. MATA PELAJARAN & KELOMPOK
// ==========================================

// Kelompok Mapel
app.get('/api/mapel/kelompok', async (req, res) => {
  try {
    const groups = await prisma.kelompokMapel.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(groups.map(g => g.nama));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/mapel/kelompok', async (req, res) => {
  const { name } = req.body;
  try {
    const existing = await prisma.kelompokMapel.findUnique({ where: { nama: name } });
    if (existing) return res.json({ success: false, error: 'Kelompok sudah ada' });
    await prisma.kelompokMapel.create({ data: { nama: name } });
    res.json({ success: true, message: 'Kelompok berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/mapel/kelompok/:oldName', async (req, res) => {
  const { oldName } = req.params;
  const { newName } = req.body;
  try {
    const existing = await prisma.kelompokMapel.findUnique({ where: { nama: oldName } });
    if (!existing) return res.json({ success: false, error: 'Kelompok tidak ditemukan' });
    
    // Cek apakah nama baru sudah ada
    if (oldName !== newName) {
      const target = await prisma.kelompokMapel.findUnique({ where: { nama: newName } });
      if (target) return res.json({ success: false, error: 'Nama kelompok sudah digunakan' });
    }

    await prisma.kelompokMapel.update({
      where: { nama: oldName },
      data: { nama: newName }
    });
    
    // Update mapel yang menggunakan kelompok ini
    await prisma.mataPelajaran.updateMany({
      where: { kelompok: oldName },
      data: { kelompok: newName }
    });

    res.json({ success: true, message: 'Kelompok berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/mapel/kelompok/:name', async (req, res) => {
  const { name } = req.params;
  try {
    await prisma.kelompokMapel.delete({ where: { nama: name } });
    res.json({ success: true, message: 'Kelompok berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mata Pelajaran
app.get('/api/mapel', async (req, res) => {
  try {
    const mapels = await prisma.mataPelajaran.findMany({ orderBy: { kode: 'asc' } });
    res.json(mapels);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/mapel', async (req, res) => {
  try {
    const newMapel = await prisma.mataPelajaran.create({ data: req.body });
    res.json({ success: true, data: newMapel, message: 'Mata pelajaran berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/mapel/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.mataPelajaran.update({ where: { id }, data: req.body });
    res.json({ success: true, message: 'Mata pelajaran berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/mapel/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.mataPelajaran.delete({ where: { id } });
    res.json({ success: true, message: 'Mata pelajaran berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 5. GURU (CRUD)
// ==========================================

app.get('/api/guru', async (req, res) => {
  try {
    const gurus = await prisma.guru.findMany({ orderBy: { name: 'asc' } });
    // Map to match frontend expected format
    res.json(gurus.map(g => ({
      id: g.id,
      nip: g.nip || '-',
      name: g.name,
      subject: g.subject || '-',
      phone: g.phone || '-',
      role: g.role
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/guru', async (req, res) => {
  try {
    const { nip, name, subject, phone } = req.body;
    const guru = await prisma.guru.create({
      data: { nip: nip || null, name, subject: subject || null, phone: phone || null }
    });
    res.json({ success: true, data: guru, message: 'Guru berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/guru/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { nip, name, subject, phone } = req.body;
    await prisma.guru.update({
      where: { id },
      data: { nip: nip || null, name, subject: subject || null, phone: phone || null }
    });
    res.json({ success: true, message: 'Data guru berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/guru/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.guru.delete({ where: { id } });
    res.json({ success: true, message: 'Guru berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 6. SISWA (CRUD)
// ==========================================

app.get('/api/siswa', async (req, res) => {
  try {
    const { kelas } = req.query;
    const siswaList = await prisma.siswa.findMany({
      include: {
        riwayatKelas: {
          include: { kelas: true, tahunAjar: true },
          where: { tahunAjar: { isActive: true } }
        }
      },
      orderBy: { name: 'asc' }
    });

    const mapped = siswaList.map(s => {
      const activeRiwayat = s.riwayatKelas?.[0];
      const kelasName = activeRiwayat?.kelas?.name || '-';
      return {
        id: s.id,
        nis: s.nis,
        nisn: s.nisn || '-',
        name: s.name,
        class: kelasName,
        gender: s.gender,
        phone_parent: s.phone_parent || '-',
        alamat: s.alamat || '-',
        sekolah_asal: s.sekolah_asal || '-'
      };
    });

    if (kelas) {
      res.json(mapped.filter(s => s.class === kelas));
    } else {
      res.json(mapped);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/siswa', async (req, res) => {
  try {
    const { nis, nisn, name, gender, phone_parent, alamat, sekolah_asal, class: kelasName } = req.body;
    const siswa = await prisma.siswa.create({
      data: { nis, nisn: nisn || null, name, gender, phone_parent, alamat, sekolah_asal }
    });

    // If class is provided, assign to active tahun ajar
    if (kelasName) {
      const kelas = await prisma.kelas.findUnique({ where: { name: kelasName } });
      const activeTa = await prisma.tahunAjar.findFirst({ where: { isActive: true } });
      if (kelas && activeTa) {
        await prisma.riwayatKelas.create({
          data: { siswaId: siswa.id, kelasId: kelas.id, tahunAjarId: activeTa.id }
        });
      }
    }

    res.json({ success: true, student: siswa, message: 'Siswa berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/siswa/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { nis, nisn, name, gender, phone_parent, alamat, sekolah_asal } = req.body;
    await prisma.siswa.update({
      where: { id },
      data: { nis, nisn: nisn || null, name, gender, phone_parent, alamat, sekolah_asal }
    });
    res.json({ success: true, message: 'Data siswa berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/siswa/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Delete related records first
    await prisma.riwayatKelas.deleteMany({ where: { siswaId: id } });
    await prisma.siswa.delete({ where: { id } });
    res.json({ success: true, message: 'Siswa berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/siswa/import', async (req, res) => {
  try {
    const { data: dataArray } = req.body;
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      return res.json({ success: false, error: 'Data kosong atau format tidak valid.' });
    }

    let successCount = 0;
    const activeTa = await prisma.tahunAjar.findFirst({ where: { isActive: true } });

    for (const item of dataArray) {
      if (!item.nis || !item.name) continue;
      // Check existing
      const exists = await prisma.siswa.findUnique({ where: { nis: String(item.nis) } });
      if (exists) continue;

      const siswa = await prisma.siswa.create({
        data: {
          nis: String(item.nis),
          nisn: item.nisn ? String(item.nisn) : null,
          name: item.name,
          gender: item.gender || 'L',
          phone_parent: item.phone_parent ? String(item.phone_parent) : null,
          alamat: item.alamat || null,
          sekolah_asal: item.sekolah_asal || null
        }
      });

      // Assign to class if provided
      if (item.class && activeTa) {
        const kelas = await prisma.kelas.findUnique({ where: { name: item.class } });
        if (kelas) {
          await prisma.riwayatKelas.create({
            data: { siswaId: siswa.id, kelasId: kelas.id, tahunAjarId: activeTa.id }
          }).catch(() => {}); // Ignore if already exists
        }
      }
      successCount++;
    }

    res.json({ success: true, message: `${successCount} data siswa berhasil diimpor.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 7. KELAS (CRUD)
// ==========================================

app.get('/api/kelas', async (req, res) => {
  try {
    const kelasList = await prisma.kelas.findMany({
      include: {
        waliKelas: true,
        _count: { select: { riwayatKelas: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json(kelasList.map(k => ({
      id: k.id,
      name: k.name,
      grade: k.grade,
      major: k.major,
      totalStudents: k._count.riwayatKelas,
      teacherId: k.teacherId,
      teacherName: k.waliKelas?.name || '-'
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/kelas', async (req, res) => {
  try {
    const { name, grade, major, teacherId } = req.body;
    const kelas = await prisma.kelas.create({
      data: { name, grade, major, teacherId: teacherId || null }
    });
    res.json({ success: true, data: kelas, message: 'Kelas berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/kelas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { name, grade, major, teacherId } = req.body;
    await prisma.kelas.update({
      where: { id },
      data: { name, grade, major, teacherId: teacherId || null }
    });
    res.json({ success: true, message: 'Kelas berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/kelas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.riwayatKelas.deleteMany({ where: { kelasId: id } });
    await prisma.kelas.delete({ where: { id } });
    res.json({ success: true, message: 'Kelas berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 8. TAHUN AJAR (CRUD)
// ==========================================

app.get('/api/tahun-ajar', async (req, res) => {
  try {
    const data = await prisma.tahunAjar.findMany({ orderBy: { startDate: 'desc' } });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tahun-ajar', async (req, res) => {
  try {
    const { nama, semester, startDate, endDate } = req.body;
    const ta = await prisma.tahunAjar.create({
      data: {
        nama, semester: Number(semester), isActive: false,
        startDate: new Date(startDate), endDate: new Date(endDate)
      }
    });
    res.json({ success: true, data: ta, message: 'Tahun ajar berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/tahun-ajar/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { nama, semester, startDate, endDate } = req.body;
    await prisma.tahunAjar.update({
      where: { id },
      data: {
        nama, semester: Number(semester),
        startDate: new Date(startDate), endDate: new Date(endDate)
      }
    });
    res.json({ success: true, message: 'Tahun ajar berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/tahun-ajar/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.tahunAjar.delete({ where: { id } });
    res.json({ success: true, message: 'Tahun ajar berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/tahun-ajar/:id/activate', async (req, res) => {
  const { id } = req.params;
  try {
    // Nonaktifkan semua dulu
    await prisma.tahunAjar.updateMany({ data: { isActive: false } });
    // Aktifkan yang dipilih
    await prisma.tahunAjar.update({ where: { id }, data: { isActive: true } });
    res.json({ success: true, message: 'Tahun ajar aktif berhasil diubah' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Since this file uses ES modules, we export the app as default
export default app;
