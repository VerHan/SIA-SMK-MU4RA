const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Endpoint untuk cek server jalan atau tidak
app.get('/', (req, res) => {
  res.send('Server SIA SMK MU4RA Berjalan!');
});

// Endpoint Anti-Sleep untuk Bot (cron-job.org)
app.get('/ping', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ message: 'Pong! Database is awake.' });
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// --- API ROUTES ---

// 1. Auth Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }
    res.json({ success: true, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
