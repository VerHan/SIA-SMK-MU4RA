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
      include: { guru: true },
      orderBy: { createdAt: 'desc' }
    });
    
    const mapped = absensi.map(a => ({
      id: a.id,
      teacherId: a.guruId,
      guruId: a.guruId,
      guruName: a.guru?.name || '-',
      teacherName: a.guru?.name || '-',
      date: a.tanggal.toISOString().split('T')[0],
      tanggal: a.tanggal.toISOString().split('T')[0],
      status: a.status,
      timeIn: a.jamMasuk,
      jamMasuk: a.jamMasuk,
      timeOut: a.jamPulang,
      jamPulang: a.jamPulang,
      source: a.sumber,
      sumber: a.sumber,
      distanceMeters: a.jarakMeter,
      jarakMeter: a.jarakMeter,
      keterangan: a.keterangan || ''
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Guru Absensi (POST GPS)
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

// 3b. Guru Absensi (POST Manual Admin)
app.post('/api/guru/absen/manual', async (req, res) => {
  const { guruId, tanggal, status, jamMasuk, jamPulang, keterangan } = req.body;
  try {
    const guru = await prisma.guru.findUnique({ where: { id: guruId } });
    if (!guru) return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });

    const targetDate = new Date(`${tanggal}T00:00:00.000Z`);

    const existing = await prisma.absensiGuru.findFirst({
      where: { guruId, tanggal: targetDate }
    });

    if (existing) {
      await prisma.absensiGuru.update({
        where: { id: existing.id },
        data: {
          status: status || 'hadir',
          sumber: 'manual',
          jamMasuk: jamMasuk || existing.jamMasuk,
          jamPulang: jamPulang || existing.jamPulang,
          keterangan: keterangan || ''
        }
      });
    } else {
      await prisma.absensiGuru.create({
        data: {
          guruId,
          tanggal: targetDate,
          status: status || 'hadir',
          sumber: 'manual',
          jamMasuk: jamMasuk || null,
          jamPulang: jamPulang || null,
          keterangan: keterangan || ''
        }
      });
    }

    res.json({ success: true, message: 'Absensi guru berhasil dicatat.' });
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
        nomor: s.nomor,
        nis: s.nomor, // fallback kompatibilitas komponen
        name: s.name,
        class: kelasName,
        gender: s.gender,
        phone: s.phone || '-',
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
    const { nomor, nis, name, gender, phone, phone_parent, alamat, sekolah_asal, class: kelasName } = req.body;
    const finalNomor = String(nomor || nis || '').trim();
    if (!finalNomor || !name) {
      return res.status(400).json({ success: false, error: 'Nomor dan Nama Siswa wajib diisi' });
    }

    const siswa = await prisma.siswa.create({
      data: {
        nomor: finalNomor,
        name,
        gender: gender || 'L',
        phone: phone || null,
        phone_parent: phone_parent || null,
        alamat: alamat || null,
        sekolah_asal: sekolah_asal || null
      }
    });

    // If class is provided, assign to active tahun ajar
    if (kelasName) {
      const kelas = await prisma.kelas.findUnique({ where: { name: kelasName } });
      const activeTa = await prisma.tahunAjar.findFirst({ where: { isActive: true } });
      if (kelas && activeTa) {
        await prisma.riwayatKelas.create({
          data: { siswaId: siswa.id, kelasId: kelas.id, tahunAjarId: activeTa.id }
        }).catch(() => {});
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
    const { nomor, nis, name, gender, phone, phone_parent, alamat, sekolah_asal } = req.body;
    const finalNomor = nomor || nis;
    const dataToUpdate = {
      name,
      gender,
      phone: phone || null,
      phone_parent: phone_parent || null,
      alamat: alamat || null,
      sekolah_asal: sekolah_asal || null
    };
    if (finalNomor) dataToUpdate.nomor = String(finalNomor).trim();

    await prisma.siswa.update({
      where: { id },
      data: dataToUpdate
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
      const itemNomor = String(item.nomor || item.nis || '').trim();
      if (!itemNomor || !item.name) continue;
      // Check existing
      const exists = await prisma.siswa.findUnique({ where: { nomor: itemNomor } });
      if (exists) continue;

      const siswa = await prisma.siswa.create({
        data: {
          nomor: itemNomor,
          name: item.name,
          gender: item.gender || 'L',
          phone: item.phone ? String(item.phone) : null,
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

// ==========================================
// 9. ABSENSI MAPEL (Per Mata Pelajaran)
// ==========================================

// POST — Guru menyimpan absensi murid per jam pelajaran
app.post('/api/absensi-mapel', async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.json({ success: false, error: 'Data absensi kosong' });
    }

    const activeTa = await prisma.tahunAjar.findFirst({ where: { isActive: true } });

    for (const record of records) {
      await prisma.absensiMapel.upsert({
        where: {
          studentId_mapelId_date_jamKe: {
            studentId: record.studentId,
            mapelId: record.mapelId || record.subjectId,
            date: new Date(record.date),
            jamKe: record.jamKe
          }
        },
        update: {
          status: record.status,
          guruId: record.guruId || record.teacherId,
          kelasName: record.class || record.kelasName || '-'
        },
        create: {
          studentId: record.studentId,
          mapelId: record.mapelId || record.subjectId,
          guruId: record.guruId || record.teacherId,
          kelasName: record.class || record.kelasName || '-',
          tahunAjarId: activeTa?.id || null,
          date: new Date(record.date),
          jamKe: record.jamKe,
          status: record.status
        }
      });
    }

    res.json({ success: true, message: 'Absensi mapel berhasil disimpan.' });
  } catch (err) {
    console.error('POST /api/absensi-mapel error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET — Ambil data absensi mapel (filter: kelas, mapel, tanggal, bulan)
app.get('/api/absensi-mapel', async (req, res) => {
  try {
    const { kelas, mapel, date, month } = req.query;
    let where = {};
    if (kelas) where.kelasName = kelas;
    if (mapel) where.mapelId = mapel;
    if (date) where.date = new Date(date);
    if (month) {
      const [y, m] = month.split('-');
      const start = new Date(`${y}-${m}-01`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      where.date = { gte: start, lt: end };
    }

    const data = await prisma.absensiMapel.findMany({
      where,
      include: {
        student: true,
        mapel: true,
        guru: true
      },
      orderBy: [{ date: 'desc' }, { jamKe: 'asc' }]
    });

    res.json(data.map(a => ({
      id: a.id,
      studentId: a.studentId,
      studentName: a.student.name,
      mapelId: a.mapelId,
      subject: a.mapel.nama,
      guruId: a.guruId,
      teacherName: a.guru.name,
      class: a.kelasName,
      date: a.date.toISOString().split('T')[0],
      jamKe: a.jamKe,
      status: a.status
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET — Rekap bulanan per kelas per mapel
// Persentase dihitung berdasarkan berapa kali guru benar-benar mengabsen
app.get('/api/absensi-mapel/rekap', async (req, res) => {
  try {
    const { kelas, mapel, month } = req.query;
    if (!kelas || !month) {
      return res.json({ success: false, error: 'Parameter kelas dan month wajib' });
    }

    const [y, m] = month.split('-');
    const start = new Date(`${y}-${m}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    let where = {
      kelasName: kelas,
      date: { gte: start, lt: end }
    };
    if (mapel) where.mapelId = mapel;

    const data = await prisma.absensiMapel.findMany({
      where,
      include: { student: true, mapel: true }
    });

    // Hitung total sesi unik (tanggal + jamKe + mapelId)
    const sesiSet = new Set();
    data.forEach(a => sesiSet.add(`${a.date.toISOString().split('T')[0]}_${a.jamKe}_${a.mapelId}`));
    const totalSesi = sesiSet.size;

    // Hitung per siswa
    const studentMap = {};
    data.forEach(a => {
      if (!studentMap[a.studentId]) {
        studentMap[a.studentId] = {
          studentId: a.studentId,
          studentName: a.student.name,
          class: a.kelasName,
          hadir: 0, izin: 0, sakit: 0, alpha: 0
        };
      }
      const s = studentMap[a.studentId];
      if (a.status === 'hadir') s.hadir++;
      else if (a.status === 'izin') s.izin++;
      else if (a.status === 'sakit') s.sakit++;
      else if (a.status === 'alpha') s.alpha++;
    });

    // Hitung persentase per mapel jika filter mapel aktif
    // Jika tidak ada filter mapel, hitung total sesi per siswa
    const rekap = Object.values(studentMap).map(s => {
      const totalPerSiswa = s.hadir + s.izin + s.sakit + s.alpha;
      const persen = totalPerSiswa > 0 ? Math.round((s.hadir / totalPerSiswa) * 100) : 0;
      return {
        ...s,
        totalSesi: totalPerSiswa,
        persentase: persen
      };
    });

    // Sort by name
    rekap.sort((a, b) => a.studentName.localeCompare(b.studentName));

    res.json({
      success: true,
      totalSesiGuru: totalSesi,
      kelas,
      bulan: month,
      mapelId: mapel || 'semua',
      rekap
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Since this file uses ES modules, we export the app as default
export default app;
