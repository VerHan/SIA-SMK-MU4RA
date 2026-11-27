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
  MOCK_PAYMENTS,
  MOCK_PRAYER_ATTENDANCE,
} from '../src/services/mockData.js';
import {
  buildUserCapabilities,
  calculateHaversineMeters,
  clearSessionCookie,
  computeAttendanceRiskTier,
  DEFAULT_SCHOOL_GEOFENCE,
  formatJakartaTimeHHMM,
  hashPassword,
  hashPasswordAsync,
  normalizeRole,
  verifyPasswordAsync,
  setAuthNoStoreHeaders,
  setSessionCookie,
  signToken,
  isValidRole,
  requireAuth,
  requirePiketAccess,
  requireRole,
  requireStudentReadAccess,
  sanitizeSafeUrl,
  validateGeofenceConfig,
  validateGeofenceCoords,
  validateNewPassword,
} from './authUtils.js';
import {
  aggregatePiketSummary,
  buildPaginationMeta,
  buildRolloverPlan,
  getAcademicYearDateRange,
  parseGradeFromClassName,
  parsePaginationParams,
  suggestClassMapping,
} from './academicRolloverUtils.js';
import {
  changePasswordSchema,
  loginSchema,
  userCreateSchema,
  userUpdateSchema,
  validateBody,
} from './validators/schemas.js';
import {
  computePaymentStatus,
  createAuditLogger,
  createTokenVersionGuard,
  DEFAULT_SCHOOL_CONFIG,
  detectAttendanceAlerts,
  dispatchWebhookPayload,
} from './modules/auditService.js';
import { createAuditRouter } from './modules/auditRouter.js';
import { createSchoolConfigRouter } from './modules/schoolConfigRouter.js';
import { createOperationsRouter } from './modules/operationsRouter.js';
import { realtimeHub } from './modules/realtimeHub.js';

const newId = () => crypto.randomUUID();
const VALID_PPDB_STATUSES = new Set(['Menunggu Verifikasi', 'Diterima', 'Cadangan', 'Ditolak']);
const VALID_NON_EMPTY_ATTENDANCE = new Set(['hadir', 'izin', 'sakit', 'alpha']);
const VALID_ATTENDANCE_STATUSES = new Set(['hadir', 'izin', 'sakit', 'alpha', null, '', undefined]);

export function createMockApiRouter() {
  const router = express.Router();

  // Seed users with scrypt-hashed passwords (zero plaintext in memory)
  // guru1 = Guru Piket + Wali Kelas XI TKJ 1; guru2 = Guru Reguler (Non-Piket) + Wali Kelas X RPL 1
  const seedUsers = [
    ...MOCK_USERS.map(u => ({
      id: u.id,
      username: u.username,
      password: hashPassword(u.password),
      name: u.name,
      role: u.role,
      isPiket: u.username === 'guru1' ? true : Boolean(u.isPiket),
      isActive: true,
      tokenVersion: 1,
      teacherId: u.teacherId || null,
      studentId: u.studentId || null,
      createdAt: new Date().toISOString(),
    })),
    {
      id: 'u006',
      username: 'guru2',
      password: hashPassword('guru123'),
      name: 'Siti Nurhaliza, S.Kom.',
      role: 'guru',
      isPiket: false,
      isActive: true,
      tokenVersion: 1,
      teacherId: 'g002',
      studentId: null,
      createdAt: new Date().toISOString(),
    },
  ];
  let users = seedUsers;

  const tokenVersionGuard = createTokenVersionGuard({
    lookupUserState: async (userId) => {
      const u = users.find(x => x.id === userId);
      return u ? { id: u.id, isActive: u.isActive !== false, tokenVersion: u.tokenVersion || 1 } : null;
    },
  });
  router.use(tokenVersionGuard.middleware);

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
  const initialActiveYearId = tahunAjarList.find(t => t.isActive)?.id || tahunAjarList[0]?.id || 'ta001';
  let riwayatKelasList = siswaList
    .map(s => {
      const cls = kelasList.find(k => k.name === s.class);
      if (!cls) return null;
      return { id: newId(), siswaId: s.id, kelasId: cls.id, tahunAjarId: initialActiveYearId };
    })
    .filter(Boolean);
  let schoolConfig = { ...DEFAULT_SCHOOL_CONFIG };
  let logAktivitasList = [
    {
      id: 'log-init-1',
      userId: 'u001',
      userName: 'Administrator Sekolah',
      action: 'SYSTEM_INIT',
      target: 'SIA SMK Muhammadiyah 04 Bangsri',
      detail: 'Audit Trail, Pengaturan Sekolah Terpusat, dan proteksi sesi aktif.',
      ipAddress: '127.0.0.1',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];
  let notificationLogs = [
    {
      id: 'notif-seed-1',
      recipientRole: 'guru',
      recipientUserId: 'u002',
      recipientName: 'Ahmad Fauzi, S.Pd.',
      recipientPhone: '081234567890',
      studentId: 's003',
      studentName: 'Budi Santoso',
      className: 'XI TKJ 1',
      eventType: 'ALPHA_ALERT',
      title: 'Ketidakhadiran Alpha: Budi Santoso (XI TKJ 1)',
      message: '[SMK Muhammadiyah 04 Bangsri] Siswa Budi Santoso kelas XI TKJ 1 tercatat Alpha pada sesi piket. Mohon konfirmasi wali kelas.',
      channel: 'in_app',
      deliveryStatus: 'sent',
      readAt: null,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'notif-seed-2',
      recipientRole: 'admin',
      recipientUserId: 'u001',
      recipientName: 'Administrator Sekolah',
      recipientPhone: null,
      studentId: null,
      studentName: null,
      className: null,
      eventType: 'GENERAL',
      title: 'Backup Harian Otomatis Siap',
      message: 'Jadwal backup database harian aktif pukul 02:00 WIB. Anda dapat mengunduh snapshot JSON kapan saja melalui Pengaturan.',
      channel: 'in_app',
      deliveryStatus: 'sent',
      readAt: null,
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
  ];
  let pembayaranList = (MOCK_PAYMENTS || []).map(p => ({ ...p }));
  const todayJakartaStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  let absenSholatList = (MOCK_PRAYER_ATTENDANCE || []).map(p => ({
    ...p,
    date: p.date || todayJakartaStr,
  }));

  const logAudit = createAuditLogger({
    writeLog: async ({ userId, userName, action, target, detail, ipAddress }) => {
      const entry = {
        id: newId(),
        userId,
        userName,
        action,
        target,
        detail,
        ipAddress,
        createdAt: new Date().toISOString(),
      };
      logAktivitasList.unshift(entry);
      if (logAktivitasList.length > 2000) logAktivitasList.length = 2000;
      return entry;
    },
  });

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
  let absensiPiketList = MOCK_ATTENDANCE.map(a => ({
    ...a,
    tahunAjarId: a.tahunAjarId || initialActiveYearId,
    updatedAt: a.updatedAt || new Date().toISOString(),
  }));
  let absensiGuruList = MOCK_TEACHER_ATTENDANCE.map(a => ({ ...a }));
  let absensiMapelList = [];

  const getActiveYear = () => tahunAjarList.find(t => t.isActive) || tahunAjarList[0] || null;
  const resolveStudentClassForYear = (student, yearId) => {
    if (yearId && yearId !== 'all') {
      const enr = riwayatKelasList.find(r => r.siswaId === student.id && r.tahunAjarId === yearId);
      if (enr) {
        const cls = kelasList.find(k => k.id === enr.kelasId);
        return { className: cls?.name || '-', kelasId: cls?.id || null, grade: cls?.grade || null, enrolled: true };
      }
      return { className: '-', kelasId: null, grade: null, enrolled: false };
    }
    const active = getActiveYear();
    const enr = active
      ? riwayatKelasList.find(r => r.siswaId === student.id && r.tahunAjarId === active.id)
      : riwayatKelasList.find(r => r.siswaId === student.id);
    if (enr) {
      const cls = kelasList.find(k => k.id === enr.kelasId);
      return { className: cls?.name || student.class || '-', kelasId: cls?.id || null, grade: cls?.grade || null, enrolled: true };
    }
    const fallbackCls = kelasList.find(k => k.name === student.class);
    return {
      className: student.class || '-',
      kelasId: fallbackCls?.id || null,
      grade: fallbackCls?.grade || parseGradeFromClassName(student.class).grade,
      enrolled: Boolean(student.class && student.class !== '-'),
    };
  };
  const matchesAcademicYearRecord = (rec, yearId) => {
    if (!yearId || yearId === 'all') return true;
    if (rec.tahunAjarId) return rec.tahunAjarId === yearId;
    const ta = tahunAjarList.find(t => t.id === yearId);
    const range = getAcademicYearDateRange(ta);
    if (!range || !rec.date) return false;
    return rec.date >= range.startStr && rec.date <= range.endStr;
  };
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

  const buildSafeAuthUser = (user) => {
    const homeroomClasses = user.teacherId
      ? kelasList
          .filter(k => k.teacherId === user.teacherId)
          .map(k => ({ id: k.id, name: k.name }))
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
    return {
      ...baseUser,
      capabilities: buildUserCapabilities(baseUser, homeroomClasses),
    };
  };

  // --- Auth & User Management ---
  router.post('/auth/login', validateBody(loginSchema), async (req, res) => {
    setAuthNoStoreHeaders(res);
    const { username, password, rememberMe = true } = req.validatedBody;
    const cleanUsername = String(username).trim().toLowerCase();
    const user = users.find(u => u.username.toLowerCase() === cleanUsername);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Username atau password salah' });
    }
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        error: 'Akun Anda sedang dinonaktifkan oleh administrator sekolah.',
      });
    }
    const { valid } = await verifyPasswordAsync(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Username atau password salah' });
    }
    const safeUser = buildSafeAuthUser(user);
    const persistSession = rememberMe !== false;
    const token = signToken(safeUser, { rememberMe: persistSession });
    setSessionCookie(req, res, token, { rememberMe: persistSession });
    return res.json({ success: true, token, user: safeUser, rememberMe: persistSession });
  });

  router.post('/auth/logout', (req, res) => {
    setAuthNoStoreHeaders(res);
    clearSessionCookie(req, res);
    return res.json({ success: true, message: 'Berhasil keluar dari sesi.' });
  });

  router.get('/auth/me', (req, res) => {
    setAuthNoStoreHeaders(res);
    if (!req.authUser) {
      return res.status(200).json({ success: false, authenticated: false, user: null });
    }
    const user = users.find(u => u.id === req.authUser.id);
    if (!user || user.isActive === false) {
      clearSessionCookie(req, res);
      return res.status(200).json({ success: false, authenticated: false, user: null });
    }
    const safeUser = buildSafeAuthUser(user);
    const token = signToken(safeUser, { rememberMe: true });
    setSessionCookie(req, res, token, { rememberMe: true });
    res.json({
      success: true,
      authenticated: true,
      token,
      user: safeUser,
    });
  });

  router.post('/auth/change-password', requireAuth, validateBody(changePasswordSchema), async (req, res) => {
    const { currentPassword, newPassword } = req.validatedBody;
    const idx = users.findIndex(u => u.id === req.authUser.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Akun tidak ditemukan.' });
    }
    const { valid: oldValid } = await verifyPasswordAsync(currentPassword, users[idx].password);
    if (!oldValid) {
      return res.status(400).json({ success: false, error: 'Password lama tidak sesuai.' });
    }
    const check = validateNewPassword(newPassword, currentPassword);
    if (!check.valid) {
      return res.status(400).json({ success: false, error: check.error });
    }
    const nextTv = (Number(users[idx].tokenVersion) || 1) + 1;
    users[idx] = {
      ...users[idx],
      password: await hashPasswordAsync(check.value),
      tokenVersion: nextTv,
    };
    tokenVersionGuard.invalidateUserSession(users[idx].id);
    await logAudit(req, {
      action: 'AUTH_CHANGE_PASSWORD',
      target: `${users[idx].name} (@${users[idx].username})`,
      detail: { newTokenVersion: nextTv, otherDevicesRevoked: true },
    });
    const safeUser = buildSafeAuthUser(users[idx]);
    const token = signToken(safeUser, { rememberMe: true });
    setSessionCookie(req, res, token, { rememberMe: true });
    res.json({
      success: true,
      token,
      message: 'Password berhasil diperbarui! Sesi di perangkat lain otomatis terputus.',
    });
  });

  router.get('/users', requireRole('admin'), (req, res) => {
    res.json(users.map(u => {
      const guru = u.teacherId ? guruList.find(g => g.id === u.teacherId) : null;
      const siswa = u.studentId ? siswaList.find(s => s.id === u.studentId) : null;
      const safe = buildSafeAuthUser(u);
      return {
        ...safe,
        teacherName: guru?.name || null,
        studentName: siswa?.name || null,
        createdAt: u.createdAt,
      };
    }));
  });

  router.post('/users', requireRole('admin'), validateBody(userCreateSchema), async (req, res) => {
    const { username, password, name, role, isPiket, isActive, teacherId, studentId } = req.validatedBody;
    const cleanUsername = String(username).trim();
    const cleanName = String(name).trim();
    if (users.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
      return res.status(400).json({ success: false, error: `Username "${cleanUsername}" sudah digunakan.` });
    }
    const created = {
      id: newId(),
      username: cleanUsername,
      password: await hashPasswordAsync(password),
      name: cleanName,
      role,
      isPiket: role === 'guru' ? Boolean(isPiket) : false,
      isActive: isActive !== false,
      tokenVersion: 1,
      teacherId: role === 'guru' && teacherId ? String(teacherId).trim() : null,
      studentId: role === 'wali_murid' && studentId ? String(studentId).trim() : null,
      createdAt: new Date().toISOString(),
    };
    users.push(created);
    await logAudit(req, {
      action: 'USER_CREATE',
      target: `${created.name} (@${created.username})`,
      detail: { role: created.role, isPiket: created.isPiket },
    });
    res.json({ success: true, data: buildSafeAuthUser(created), message: 'Akun pengguna berhasil dibuat.' });
  });

  router.put('/users/:id', requireRole('admin'), validateBody(userUpdateSchema), async (req, res) => {
    const idx = users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Akun tidak ditemukan.' });
    const prev = users[idx];
    const { name, role, isPiket, isActive, password, teacherId, studentId } = req.validatedBody;
    if (req.params.id === req.authUser.id && isActive === false) {
      return res.status(400).json({ success: false, error: 'Anda tidak dapat menonaktifkan akun Anda sendiri.' });
    }
    const nextRole = role !== undefined ? role : prev.role;
    const hashedPassword = password && String(password).trim() ? await hashPasswordAsync(password) : null;
    const nextActive = isActive !== undefined ? Boolean(isActive) : prev.isActive !== false;
    const shouldRevoke = Boolean(hashedPassword) || nextRole !== prev.role || nextActive === false;
    const nextTokenVersion = shouldRevoke ? (Number(prev.tokenVersion) || 1) + 1 : (Number(prev.tokenVersion) || 1);

    users[idx] = {
      ...prev,
      ...(name && String(name).trim() ? { name: String(name).trim() } : {}),
      role: nextRole,
      isPiket: nextRole === 'guru' ? Boolean(isPiket !== undefined ? isPiket : prev.isPiket) : false,
      isActive: nextActive,
      tokenVersion: nextTokenVersion,
      ...(hashedPassword ? { password: hashedPassword } : {}),
      ...(teacherId !== undefined ? { teacherId: nextRole === 'guru' && teacherId ? String(teacherId).trim() : null } : {}),
      ...(studentId !== undefined ? { studentId: nextRole === 'wali_murid' && studentId ? String(studentId).trim() : null } : {}),
    };
    if (shouldRevoke) {
      tokenVersionGuard.invalidateUserSession(prev.id);
    }
    await logAudit(req, {
      action: hashedPassword ? 'USER_PASSWORD_RESET' : nextActive === false ? 'USER_DEACTIVATE' : 'USER_UPDATE',
      target: `${users[idx].name} (@${users[idx].username})`,
      detail: {
        roleChanged: nextRole !== prev.role ? `${prev.role} -> ${nextRole}` : undefined,
        passwordReset: Boolean(hashedPassword),
        isActive: nextActive,
        sessionsRevoked: shouldRevoke,
      },
    });
    res.json({
      success: true,
      data: buildSafeAuthUser(users[idx]),
      message: shouldRevoke
        ? 'Akun diperbarui & sesi perangkat lama otomatis diputus.'
        : 'Akun pengguna berhasil diperbarui.',
    });
  });

  router.delete('/users/:id', requireRole('admin'), async (req, res) => {
    if (req.params.id === req.authUser.id) {
      return res.status(400).json({ success: false, error: 'Anda tidak dapat menghapus akun yang sedang aktif digunakan.' });
    }
    const target = users.find(u => u.id === req.params.id);
    users = users.filter(u => u.id !== req.params.id);
    tokenVersionGuard.invalidateUserSession(req.params.id);
    if (target) {
      await logAudit(req, {
        action: 'USER_DELETE',
        target: `${target.name} (@${target.username})`,
        detail: { role: target.role },
      });
    }
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

  // --- Absensi Piket Siswa (Concurrency-safe + Piket/Staff/Admin RBAC) ---
  router.get('/absensi', requireAuth, (req, res) => {
    const { kelas, date, month, studentId, tahunAjarId } = req.query;
    const { isPaginated, page, limit, skip } = parsePaginationParams(req.query, { defaultLimit: 50, maxLimit: 200 });
    let list = [...absensiPiketList];
    if (req.authUser.role === 'wali_murid') {
      list = list.filter(a => a.studentId === (req.authUser.studentId || '__no_linked_student__'));
    } else {
      if (studentId) list = list.filter(a => a.studentId === studentId);
      if (kelas && kelas !== 'Semua') list = list.filter(a => a.class === kelas);
    }
    if (tahunAjarId && tahunAjarId !== 'all') {
      list = list.filter(a => matchesAcademicYearRecord(a, String(tahunAjarId)));
    }
    if (date) list = list.filter(a => a.date === date);
    if (month && month !== 'all') list = list.filter(a => (a.date || '').startsWith(month));
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (isPaginated) {
      return res.json({
        success: true,
        items: list.slice(skip, skip + limit),
        pagination: buildPaginationMeta(list.length, page, limit),
      });
    }
    res.json(list);
  });

  // --- Aggregated Annual / Semester / Monthly Piket Attendance Summary ---
  router.get('/absensi/summary', requireRole('admin', 'guru', 'staff', 'kepsek'), (req, res) => {
    const { tahunAjarId, kelas, month, sesi = 'pagi', search = '' } = req.query;
    const { page, limit } = parsePaginationParams(
      { ...req.query, paginated: 'true' },
      { defaultLimit: 25, maxLimit: 200 }
    );
    const targetYear = tahunAjarId && tahunAjarId !== 'all'
      ? tahunAjarList.find(t => t.id === String(tahunAjarId))
      : (tahunAjarId === 'all' ? null : getActiveYear());

    let records = [...absensiPiketList];
    if (targetYear) {
      records = records.filter(a => matchesAcademicYearRecord(a, targetYear.id));
    }
    if (kelas && kelas !== 'Semua') {
      records = records.filter(a => a.class === kelas);
    }
    if (month && month !== 'all') {
      records = records.filter(a => (a.date || '').startsWith(month));
    }

    const studentsForScope = siswaList
      .map(s => {
        const resolved = resolveStudentClassForYear(s, targetYear ? targetYear.id : null);
        return { ...s, class: resolved.className, _enrolled: resolved.enrolled };
      })
      .filter(s => {
        if (targetYear && !s._enrolled) return false;
        if (kelas && kelas !== 'Semua' && s.class !== kelas) return false;
        return true;
      });

    const aggregated = aggregatePiketSummary({
      records,
      students: studentsForScope,
      sesi: sesi === 'sore' ? 'sore' : 'pagi',
      search,
      page,
      limit,
    });

    res.json({
      success: true,
      tahunAjar: targetYear ? { id: targetYear.id, nama: targetYear.nama, semester: targetYear.semester } : null,
      kelas: kelas || 'Semua',
      month: month || 'all',
      sesi: sesi === 'sore' ? 'sore' : 'pagi',
      ...aggregated,
    });
  });

  router.post('/absensi', requirePiketAccess, (req, res) => {
    const { records, session, force } = req.body || {};
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: 'Data absensi kosong.' });
    }
    const cleanSession = session === 'pagi' || session === 'sore' ? session : null;
    const conflicts = [];
    const staged = [];

    for (const rec of records) {
      if (!rec.studentId || !rec.date) continue;
      if (!VALID_ATTENDANCE_STATUSES.has(rec.statusPagi) || !VALID_ATTENDANCE_STATUSES.has(rec.statusSore)) {
        continue;
      }
      const dateStr = String(rec.date).split('T')[0];
      const idx = absensiPiketList.findIndex(a => a.studentId === rec.studentId && a.date === dateStr);
      const existing = idx !== -1 ? absensiPiketList[idx] : null;

      // Optimistic concurrency check
      if (!force && existing && rec.expectedUpdatedAt) {
        const existingMs = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
        const expectedMs = new Date(rec.expectedUpdatedAt).getTime();
        if (!Number.isNaN(expectedMs) && existingMs > expectedMs) {
          const sameSessionConflict =
            cleanSession === 'pagi'
              ? (rec.expectedStatusPagi !== undefined
                  ? (existing.statusPagi || null) !== (rec.expectedStatusPagi || null)
                  : Boolean(existing.statusPagi))
              : cleanSession === 'sore'
                ? (rec.expectedStatusSore !== undefined
                    ? (existing.statusSore || null) !== (rec.expectedStatusSore || null)
                    : Boolean(existing.statusSore))
                : true;

          if (sameSessionConflict) {
            conflicts.push({
              studentId: rec.studentId,
              studentName: existing.studentName || rec.studentName || rec.studentId,
              date: dateStr,
              serverStatusPagi: existing.statusPagi || null,
              serverStatusSore: existing.statusSore || null,
              serverUpdatedAt: existing.updatedAt || null,
            });
            continue;
          }
        }
      }

      const nextPagi = VALID_NON_EMPTY_ATTENDANCE.has(rec.statusPagi) ? rec.statusPagi : null;
      const nextSore = VALID_NON_EMPTY_ATTENDANCE.has(rec.statusSore) ? rec.statusSore : null;
      const patch = {};
      if (cleanSession === 'pagi') {
        if (nextPagi || rec.allowClear) patch.statusPagi = nextPagi;
      } else if (cleanSession === 'sore') {
        if (nextSore || rec.allowClear) patch.statusSore = nextSore;
      } else {
        if (nextPagi || rec.allowClear) patch.statusPagi = nextPagi;
        if (nextSore || rec.allowClear) patch.statusSore = nextSore;
      }
      if (Object.keys(patch).length === 0) continue;

      staged.push({ rec, dateStr, idx, patch });
    }

    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        conflict: true,
        error: 'Data absensi sesi ini baru saja diperbarui oleh petugas lain. Muat ulang data terbaru sebelum menyimpan.',
        conflicts,
      });
    }

    const nowIso = new Date().toISOString();
    const recordedByUserId = req.authUser?.id || null;
    const recordedByGuruId = req.authUser?.teacherId || null;
    const recordedByName = req.authUser?.name || null;
    const saved = [];
    for (const item of staged) {
      const { rec, dateStr, idx, patch } = item;
      const student = siswaList.find(s => s.id === rec.studentId);
      if (!student) continue;
      const className = student.class || rec.class || '-';
      const kelasObj = kelasList.find(k => k.name === className);
      const kelasId = kelasObj?.id || null;
      if (idx !== -1) {
        absensiPiketList[idx] = {
          ...absensiPiketList[idx],
          ...patch,
          kelasId: kelasId || absensiPiketList[idx].kelasId || null,
          recordedByUserId,
          recordedByGuruId,
          recordedByName,
          updatedAt: nowIso,
        };
        saved.push(absensiPiketList[idx]);
      } else {
        const created = {
          id: newId(),
          studentId: rec.studentId,
          studentName: student.name,
          kelasId,
          class: className,
          date: dateStr,
          statusPagi: patch.statusPagi ?? null,
          statusSore: patch.statusSore ?? null,
          recordedByUserId,
          recordedByGuruId,
          recordedByName,
          updatedAt: nowIso,
        };
        absensiPiketList.push(created);
        saved.push(created);
      }
    }

    if (saved.length === 0) {
      return res.status(400).json({ success: false, error: 'Tidak ada data siswa atau status absensi yang valid.' });
    }

    // Audit backdated attendance edits (tanggal lampau)
    const todayDateStr = getJakartaNow().dateStr;
    const backdatedDates = [...new Set(saved.map(s => s.date).filter(d => d && d < todayDateStr))];
    if (backdatedDates.length > 0) {
      logAudit(req, {
        action: 'ATTENDANCE_BACKDATED_EDIT',
        target: `Tanggal ${backdatedDates.join(', ')}`,
        detail: { session: cleanSession || 'both', savedCount: saved.length },
      });
    }

    // Automatic Alpha & Bolos notifications to homeroom teacher & parent
    const alerts = detectAttendanceAlerts({
      savedRecords: saved,
      studentsById: new Map(siswaList.map(s => [s.id, s])),
      classesById: new Map(kelasList.map(k => [k.id, k])),
      teachersById: new Map(guruList.map(g => [g.id, g])),
      users,
      config: schoolConfig,
    });
    if (alerts.length > 0) {
      for (const alert of alerts) {
        const channel = schoolConfig.whatsappEnabled && schoolConfig.whatsappWebhookUrl ? 'whatsapp_webhook' : 'in_app';
        const notifEntry = {
          id: newId(),
          ...alert,
          channel,
          deliveryStatus: channel === 'whatsapp_webhook' ? 'sent' : 'sent',
          readAt: null,
          createdAt: new Date().toISOString(),
        };
        notificationLogs.unshift(notifEntry);
        if (channel === 'whatsapp_webhook') {
          dispatchWebhookPayload(schoolConfig.whatsappWebhookUrl, {
            event: alert.eventType,
            schoolName: schoolConfig.schoolName,
            ...alert,
          }).then((r) => {
            notifEntry.deliveryStatus = r.status;
          }).catch(() => {});
        }
      }
      if (notificationLogs.length > 1000) notificationLogs.length = 1000;
    }

    const affectedClassNames = [...new Set(saved.map(s => s.class).filter(Boolean))];
    const affectedStudentIds = [...new Set(saved.map(s => s.studentId).filter(Boolean))];
    realtimeHub.publish({
      type: 'attendance:updated',
      classNames: affectedClassNames,
      studentIds: affectedStudentIds,
      date: saved[0]?.date || null,
      session: cleanSession || 'both',
      updatedBy: req.authUser?.name || null,
    });
    if (alerts.length > 0) {
      realtimeHub.publish({
        type: 'notification:created',
        classNames: [...new Set(alerts.map(a => a.className).filter(Boolean))],
        studentIds: [...new Set(alerts.map(a => a.studentId).filter(Boolean))],
        recipientUserIds: [...new Set(alerts.map(a => a.recipientUserId).filter(Boolean))],
        date: saved[0]?.date || null,
        updatedBy: req.authUser?.name || null,
      });
    }

    res.json({
      success: true,
      savedCount: saved.length,
      notificationsTriggered: alerts.length,
      records: saved,
      message: 'Absensi piket berhasil disimpan.',
    });
  });

  // Helper internal: profil kehadiran & risk tier per siswa
  const buildStudentAttendanceBundle = (studentId, month) => {
    const student = siswaList.find(s => s.id === studentId);
    if (!student) return null;

    let piket = absensiPiketList.filter(a => a.studentId === studentId);
    let mapel = absensiMapelList.filter(a => a.studentId === studentId);
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      piket = piket.filter(a => (a.date || '').startsWith(month));
      mapel = mapel.filter(a => (a.date || '').startsWith(month));
    }

    piket = [...piket].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    mapel = [...mapel].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (a.jamKe || 0) - (b.jamKe || 0));

    const piketRecords = piket.map(a => ({
      id: a.id,
      date: a.date,
      statusPagi: a.statusPagi || '-',
      statusSore: a.statusSore || '-',
      updatedAt: a.updatedAt || null,
    }));

    const mapelRecords = mapel.map(a => ({
      id: a.id,
      date: a.date,
      jamKe: a.jamKe,
      mapelId: a.mapelId,
      subject: a.subject || '-',
      teacherName: a.teacherName || '-',
      class: a.class || student.class || '-',
      status: a.status,
    }));

    const piketSummary = {
      totalHari: piketRecords.length,
      hadir: piketRecords.filter(r => r.statusPagi === 'hadir').length,
      izin: piketRecords.filter(r => r.statusPagi === 'izin').length,
      sakit: piketRecords.filter(r => r.statusPagi === 'sakit').length,
      alpha: piketRecords.filter(r => r.statusPagi === 'alpha').length,
      bolos: piketRecords.filter(r => r.statusPagi === 'hadir' && r.statusSore === 'alpha').length,
    };

    const mapelHadir = mapelRecords.filter(r => r.status === 'hadir').length;
    const mapelTotal = mapelRecords.length;
    const mapelSummary = {
      totalSesi: mapelTotal,
      hadir: mapelHadir,
      izin: mapelRecords.filter(r => r.status === 'izin').length,
      sakit: mapelRecords.filter(r => r.status === 'sakit').length,
      alpha: mapelRecords.filter(r => r.status === 'alpha').length,
      persentase: mapelTotal > 0 ? Math.round((mapelHadir / mapelTotal) * 100) : 0,
    };

    const kelasObj = kelasList.find(k => k.name === student.class);
    const waliGuru = kelasObj?.teacherId ? guruList.find(g => g.id === kelasObj.teacherId) : null;
    const riskStatus = computeAttendanceRiskTier({ piketSummary, mapelSummary });

    return {
      success: true,
      month: month || 'all',
      student: {
        id: student.id,
        nomor: student.nomor || student.nis || '-',
        name: student.name,
        class: student.class || '-',
        gender: student.gender || 'L',
        status: student.status || 'aktif',
        phone: student.phone || '-',
        phone_parent: student.phone_parent || '-',
        alamat: student.alamat || '-',
        sekolah_asal: student.sekolah_asal || '-',
      },
      homeroomTeacher: waliGuru ? { id: waliGuru.id, name: waliGuru.name, phone: waliGuru.phone || '-' } : null,
      summary: {
        piket: piketSummary,
        mapel: mapelSummary,
      },
      riskStatus,
      piketRecords,
      mapelRecords,
    };
  };

  // --- Detail Kehadiran per Siswa (Piket + Mapel, strict ownership untuk wali_murid) ---
  router.get('/siswa/:id/absensi', requireStudentReadAccess, (req, res) => {
    const bundle = buildStudentAttendanceBundle(req.params.id, req.query.month);
    if (!bundle) {
      return res.status(404).json({ success: false, error: 'Data siswa tidak ditemukan.' });
    }
    res.json(bundle);
  });

  // --- Portal Wali Murid (Read-Only, strictly scoped to authUser.studentId) ---
  router.get('/guardian/overview', requireRole('wali_murid', 'admin'), (req, res) => {
    const targetStudentId =
      req.authUser.role === 'wali_murid'
        ? req.authUser.studentId
        : (req.query.studentId || req.authUser.studentId);

    if (!targetStudentId) {
      return res.status(400).json({
        success: false,
        error: 'Akun wali murid belum dihubungkan ke data siswa. Hubungi admin sekolah.',
      });
    }
    const bundle = buildStudentAttendanceBundle(targetStudentId, req.query.month);
    if (!bundle) {
      return res.status(404).json({ success: false, error: 'Data siswa yang terhubung tidak ditemukan.' });
    }
    res.json(bundle);
  });

  // --- Monitoring Wali Kelas (strictly scoped to Kelas.teacherId for role 'guru') ---
  router.get('/monitoring/homeroom', requireRole('guru', 'admin', 'kepsek', 'staff'), (req, res) => {
    const { month, kelas: kelasQuery } = req.query;
    const assignedClasses = req.authUser.role === 'guru'
      ? kelasList.filter(k => req.authUser.teacherId && k.teacherId === req.authUser.teacherId)
      : [...kelasList].sort((a, b) => a.name.localeCompare(b.name));

    if (assignedClasses.length === 0) {
      return res.json({ success: true, month: month || 'all', classes: [], students: [], summary: { total: 0, hijau: 0, kuning: 0, merah: 0 } });
    }

    const allowedNames = new Set(assignedClasses.map(c => c.name));
    const selectedClassName = kelasQuery && allowedNames.has(kelasQuery)
      ? kelasQuery
      : assignedClasses[0].name;

    const classStudents = siswaList.filter(
      s => s.class === selectedClassName && (s.status || 'aktif') === 'aktif'
    );

    const tierRank = { merah: 0, kuning: 1, hijau: 2 };
    const rows = classStudents.map(s => {
      const b = buildStudentAttendanceBundle(s.id, month);
      return {
        id: s.id,
        nomor: s.nomor || s.nis || '-',
        name: s.name,
        class: selectedClassName,
        phone_parent: s.phone_parent || '-',
        piket: b.summary.piket,
        mapel: b.summary.mapel,
        riskStatus: b.riskStatus,
      };
    }).sort((a, b) => (tierRank[a.riskStatus.tier] ?? 2) - (tierRank[b.riskStatus.tier] ?? 2) || a.name.localeCompare(b.name));

    res.json({
      success: true,
      month: month || 'all',
      selectedClass: selectedClassName,
      classes: assignedClasses.map(c => ({ id: c.id, name: c.name, grade: c.grade, major: c.major })),
      summary: {
        total: rows.length,
        hijau: rows.filter(r => r.riskStatus.tier === 'hijau').length,
        kuning: rows.filter(r => r.riskStatus.tier === 'kuning').length,
        merah: rows.filter(r => r.riskStatus.tier === 'merah').length,
      },
      students: rows,
    });
  });

  // --- Monitoring Kelas (CCTV Real-time) ---
  router.get('/monitoring/kelas', requireRole('admin', 'guru', 'staff', 'kepsek'), (req, res) => {
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
  router.get('/nilai', requireAuth, (req, res) => {
    const { studentId, mapelId, kelas, subject, type } = req.query;
    let list = [...nilaiList];
    if (req.authUser.role === 'wali_murid') {
      list = list.filter(n => n.studentId === (req.authUser.studentId || '__no_linked_student__'));
    } else {
      if (studentId) list = list.filter(n => n.studentId === studentId);
      if (kelas) list = list.filter(n => n.class === kelas);
    }
    if (mapelId) list = list.filter(n => n.mapelId === mapelId);
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
    logAudit(req, {
      action: 'GRADE_UPDATE',
      target: `${nilaiList[idx].studentName} (${nilaiList[idx].subject} - ${nilaiList[idx].type})`,
      detail: { score: nilaiList[idx].score },
    });
    res.json({ success: true, data: nilaiList[idx], message: 'Nilai siswa berhasil diperbarui.' });
  });

  router.delete('/nilai/:id', requireRole('admin', 'guru'), (req, res) => {
    const target = nilaiList.find(n => n.id === req.params.id);
    nilaiList = nilaiList.filter(n => n.id !== req.params.id);
    if (target) {
      logAudit(req, {
        action: 'GRADE_DELETE',
        target: `${target.studentName} (${target.subject} - ${target.type})`,
        detail: { previousScore: target.score },
      });
    }
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

  router.get('/poin-sikap', requireAuth, (req, res) => {
    const { siswaId } = req.query;
    let list = [...poinSikapList];
    if (req.authUser.role === 'wali_murid') {
      list = list.filter(p => p.siswaId === (req.authUser.studentId || '__no_linked_student__'));
    } else if (siswaId) {
      list = list.filter(p => p.siswaId === siswaId);
    }
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

  // --- School Geofence Settings (Authoritative for all devices, synced with SchoolConfig) ---
  let schoolGeofenceConfig = { ...DEFAULT_SCHOOL_GEOFENCE };

  router.get('/settings/geofence', requireAuth, (req, res) => {
    res.json({ success: true, data: schoolGeofenceConfig });
  });

  router.put('/settings/geofence', requireRole('admin'), (req, res) => {
    const valid = validateGeofenceConfig(req.body);
    if (!valid) {
      return res.status(400).json({
        success: false,
        error: 'Koordinat atau radius tidak valid (radius harus antara 20m – 2000m).',
      });
    }
    schoolGeofenceConfig = valid;
    schoolConfig = {
      ...schoolConfig,
      geofenceLat: valid.latitude,
      geofenceLng: valid.longitude,
      geofenceRadius: valid.radiusMeters,
    };
    logAudit(req, {
      action: 'SCHOOL_GEOFENCE_CONFIG',
      target: `Radius ${valid.radiusMeters}m`,
      detail: valid,
    });
    res.json({
      success: true,
      data: schoolGeofenceConfig,
      message: 'Pengaturan Geofence sekolah berhasil disimpan untuk semua perangkat.',
    });
  });

  // --- Guru Absensi (Protected & Server-Side Geofence Enforced) ---
  router.get('/guru/absen', requireRole('admin', 'guru', 'staff', 'kepsek'), (req, res) => {
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
      timeIn: a.jamMasuk ? String(a.jamMasuk).replace('.', ':') : null,
      jamMasuk: a.jamMasuk ? String(a.jamMasuk).replace('.', ':') : null,
      timeOut: a.jamPulang ? String(a.jamPulang).replace('.', ':') : null,
      jamPulang: a.jamPulang ? String(a.jamPulang).replace('.', ':') : null,
      source: a.sumber,
      sumber: a.sumber,
      distanceMeters: a.jarakMeter,
      jarakMeter: a.jarakMeter,
      isWithinGeofence: a.status !== 'luar_radius',
      keterangan: a.keterangan || '',
    })));
  });

  router.post('/guru/absen', requireRole('admin', 'guru', 'staff', 'kepsek'), (req, res) => {
    const { teacherName, teacherId, guruId, type, coords } = req.body || {};
    if (type !== 'in' && type !== 'out') {
      return res.status(400).json({ success: false, message: 'Tipe absen tidak valid' });
    }

    // 1. Validasi koordinat & jarak mutlak di dalam area sekolah langsung di server
    const validCoords = validateGeofenceCoords(coords);
    if (!validCoords) {
      return res.status(400).json({
        success: false,
        message: 'Koordinat GPS tidak valid. Silakan deteksi lokasi Anda di area sekolah terlebih dahulu.',
      });
    }

    const serverDistance = calculateHaversineMeters(
      validCoords.latitude,
      validCoords.longitude,
      schoolGeofenceConfig.latitude,
      schoolGeofenceConfig.longitude
    );

    if (serverDistance > schoolGeofenceConfig.radiusMeters) {
      return res.status(403).json({
        success: false,
        message: `Absen ditolak! Anda berada ${serverDistance}m dari sekolah (batas maksimal ${schoolGeofenceConfig.radiusMeters}m). Absensi mutlak harus dilakukan di dalam area sekolah.`,
        distanceMeters: serverDistance,
        radiusMeters: schoolGeofenceConfig.radiusMeters,
      });
    }

    // 2. Kunci identitas guru berdasarkan akun yang login
    const isAdmin = req.authUser?.role === 'admin';
    const targetGuruId = isAdmin
      ? (teacherId || guruId || req.authUser?.teacherId)
      : req.authUser?.teacherId;
    const targetName = isAdmin
      ? (teacherName || req.authUser?.name)
      : req.authUser?.name;

    let guru = guruList.find(g => (targetGuruId && g.id === targetGuruId) || (targetName && g.name === targetName));
    if (!guru && targetName) {
      guru = { id: targetGuruId || req.authUser?.id || newId(), name: targetName };
    }
    if (!guru) return res.status(404).json({ success: false, message: 'Data profil guru tidak ditemukan.' });

    const { dateStr } = getJakartaNow();
    const timeStr = formatJakartaTimeHHMM(new Date());
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

    if (type === 'in') {
      if (idx !== -1 && absensiGuruList[idx].jamMasuk) {
        return res.json({ success: false, message: 'Anda sudah absen masuk hari ini', record: toRecord(absensiGuruList[idx]) });
      }
      const rec = {
        id: idx !== -1 ? absensiGuruList[idx].id : newId(),
        guruId: guru.id,
        guruName: guru.name,
        tanggal: dateStr,
        status: 'hadir',
        sumber: 'gps',
        jamMasuk: timeStr,
        jamPulang: idx !== -1 ? absensiGuruList[idx].jamPulang : null,
        jarakMeter: serverDistance,
        keterangan: '',
      };
      if (idx !== -1) absensiGuruList[idx] = rec;
      else absensiGuruList.unshift(rec);
      return res.json({ success: true, message: `Berhasil Absen Masuk pukul ${timeStr} WIB!`, record: toRecord(rec) });
    }

    if (idx === -1 || !absensiGuruList[idx].jamMasuk) {
      return res.json({ success: false, message: 'Anda belum absen masuk' });
    }
    if (absensiGuruList[idx].jamPulang) {
      return res.json({ success: false, message: 'Anda sudah absen pulang hari ini', record: toRecord(absensiGuruList[idx]) });
    }
    absensiGuruList[idx] = { ...absensiGuruList[idx], jamPulang: timeStr, jarakMeter: serverDistance };
    return res.json({ success: true, message: `Berhasil Absen Pulang pukul ${timeStr} WIB!`, record: toRecord(absensiGuruList[idx]) });
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
    const target = guruList.find(g => g.id === req.params.id);
    guruList = guruList.filter(g => g.id !== req.params.id);
    if (target) {
      logAudit(req, {
        action: 'TEACHER_DELETE',
        target: target.name,
        detail: { nip: target.nip || null },
      });
    }
    res.json({ success: true, message: 'Guru berhasil dihapus' });
  });

  // --- Siswa ---
  const VALID_STUDENT_STATUSES = new Set(['aktif', 'lulus', 'pindah', 'nonaktif']);

  router.get('/siswa', requireAuth, (req, res) => {
    const { kelas, status, includeInactive, tahunAjarId, grade, search } = req.query;
    const { isPaginated, page, limit, skip } = parsePaginationParams(req.query, { defaultLimit: 25, maxLimit: 200 });
    const useExplicitYear = Boolean(tahunAjarId && tahunAjarId !== 'all');
    const resolvedYearId = useExplicitYear ? String(tahunAjarId) : (tahunAjarId === 'all' ? 'all' : (getActiveYear()?.id || null));

    const allWithYearClass = siswaList.map(s => {
      const resolved = resolveStudentClassForYear(s, resolvedYearId === 'all' ? null : resolvedYearId);
      return {
        id: s.id,
        nomor: s.nomor || s.nis || '-',
        nis: s.nis || s.nomor || '-',
        name: s.name,
        class: resolved.className,
        kelasId: resolved.kelasId,
        grade: resolved.grade || parseGradeFromClassName(resolved.className).grade,
        gender: s.gender || 'L',
        status: s.status || 'aktif',
        phone: s.phone || '-',
        phone_parent: s.phone_parent || '-',
        pekerjaan_ortu: s.pekerjaan_ortu || '-',
        alamat: s.alamat || '-',
        sekolah_asal: s.sekolah_asal || '-',
        _enrolled: resolved.enrolled,
      };
    });

    let list = [...allWithYearClass];
    if (req.authUser.role === 'wali_murid') {
      list = list.filter(s => s.id === (req.authUser.studentId || '__no_linked_student__'));
    } else {
      if (status && status !== 'all' && VALID_STUDENT_STATUSES.has(status)) {
        list = list.filter(s => s.status === status);
      } else if (includeInactive !== 'true' && status !== 'all') {
        list = list.filter(s => s.status === 'aktif');
      }
      if (useExplicitYear && status !== 'lulus' && status !== 'all') {
        list = list.filter(s => s._enrolled);
      }
      if (kelas && kelas !== 'Semua') list = list.filter(s => s.class === kelas);
      if (grade && grade !== 'Semua' && ['X', 'XI', 'XII'].includes(String(grade).toUpperCase())) {
        const gUpper = String(grade).toUpperCase();
        list = list.filter(s => (s.grade || '').toUpperCase() === gUpper);
      }
      const cleanSearch = String(search || '').trim().toLowerCase();
      if (cleanSearch) {
        list = list.filter(
          s =>
            s.name.toLowerCase().includes(cleanSearch) ||
            String(s.nomor || '').toLowerCase().includes(cleanSearch) ||
            String(s.class || '').toLowerCase().includes(cleanSearch)
        );
      }
    }

    list.sort((a, b) => a.name.localeCompare(b.name));
    const stripInternal = ({ _enrolled, ...rest }) => rest;

    if (isPaginated) {
      const counts = { aktif: 0, lulus: 0, pindah: 0, nonaktif: 0, total: siswaList.length };
      for (const s of siswaList) {
        const st = s.status || 'aktif';
        if (counts[st] !== undefined) counts[st]++;
      }
      return res.json({
        success: true,
        items: list.slice(skip, skip + limit).map(stripInternal),
        pagination: buildPaginationMeta(list.length, page, limit),
        counts,
        tahunAjarId: useExplicitYear ? String(tahunAjarId) : null,
      });
    }

    res.json(list.map(stripInternal));
  });

  router.post('/siswa', requireRole('admin', 'staff'), (req, res) => {
    const { nomor, nis, name, gender, status, phone, phone_parent, pekerjaan_ortu, alamat, sekolah_asal, class: kelasName } = req.body || {};
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
      status: VALID_STUDENT_STATUSES.has(status) ? status : 'aktif',
      phone: phone ? String(phone).trim() : '-',
      phone_parent: phone_parent ? String(phone_parent).trim() : '-',
      pekerjaan_ortu: pekerjaan_ortu ? String(pekerjaan_ortu).trim() : '-',
      alamat: alamat ? String(alamat).trim() : '-',
      sekolah_asal: sekolah_asal ? String(sekolah_asal).trim() : '-',
    };
    siswaList.push(siswa);
    const activeYr = getActiveYear();
    const clsObj = kelasList.find(k => k.name === siswa.class);
    if (activeYr && clsObj) {
      riwayatKelasList.push({ id: newId(), siswaId: siswa.id, kelasId: clsObj.id, tahunAjarId: activeYr.id });
    }
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
        status: 'aktif',
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
    const { nomor, nis, name, gender, status, phone, phone_parent, pekerjaan_ortu, alamat, sekolah_asal, class: kelasName } = req.body || {};
    if (status !== undefined && !VALID_STUDENT_STATUSES.has(status)) {
      return res.status(400).json({ success: false, error: 'Status siswa tidak valid.' });
    }
    const finalNomor = nomor !== undefined ? (nomor ? String(nomor).trim() : null) : siswaList[idx].nomor;
    siswaList[idx] = {
      ...siswaList[idx],
      nomor: finalNomor,
      nis: finalNomor || nis || siswaList[idx].nis,
      name: name ?? siswaList[idx].name,
      class: kelasName ?? siswaList[idx].class,
      gender: gender || siswaList[idx].gender,
      status: status ?? siswaList[idx].status ?? 'aktif',
      phone: phone !== undefined ? (phone ? String(phone).trim() : '-') : siswaList[idx].phone,
      phone_parent: phone_parent !== undefined ? (phone_parent ? String(phone_parent).trim() : '-') : siswaList[idx].phone_parent,
      pekerjaan_ortu: pekerjaan_ortu !== undefined ? (pekerjaan_ortu ? String(pekerjaan_ortu).trim() : '-') : siswaList[idx].pekerjaan_ortu,
      alamat: alamat !== undefined ? (alamat ? String(alamat).trim() : '-') : siswaList[idx].alamat,
      sekolah_asal: sekolah_asal !== undefined ? (sekolah_asal ? String(sekolah_asal).trim() : '-') : siswaList[idx].sekolah_asal,
    };
    res.json({ success: true, data: siswaList[idx], message: 'Data siswa berhasil diperbarui' });
  });

  router.delete('/siswa/:id', requireRole('admin', 'staff'), (req, res) => {
    const idx = siswaList.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Siswa tidak ditemukan' });
    const force = req.query.force === 'true';
    const hasHistory =
      absensiPiketList.some(a => a.studentId === req.params.id) ||
      absensiMapelList.some(a => a.studentId === req.params.id);

    if (!force && hasHistory) {
      siswaList[idx] = { ...siswaList[idx], status: 'nonaktif' };
      logAudit(req, {
        action: 'STUDENT_ARCHIVE',
        target: siswaList[idx].name,
        detail: { reason: 'has_attendance_history' },
      });
      return res.json({
        success: true,
        archived: true,
        message: 'Siswa memiliki riwayat absensi, status diubah menjadi Nonaktif agar data kehadiran tetap aman.',
      });
    }

    siswaList = siswaList.filter(s => s.id !== req.params.id);
    res.json({ success: true, archived: false, message: 'Siswa berhasil dihapus permanen.' });
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
    const oldName = kelasList[idx].name;
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
    if (oldName !== trimmedName) {
      jadwalList = jadwalList.map(j => (j.class === oldName ? { ...j, class: trimmedName } : j));
      absensiMapelList = absensiMapelList.map(a => (a.class === oldName ? { ...a, class: trimmedName } : a));
      absensiPiketList = absensiPiketList.map(a => (a.class === oldName ? { ...a, class: trimmedName } : a));
      siswaList = siswaList.map(s => (s.class === oldName ? { ...s, class: trimmedName } : s));
    }
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

  // --- Tutup Semester & Kenaikan Kelas Massal (Preview & Execute) ---
  router.get('/tahun-ajar/rollover-preview', requireRole('admin'), (req, res) => {
    const { sourceYearId, targetYearId, mode = 'promote' } = req.query;
    const cleanMode = mode === 'semester' ? 'semester' : 'promote';

    const sourceYear = sourceYearId
      ? tahunAjarList.find(y => y.id === String(sourceYearId))
      : getActiveYear();
    if (!sourceYear) {
      return res.status(404).json({ success: false, error: 'Tahun ajar sumber tidak ditemukan.' });
    }
    const targetYear = targetYearId ? tahunAjarList.find(y => y.id === String(targetYearId)) : null;

    const sourceEnrollments = riwayatKelasList.filter(r => {
      if (r.tahunAjarId !== sourceYear.id) return false;
      const st = siswaList.find(s => s.id === r.siswaId);
      return st && (st.status || 'aktif') === 'aktif';
    });
    const alreadyEnrolledSet = new Set(
      targetYear ? riwayatKelasList.filter(r => r.tahunAjarId === targetYear.id).map(r => r.siswaId) : []
    );

    const groupsMap = new Map();
    const flatEnrollments = [];

    for (const enr of sourceEnrollments) {
      const st = siswaList.find(s => s.id === enr.siswaId);
      const cls = kelasList.find(k => k.id === enr.kelasId);
      if (!st || !cls) continue;
      if (!groupsMap.has(cls.id)) {
        groupsMap.set(cls.id, {
          id: cls.id,
          name: cls.name,
          grade: cls.grade,
          major: cls.major,
          studentCount: 0,
          students: [],
        });
      }
      const grp = groupsMap.get(cls.id);
      grp.studentCount++;
      grp.students.push({
        studentId: st.id,
        studentName: st.name,
        nis: st.nomor || st.nis || '-',
        gender: st.gender || 'L',
        alreadyEnrolledInTarget: alreadyEnrolledSet.has(st.id),
      });
      flatEnrollments.push({
        studentId: st.id,
        studentName: st.name,
        classId: cls.id,
        className: cls.name,
      });
    }

    const groups = Array.from(groupsMap.values())
      .map(g => ({ ...g, students: g.students.sort((a, b) => a.studentName.localeCompare(b.studentName)) }))
      .sort((a, b) => String(a.grade || '').localeCompare(String(b.grade || '')) || a.name.localeCompare(b.name));

    const mappings = suggestClassMapping(groups, kelasList, cleanMode);
    const previewPlan = buildRolloverPlan({
      enrollments: flatEnrollments,
      mappings,
      alreadyEnrolledStudentIds: Array.from(alreadyEnrolledSet),
      validClassIds: kelasList.map(c => c.id),
    });

    res.json({
      success: true,
      mode: cleanMode,
      sourceYear: { id: sourceYear.id, nama: sourceYear.nama, semester: sourceYear.semester, isActive: sourceYear.isActive },
      targetYear: targetYear
        ? { id: targetYear.id, nama: targetYear.nama, semester: targetYear.semester, isActive: targetYear.isActive }
        : null,
      classes: kelasList.map(c => ({ id: c.id, name: c.name, grade: c.grade, major: c.major })),
      mappings,
      groups,
      summary: previewPlan.summary,
      missingMappings: mappings.filter(m => m.action === 'promote' && !m.targetClassId).map(m => m.sourceClassName),
    });
  });

  router.post('/tahun-ajar/rollover', requireRole('admin'), (req, res) => {
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

    const sourceYear = tahunAjarList.find(y => y.id === String(sourceYearId));
    const targetYear = tahunAjarList.find(y => y.id === String(targetYearId));
    if (!sourceYear || !targetYear) {
      return res.status(404).json({ success: false, error: 'Tahun ajar sumber atau tujuan tidak ditemukan.' });
    }

    const flatEnrollments = riwayatKelasList
      .filter(r => {
        if (r.tahunAjarId !== sourceYear.id) return false;
        const st = siswaList.find(s => s.id === r.siswaId);
        return st && (st.status || 'aktif') === 'aktif';
      })
      .map(r => {
        const st = siswaList.find(s => s.id === r.siswaId);
        const cls = kelasList.find(k => k.id === r.kelasId);
        return { studentId: r.siswaId, studentName: st?.name || '-', classId: r.kelasId, className: cls?.name || '-' };
      });

    const plan = buildRolloverPlan({
      enrollments: flatEnrollments,
      mappings: Array.isArray(mappings) ? mappings : [],
      retainStudentIds: Array.isArray(retainStudentIds) ? retainStudentIds : [],
      excludedStudentIds: Array.isArray(excludedStudentIds) ? excludedStudentIds : [],
      validClassIds: kelasList.map(c => c.id),
    });

    if (!plan.valid) {
      return res.status(400).json({
        success: false,
        error: plan.errors[0] || 'Pemetaan kelas tujuan belum lengkap.',
        errors: plan.errors,
      });
    }

    for (const act of plan.actions) {
      if (['promote', 'keep', 'retain'].includes(act.action) && act.targetClassId) {
        const existingIdx = riwayatKelasList.findIndex(
          r => r.siswaId === act.studentId && r.tahunAjarId === targetYear.id
        );
        if (existingIdx !== -1) {
          riwayatKelasList[existingIdx].kelasId = act.targetClassId;
        } else {
          riwayatKelasList.push({ id: newId(), siswaId: act.studentId, kelasId: act.targetClassId, tahunAjarId: targetYear.id });
        }
        if (activateTargetYear) {
          const st = siswaList.find(s => s.id === act.studentId);
          const targetCls = kelasList.find(k => k.id === act.targetClassId);
          if (st && targetCls) st.class = targetCls.name;
        }
      } else if (act.action === 'graduate') {
        const st = siswaList.find(s => s.id === act.studentId);
        if (st) st.status = 'lulus';
      }
    }

    if (activateTargetYear) {
      tahunAjarList = tahunAjarList.map(t => ({ ...t, isActive: t.id === targetYear.id }));
      for (const cls of kelasList) {
        const activeCount = riwayatKelasList.filter(r => {
          if (r.tahunAjarId !== targetYear.id || r.kelasId !== cls.id) return false;
          const st = siswaList.find(s => s.id === r.siswaId);
          return st && (st.status || 'aktif') === 'aktif';
        }).length;
        cls.totalStudents = activeCount;
      }
    }

    logAktivitasList.unshift({
      id: newId(),
      userId: req.authUser?.id || null,
      userName: req.authUser?.name || req.authUser?.username || 'Admin',
      action: 'BULK_ACADEMIC_ROLLOVER',
      target: `${sourceYear.nama} Smt ${sourceYear.semester} -> ${targetYear.nama} Smt ${targetYear.semester}`,
      details: JSON.stringify({ mode, activateTargetYear: Boolean(activateTargetYear), summary: plan.summary }),
      createdAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      summary: plan.summary,
      activatedTargetYear: Boolean(activateTargetYear),
      message: `Proses ${mode === 'semester' ? 'Tutup Semester' : 'Kenaikan Kelas & Kelulusan'} berhasil: ${plan.summary.toPromote + plan.summary.toKeep} siswa dipindahkan, ${plan.summary.toGraduate} siswa diluluskan, ${plan.summary.toRetain} tinggal kelas.`,
    });
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
      return res.status(400).json({ success: false, error: 'Data absensi kosong' });
    }
    const nowIso = new Date().toISOString();
    const recordedByUserId = req.authUser?.id || null;
    const recordedByName = req.authUser?.name || null;
    let savedCount = 0;
    for (const record of records) {
      if (!record.studentId || !record.date) continue;
      if (!VALID_NON_EMPTY_ATTENDANCE.has(record.status)) continue;
      const student = siswaList.find(s => s.id === record.studentId);
      if (!student) continue;
      const mapelId = record.mapelId || record.subjectId;
      const guruId =
        req.authUser.role === 'guru' && req.authUser.teacherId
          ? req.authUser.teacherId
          : (record.guruId || record.teacherId || req.authUser?.teacherId || 'g001');
      const kelasName = record.class || record.kelasName || student.class || '-';
      const kelasObj = kelasList.find(k => k.id === record.kelasId || k.name === kelasName);
      const idx = absensiMapelList.findIndex(
        a => a.studentId === record.studentId && a.mapelId === mapelId && a.date === record.date && Number(a.jamKe) === Number(record.jamKe)
      );
      const mapel = mapelList.find(m => m.id === mapelId || m.nama === record.subject);
      const guru = guruList.find(g => g.id === guruId);
      if (!guru) continue;
      const item = {
        id: idx !== -1 ? absensiMapelList[idx].id : newId(),
        studentId: record.studentId,
        studentName: student.name,
        mapelId: mapel?.id || mapelId,
        subject: mapel?.nama || record.subject || '-',
        guruId: guru.id,
        teacherName: guru.name,
        kelasId: kelasObj?.id || null,
        class: kelasObj?.name || kelasName,
        recordedByUserId,
        recordedByName: recordedByName || guru.name,
        date: record.date,
        jamKe: Number(record.jamKe) || 1,
        status: record.status,
        updatedAt: nowIso,
      };
      if (idx !== -1) absensiMapelList[idx] = item;
      else absensiMapelList.push(item);
      savedCount++;
    }
    if (savedCount === 0) {
      return res.status(400).json({ success: false, error: 'Tidak ada data absensi mapel yang valid.' });
    }
    const mapelClasses = [...new Set(records.map(r => r.class || r.kelasName || siswaList.find(s => s.id === r.studentId)?.class).filter(Boolean))];
    const mapelStudentIds = [...new Set(records.map(r => r.studentId).filter(Boolean))];
    realtimeHub.publish({
      type: 'subject-attendance:updated',
      classNames: mapelClasses,
      studentIds: mapelStudentIds,
      date: records[0]?.date || null,
      updatedBy: req.authUser?.name || null,
    });
    res.json({ success: true, savedCount, message: 'Absensi mapel berhasil disimpan.' });
  });

  router.get('/absensi-mapel', requireAuth, (req, res) => {
    const { kelas, mapel, date, month, studentId, tahunAjarId } = req.query;
    const { isPaginated, page, limit, skip } = parsePaginationParams(req.query, { defaultLimit: 50, maxLimit: 200 });
    let list = [...absensiMapelList];
    if (req.authUser.role === 'wali_murid') {
      list = list.filter(a => a.studentId === (req.authUser.studentId || '__no_linked_student__'));
    } else {
      if (studentId) list = list.filter(a => a.studentId === studentId);
      if (kelas && kelas !== 'Semua') list = list.filter(a => a.class === kelas);
    }
    if (tahunAjarId && tahunAjarId !== 'all') {
      list = list.filter(a => matchesAcademicYearRecord(a, String(tahunAjarId)));
    }
    if (mapel && mapel !== 'Semua') list = list.filter(a => a.mapelId === mapel || a.subject === mapel);
    if (date) list = list.filter(a => a.date === date);
    if (month && month !== 'all') list = list.filter(a => (a.date || '').startsWith(month));
    list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (a.jamKe || 0) - (b.jamKe || 0));

    if (isPaginated) {
      return res.json({
        success: true,
        items: list.slice(skip, skip + limit),
        pagination: buildPaginationMeta(list.length, page, limit),
      });
    }
    res.json(list);
  });

  router.get('/absensi-mapel/rekap', requireRole('admin', 'guru', 'staff', 'kepsek'), (req, res) => {
    const { kelas, mapel, month, tahunAjarId, search } = req.query;
    const { isPaginated, page, limit } = parsePaginationParams(req.query, { defaultLimit: 25, maxLimit: 200 });
    const targetYear = tahunAjarId && tahunAjarId !== 'all'
      ? tahunAjarList.find(t => t.id === String(tahunAjarId))
      : (tahunAjarId === 'all' ? null : getActiveYear());

    let list = [...absensiMapelList];
    if (targetYear) list = list.filter(a => matchesAcademicYearRecord(a, targetYear.id));
    if (kelas && kelas !== 'Semua') list = list.filter(a => a.class === kelas);
    if (month && month !== 'all') list = list.filter(a => (a.date || '').startsWith(month));
    if (mapel && mapel !== 'Semua' && mapel !== 'semua') {
      list = list.filter(a => a.mapelId === mapel || a.subject === mapel);
    }

    const sesiSet = new Set();
    const totals = { hadir: 0, izin: 0, sakit: 0, alpha: 0, totalRecords: 0, attendanceRate: 0 };
    const studentMap = {};

    list.forEach(a => {
      sesiSet.add(`${a.date}_${a.jamKe}_${a.mapelId}`);
      if (totals[a.status] !== undefined) {
        totals[a.status]++;
        totals.totalRecords++;
      }
      if (!studentMap[a.studentId]) {
        const st = siswaList.find(item => item.id === a.studentId);
        studentMap[a.studentId] = {
          studentId: a.studentId,
          studentName: a.studentName,
          nis: st?.nomor || st?.nis || '-',
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

    totals.attendanceRate = totals.totalRecords > 0
      ? Math.round((totals.hadir / totals.totalRecords) * 100)
      : 0;

    const cleanSearch = String(search || '').trim().toLowerCase();
    let rekapAll = Object.values(studentMap)
      .map(s => {
        const totalSesi = s.hadir + s.izin + s.sakit + s.alpha;
        return { ...s, totalSesi, persentase: totalSesi > 0 ? Math.round((s.hadir / totalSesi) * 100) : 0 };
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName));

    if (cleanSearch) {
      rekapAll = rekapAll.filter(
        r =>
          r.studentName.toLowerCase().includes(cleanSearch) ||
          String(r.nis || '').toLowerCase().includes(cleanSearch) ||
          String(r.class || '').toLowerCase().includes(cleanSearch)
      );
    }

    const pagination = buildPaginationMeta(rekapAll.length, page, limit);
    const rekap = isPaginated
      ? rekapAll.slice((pagination.page - 1) * pagination.limit, pagination.page * pagination.limit)
      : rekapAll;

    res.json({
      success: true,
      totalSesiGuru: sesiSet.size,
      kelas: kelas || 'Semua',
      bulan: month || 'all',
      tahunAjarId: targetYear?.id || null,
      mapelId: mapel || 'semua',
      totals,
      rekap,
      pagination,
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
      totalStudents: siswaList.filter(s => (s.status || 'aktif') === 'aktif').length,
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

  // --- Mount Real-Time SSE Hub & Modular Routers (Audit/Backup, School Config/Notifications, Operations) ---
  router.use(realtimeHub.createRouter());
  router.use(
    createAuditRouter({
      listAuditLogs: async ({ action, search, page, limit }) => {
        let filtered = [...logAktivitasList];
        if (action) filtered = filtered.filter(l => l.action === action);
        if (search) {
          const q = search.toLowerCase();
          filtered = filtered.filter(
            l =>
              String(l.userName || '').toLowerCase().includes(q) ||
              String(l.action || '').toLowerCase().includes(q) ||
              String(l.target || '').toLowerCase().includes(q) ||
              String(l.detail || '').toLowerCase().includes(q)
          );
        }
        const actions = [...new Set(logAktivitasList.map(l => l.action))].sort();
        const start = (page - 1) * limit;
        return {
          total: filtered.length,
          items: filtered.slice(start, start + limit),
          actions,
        };
      },
      revokeUserSessions: async (userId) => {
        const idx = users.findIndex(u => u.id === userId);
        if (idx === -1) return null;
        const nextTv = (Number(users[idx].tokenVersion) || 1) + 1;
        users[idx] = { ...users[idx], tokenVersion: nextTv };
        tokenVersionGuard.invalidateUserSession(userId);
        return {
          id: users[idx].id,
          username: users[idx].username,
          name: users[idx].name,
          tokenVersion: nextTv,
        };
      },
      buildBackupSnapshot: async () => ({
        counts: {
          tahunAjar: tahunAjarList.length,
          kelas: kelasList.length,
          guru: guruList.length,
          siswa: siswaList.length,
          riwayatKelas: riwayatKelasList.length,
          mapel: mapelList.length,
          absensi: absensiPiketList.length,
          nilai: nilaiList.length,
          pembayaran: pembayaranList.length,
          absensiSholat: absenSholatList.length,
          users: users.length,
        },
        data: {
          schoolConfig,
          tahunAjar: tahunAjarList,
          kelas: kelasList,
          guru: guruList,
          siswa: siswaList,
          riwayatKelas: riwayatKelasList,
          mapel: mapelList,
          absensi: absensiPiketList,
          nilai: nilaiList,
          pembayaran: pembayaranList,
          absensiSholat: absenSholatList,
          users: users.map(({ password: _omit, ...safe }) => safe),
        },
      }),
      recordBackupRun: async ({ exportedAt }) => {
        schoolConfig = { ...schoolConfig, lastBackupAt: exportedAt };
      },
      logAudit,
    })
  );

  router.use(
    createSchoolConfigRouter({
      getSchoolConfig: async () => ({
        ...schoolConfig,
        geofenceLat: schoolGeofenceConfig.latitude,
        geofenceLng: schoolGeofenceConfig.longitude,
        geofenceRadius: schoolGeofenceConfig.radiusMeters,
      }),
      saveSchoolConfig: async (patch) => {
        schoolConfig = { ...schoolConfig, ...patch, updatedAt: new Date().toISOString() };
        if (patch.geofenceLat !== undefined || patch.geofenceLng !== undefined || patch.geofenceRadius !== undefined) {
          schoolGeofenceConfig = {
            latitude: Number(schoolConfig.geofenceLat),
            longitude: Number(schoolConfig.geofenceLng),
            radiusMeters: Number(schoolConfig.geofenceRadius),
          };
        }
        return { ...schoolConfig };
      },
      listNotifications: async ({ user, unreadOnly, eventType, page, limit }) => {
        let list = [...notificationLogs];
        if (user.role === 'wali_murid') {
          list = list.filter(
            n => n.recipientUserId === user.id || (user.studentId && n.studentId === user.studentId && n.recipientRole === 'wali_murid')
          );
        } else if (user.role === 'guru') {
          const homeroomNames = new Set((user.homeroomClasses || []).map(c => c.name));
          list = list.filter(
            n => n.recipientUserId === user.id || (n.recipientRole === 'guru' && homeroomNames.has(n.className))
          );
        }
        if (eventType) list = list.filter(n => n.eventType === eventType);
        const unreadCount = list.filter(n => !n.readAt).length;
        if (unreadOnly) list = list.filter(n => !n.readAt);
        const start = (page - 1) * limit;
        return {
          total: list.length,
          unreadCount,
          items: list.slice(start, start + limit),
        };
      },
      createNotification: async (entry) => {
        const created = { id: newId(), ...entry, readAt: null, createdAt: new Date().toISOString() };
        notificationLogs.unshift(created);
        return created;
      },
      markNotificationRead: async (id, user) => {
        const idx = notificationLogs.findIndex(n => n.id === id);
        if (idx === -1) return null;
        if (user.role === 'wali_murid' && notificationLogs[idx].recipientUserId !== user.id && notificationLogs[idx].studentId !== user.studentId) {
          return null;
        }
        notificationLogs[idx] = { ...notificationLogs[idx], readAt: new Date().toISOString() };
        return notificationLogs[idx];
      },
      markAllNotificationsRead: async (user) => {
        let count = 0;
        const now = new Date().toISOString();
        const homeroomNames = new Set((user.homeroomClasses || []).map(c => c.name));
        notificationLogs = notificationLogs.map(n => {
          if (n.readAt) return n;
          const visible =
            ['admin', 'staff', 'kepsek'].includes(user.role) ||
            n.recipientUserId === user.id ||
            (user.role === 'wali_murid' && user.studentId && n.studentId === user.studentId) ||
            (user.role === 'guru' && n.recipientRole === 'guru' && homeroomNames.has(n.className));
          if (!visible) return n;
          count++;
          return { ...n, readAt: now };
        });
        return count;
      },
      logAudit,
    })
  );

  router.use(
    createOperationsRouter({
      listPayments: async ({ status, kelas, search, studentId, page, limit }) => {
        let list = [...pembayaranList];
        if (studentId) list = list.filter(p => p.studentId === studentId);
        if (status) list = list.filter(p => p.status === status);
        if (kelas) list = list.filter(p => p.class === kelas);
        if (search) {
          const q = search.toLowerCase();
          list = list.filter(
            p =>
              String(p.studentName || '').toLowerCase().includes(q) ||
              String(p.month || '').toLowerCase().includes(q) ||
              String(p.type || '').toLowerCase().includes(q)
          );
        }
        const summary = list.reduce(
          (acc, r) => {
            acc.totalTagihan += Number(r.amount) || 0;
            acc.totalTerbayar += Number(r.paid) || 0;
            if (r.status === 'lunas') acc.countLunas++;
            else if (r.status === 'cicilan') acc.countCicilan++;
            else acc.countBelum++;
            return acc;
          },
          { totalTagihan: 0, totalTerbayar: 0, totalTunggakan: 0, countLunas: 0, countCicilan: 0, countBelum: 0 }
        );
        summary.totalTunggakan = Math.max(0, summary.totalTagihan - summary.totalTerbayar);
        const start = (page - 1) * limit;
        return { total: list.length, summary, items: list.slice(start, start + limit) };
      },
      createPayment: async (body) => {
        const student = siswaList.find(s => s.id === body.studentId);
        if (!student) throw new Error('Data siswa tidak ditemukan.');
        const created = {
          id: newId(),
          studentId: student.id,
          studentName: student.name,
          class: student.class || '-',
          type: body.type,
          month: body.month,
          amount: body.amount,
          paid: body.paid,
          status: body.status,
          date: body.date || null,
        };
        pembayaranList.unshift(created);
        return created;
      },
      updatePayment: async (id, patch) => {
        const idx = pembayaranList.findIndex(p => p.id === id);
        if (idx === -1) return null;
        const prev = pembayaranList[idx];
        const nextAmount = patch.amount !== undefined ? patch.amount : prev.amount;
        const nextPaid = patch.paid !== undefined ? patch.paid : prev.paid;
        const nextStatus = patch.status || computePaymentStatus(nextAmount, nextPaid);
        pembayaranList[idx] = {
          ...prev,
          ...(patch.type ? { type: patch.type } : {}),
          ...(patch.month ? { month: patch.month } : {}),
          amount: nextAmount,
          paid: nextPaid,
          status: nextStatus,
          date:
            patch.date !== undefined
              ? patch.date
              : nextPaid > prev.paid
                ? getJakartaNow().dateStr
                : prev.date,
        };
        return pembayaranList[idx];
      },
      deletePayment: async (id) => {
        const target = pembayaranList.find(p => p.id === id);
        if (!target) return null;
        pembayaranList = pembayaranList.filter(p => p.id !== id);
        return target;
      },
      listPrayerAttendance: async ({ date, kelas, studentId }) => {
        let activeStudents = siswaList.filter(s => (s.status || 'aktif') === 'aktif');
        if (studentId) activeStudents = activeStudents.filter(s => s.id === studentId);
        if (kelas) activeStudents = activeStudents.filter(s => s.class === kelas);

        const rowMap = new Map(
          absenSholatList.filter(r => r.date === date).map(r => [r.studentId, r])
        );
        const items = activeStudents
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(s => {
            const saved = rowMap.get(s.id);
            return {
              id: saved?.id || `prayer-${s.id}-${date}`,
              studentId: s.id,
              studentName: s.name,
              nis: s.nis || s.nomor || '-',
              class: s.class || '-',
              date,
              dzuhur: Boolean(saved?.dzuhur),
              ashar: Boolean(saved?.ashar),
            };
          });
        return {
          items,
          summary: {
            totalStudents: items.length,
            dzuhurCount: items.filter(i => i.dzuhur).length,
            asharCount: items.filter(i => i.ashar).length,
            lengkapCount: items.filter(i => i.dzuhur && i.ashar).length,
          },
        };
      },
      savePrayerAttendanceBatch: async ({ date, records }) => {
        let count = 0;
        for (const rec of records) {
          const student = siswaList.find(s => s.id === rec.studentId);
          if (!student) continue;
          const idx = absenSholatList.findIndex(r => r.studentId === rec.studentId && r.date === date);
          if (idx !== -1) {
            absenSholatList[idx] = {
              ...absenSholatList[idx],
              dzuhur: Boolean(rec.dzuhur),
              ashar: Boolean(rec.ashar),
            };
          } else {
            absenSholatList.push({
              id: newId(),
              studentId: student.id,
              studentName: student.name,
              class: student.class || '-',
              date,
              dzuhur: Boolean(rec.dzuhur),
              ashar: Boolean(rec.ashar),
            });
          }
          count++;
        }
        return { count };
      },
      logAudit,
    })
  );

  return router;
}
