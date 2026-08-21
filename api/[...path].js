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

// Since this file uses ES modules, we export the app as default
export default app;
