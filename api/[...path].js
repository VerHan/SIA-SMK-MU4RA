import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { createMockApiRouter } from './mockStore.js';
import { createExtraPrismaRoutes } from './extraPrismaRoutes.js';
import { realtimeHub } from './modules/realtimeHub.js';
import {
  attachAuth,
  buildUserCapabilities,
  calculateHaversineMeters,
  clearSessionCookie,
  createCorsOptions,
  createRateLimiter,
  DEFAULT_SCHOOL_GEOFENCE,
  formatJakartaTimeHHMM,
  getClientIp,
  hashPasswordAsync,
  normalizeRole,
  requireAuth,
  requireRole,
  securityHeadersMiddleware,
  setAuthNoStoreHeaders,
  setSessionCookie,
  signToken,
  validateGeofenceConfig,
  validateGeofenceCoords,
  verifyPasswordAsync,
} from './authUtils.js';
import {
  buildMonthDateBounds,
  buildPaginationMeta,
  buildRolloverPlan,
  getAcademicYearDateRange,
  parsePaginationParams,
  suggestClassMapping,
} from './academicRolloverUtils.js';
import { createPrismaBackendModules } from './modules/prismaAdapters.js';
import { loginSchema, rolloverExecuteSchema, validateBody } from './validators/schemas.js';
dotenv.config();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// Singleton PrismaClient across warm serverless invocations & dev reloads
let prisma = null;
if (process.env.DATABASE_URL) {
  try {
    if (!globalThis.__siaPrisma) {
      globalThis.__siaPrisma = new PrismaClient();
    }
    prisma = globalThis.__siaPrisma;
  } catch (err) {
    console.warn('[AI Studio] PrismaClient unavailable — using in-memory mock store:', err.message);
    prisma = null;
  }
} else {
  console.warn('[AI Studio] DATABASE_URL not set — using in-memory mock store for /api');
}

// Short TTL in-memory caches for hot school-wide settings (invalidated immediately on writes)
const CONFIG_CACHE_TTL_MS = 60 * 1000;
let geofenceCache = { value: null, expiresAt: 0 };
let activeTahunAjarCache = { value: null, expiresAt: 0 };

function invalidateGeofenceCache() {
  geofenceCache = { value: null, expiresAt: 0 };
}

function invalidateActiveTahunAjarCache() {
  activeTahunAjarCache = { value: null, expiresAt: 0 };
}

async function getActiveTahunAjar() {
  if (!prisma) return null;
  const now = Date.now();
  if (activeTahunAjarCache.expiresAt > now) {
    return activeTahunAjarCache.value;
  }
  const active = await prisma.tahunAjar.findFirst({ where: { isActive: true } });
  activeTahunAjarCache = { value: active, expiresAt: now + CONFIG_CACHE_TTL_MS };
  return active;
}

app.use(securityHeadersMiddleware);
app.use(cors(createCorsOptions()));
app.use('/api/auth', (req, res, next) => {
  setAuthNoStoreHeaders(res);
  next();
});
app.use(attachAuth);

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

// Rate limiters (school Wi-Fi friendly: keyed per IP+username for login so 30+ teachers on 1 Wi-Fi never collide)
const loginAccountRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  keyGenerator: (req) => `${getClientIp(req)}:${String(req.body?.username || '').trim().toLowerCase()}`,
  message: 'Terlalu banyak percobaan login untuk akun ini. Silakan tunggu beberapa menit lalu coba lagi.',
});

const loginIpRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 80,
  keyGenerator: (req) => `login_ip:${getClientIp(req)}`,
  message: 'Terlalu banyak percobaan login dari jaringan ini. Silakan tunggu sebentar.',
});

const ppdbRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `ppdb:${getClientIp(req)}`,
  message: 'Terlalu banyak pengiriman formulir PPDB. Silakan coba lagi beberapa menit kemudian.',
});

const changePasswordRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `chpwd:${req.authUser?.id || getClientIp(req)}`,
  message: 'Terlalu banyak percobaan ubah password. Silakan tunggu beberapa menit lalu coba lagi.',
});

app.post('/api/auth/login', loginIpRateLimiter, loginAccountRateLimiter);
app.post('/api/auth/change-password', changePasswordRateLimiter);
app.post('/api/ppdb', ppdbRateLimiter);

// When no external PostgreSQL database is configured, serve all /api/* routes from in-memory store
let prismaModules = null;
if (!prisma) {
  app.use('/api', createMockApiRouter());
} else {
  prismaModules = createPrismaBackendModules(prisma, {
    getActiveTahunAjar,
    invalidateGeofenceCache,
  });
  app.use('/api', prismaModules.tokenVersionGuard.middleware);
  app.use('/api', createExtraPrismaRoutes(prisma, {
    getActiveTahunAjar,
    logAudit: prismaModules.logAudit,
    invalidateUserSession: prismaModules.tokenVersionGuard.invalidateUserSession,
    dispatchAttendanceNotifications: prismaModules.dispatchAttendanceNotifications,
  }));
  app.use('/api', prismaModules.auditRouter);
  app.use('/api', prismaModules.schoolConfigRouter);
  app.use('/api', prismaModules.operationsRouter);
  app.use('/api', realtimeHub.createRouter());
}

// Endpoint untuk cek server jalan atau tidak
app.get('/api/health', (req, res) => {
  res.json({ ok: true, mode: prisma ? 'prisma' : 'memory', message: 'Server SIA SMK MU4RA Berjalan!' });
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
app.all('/api/keep-alive/ping', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const querySecret = req.query.secret;
    const isGet = req.method === 'GET';
    const isVercelCron = (req.headers['user-agent'] || '').includes('vercel-cron');
    const pingType = isGet ? (req.query.pingType || 'AUTO_BOT') : (req.body?.pingType || 'AUTO_BOT');
    let triggeredBy = isVercelCron ? 'Vercel Cron (Daily)' : (isGet ? (req.query.triggeredBy || 'CRON_BOT') : (req.body?.triggeredBy || 'CRON_BOT'));
    let note = isVercelCron ? 'Automated daily ping from Vercel' : (isGet ? (req.query.note || 'Automated Keep-Alive Ping (GET)') : (req.body?.note || 'Automated Keep-Alive Ping (POST)'));
    
    // Verification for CRON bot if CRON_SECRET is configured
    if (pingType === 'AUTO_BOT' && process.env.CRON_SECRET) {
      const cronSecret = process.env.CRON_SECRET;
      const isBearerMatch = authHeader && authHeader === `Bearer ${cronSecret}`;
      const isQueryMatch = querySecret && querySecret === cronSecret;
      if (!isBearerMatch && !isQueryMatch && !isVercelCron) {
        return res.status(401).json({ success: false, error: 'Unauthorized CRON request: Token rahasia CRON_SECRET tidak cocok' });
      }
    }

    // Auto-create SystemHeartbeat table if it does not exist in Supabase
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SystemHeartbeat" (
          "id" TEXT PRIMARY KEY,
          "pingType" TEXT NOT NULL,
          "triggeredBy" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "note" TEXT
        );
      `);
    } catch (tableErr) {
      console.warn('Auto-create table SystemHeartbeat notice:', tableErr.message);
    }

    // Insert heartbeat record to wake up and query database
    let record;
    try {
      record = await prisma.systemHeartbeat.create({
        data: {
          pingType: pingType || 'MANUAL_ADMIN',
          triggeredBy: triggeredBy || 'Admin',
          note: note || 'Database ping'
        }
      });
    } catch (insertErr) {
      console.warn('Prisma create failed, falling back to raw insert:', insertErr.message);
      const pingId = 'hb_' + Date.now();
      await prisma.$executeRawUnsafe(`
        INSERT INTO "SystemHeartbeat" ("id", "pingType", "triggeredBy", "note", "createdAt")
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP);
      `, pingId, pingType || 'MANUAL_ADMIN', triggeredBy || 'Admin', note || 'Database ping');
      record = { id: pingId, pingType, triggeredBy, note, createdAt: new Date() };
    }

    // Auto-retention: prune heartbeat logs older than 30 days to prevent DB bloat
    const retentionCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await prisma.systemHeartbeat.deleteMany({
      where: { createdAt: { lt: retentionCutoff } },
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: '⚡ Supabase Database is awake and active!',
      timestamp: new Date().toISOString(),
      record
    });
  } catch (error) {
    console.error('Keep-Alive Ping Error:', error);
    // If table operations fail, execute simple query to still wake up Supabase!
    try {
      await prisma.$queryRaw`SELECT 1`;
      return res.status(200).json({
        success: true,
        message: '⚡ Supabase Database is awake via fallback ping (SELECT 1)!',
        timestamp: new Date().toISOString()
      });
    } catch (fallbackErr) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

app.get('/api/keep-alive/status', async (req, res) => {
  try {
    // Auto-create SystemHeartbeat table if it does not exist in Supabase
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SystemHeartbeat" (
          "id" TEXT PRIMARY KEY,
          "pingType" TEXT NOT NULL,
          "triggeredBy" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "note" TEXT
        );
      `);
    } catch (tableErr) {
      // Ignore if exists
    }

    let history = [];
    try {
      history = await prisma.systemHeartbeat.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
      });
    } catch (findErr) {
      // Fallback raw query if Prisma model mapping has mismatch
      const rows = await prisma.$queryRawUnsafe(`
        SELECT "id", "pingType", "triggeredBy", "note", "createdAt"
        FROM "SystemHeartbeat"
        ORDER BY "createdAt" DESC
        LIMIT 5;
      `);
      history = rows || [];
    }

    res.status(200).json({ success: true, history });
  } catch (error) {
    console.warn('Keep-alive status query fallback:', error.message);
    try {
      await prisma.$queryRaw`SELECT 1`;
      return res.status(200).json({
        success: true,
        history: [{
          id: 'ping-live',
          pingType: 'AUTO_BOT',
          triggeredBy: 'Database Connection Verified',
          note: 'Koneksi Supabase aktif & terhubung',
          createdAt: new Date().toISOString()
        }]
      });
    } catch (dbErr) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// --- API ROUTES ---

// 1. Auth Login (scrypt hashed password + seamless upgrade for legacy plaintext rows + signed JWT + HttpOnly cookie)
app.post('/api/auth/login', validateBody(loginSchema), async (req, res) => {
  try {
    const { username, password, rememberMe = true } = req.validatedBody;

    const cleanUsername = String(username).trim();
    let user = await prisma.user.findUnique({ where: { username: cleanUsername } });
    if (!user) {
      user = await prisma.user.findFirst({
        where: { username: { equals: cleanUsername, mode: 'insensitive' } },
      }).catch(() => null);
    }
    if (!user) {
      return res.status(401).json({ success: false, error: 'Username atau password salah' });
    }
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        error: 'Akun Anda sedang dinonaktifkan oleh administrator sekolah.',
      });
    }

    const { valid, needsRehash } = await verifyPasswordAsync(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Username atau password salah' });
    }

    // Automatically upgrade legacy plaintext password to scrypt hash in DB
    if (needsRehash) {
      const hashed = await hashPasswordAsync(password);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed },
      }).catch(() => {});
    }

    const homeroomClasses = user.teacherId
      ? await prisma.kelas.findMany({
          where: { teacherId: user.teacherId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }).catch(() => [])
      : [];

    const normalizedRole = normalizeRole(user.role);
    const isPiket = normalizedRole === 'guru' ? Boolean(user.isPiket) : false;
    const baseUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: normalizedRole,
      isPiket,
      isActive: user.isActive !== false,
      tokenVersion: Number(user.tokenVersion) || 1,
      teacherId: user.teacherId || null,
      studentId: user.studentId || null,
      homeroomClasses,
    };
    const safeUser = {
      ...baseUser,
      capabilities: buildUserCapabilities(baseUser, homeroomClasses),
    };
    const persistSession = rememberMe !== false;
    const token = signToken(safeUser, { rememberMe: persistSession });
    setSessionCookie(req, res, token, { rememberMe: persistSession });
    return res.json({ success: true, token, user: safeUser, rememberMe: persistSession });
  } catch (err) {
    console.error('API /api/auth/login error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Database error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  clearSessionCookie(req, res);
  return res.json({ success: true, message: 'Berhasil keluar dari sesi.' });
});

// Helper: load authoritative school geofence from LogAktivitas with 60s TTL cache
async function loadServerGeofence() {
  const now = Date.now();
  if (geofenceCache.value && geofenceCache.expiresAt > now) {
    return geofenceCache.value;
  }
  try {
    const latest = await prisma.logAktivitas.findFirst({
      where: { action: 'SCHOOL_GEOFENCE_CONFIG' },
      orderBy: { createdAt: 'desc' },
      select: { detail: true },
    });
    if (latest?.detail) {
      const parsed = JSON.parse(latest.detail);
      const valid = validateGeofenceConfig(parsed);
      if (valid) {
        geofenceCache = { value: valid, expiresAt: now + CONFIG_CACHE_TTL_MS };
        return valid;
      }
    }
  } catch {
    /* Fallback ke koordinat default sekolah */
  }
  const fallback = { ...DEFAULT_SCHOOL_GEOFENCE };
  geofenceCache = { value: fallback, expiresAt: now + CONFIG_CACHE_TTL_MS };
  return fallback;
}

// 1b. School Geofence Settings (Authoritative for all devices)
app.get('/api/settings/geofence', requireAuth, async (req, res) => {
  try {
    const geofence = await loadServerGeofence();
    res.json({ success: true, data: geofence });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/settings/geofence', requireRole('admin'), async (req, res) => {
  try {
    const valid = validateGeofenceConfig(req.body);
    if (!valid) {
      return res.status(400).json({
        success: false,
        error: 'Koordinat atau radius tidak valid (radius harus antara 20m – 2000m).',
      });
    }
    await prisma.logAktivitas.create({
      data: {
        userId: req.authUser?.id || null,
        userName: req.authUser?.name || 'Admin',
        action: 'SCHOOL_GEOFENCE_CONFIG',
        detail: JSON.stringify(valid),
      },
    });
    invalidateGeofenceCache();
    geofenceCache = { value: valid, expiresAt: Date.now() + CONFIG_CACHE_TTL_MS };
    res.json({ success: true, data: valid, message: 'Pengaturan Geofence sekolah berhasil disimpan untuk semua perangkat.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Guru Absensi (GET — protected for school staff/teachers/admin)
app.get('/api/guru/absen', requireRole('admin', 'guru', 'staff', 'kepsek'), async (req, res) => {
  const { date, teacherName, guruId, teacherId } = req.query; // YYYY-MM-DD
  try {
    let where = {};
    if (date) {
      where.tanggal = new Date(`${date}T00:00:00.000Z`);
    }
    const targetGuruId = teacherId || guruId;
    if (targetGuruId) {
      where.guruId = targetGuruId;
    } else if (teacherName) {
      where.guru = { name: teacherName };
    }

    const absensi = await prisma.absensiGuru.findMany({
      where,
      include: { guru: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      ...(date ? {} : { take: 1000 }),
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
      timeIn: a.jamMasuk ? String(a.jamMasuk).replace('.', ':') : null,
      jamMasuk: a.jamMasuk ? String(a.jamMasuk).replace('.', ':') : null,
      timeOut: a.jamPulang ? String(a.jamPulang).replace('.', ':') : null,
      jamPulang: a.jamPulang ? String(a.jamPulang).replace('.', ':') : null,
      source: a.sumber,
      sumber: a.sumber,
      distanceMeters: a.jarakMeter,
      jarakMeter: a.jarakMeter,
      isWithinGeofence: a.status !== 'luar_radius',
      keterangan: a.keterangan || ''
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Guru Absensi (POST GPS — server-side geofence & authenticated teacher identity)
app.post('/api/guru/absen', requireRole('admin', 'guru', 'staff', 'kepsek'), async (req, res) => {
  const { teacherName, teacherId, guruId, type, coords } = req.body || {};
  try {
    if (type !== 'in' && type !== 'out') {
      return res.status(400).json({ success: false, message: 'Tipe absensi tidak valid.' });
    }

    // 1. Validasi koordinat & hitung jarak langsung di server (MUTLAK di dalam area sekolah)
    const validCoords = validateGeofenceCoords(coords);
    if (!validCoords) {
      return res.status(400).json({
        success: false,
        message: 'Koordinat GPS tidak valid. Silakan deteksi lokasi Anda di area sekolah terlebih dahulu.',
      });
    }

    const schoolGeofence = await loadServerGeofence();
    const serverDistance = calculateHaversineMeters(
      validCoords.latitude,
      validCoords.longitude,
      schoolGeofence.latitude,
      schoolGeofence.longitude
    );

    if (serverDistance > schoolGeofence.radiusMeters) {
      return res.status(403).json({
        success: false,
        message: `Absen ditolak! Anda berada ${serverDistance}m dari sekolah (batas maksimal ${schoolGeofence.radiusMeters}m). Absensi mutlak harus dilakukan di dalam area sekolah.`,
        distanceMeters: serverDistance,
        radiusMeters: schoolGeofence.radiusMeters,
      });
    }

    // 2. Kunci identitas guru berdasarkan akun yang login (hanya Admin yang boleh memilih guruId lain)
    const isAdmin = req.authUser?.role === 'admin';
    const targetGuruId = isAdmin
      ? (teacherId || guruId || req.authUser?.teacherId)
      : req.authUser?.teacherId;
    const targetName = isAdmin
      ? (teacherName || req.authUser?.name)
      : req.authUser?.name;

    let guru = null;
    if (targetGuruId) {
      guru = await prisma.guru.findUnique({ where: { id: targetGuruId } });
    }
    if (!guru && targetName) {
      guru = await prisma.guru.findFirst({ where: { name: targetName } });
    }
    if (!guru) return res.status(404).json({ success: false, message: 'Data profil guru tidak ditemukan untuk akun ini.' });

    const now = new Date();
    const jktDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
    const today = new Date(`${jktDateStr}T00:00:00.000Z`);
    const currentTime = formatJakartaTimeHHMM(now);

    const buildReturnRecord = (a) => ({
      id: a.id,
      teacherId: guru.id,
      guruId: guru.id,
      teacherName: guru.name,
      guruName: guru.name,
      date: jktDateStr,
      tanggal: jktDateStr,
      status: a.status,
      timeIn: a.jamMasuk ? String(a.jamMasuk).replace('.', ':') : null,
      jamMasuk: a.jamMasuk ? String(a.jamMasuk).replace('.', ':') : null,
      timeOut: a.jamPulang ? String(a.jamPulang).replace('.', ':') : null,
      jamPulang: a.jamPulang ? String(a.jamPulang).replace('.', ':') : null,
      distanceMeters: a.jarakMeter,
      jarakMeter: a.jarakMeter,
      isWithinGeofence: true,
      source: a.sumber,
      sumber: a.sumber,
    });

    const activeTa = await getActiveTahunAjar();
    const recordedByUserId = req.authUser?.id || null;

    let absensi = await prisma.absensiGuru.findUnique({
      where: { guruId_tanggal: { guruId: guru.id, tanggal: today } }
    });

    if (type === 'in') {
      if (absensi && absensi.jamMasuk) {
        return res.json({
          success: false,
          message: 'Anda sudah absen masuk hari ini',
          record: buildReturnRecord(absensi),
        });
      }
      
      absensi = await prisma.absensiGuru.upsert({
        where: { guruId_tanggal: { guruId: guru.id, tanggal: today } },
        update: {
          jamMasuk: currentTime,
          sumber: 'gps',
          jarakMeter: serverDistance,
          status: 'hadir',
          tahunAjarId: activeTa?.id || null,
          recordedByUserId,
        },
        create: {
          guruId: guru.id,
          tahunAjarId: activeTa?.id || null,
          recordedByUserId,
          tanggal: today,
          status: 'hadir',
          sumber: 'gps',
          jamMasuk: currentTime,
          jarakMeter: serverDistance
        }
      });

      return res.json({ success: true, message: `Berhasil Absen Masuk pukul ${currentTime} WIB!`, record: buildReturnRecord(absensi) });
    } else if (type === 'out') {
      if (!absensi || !absensi.jamMasuk) return res.json({ success: false, message: 'Anda belum absen masuk' });
      if (absensi.jamPulang) {
        return res.json({
          success: false,
          message: 'Anda sudah absen pulang hari ini',
          record: buildReturnRecord(absensi),
        });
      }
      
      absensi = await prisma.absensiGuru.update({
        where: { id: absensi.id },
        data: { jamPulang: currentTime, jarakMeter: serverDistance, recordedByUserId }
      });

      return res.json({ success: true, message: `Berhasil Absen Pulang pukul ${currentTime} WIB!`, record: buildReturnRecord(absensi) });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3b. Guru Absensi (POST Manual Admin)
app.post('/api/guru/absen/manual', requireRole('admin', 'staff'), async (req, res) => {
  const { guruId, tanggal, status, jamMasuk, jamPulang, keterangan } = req.body;
  try {
    const guru = await prisma.guru.findUnique({ where: { id: guruId } });
    if (!guru) return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });

    const targetDate = new Date(`${tanggal}T00:00:00.000Z`);
    const activeTa = await getActiveTahunAjar();
    const recordedByUserId = req.authUser?.id || null;

    const existing = await prisma.absensiGuru.findUnique({
      where: { guruId_tanggal: { guruId, tanggal: targetDate } }
    });

    await prisma.absensiGuru.upsert({
      where: { guruId_tanggal: { guruId, tanggal: targetDate } },
      update: {
        status: status || 'hadir',
        sumber: 'manual',
        jamMasuk: jamMasuk || existing?.jamMasuk || null,
        jamPulang: jamPulang || existing?.jamPulang || null,
        keterangan: keterangan || '',
        tahunAjarId: activeTa?.id || existing?.tahunAjarId || null,
        recordedByUserId,
      },
      create: {
        guruId,
        tahunAjarId: activeTa?.id || null,
        recordedByUserId,
        tanggal: targetDate,
        status: status || 'hadir',
        sumber: 'manual',
        jamMasuk: jamMasuk || null,
        jamPulang: jamPulang || null,
        keterangan: keterangan || ''
      }
    });

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

app.post('/api/mapel/kelompok', requireRole('admin'), async (req, res) => {
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

app.put('/api/mapel/kelompok/:oldName', requireRole('admin'), async (req, res) => {
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

app.delete('/api/mapel/kelompok/:name', requireRole('admin'), async (req, res) => {
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

app.post('/api/mapel', requireRole('admin'), async (req, res) => {
  try {
    const { kode, nama, kelompok } = req.body;
    if (!kode || !nama) {
      return res.status(400).json({ success: false, error: 'Kode dan nama mata pelajaran wajib diisi.' });
    }
    const newMapel = await prisma.mataPelajaran.create({
      data: {
        kode: String(kode).trim(),
        nama: String(nama).trim(),
        kelompok: kelompok ? String(kelompok).trim() : 'Umum',
      }
    });
    res.json({ success: true, data: newMapel, message: 'Mata pelajaran berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/mapel/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const { kode, nama, kelompok } = req.body;
    const updateData = {};
    if (kode !== undefined) updateData.kode = String(kode).trim();
    if (nama !== undefined) updateData.nama = String(nama).trim();
    if (kelompok !== undefined) updateData.kelompok = String(kelompok).trim();
    await prisma.mataPelajaran.update({ where: { id }, data: updateData });
    res.json({ success: true, message: 'Mata pelajaran berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/mapel/:id', requireRole('admin'), async (req, res) => {
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

app.post('/api/guru', requireRole('admin'), async (req, res) => {
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

app.put('/api/guru/:id', requireRole('admin'), async (req, res) => {
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

app.delete('/api/guru/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const [absensiGuruCount, absensiMapelCount] = await Promise.all([
      prisma.absensiGuru.count({ where: { guruId: id } }),
      prisma.absensiMapel.count({ where: { guruId: id } }),
    ]);
    if (absensiGuruCount > 0 || absensiMapelCount > 0) {
      return res.status(409).json({
        success: false,
        error: 'Guru ini memiliki riwayat absensi sehingga tidak dapat dihapus permanen demi integritas data.',
      });
    }
    await prisma.guru.delete({ where: { id } });
    res.json({ success: true, message: 'Guru berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 6. SISWA (CRUD + STATUS & SAFE ARCHIVE)
// ==========================================

const VALID_STUDENT_STATUSES = new Set(['aktif', 'lulus', 'pindah', 'nonaktif']);

app.get('/api/siswa', requireAuth, async (req, res) => {
  try {
    const { kelas, status, includeInactive, tahunAjarId, grade, search } = req.query;
    const { isPaginated, page, limit, skip } = parsePaginationParams(req.query, { defaultLimit: 25, maxLimit: 200 });
    const whereCondition = {};

    // Determine academic year filter for RiwayatKelas
    const useExplicitYear = Boolean(tahunAjarId && tahunAjarId !== 'all');
    const riwayatYearFilter = useExplicitYear
      ? { tahunAjarId: String(tahunAjarId) }
      : { tahunAjar: { isActive: true } };

    if (req.authUser.role === 'wali_murid') {
      whereCondition.id = req.authUser.studentId || '__no_linked_student__';
    } else {
      if (status && status !== 'all' && VALID_STUDENT_STATUSES.has(status)) {
        whereCondition.status = status;
      } else if (includeInactive !== 'true' && status !== 'all') {
        whereCondition.status = 'aktif';
      }

      const riwayatMatch = { ...riwayatYearFilter };
      let requireRiwayat = false;

      if (kelas && kelas !== 'Semua') {
        riwayatMatch.kelas = { ...(riwayatMatch.kelas || {}), name: String(kelas) };
        requireRiwayat = true;
      }
      if (grade && grade !== 'Semua' && ['X', 'XI', 'XII'].includes(String(grade).toUpperCase())) {
        riwayatMatch.kelas = { ...(riwayatMatch.kelas || {}), grade: String(grade).toUpperCase() };
        requireRiwayat = true;
      }
      if (useExplicitYear && status !== 'lulus' && status !== 'all') {
        requireRiwayat = true;
      }
      if (requireRiwayat) {
        whereCondition.riwayatKelas = { some: riwayatMatch };
      }

      const cleanSearch = String(search || '').trim();
      if (cleanSearch) {
        whereCondition.OR = [
          { name: { contains: cleanSearch, mode: 'insensitive' } },
          { nomor: { contains: cleanSearch, mode: 'insensitive' } },
        ];
      }
    }

    const mapStudentRow = (s) => {
      const targetRiwayat = s.riwayatKelas?.[0];
      const kelasName = targetRiwayat?.kelas?.name || '-';
      return {
        id: s.id,
        nomor: s.nomor || '-',
        nis: s.nomor || '-',
        name: s.name,
        class: kelasName,
        kelasId: targetRiwayat?.kelasId || null,
        grade: targetRiwayat?.kelas?.grade || null,
        gender: s.gender,
        status: s.status || 'aktif',
        phone: s.phone || '-',
        phone_parent: s.phone_parent || '-',
        pekerjaan_ortu: s.pekerjaan_ortu || '-',
        alamat: s.alamat || '-',
        sekolah_asal: s.sekolah_asal || '-',
      };
    };

    const riwayatInclude = {
      include: { kelas: true, tahunAjar: true },
      ...(tahunAjarId === 'all' ? { orderBy: { tahunAjar: { startDate: 'desc' } }, take: 1 } : { where: riwayatYearFilter, take: 1 }),
    };

    if (isPaginated) {
      const baseCountsWhere = {};
      if (req.authUser.role === 'wali_murid') {
        baseCountsWhere.id = req.authUser.studentId || '__no_linked_student__';
      }

      const [total, siswaList, statusCountsRaw] = await Promise.all([
        prisma.siswa.count({ where: whereCondition }),
        prisma.siswa.findMany({
          where: whereCondition,
          include: { riwayatKelas: riwayatInclude },
          orderBy: { name: 'asc' },
          skip,
          take: limit,
        }),
        prisma.siswa.groupBy({
          by: ['status'],
          where: baseCountsWhere,
          _count: { _all: true },
        }),
      ]);

      const counts = { aktif: 0, lulus: 0, pindah: 0, nonaktif: 0, total: 0 };
      for (const row of statusCountsRaw) {
        const key = row.status || 'aktif';
        if (counts[key] !== undefined) counts[key] = row._count._all;
        counts.total += row._count._all;
      }

      return res.json({
        success: true,
        items: siswaList.map(mapStudentRow),
        pagination: buildPaginationMeta(total, page, limit),
        counts,
        tahunAjarId: useExplicitYear ? String(tahunAjarId) : null,
      });
    }

    const siswaList = await prisma.siswa.findMany({
      where: whereCondition,
      include: { riwayatKelas: riwayatInclude },
      orderBy: { name: 'asc' },
    });

    res.json(siswaList.map(mapStudentRow));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/siswa', requireRole('admin', 'staff'), async (req, res) => {
  try {
    const { nomor, nis, name, gender, status, phone, phone_parent, pekerjaan_ortu, alamat, sekolah_asal, class: kelasName } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Nama Siswa wajib diisi' });
    }

    const finalNomor = (nomor || nis) && String(nomor || nis).trim() ? String(nomor || nis).trim() : null;
    const cleanStatus = VALID_STUDENT_STATUSES.has(status) ? status : 'aktif';

    const siswa = await prisma.siswa.create({
      data: {
        nomor: finalNomor,
        name: name.trim(),
        gender: gender || 'L',
        status: cleanStatus,
        phone: phone ? String(phone).trim() : null,
        phone_parent: phone_parent ? String(phone_parent).trim() : null,
        pekerjaan_ortu: pekerjaan_ortu ? String(pekerjaan_ortu).trim() : null,
        alamat: alamat ? String(alamat).trim() : null,
        sekolah_asal: sekolah_asal ? String(sekolah_asal).trim() : null
      }
    });

    // If class is provided, assign to active tahun ajar
    if (kelasName) {
      const [kelas, activeTa] = await Promise.all([
        prisma.kelas.findUnique({ where: { name: kelasName }, select: { id: true } }),
        getActiveTahunAjar(),
      ]);
      if (kelas && activeTa) {
        await prisma.riwayatKelas.create({
          data: { siswaId: siswa.id, kelasId: kelas.id, tahunAjarId: activeTa.id }
        }).catch(() => {});
      }
    }

    res.json({ success: true, student: { ...siswa, class: kelasName || '-' }, message: 'Siswa berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/siswa/:id', requireRole('admin', 'staff'), async (req, res) => {
  const { id } = req.params;
  try {
    const { nomor, nis, name, gender, status, phone, phone_parent, pekerjaan_ortu, alamat, sekolah_asal, class: kelasName } = req.body;
    const dataToUpdate = {};
    if (name !== undefined && String(name).trim()) dataToUpdate.name = String(name).trim();
    if (gender !== undefined) dataToUpdate.gender = gender || 'L';
    if (status !== undefined) {
      if (!VALID_STUDENT_STATUSES.has(status)) {
        return res.status(400).json({ success: false, error: 'Status siswa tidak valid (aktif, lulus, pindah, nonaktif).' });
      }
      dataToUpdate.status = status;
    }
    if (phone !== undefined) dataToUpdate.phone = phone ? String(phone).trim() : null;
    if (phone_parent !== undefined) dataToUpdate.phone_parent = phone_parent ? String(phone_parent).trim() : null;
    if (pekerjaan_ortu !== undefined) dataToUpdate.pekerjaan_ortu = pekerjaan_ortu ? String(pekerjaan_ortu).trim() : null;
    if (alamat !== undefined) dataToUpdate.alamat = alamat ? String(alamat).trim() : null;
    if (sekolah_asal !== undefined) dataToUpdate.sekolah_asal = sekolah_asal ? String(sekolah_asal).trim() : null;
    if (nomor !== undefined || nis !== undefined) {
      const rawNo = nomor !== undefined ? nomor : nis;
      dataToUpdate.nomor = rawNo && String(rawNo).trim() && String(rawNo).trim() !== '-' ? String(rawNo).trim() : null;
    }

    await prisma.siswa.update({
      where: { id },
      data: dataToUpdate
    });

    // Update class assignment on active TahunAjar if provided
    if (kelasName && kelasName !== '-') {
      const [kelas, activeTa] = await Promise.all([
        prisma.kelas.findUnique({ where: { name: kelasName }, select: { id: true } }),
        getActiveTahunAjar(),
      ]);
      if (kelas && activeTa) {
        await prisma.riwayatKelas.upsert({
          where: { siswaId_tahunAjarId: { siswaId: id, tahunAjarId: activeTa.id } },
          update: { kelasId: kelas.id },
          create: { siswaId: id, kelasId: kelas.id, tahunAjarId: activeTa.id },
        });
      }
    }

    res.json({ success: true, message: 'Data siswa berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/siswa/:id', requireRole('admin', 'staff'), async (req, res) => {
  const { id } = req.params;
  const force = req.query.force === 'true';
  try {
    const [piketCount, mapelCount] = await Promise.all([
      prisma.absensi.count({ where: { studentId: id } }),
      prisma.absensiMapel.count({ where: { studentId: id } }),
    ]);

    if (!force && (piketCount > 0 || mapelCount > 0)) {
      await prisma.siswa.update({
        where: { id },
        data: { status: 'nonaktif' },
      });
      return res.json({
        success: true,
        archived: true,
        message: 'Siswa memiliki riwayat absensi, status diubah menjadi Nonaktif agar data kehadiran tetap aman.',
      });
    }

    await prisma.siswa.delete({ where: { id } });
    res.json({ success: true, archived: false, message: 'Siswa berhasil dihapus permanen.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/siswa/import', requireRole('admin', 'staff'), async (req, res) => {
  try {
    const { data: dataArray } = req.body;
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      return res.json({ success: false, error: 'Data kosong atau format tidak valid.' });
    }
    if (dataArray.length > 1000) {
      return res.status(400).json({ success: false, error: 'Maksimal 1.000 data siswa per sekali impor.' });
    }

    const [activeTa, existingStudents, allClasses] = await Promise.all([
      getActiveTahunAjar(),
      prisma.siswa.findMany({ where: { nomor: { not: null } }, select: { nomor: true } }),
      prisma.kelas.findMany({ select: { id: true, name: true } }),
    ]);

    const existingNomorSet = new Set(existingStudents.map(s => s.nomor).filter(Boolean));
    const classIdByName = new Map(allClasses.map(c => [c.name, c.id]));

    const siswaRows = [];
    const riwayatRows = [];

    for (const item of dataArray) {
      const cleanName = item?.name ? String(item.name).trim() : '';
      if (!cleanName) continue;

      const rawNomor = item.nomor || item.nis;
      const itemNomor = rawNomor && String(rawNomor).trim() && String(rawNomor).trim() !== '-'
        ? String(rawNomor).trim()
        : null;

      if (itemNomor) {
        if (existingNomorSet.has(itemNomor)) continue;
        existingNomorSet.add(itemNomor);
      }

      const id = crypto.randomUUID();
      siswaRows.push({
        id,
        nomor: itemNomor,
        name: cleanName,
        gender: item.gender === 'P' ? 'P' : 'L',
        status: 'aktif',
        phone: item.phone ? String(item.phone).trim() : null,
        phone_parent: item.phone_parent ? String(item.phone_parent).trim() : null,
        pekerjaan_ortu: item.pekerjaan_ortu ? String(item.pekerjaan_ortu).trim() : null,
        alamat: item.alamat ? String(item.alamat).trim() : null,
        sekolah_asal: item.sekolah_asal ? String(item.sekolah_asal).trim() : null,
      });

      if (item.class && activeTa) {
        const kelasId = classIdByName.get(String(item.class).trim());
        if (kelasId) {
          riwayatRows.push({
            siswaId: id,
            kelasId,
            tahunAjarId: activeTa.id,
          });
        }
      }
    }

    if (siswaRows.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.siswa.createMany({ data: siswaRows, skipDuplicates: true });
        if (riwayatRows.length > 0) {
          await tx.riwayatKelas.createMany({ data: riwayatRows, skipDuplicates: true });
        }
      }, { timeout: 15000 });
    }

    res.json({ success: true, importedCount: siswaRows.length, message: `${siswaRows.length} data siswa berhasil diimpor.` });
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
        _count: {
          select: {
            riwayatKelas: {
              where: { tahunAjar: { isActive: true } },
            },
          },
        },
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

app.post('/api/kelas', requireRole('admin'), async (req, res) => {
  try {
    const { name, grade, major, teacherId } = req.body;
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      return res.status(400).json({ success: false, error: 'Nama kelas wajib diisi' });
    }

    // Check duplicate name
    const existing = await prisma.kelas.findUnique({ where: { name: trimmedName } }).catch(() => null);
    if (existing) {
      return res.status(400).json({ success: false, error: `Kelas "${trimmedName}" sudah ada.` });
    }

    // Auto-detect major if not specified
    let finalMajor = (major || '').trim();
    if (!finalMajor) {
      const upper = trimmedName.toUpperCase();
      if (upper.includes('TKJ')) finalMajor = 'TKJ';
      else if (upper.includes('RPL')) finalMajor = 'RPL';
      else if (upper.includes('TBSM') || upper.includes('TSM')) finalMajor = 'TBSM';
      else if (upper.includes('AKL') || upper.includes('AK')) finalMajor = 'AKL';
      else if (upper.includes('DKV')) finalMajor = 'DKV';
      else finalMajor = 'Umum';
    }

    // Validate teacherId against DB to avoid foreign key errors
    let validTeacherId = null;
    if (teacherId && typeof teacherId === 'string' && teacherId.trim() !== '') {
      const teacher = await prisma.guru.findUnique({ where: { id: teacherId.trim() } }).catch(() => null);
      if (teacher) validTeacherId = teacher.id;
    }

    const kelas = await prisma.kelas.create({
      data: {
        name: trimmedName,
        grade: (grade || 'X').trim(),
        major: finalMajor,
        teacherId: validTeacherId
      },
      include: {
        waliKelas: true,
        _count: { select: { riwayatKelas: true } }
      }
    });

    res.json({
      success: true,
      data: {
        id: kelas.id,
        name: kelas.name,
        grade: kelas.grade,
        major: kelas.major,
        totalStudents: kelas._count?.riwayatKelas || 0,
        teacherId: kelas.teacherId,
        teacherName: kelas.waliKelas?.name || '-'
      },
      message: 'Kelas berhasil ditambahkan'
    });
  } catch (err) {
    console.error('Error adding class:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/kelas/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const { name, grade, major, teacherId } = req.body;
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      return res.status(400).json({ success: false, error: 'Nama kelas wajib diisi' });
    }

    // Auto-detect major if not specified
    let finalMajor = (major || '').trim();
    if (!finalMajor) {
      const upper = trimmedName.toUpperCase();
      if (upper.includes('TKJ')) finalMajor = 'TKJ';
      else if (upper.includes('RPL')) finalMajor = 'RPL';
      else if (upper.includes('TBSM') || upper.includes('TSM')) finalMajor = 'TBSM';
      else if (upper.includes('AKL') || upper.includes('AK')) finalMajor = 'AKL';
      else if (upper.includes('DKV')) finalMajor = 'DKV';
      else finalMajor = 'Umum';
    }

    let validTeacherId = null;
    if (teacherId && typeof teacherId === 'string' && teacherId.trim() !== '') {
      const teacher = await prisma.guru.findUnique({ where: { id: teacherId.trim() } }).catch(() => null);
      if (teacher) validTeacherId = teacher.id;
    }

    const oldKelas = await prisma.kelas.findUnique({ where: { id } }).catch(() => null);

    const updated = await prisma.kelas.update({
      where: { id },
      data: {
        name: trimmedName,
        grade: (grade || 'X').trim(),
        major: finalMajor,
        teacherId: validTeacherId
      },
      include: {
        waliKelas: true,
        _count: { select: { riwayatKelas: true } }
      }
    });

    // Keep className & kelasId links in Jadwal & AbsensiMapel synchronized on rename
    if (oldKelas && oldKelas.name !== trimmedName) {
      await Promise.all([
        prisma.jadwal.updateMany({
          where: { OR: [{ kelasId: id }, { className: oldKelas.name }] },
          data: { kelasId: id, className: trimmedName }
        }),
        prisma.absensiMapel.updateMany({
          where: { OR: [{ kelasId: id }, { kelasName: oldKelas.name }] },
          data: { kelasId: id, kelasName: trimmedName }
        }),
      ]).catch(() => {});
    }

    res.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        grade: updated.grade,
        major: updated.major,
        totalStudents: updated._count?.riwayatKelas || 0,
        teacherId: updated.teacherId,
        teacherName: updated.waliKelas?.name || '-'
      },
      message: 'Kelas berhasil diperbarui'
    });
  } catch (err) {
    console.error('Error updating class:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/kelas/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const enrolledCount = await prisma.riwayatKelas.count({ where: { kelasId: id } });
    if (enrolledCount > 0) {
      return res.status(409).json({
        success: false,
        error: 'Kelas masih memiliki riwayat penempatan siswa sehingga tidak dapat dihapus. Pindahkan siswa terlebih dahulu.',
      });
    }
    await prisma.kelas.delete({ where: { id } });
    res.json({ success: true, message: 'Kelas berhasil dihapus' });
  } catch (err) {
    console.error('Error deleting class:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 7.1 JURUSAN / PROGRAM KEAHLIAN (CRUD)
// ==========================================

app.get('/api/jurusan', async (req, res) => {
  try {
    let list = await prisma.jurusan.findMany({ orderBy: { kode: 'asc' } });
    if (list.length === 0) {
      const defaults = [
        { kode: 'TKJ', nama: 'Teknik Komputer & Jaringan', color: '#3B82F6', deskripsi: 'Jaringan komputer, server, dan infrastruktur IT' },
        { kode: 'RPL', nama: 'Rekayasa Perangkat Lunak', color: '#10B981', deskripsi: 'Pemrograman software, aplikasi web & mobile' },
        { kode: 'TBSM', nama: 'Teknik Bisnis Sepeda Motor', color: '#F59E0B', deskripsi: 'Teknik mesin, otomotif, dan bengkel sepeda motor' },
        { kode: 'AKL', nama: 'Akuntansi & Keuangan Lembaga', color: '#8B5CF6', deskripsi: 'Akuntansi, perpajakan, dan keuangan lembaga' },
      ];
      for (const d of defaults) {
        await prisma.jurusan.create({ data: d }).catch(() => null);
      }
      list = await prisma.jurusan.findMany({ orderBy: { kode: 'asc' } });
    }
    res.json(list);
  } catch (err) {
    console.error('Error getting jurusan:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jurusan', requireRole('admin'), async (req, res) => {
  try {
    const { kode, nama, deskripsi, color } = req.body;
    const cleanKode = (kode || '').trim().toUpperCase();
    const cleanNama = (nama || '').trim();
    if (!cleanKode || !cleanNama) {
      return res.status(400).json({ success: false, error: 'Kode dan Nama Jurusan wajib diisi' });
    }
    const existing = await prisma.jurusan.findUnique({ where: { kode: cleanKode } }).catch(() => null);
    if (existing) {
      return res.status(400).json({ success: false, error: `Jurusan dengan kode "${cleanKode}" sudah ada.` });
    }
    const created = await prisma.jurusan.create({
      data: {
        kode: cleanKode,
        nama: cleanNama,
        deskripsi: deskripsi ? deskripsi.trim() : null,
        color: color || '#3B82F6'
      }
    });
    res.json({ success: true, data: created, message: 'Jurusan berhasil ditambahkan' });
  } catch (err) {
    console.error('Error adding jurusan:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/jurusan/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const { kode, nama, deskripsi, color } = req.body;
    const cleanKode = (kode || '').trim().toUpperCase();
    const cleanNama = (nama || '').trim();
    if (!cleanKode || !cleanNama) {
      return res.status(400).json({ success: false, error: 'Kode dan Nama Jurusan wajib diisi' });
    }

    const existing = await prisma.jurusan.findUnique({ where: { kode: cleanKode } }).catch(() => null);
    if (existing && existing.id !== id) {
      return res.status(400).json({ success: false, error: `Kode jurusan "${cleanKode}" sudah digunakan oleh jurusan lain.` });
    }

    const old = await prisma.jurusan.findUnique({ where: { id } }).catch(() => null);

    const updated = await prisma.jurusan.update({
      where: { id },
      data: {
        kode: cleanKode,
        nama: cleanNama,
        deskripsi: deskripsi ? deskripsi.trim() : null,
        color: color || '#3B82F6'
      }
    });

    if (old && old.kode !== cleanKode) {
      await prisma.kelas.updateMany({
        where: { major: old.kode },
        data: { major: cleanKode }
      }).catch(() => null);
    }

    res.json({ success: true, data: updated, message: 'Jurusan berhasil diperbarui' });
  } catch (err) {
    console.error('Error updating jurusan:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/jurusan/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const target = await prisma.jurusan.findUnique({ where: { id } });
    if (!target) {
      return res.status(404).json({ success: false, error: 'Jurusan tidak ditemukan' });
    }

    const classCount = await prisma.kelas.count({ where: { major: target.kode } });
    if (classCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Jurusan "${target.kode}" tidak dapat dihapus karena masih digunakan oleh ${classCount} kelas.`
      });
    }

    await prisma.jurusan.delete({ where: { id } });
    res.json({ success: true, message: 'Jurusan berhasil dihapus' });
  } catch (err) {
    console.error('Error deleting jurusan:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 8. TAHUN AJAR (CRUD)
// ==========================================

app.get('/api/tahun-ajar', async (req, res) => {
  try {
    const data = await prisma.tahunAjar.findMany({
      orderBy: [
        { isActive: 'desc' },
        { startDate: 'desc' }
      ]
    });
    res.json(data.map(ta => ({
      ...ta,
      startDate: ta.startDate ? (typeof ta.startDate === 'string' ? ta.startDate.split('T')[0] : ta.startDate.toISOString().split('T')[0]) : '',
      endDate: ta.endDate ? (typeof ta.endDate === 'string' ? ta.endDate.split('T')[0] : ta.endDate.toISOString().split('T')[0]) : ''
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET — Pratinjau Tutup Semester & Kenaikan Kelas Massal (X -> XI -> XII -> Lulus)
app.get('/api/tahun-ajar/rollover-preview', requireRole('admin'), async (req, res) => {
  try {
    const { sourceYearId, targetYearId, mode = 'promote' } = req.query;
    const cleanMode = mode === 'semester' ? 'semester' : 'promote';

    const [allYears, allClasses] = await Promise.all([
      prisma.tahunAjar.findMany({ orderBy: [{ isActive: 'desc' }, { startDate: 'desc' }] }),
      prisma.kelas.findMany({ orderBy: [{ grade: 'asc' }, { name: 'asc' }] }),
    ]);

    const sourceYear = sourceYearId
      ? allYears.find(y => y.id === String(sourceYearId))
      : (allYears.find(y => y.isActive) || allYears[0]);
    if (!sourceYear) {
      return res.status(404).json({ success: false, error: 'Tahun ajar sumber tidak ditemukan.' });
    }

    const targetYear = targetYearId ? allYears.find(y => y.id === String(targetYearId)) : null;

    const [sourceEnrollments, targetEnrollments] = await Promise.all([
      prisma.riwayatKelas.findMany({
        where: {
          tahunAjarId: sourceYear.id,
          siswa: { status: 'aktif' },
        },
        include: {
          siswa: { select: { id: true, name: true, nomor: true, gender: true, status: true } },
          kelas: { select: { id: true, name: true, grade: true, major: true } },
        },
        orderBy: { siswa: { name: 'asc' } },
      }),
      targetYear
        ? prisma.riwayatKelas.findMany({
            where: { tahunAjarId: targetYear.id },
            select: { siswaId: true, kelasId: true },
          })
        : Promise.resolve([]),
    ]);

    const alreadyEnrolledSet = new Set(targetEnrollments.map(e => e.siswaId));
    const groupsMap = new Map();

    for (const enr of sourceEnrollments) {
      if (!enr.kelas || !enr.siswa) continue;
      if (!groupsMap.has(enr.kelas.id)) {
        groupsMap.set(enr.kelas.id, {
          id: enr.kelas.id,
          name: enr.kelas.name,
          grade: enr.kelas.grade,
          major: enr.kelas.major,
          studentCount: 0,
          students: [],
        });
      }
      const grp = groupsMap.get(enr.kelas.id);
      grp.studentCount++;
      grp.students.push({
        studentId: enr.siswa.id,
        studentName: enr.siswa.name,
        nis: enr.siswa.nomor || '-',
        gender: enr.siswa.gender || 'L',
        alreadyEnrolledInTarget: alreadyEnrolledSet.has(enr.siswa.id),
      });
    }

    const groups = Array.from(groupsMap.values()).sort((a, b) =>
      String(a.grade || '').localeCompare(String(b.grade || '')) || a.name.localeCompare(b.name)
    );
    const mappings = suggestClassMapping(groups, allClasses, cleanMode);

    const flatEnrollments = sourceEnrollments.map(e => ({
      studentId: e.siswaId,
      studentName: e.siswa?.name || '-',
      classId: e.kelasId,
      className: e.kelas?.name || '-',
    }));
    const previewPlan = buildRolloverPlan({
      enrollments: flatEnrollments,
      mappings,
      alreadyEnrolledStudentIds: Array.from(alreadyEnrolledSet),
      validClassIds: allClasses.map(c => c.id),
    });

    res.json({
      success: true,
      mode: cleanMode,
      sourceYear: {
        id: sourceYear.id,
        nama: sourceYear.nama,
        semester: sourceYear.semester,
        isActive: sourceYear.isActive,
      },
      targetYear: targetYear
        ? { id: targetYear.id, nama: targetYear.nama, semester: targetYear.semester, isActive: targetYear.isActive }
        : null,
      classes: allClasses.map(c => ({ id: c.id, name: c.name, grade: c.grade, major: c.major })),
      mappings,
      groups,
      summary: previewPlan.summary,
      missingMappings: mappings.filter(m => m.action === 'promote' && !m.targetClassId).map(m => m.sourceClassName),
    });
  } catch (err) {
    console.error('GET /api/tahun-ajar/rollover-preview error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST — Eksekusi Atomik Tutup Semester & Kenaikan Kelas Massal
app.post('/api/tahun-ajar/rollover', requireRole('admin'), async (req, res) => {
  try {
    const {
      sourceYearId,
      targetYearId,
      mode = 'promote',
      mappings = [],
      retainStudentIds = [],
      excludedStudentIds = [],
      activateTargetYear = true,
    } = req.body || {};

    if (!sourceYearId || !targetYearId) {
      return res.status(400).json({ success: false, error: 'Tahun ajar sumber dan tujuan wajib dipilih.' });
    }
    if (sourceYearId === targetYearId) {
      return res.status(400).json({ success: false, error: 'Tahun ajar tujuan harus berbeda dari tahun ajar sumber.' });
    }

    const [sourceYear, targetYear, allClasses, sourceEnrollments] = await Promise.all([
      prisma.tahunAjar.findUnique({ where: { id: String(sourceYearId) } }),
      prisma.tahunAjar.findUnique({ where: { id: String(targetYearId) } }),
      prisma.kelas.findMany({ select: { id: true, name: true, grade: true, major: true } }),
      prisma.riwayatKelas.findMany({
        where: { tahunAjarId: String(sourceYearId), siswa: { status: 'aktif' } },
        include: {
          siswa: { select: { id: true, name: true } },
          kelas: { select: { id: true, name: true } },
        },
      }),
    ]);

    if (!sourceYear || !targetYear) {
      return res.status(404).json({ success: false, error: 'Tahun ajar sumber atau tujuan tidak ditemukan.' });
    }

    const flatEnrollments = sourceEnrollments.map(e => ({
      studentId: e.siswaId,
      studentName: e.siswa?.name || '-',
      classId: e.kelasId,
      className: e.kelas?.name || '-',
    }));

    const plan = buildRolloverPlan({
      enrollments: flatEnrollments,
      mappings: Array.isArray(mappings) ? mappings : [],
      retainStudentIds: Array.isArray(retainStudentIds) ? retainStudentIds : [],
      excludedStudentIds: Array.isArray(excludedStudentIds) ? excludedStudentIds : [],
      validClassIds: allClasses.map(c => c.id),
    });

    if (!plan.valid) {
      return res.status(400).json({
        success: false,
        error: plan.errors[0] || 'Pemetaan kelas tujuan belum lengkap.',
        errors: plan.errors,
      });
    }

    const enrollActions = plan.actions.filter(a => ['promote', 'keep', 'retain'].includes(a.action) && a.targetClassId);
    const graduateIds = plan.actions.filter(a => a.action === 'graduate').map(a => a.studentId);

    await prisma.$transaction(async (tx) => {
      for (const act of enrollActions) {
        await tx.riwayatKelas.upsert({
          where: {
            siswaId_tahunAjarId: {
              siswaId: act.studentId,
              tahunAjarId: targetYear.id,
            },
          },
          update: { kelasId: act.targetClassId },
          create: {
            siswaId: act.studentId,
            kelasId: act.targetClassId,
            tahunAjarId: targetYear.id,
          },
        });
      }

      if (graduateIds.length > 0) {
        await tx.siswa.updateMany({
          where: { id: { in: graduateIds } },
          data: { status: 'lulus' },
        });
      }

      if (activateTargetYear) {
        await tx.tahunAjar.updateMany({ data: { isActive: false } });
        await tx.tahunAjar.update({
          where: { id: targetYear.id },
          data: { isActive: true },
        });

        // Recalculate Kelas.totalStudents based on target year's RiwayatKelas
        const countsByClass = await tx.riwayatKelas.groupBy({
          by: ['kelasId'],
          where: { tahunAjarId: targetYear.id, siswa: { status: 'aktif' } },
          _count: { _all: true },
        });
        const countMap = new Map(countsByClass.map(c => [c.kelasId, c._count._all]));
        for (const cls of allClasses) {
          await tx.kelas.update({
            where: { id: cls.id },
            data: { totalStudents: countMap.get(cls.id) || 0 },
          });
        }
      }

      await tx.logAktivitas.create({
        data: {
          userId: req.authUser?.id || null,
          userName: req.authUser?.name || req.authUser?.username || 'Admin',
          action: 'BULK_ACADEMIC_ROLLOVER',
          target: `${sourceYear.nama} Smt ${sourceYear.semester} -> ${targetYear.nama} Smt ${targetYear.semester}`,
          detail: JSON.stringify({
            mode,
            activateTargetYear: Boolean(activateTargetYear),
            summary: plan.summary,
          }),
          ipAddress: getClientIp(req),
        },
      });
    });

    invalidateActiveTahunAjarCache();

    res.json({
      success: true,
      summary: plan.summary,
      activatedTargetYear: Boolean(activateTargetYear),
      message: `Proses ${mode === 'semester' ? 'Tutup Semester' : 'Kenaikan Kelas & Kelulusan'} berhasil: ${plan.summary.toPromote + plan.summary.toKeep} siswa dipindahkan, ${plan.summary.toGraduate} siswa diluluskan, ${plan.summary.toRetain} tinggal kelas.`,
    });
  } catch (err) {
    console.error('POST /api/tahun-ajar/rollover error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tahun-ajar', requireRole('admin'), async (req, res) => {
  try {
    const { nama, semester, startDate, endDate, isActive } = req.body;
    const shouldBeActive = Boolean(isActive);

    if (shouldBeActive) {
      await prisma.tahunAjar.updateMany({ data: { isActive: false } });
    }

    const ta = await prisma.tahunAjar.create({
      data: {
        nama: (nama || '').trim(),
        semester: Number(semester) || 1,
        isActive: shouldBeActive,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      }
    });
    invalidateActiveTahunAjarCache();

    const formattedTa = {
      ...ta,
      startDate: ta.startDate ? ta.startDate.toISOString().split('T')[0] : '',
      endDate: ta.endDate ? ta.endDate.toISOString().split('T')[0] : ''
    };

    res.json({ success: true, data: formattedTa, message: 'Tahun ajar berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/tahun-ajar/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const { nama, semester, startDate, endDate, isActive } = req.body;
    const updateData = {};
    if (nama) updateData.nama = nama.trim();
    if (semester !== undefined) updateData.semester = Number(semester);
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (isActive !== undefined) {
      if (isActive) {
        await prisma.tahunAjar.updateMany({ data: { isActive: false } });
      }
      updateData.isActive = Boolean(isActive);
    }

    const updated = await prisma.tahunAjar.update({
      where: { id },
      data: updateData
    });
    invalidateActiveTahunAjarCache();

    res.json({
      success: true,
      data: {
        ...updated,
        startDate: updated.startDate ? updated.startDate.toISOString().split('T')[0] : '',
        endDate: updated.endDate ? updated.endDate.toISOString().split('T')[0] : ''
      },
      message: 'Tahun ajar berhasil diperbarui'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/tahun-ajar/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.tahunAjar.delete({ where: { id } });
    invalidateActiveTahunAjarCache();
    res.json({ success: true, message: 'Tahun ajar berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/tahun-ajar/:id/activate', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    // Nonaktifkan semua dulu
    await prisma.tahunAjar.updateMany({ data: { isActive: false } });
    // Aktifkan yang dipilih
    const activated = await prisma.tahunAjar.update({ where: { id }, data: { isActive: true } });
    invalidateActiveTahunAjarCache();
    res.json({
      success: true,
      data: {
        ...activated,
        startDate: activated.startDate ? activated.startDate.toISOString().split('T')[0] : '',
        endDate: activated.endDate ? activated.endDate.toISOString().split('T')[0] : ''
      },
      message: 'Tahun ajar aktif berhasil diubah'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 9. ABSENSI MAPEL (Per Mata Pelajaran)
// ==========================================

const VALID_MAPEL_STATUSES = new Set(['hadir', 'izin', 'sakit', 'alpha']);

// POST — Guru menyimpan absensi murid per jam pelajaran
app.post('/api/absensi-mapel', requireRole('admin', 'guru'), async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: 'Data absensi kosong' });
    }

    const requestedStudentIds = [...new Set(records.map(r => r?.studentId).filter(Boolean))];
    const requestedMapelIds = [...new Set(records.map(r => r?.mapelId || r?.subjectId).filter(Boolean))];
    const requestedGuruIds = [...new Set(
      records.map(r => (
        req.authUser.role === 'guru' && req.authUser.teacherId
          ? req.authUser.teacherId
          : (r?.guruId || r?.teacherId)
      )).filter(Boolean)
    )];

    const [activeTa, validStudents, validMapels, validGurus, allClasses] = await Promise.all([
      getActiveTahunAjar(),
      requestedStudentIds.length > 0
        ? prisma.siswa.findMany({
            where: { id: { in: requestedStudentIds } },
            select: {
              id: true,
              riwayatKelas: {
                where: { tahunAjar: { isActive: true } },
                include: { kelas: { select: { id: true, name: true } } },
                take: 1,
              },
            },
          })
        : [],
      requestedMapelIds.length > 0
        ? prisma.mataPelajaran.findMany({ where: { id: { in: requestedMapelIds } }, select: { id: true } })
        : [],
      requestedGuruIds.length > 0
        ? prisma.guru.findMany({ where: { id: { in: requestedGuruIds } }, select: { id: true } })
        : [],
      prisma.kelas.findMany({ select: { id: true, name: true } }),
    ]);

    const studentMap = new Map(validStudents.map(s => [s.id, s]));
    const validMapelSet = new Set(validMapels.map(m => m.id));
    const validGuruSet = new Set(validGurus.map(g => g.id));
    const classByName = new Map(allClasses.map(c => [c.name, c]));
    const classById = new Map(allClasses.map(c => [c.id, c]));
    const recordedByUserId = req.authUser?.id || null;

    const operations = [];

    for (const record of records) {
      const targetMapelId = record.mapelId || record.subjectId;
      if (!record.studentId || !record.date || !targetMapelId) continue;
      if (!VALID_MAPEL_STATUSES.has(record.status)) continue;
      if (!studentMap.has(record.studentId) || !validMapelSet.has(targetMapelId)) continue;

      const recordDate = new Date(`${String(record.date).split('T')[0]}T00:00:00.000Z`);
      const resolvedGuruId =
        req.authUser.role === 'guru' && req.authUser.teacherId
          ? req.authUser.teacherId
          : (record.guruId || record.teacherId);
      if (!resolvedGuruId || !validGuruSet.has(resolvedGuruId)) continue;

      const activeStudentClass = studentMap.get(record.studentId)?.riwayatKelas?.[0]?.kelas || null;
      const requestedClassName = record.class || record.kelasName || activeStudentClass?.name || '-';
      const matchedClass =
        (record.kelasId && classById.get(record.kelasId)) ||
        classByName.get(requestedClassName) ||
        activeStudentClass ||
        null;
      const finalKelasId = matchedClass?.id || null;
      const finalKelasName = matchedClass?.name || requestedClassName;

      operations.push(
        prisma.absensiMapel.upsert({
          where: {
            studentId_mapelId_date_jamKe: {
              studentId: record.studentId,
              mapelId: targetMapelId,
              date: recordDate,
              jamKe: Number(record.jamKe) || 1
            }
          },
          update: {
            status: record.status,
            guruId: resolvedGuruId,
            kelasId: finalKelasId,
            kelasName: finalKelasName,
            recordedByUserId,
          },
          create: {
            studentId: record.studentId,
            mapelId: targetMapelId,
            guruId: resolvedGuruId,
            kelasId: finalKelasId,
            recordedByUserId,
            kelasName: finalKelasName,
            tahunAjarId: activeTa?.id || null,
            date: recordDate,
            jamKe: Number(record.jamKe) || 1,
            status: record.status
          }
        })
      );
    }

    if (operations.length === 0) {
      return res.status(400).json({ success: false, error: 'Tidak ada data absensi mapel yang valid (pastikan siswa, mapel, dan guru terdaftar).' });
    }

    await prisma.$transaction(operations);

    const affectedClassNames = [...new Set(
      records.map(r => r.class || r.kelasName || studentMap.get(r.studentId)?.riwayatKelas?.[0]?.kelas?.name).filter(Boolean)
    )];
    const affectedStudentIds = [...new Set(records.map(r => r.studentId).filter(Boolean))];
    realtimeHub.publish({
      type: 'subject-attendance:updated',
      classNames: affectedClassNames,
      studentIds: affectedStudentIds,
      date: records[0]?.date || null,
      updatedBy: req.authUser?.name || null,
    });

    res.json({ success: true, savedCount: operations.length, message: 'Absensi mapel berhasil disimpan.' });
  } catch (err) {
    console.error('POST /api/absensi-mapel error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET — Ambil data absensi mapel (filter: tahunAjarId, kelas, mapel, tanggal, bulan + pagination opsional)
app.get('/api/absensi-mapel', requireAuth, async (req, res) => {
  try {
    const { kelas, mapel, date, month, studentId, tahunAjarId } = req.query;
    const { isPaginated, page, limit, skip } = parsePaginationParams(req.query, { defaultLimit: 50, maxLimit: 200 });
    const where = {};
    const andClauses = [];

    if (req.authUser.role === 'wali_murid') {
      where.studentId = req.authUser.studentId || '__no_linked_student__';
    } else {
      if (kelas && kelas !== 'Semua') where.kelasName = String(kelas);
      if (studentId) where.studentId = String(studentId);
    }
    if (mapel && mapel !== 'Semua') {
      andClauses.push({
        OR: [
          { mapelId: String(mapel) },
          { mapel: { nama: String(mapel) } },
        ],
      });
    }
    if (tahunAjarId && tahunAjarId !== 'all') {
      const ta = await prisma.tahunAjar.findUnique({ where: { id: String(tahunAjarId) } });
      const range = getAcademicYearDateRange(ta);
      if (range) {
        andClauses.push({
          OR: [
            { tahunAjarId: String(tahunAjarId) },
            { tahunAjarId: null, date: { gte: range.startDate, lte: range.endDate } },
          ],
        });
      } else {
        where.tahunAjarId = String(tahunAjarId);
      }
    }
    if (date) {
      where.date = new Date(`${String(date).split('T')[0]}T00:00:00.000Z`);
    } else if (month && month !== 'all') {
      const bounds = buildMonthDateBounds(month);
      if (bounds) where.date = { gte: bounds.start, lt: bounds.end };
    }
    if (andClauses.length > 0) where.AND = andClauses;

    const selectFields = {
      id: true,
      studentId: true,
      mapelId: true,
      guruId: true,
      kelasId: true,
      kelasName: true,
      tahunAjarId: true,
      recordedByUserId: true,
      date: true,
      jamKe: true,
      status: true,
      updatedAt: true,
      student: { select: { name: true } },
      mapel: { select: { nama: true } },
      guru: { select: { name: true } },
      kelas: { select: { id: true, name: true } },
      recordedByUser: { select: { id: true, name: true } },
    };

    const formatRow = (a) => ({
      id: a.id,
      studentId: a.studentId,
      studentName: a.student?.name || '-',
      mapelId: a.mapelId,
      subject: a.mapel?.nama || '-',
      guruId: a.guruId,
      teacherName: a.guru?.name || '-',
      kelasId: a.kelasId || null,
      class: a.kelas?.name || a.kelasName,
      tahunAjarId: a.tahunAjarId || null,
      recordedByUserId: a.recordedByUserId || null,
      recordedByName: a.recordedByUser?.name || a.guru?.name || '-',
      date: a.date.toISOString().split('T')[0],
      jamKe: a.jamKe,
      status: a.status,
      updatedAt: a.updatedAt ? a.updatedAt.toISOString() : null,
    });

    if (isPaginated) {
      const [total, data] = await Promise.all([
        prisma.absensiMapel.count({ where }),
        prisma.absensiMapel.findMany({
          where,
          select: selectFields,
          orderBy: [{ date: 'desc' }, { jamKe: 'asc' }],
          skip,
          take: limit,
        }),
      ]);
      return res.json({
        success: true,
        items: data.map(formatRow),
        pagination: buildPaginationMeta(total, page, limit),
      });
    }

    const isUnbounded = !date && !month && !studentId;
    const data = await prisma.absensiMapel.findMany({
      where,
      select: selectFields,
      orderBy: [{ date: 'desc' }, { jamKe: 'asc' }],
      ...(isUnbounded ? { take: 2500 } : {}),
    });

    res.json(data.map(formatRow));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET — Rekap Absensi Mapel dengan Agregasi Langsung di PostgreSQL (groupBy) + Pagination
app.get('/api/absensi-mapel/rekap', requireRole('admin', 'guru', 'staff', 'kepsek'), async (req, res) => {
  try {
    const { kelas, mapel, month, tahunAjarId, search } = req.query;
    const { isPaginated, page, limit } = parsePaginationParams(req.query, { defaultLimit: 25, maxLimit: 200 });

    const targetYear = tahunAjarId && tahunAjarId !== 'all'
      ? await prisma.tahunAjar.findUnique({ where: { id: String(tahunAjarId) } })
      : await getActiveTahunAjar();

    const where = {};
    const andClauses = [];

    if (kelas && kelas !== 'Semua') where.kelasName = String(kelas);
    if (mapel && mapel !== 'Semua' && mapel !== 'semua') {
      andClauses.push({
        OR: [
          { mapelId: String(mapel) },
          { mapel: { nama: String(mapel) } },
        ],
      });
    }
    if (month && month !== 'all') {
      const bounds = buildMonthDateBounds(month);
      if (bounds) where.date = { gte: bounds.start, lt: bounds.end };
    }
    if (targetYear && tahunAjarId !== 'all') {
      const range = getAcademicYearDateRange(targetYear);
      if (range) {
        andClauses.push({
          OR: [
            { tahunAjarId: targetYear.id },
            { tahunAjarId: null, date: { gte: range.startDate, lte: range.endDate } },
          ],
        });
      } else {
        where.tahunAjarId = targetYear.id;
      }
    }
    if (andClauses.length > 0) where.AND = andClauses;

    // DB-level PostgreSQL aggregation (no raw row scan into JS memory!)
    const [groupedByStudentStatus, distinctSessions, overallByStatus] = await Promise.all([
      prisma.absensiMapel.groupBy({
        by: ['studentId', 'status'],
        where,
        _count: { _all: true },
      }),
      prisma.absensiMapel.groupBy({
        by: ['date', 'jamKe', 'mapelId'],
        where,
        _count: { _all: true },
      }),
      prisma.absensiMapel.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
    ]);

    const totals = { hadir: 0, izin: 0, sakit: 0, alpha: 0, totalRecords: 0, attendanceRate: 0 };
    for (const row of overallByStatus) {
      if (totals[row.status] !== undefined) {
        totals[row.status] = row._count._all;
        totals.totalRecords += row._count._all;
      }
    }
    totals.attendanceRate = totals.totalRecords > 0
      ? Math.round((totals.hadir / totals.totalRecords) * 100)
      : 0;

    const studentIds = [...new Set(groupedByStudentStatus.map(g => g.studentId))];
    const studentLookup = new Map();
    if (studentIds.length > 0) {
      const students = await prisma.siswa.findMany({
        where: { id: { in: studentIds } },
        select: {
          id: true,
          name: true,
          nomor: true,
          riwayatKelas: {
            where: targetYear ? { tahunAjarId: targetYear.id } : { tahunAjar: { isActive: true } },
            select: { kelas: { select: { name: true } } },
            take: 1,
          },
        },
      });
      for (const st of students) {
        studentLookup.set(st.id, {
          name: st.name,
          nis: st.nomor || '-',
          className: st.riwayatKelas?.[0]?.kelas?.name || kelas || '-',
        });
      }
    }

    const studentMap = new Map();
    for (const row of groupedByStudentStatus) {
      if (!studentMap.has(row.studentId)) {
        const meta = studentLookup.get(row.studentId) || { name: '-', nis: '-', className: kelas || '-' };
        studentMap.set(row.studentId, {
          studentId: row.studentId,
          studentName: meta.name,
          nis: meta.nis,
          class: meta.className,
          hadir: 0,
          izin: 0,
          sakit: 0,
          alpha: 0,
        });
      }
      const entry = studentMap.get(row.studentId);
      if (entry[row.status] !== undefined) {
        entry[row.status] += row._count._all;
      }
    }

    const cleanSearch = String(search || '').trim().toLowerCase();
    let rekapAll = Array.from(studentMap.values()).map(s => {
      const totalPerSiswa = s.hadir + s.izin + s.sakit + s.alpha;
      const persen = totalPerSiswa > 0 ? Math.round((s.hadir / totalPerSiswa) * 100) : 0;
      return { ...s, totalSesi: totalPerSiswa, persentase: persen };
    });

    if (cleanSearch) {
      rekapAll = rekapAll.filter(
        r =>
          r.studentName.toLowerCase().includes(cleanSearch) ||
          String(r.nis || '').toLowerCase().includes(cleanSearch) ||
          String(r.class || '').toLowerCase().includes(cleanSearch)
      );
    }

    rekapAll.sort((a, b) => a.studentName.localeCompare(b.studentName));

    const pagination = buildPaginationMeta(rekapAll.length, page, limit);
    const rekap = isPaginated
      ? rekapAll.slice((pagination.page - 1) * pagination.limit, pagination.page * pagination.limit)
      : rekapAll;

    res.json({
      success: true,
      totalSesiGuru: distinctSessions.length,
      kelas: kelas || 'Semua',
      bulan: month || 'all',
      tahunAjarId: targetYear?.id || null,
      mapelId: mapel || 'semua',
      totals,
      rekap,
      pagination,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Since this file uses ES modules, we export the app as default
export default app;
