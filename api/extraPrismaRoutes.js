import express from 'express';
import {
  buildUserCapabilities,
  clearSessionCookie,
  computeAttendanceRiskTier,
  hashPasswordAsync,
  isValidRole,
  normalizeRole,
  requireAuth,
  requirePiketAccess,
  requireRole,
  requireStudentReadAccess,
  sanitizeSafeUrl,
  setAuthNoStoreHeaders,
  setSessionCookie,
  signToken,
  validateNewPassword,
  verifyPasswordAsync,
} from './authUtils.js';
import { MOCK_TIME_SLOTS, MOCK_NEWS } from '../src/services/mockData.js';

const VALID_PPDB_STATUSES = new Set(['Menunggu Verifikasi', 'Diterima', 'Cadangan', 'Ditolak']);
const VALID_NON_EMPTY_ATTENDANCE = new Set(['hadir', 'izin', 'sakit', 'alpha']);
const VALID_ATTENDANCE_STATUSES = new Set(['hadir', 'izin', 'sakit', 'alpha', null, '', undefined]);

export function createExtraPrismaRoutes(prisma, { getActiveTahunAjar } = {}) {
  const router = express.Router();
  const resolveActiveTahunAjar = getActiveTahunAjar
    || (() => prisma.tahunAjar.findFirst({ where: { isActive: true } }));

  // ==========================================
  // 1. AUTH SESSION & USER CRUD (ADMIN)
  // ==========================================
  router.get('/auth/me', async (req, res) => {
    setAuthNoStoreHeaders(res);
    if (!req.authUser) {
      return res.status(200).json({ success: false, authenticated: false, user: null });
    }
    try {
      const user = await prisma.user.findUnique({ where: { id: req.authUser.id } });
      if (!user) {
        clearSessionCookie(req, res);
        return res.status(200).json({ success: false, authenticated: false, user: null });
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
        teacherId: user.teacherId || null,
        studentId: user.studentId || null,
        homeroomClasses,
      };
      const safeUser = {
        ...baseUser,
        capabilities: buildUserCapabilities(baseUser, homeroomClasses),
      };
      const token = signToken(safeUser, { rememberMe: true });
      setSessionCookie(req, res, token, { rememberMe: true });
      res.json({
        success: true,
        authenticated: true,
        token,
        user: safeUser,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/auth/logout', (req, res) => {
    clearSessionCookie(req, res);
    res.json({ success: true, message: 'Berhasil keluar dari sesi.' });
  });

  // Self-service password change for any authenticated user (verifies old password & refreshes session)
  router.post('/auth/change-password', requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, error: 'Password lama dan password baru wajib diisi.' });
      }
      const user = await prisma.user.findUnique({ where: { id: req.authUser.id } });
      if (!user) {
        return res.status(404).json({ success: false, error: 'Akun tidak ditemukan.' });
      }
      const { valid: oldValid } = await verifyPasswordAsync(currentPassword, user.password);
      if (!oldValid) {
        return res.status(400).json({ success: false, error: 'Password lama tidak sesuai.' });
      }
      const check = validateNewPassword(newPassword, currentPassword);
      if (!check.valid) {
        return res.status(400).json({ success: false, error: check.error });
      }

      const hashed = await hashPasswordAsync(check.value);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed },
      });

      const token = signToken(req.authUser, { rememberMe: true });
      setSessionCookie(req, res, token, { rememberMe: true });
      res.json({
        success: true,
        token,
        message: 'Password berhasil diperbarui! Sesi login Anda tetap aktif.',
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/users', requireRole('admin'), async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        include: {
          guru: { include: { kelasWali: { select: { id: true, name: true } } } },
          siswa: true,
        },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      });
      res.json(users.map(u => {
        const homeroomClasses = u.guru?.kelasWali || [];
        const isPiket = u.role === 'guru' ? Boolean(u.isPiket) : false;
        return {
          id: u.id,
          username: u.username,
          name: u.name,
          role: u.role,
          isPiket,
          teacherId: u.teacherId || null,
          teacherName: u.guru?.name || null,
          homeroomClasses,
          studentId: u.studentId || null,
          studentName: u.siswa?.name || null,
          capabilities: buildUserCapabilities({ ...u, isPiket }, homeroomClasses),
          createdAt: u.createdAt,
        };
      }));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/users', requireRole('admin'), async (req, res) => {
    try {
      const { username, password, name, role, isPiket, teacherId, studentId } = req.body || {};
      const cleanUsername = String(username || '').trim();
      const cleanName = String(name || '').trim();
      if (!cleanUsername || !cleanName || !password || String(password).length < 6) {
        return res.status(400).json({ success: false, error: 'Username, nama, dan password (min. 6 karakter) wajib diisi.' });
      }
      if (!isValidRole(role)) {
        return res.status(400).json({ success: false, error: 'Role tidak valid.' });
      }
      const existing = await prisma.user.findUnique({ where: { username: cleanUsername } });
      if (existing) {
        return res.status(400).json({ success: false, error: `Username "${cleanUsername}" sudah digunakan.` });
      }

      const cleanTeacherId = role === 'guru' && teacherId ? String(teacherId).trim() : null;
      const cleanStudentId = role === 'wali_murid' && studentId ? String(studentId).trim() : null;
      if (cleanTeacherId) {
        const guruExists = await prisma.guru.findUnique({ where: { id: cleanTeacherId }, select: { id: true } });
        if (!guruExists) return res.status(400).json({ success: false, error: 'Data guru yang dipilih tidak ditemukan.' });
      }
      if (cleanStudentId) {
        const siswaExists = await prisma.siswa.findUnique({ where: { id: cleanStudentId }, select: { id: true } });
        if (!siswaExists) return res.status(400).json({ success: false, error: 'Data siswa yang dipilih tidak ditemukan.' });
      }

      const hashedPassword = await hashPasswordAsync(password);
      const created = await prisma.user.create({
        data: {
          username: cleanUsername,
          password: hashedPassword,
          name: cleanName,
          role,
          isPiket: role === 'guru' ? Boolean(isPiket) : false,
          teacherId: cleanTeacherId,
          studentId: cleanStudentId,
        },
      });

      res.json({
        success: true,
        data: {
          id: created.id,
          username: created.username,
          name: created.name,
          role: created.role,
          isPiket: Boolean(created.isPiket),
          teacherId: created.teacherId,
          studentId: created.studentId,
        },
        message: 'Akun pengguna berhasil dibuat.',
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.put('/users/:id', requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, role, isPiket, password, teacherId, studentId } = req.body || {};
      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, error: 'Akun tidak ditemukan.' });

      const nextRole = role !== undefined ? role : existing.role;
      if (!isValidRole(nextRole)) return res.status(400).json({ success: false, error: 'Role tidak valid.' });

      const updateData = {};
      if (name && String(name).trim()) updateData.name = String(name).trim();
      if (role !== undefined) updateData.role = nextRole;
      if (password && String(password).trim()) {
        if (String(password).length < 6) {
          return res.status(400).json({ success: false, error: 'Password minimal 6 karakter.' });
        }
        updateData.password = await hashPasswordAsync(password);
      }
      if (isPiket !== undefined || role !== undefined) {
        updateData.isPiket = nextRole === 'guru' ? Boolean(isPiket !== undefined ? isPiket : existing.isPiket) : false;
      }
      if (teacherId !== undefined || role !== undefined) {
        const nextTeacherId = nextRole === 'guru'
          ? (teacherId !== undefined ? (teacherId ? String(teacherId).trim() : null) : existing.teacherId)
          : null;
        if (nextTeacherId) {
          const guruExists = await prisma.guru.findUnique({ where: { id: nextTeacherId }, select: { id: true } });
          if (!guruExists) return res.status(400).json({ success: false, error: 'Data guru yang dipilih tidak ditemukan.' });
        }
        updateData.teacherId = nextTeacherId;
      }
      if (studentId !== undefined || role !== undefined) {
        const nextStudentId = nextRole === 'wali_murid'
          ? (studentId !== undefined ? (studentId ? String(studentId).trim() : null) : existing.studentId)
          : null;
        if (nextStudentId) {
          const siswaExists = await prisma.siswa.findUnique({ where: { id: nextStudentId }, select: { id: true } });
          if (!siswaExists) return res.status(400).json({ success: false, error: 'Data siswa yang dipilih tidak ditemukan.' });
        }
        updateData.studentId = nextStudentId;
      }

      const updated = await prisma.user.update({ where: { id }, data: updateData });
      res.json({
        success: true,
        data: {
          id: updated.id,
          username: updated.username,
          name: updated.name,
          role: updated.role,
          isPiket: Boolean(updated.isPiket),
          teacherId: updated.teacherId,
          studentId: updated.studentId,
        },
        message: 'Akun pengguna berhasil diperbarui.',
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.delete('/users/:id', requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      if (id === req.authUser.id) {
        return res.status(400).json({ success: false, error: 'Anda tidak dapat menghapus akun yang sedang aktif digunakan.' });
      }
      await prisma.user.delete({ where: { id } });
      res.json({ success: true, message: 'Akun pengguna berhasil dihapus.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 2. MASTER SESI WAKTU
  // ==========================================
  router.get('/master-sesi', async (req, res) => {
    try {
      let slots = await prisma.masterSesi.findMany({ orderBy: { order: 'asc' } });
      if (slots.length === 0) {
        for (let i = 0; i < MOCK_TIME_SLOTS.length; i++) {
          const s = MOCK_TIME_SLOTS[i];
          await prisma.masterSesi.create({
            data: {
              order: i,
              jamKe: s.jamKe ?? null,
              type: s.type || 'pelajaran',
              start: s.start,
              end: s.end,
              name: s.name || null,
            },
          }).catch(() => null);
        }
        slots = await prisma.masterSesi.findMany({ orderBy: { order: 'asc' } });
      }
      res.json(slots);
    } catch {
      res.json(MOCK_TIME_SLOTS);
    }
  });

  router.put('/master-sesi', requireRole('admin'), async (req, res) => {
    try {
      const { slots } = req.body || {};
      const list = Array.isArray(slots) ? slots : (Array.isArray(req.body) ? req.body : null);
      if (!list) return res.status(400).json({ success: false, error: 'Format sesi tidak valid.' });

      await prisma.$transaction([
        prisma.masterSesi.deleteMany({}),
        ...list.map((s, idx) =>
          prisma.masterSesi.create({
            data: {
              order: idx,
              jamKe: s.jamKe ? Number(s.jamKe) : null,
              type: s.type === 'istirahat' ? 'istirahat' : 'pelajaran',
              start: String(s.start || '07:00'),
              end: String(s.end || '07:45'),
              name: s.name ? String(s.name).trim() : null,
            },
          })
        ),
      ]);
      const updated = await prisma.masterSesi.findMany({ orderBy: { order: 'asc' } });
      res.json({ success: true, data: updated, message: 'Master Sesi Waktu berhasil diperbarui.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 3. KALENDER AKADEMIK
  // ==========================================
  router.get('/kalender', async (req, res) => {
    try {
      const { date } = req.query;
      const where = date ? { tanggal: new Date(`${date}T00:00:00.000Z`) } : {};
      const items = await prisma.kalenderAkademik.findMany({ where, orderBy: { tanggal: 'desc' } });
      res.json(items.map(e => ({
        id: e.id,
        tanggal: e.tanggal.toISOString().split('T')[0],
        tipe: e.tipe,
        judul: e.judul,
        keterangan: e.keterangan || '',
        jamMulai: e.jamMulai,
        jamSelesai: e.jamSelesai,
        isFullDay: e.isFullDay,
      })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/kalender', requireRole('admin'), async (req, res) => {
    try {
      const { tanggal, tipe, judul, keterangan, jamMulai, jamSelesai, isFullDay } = req.body || {};
      if (!tanggal || !judul) return res.status(400).json({ success: false, error: 'Tanggal dan judul wajib diisi.' });
      const created = await prisma.kalenderAkademik.create({
        data: {
          tanggal: new Date(`${tanggal}T00:00:00.000Z`),
          tipe: tipe || 'acara',
          judul: String(judul).trim(),
          keterangan: keterangan ? String(keterangan).trim() : null,
          isFullDay: isFullDay !== false,
          jamMulai: isFullDay !== false ? null : (jamMulai ? Number(jamMulai) : null),
          jamSelesai: isFullDay !== false ? null : (jamSelesai ? Number(jamSelesai) : null),
        },
      });
      res.json({
        success: true,
        data: { ...created, tanggal: created.tanggal.toISOString().split('T')[0] },
        message: 'Agenda kalender berhasil ditambahkan.',
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.delete('/kalender/:id', requireRole('admin'), async (req, res) => {
    try {
      await prisma.kalenderAkademik.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Agenda kalender berhasil dihapus.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 4. JADWAL PELAJARAN (+ MATRIX)
  // ==========================================
  router.get('/jadwal', async (req, res) => {
    try {
      const { day, kelas, teacherId } = req.query;
      const where = {};
      if (day) where.day = day;
      if (kelas) where.className = kelas;
      if (teacherId) where.teacherId = teacherId;

      const items = await prisma.jadwal.findMany({
        where,
        include: { subject: true, teacher: true },
        orderBy: [{ day: 'asc' }, { jamKe: 'asc' }],
      });

      res.json(items.map(j => ({
        id: j.id,
        day: j.day,
        time: j.time,
        jamKe: j.jamKe,
        subjectId: j.subjectId,
        subject: j.subject?.nama || '-',
        teacherId: j.teacherId,
        teacher: j.teacher?.name || '-',
        class: j.className,
        room: j.room || '-',
      })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/jadwal', requireRole('admin'), async (req, res) => {
    try {
      const { day, time, jamKe, subjectId, teacherId, class: className, room } = req.body || {};
      if (!day || !subjectId || !teacherId || !className) {
        return res.status(400).json({ success: false, error: 'Hari, kelas, mapel, dan guru wajib diisi.' });
      }
      const [activeTa, kelasRow] = await Promise.all([
        resolveActiveTahunAjar(),
        prisma.kelas.findUnique({ where: { name: className }, select: { id: true } }),
      ]);
      const created = await prisma.jadwal.create({
        data: {
          day,
          time: time || `Jam ${jamKe || 1}`,
          jamKe: jamKe ? Number(jamKe) : null,
          subjectId,
          teacherId,
          kelasId: kelasRow?.id || null,
          className,
          room: room || '-',
          tahunAjarId: activeTa?.id || null,
        },
        include: { subject: true, teacher: true },
      });
      res.json({
        success: true,
        data: {
          id: created.id,
          day: created.day,
          time: created.time,
          jamKe: created.jamKe,
          subjectId: created.subjectId,
          subject: created.subject?.nama || '-',
          teacherId: created.teacherId,
          teacher: created.teacher?.name || '-',
          kelasId: created.kelasId || null,
          class: created.className,
          room: created.room || '-',
        },
        message: 'Jadwal berhasil ditambahkan.',
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/jadwal/matrix', requireRole('admin'), async (req, res) => {
    try {
      const { day, records } = req.body || {};
      if (!day || !Array.isArray(records)) {
        return res.status(400).json({ success: false, error: 'Parameter day dan records wajib diisi.' });
      }
      const [activeTa, allClasses] = await Promise.all([
        resolveActiveTahunAjar(),
        prisma.kelas.findMany({ select: { id: true, name: true } }),
      ]);
      const classIdByName = new Map(allClasses.map(c => [c.name, c.id]));
      const classesToUpdate = [...new Set(records.map(r => r.class).filter(Boolean))];
      const validRecords = records.filter(r => r.subjectId && r.teacherId && r.class);

      await prisma.$transaction([
        classesToUpdate.length > 0
          ? prisma.jadwal.deleteMany({ where: { day, className: { in: classesToUpdate } } })
          : prisma.jadwal.deleteMany({ where: { day } }),
        ...validRecords.map(r =>
          prisma.jadwal.create({
            data: {
              day,
              jamKe: r.jamKe ? Number(r.jamKe) : 1,
              time: r.time || `Jam ${r.jamKe || 1}`,
              subjectId: r.subjectId,
              teacherId: r.teacherId,
              kelasId: classIdByName.get(r.class) || null,
              className: r.class,
              room: r.room || '-',
              tahunAjarId: activeTa?.id || null,
            },
          })
        ),
      ]);
      res.json({ success: true, message: 'Matriks jadwal berhasil disimpan.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.delete('/jadwal/:id', requireRole('admin'), async (req, res) => {
    try {
      await prisma.jadwal.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Jadwal berhasil dihapus.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 5. ABSENSI PIKET SISWA (PAGI & SORE) + DETAIL PER SISWA + MONITORING WALI
  // ==========================================
  router.get('/absensi', requireAuth, async (req, res) => {
    try {
      const { kelas, date, month, studentId } = req.query;
      const where = {};
      if (req.authUser.role === 'wali_murid') {
        where.studentId = req.authUser.studentId || '__no_linked_student__';
      } else {
        if (studentId) where.studentId = studentId;
        if (kelas) {
          where.student = {
            riwayatKelas: { some: { kelas: { name: kelas }, tahunAjar: { isActive: true } } },
          };
        }
      }
      if (date) where.date = new Date(`${date}T00:00:00.000Z`);
      if (month) {
        const [y, m] = month.split('-');
        const start = new Date(`${y}-${m}-01T00:00:00.000Z`);
        const end = new Date(start);
        end.setUTCMonth(end.getUTCMonth() + 1);
        where.date = { gte: start, lt: end };
      }

      const isUnbounded = !date && !month && !studentId;
      const items = await prisma.absensi.findMany({
        where,
        select: {
          id: true,
          studentId: true,
          kelasId: true,
          date: true,
          statusPagi: true,
          statusSore: true,
          recordedByUserId: true,
          recordedByGuruId: true,
          updatedAt: true,
          kelas: { select: { id: true, name: true } },
          recordedByUser: { select: { id: true, name: true } },
          recordedByGuru: { select: { id: true, name: true } },
          student: {
            select: {
              name: true,
              riwayatKelas: {
                select: {
                  kelasId: true,
                  kelas: { select: { name: true } },
                },
                where: { tahunAjar: { isActive: true } },
                take: 1,
              },
            },
          },
        },
        orderBy: { date: 'desc' },
        ...(isUnbounded ? { take: 2500 } : {}),
      });

      res.json(items.map(a => ({
        id: a.id,
        studentId: a.studentId,
        studentName: a.student?.name || '-',
        kelasId: a.kelasId || a.student?.riwayatKelas?.[0]?.kelasId || null,
        class: a.kelas?.name || a.student?.riwayatKelas?.[0]?.kelas?.name || kelas || '-',
        date: a.date.toISOString().split('T')[0],
        statusPagi: a.statusPagi,
        statusSore: a.statusSore,
        recordedByUserId: a.recordedByUserId || null,
        recordedByGuruId: a.recordedByGuruId || null,
        recordedByName: a.recordedByGuru?.name || a.recordedByUser?.name || null,
        updatedAt: a.updatedAt ? a.updatedAt.toISOString() : null,
      })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Concurrency-safe, session-scoped Piket attendance batch upsert (Piket/Staff/Admin only)
  router.post('/absensi', requirePiketAccess, async (req, res) => {
    try {
      const { records, session, force } = req.body || {};
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ success: false, error: 'Data absensi kosong.' });
      }
      const cleanSession = session === 'pagi' || session === 'sore' ? session : null;
      const requestedStudentIds = [...new Set(records.map(r => r?.studentId).filter(Boolean))];
      const [activeTa, validStudents, validRecorderGuru] = await Promise.all([
        resolveActiveTahunAjar(),
        requestedStudentIds.length > 0
          ? prisma.siswa.findMany({
              where: { id: { in: requestedStudentIds } },
              select: {
                id: true,
                riwayatKelas: {
                  where: { tahunAjar: { isActive: true } },
                  select: { kelasId: true },
                  take: 1,
                },
              },
            })
          : [],
        req.authUser?.teacherId
          ? prisma.guru.findUnique({ where: { id: req.authUser.teacherId }, select: { id: true } })
          : null,
      ]);

      const studentClassMap = new Map(
        validStudents.map(s => [s.id, s.riwayatKelas?.[0]?.kelasId || null])
      );
      const recordedByUserId = req.authUser?.id || null;
      const recordedByGuruId = validRecorderGuru?.id || null;

      // Normalize valid input rows once before entering transaction
      const normalizedRecords = [];
      const uniqueStudentIdSet = new Set();
      const uniqueDateMap = new Map();

      for (const rec of records) {
        if (!rec?.studentId || !rec?.date || !studentClassMap.has(rec.studentId)) continue;
        if (!VALID_ATTENDANCE_STATUSES.has(rec.statusPagi) || !VALID_ATTENDANCE_STATUSES.has(rec.statusSore)) {
          continue;
        }
        const dateStr = String(rec.date).split('T')[0];
        const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
        if (Number.isNaN(targetDate.getTime())) continue;
        uniqueStudentIdSet.add(rec.studentId);
        uniqueDateMap.set(dateStr, targetDate);
        normalizedRecords.push({ rec, dateStr, targetDate });
      }

      if (normalizedRecords.length === 0) {
        return res.status(400).json({ success: false, error: 'Tidak ada data siswa atau status absensi yang valid.' });
      }

      const uniqueStudentIds = [...uniqueStudentIdSet];
      const uniqueDates = [...uniqueDateMap.values()];

      const result = await prisma.$transaction(async (tx) => {
        // 1 single batch query instead of N individual findUnique queries
        const existingRows = await tx.absensi.findMany({
          where: {
            studentId: { in: uniqueStudentIds },
            date: { in: uniqueDates },
          },
          select: {
            id: true,
            studentId: true,
            date: true,
            statusPagi: true,
            statusSore: true,
            updatedAt: true,
          },
        });

        const existingMap = new Map(
          existingRows.map(row => [`${row.studentId}_${row.date.toISOString().split('T')[0]}`, row])
        );

        const conflicts = [];
        const toCreate = [];
        const toUpdate = [];
        const affectedKeys = new Set();

        for (const { rec, dateStr, targetDate } of normalizedRecords) {
          const key = `${rec.studentId}_${dateStr}`;
          const existing = existingMap.get(key) || null;
          const resolvedKelasId = studentClassMap.get(rec.studentId) || null;

          // Optimistic concurrency check: detect same-session overwrite by another teacher
          if (!force && existing && rec.expectedUpdatedAt) {
            const existingMs = existing.updatedAt ? existing.updatedAt.getTime() : 0;
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
                  studentName: rec.studentName || rec.studentId,
                  date: dateStr,
                  serverStatusPagi: existing.statusPagi,
                  serverStatusSore: existing.statusSore,
                  serverUpdatedAt: existing.updatedAt?.toISOString() || null,
                });
                continue;
              }
            }
          }

          // Non-destructive partial session merge: Pagi never wipes Sore, Sore never wipes Pagi
          const updateData = {};
          const nextPagi = VALID_NON_EMPTY_ATTENDANCE.has(rec.statusPagi) ? rec.statusPagi : null;
          const nextSore = VALID_NON_EMPTY_ATTENDANCE.has(rec.statusSore) ? rec.statusSore : null;

          if (cleanSession === 'pagi') {
            if (nextPagi || rec.allowClear) updateData.statusPagi = nextPagi;
          } else if (cleanSession === 'sore') {
            if (nextSore || rec.allowClear) updateData.statusSore = nextSore;
          } else {
            if (nextPagi || rec.allowClear) updateData.statusPagi = nextPagi;
            if (nextSore || rec.allowClear) updateData.statusSore = nextSore;
          }

          if (Object.keys(updateData).length === 0) continue;

          if (resolvedKelasId) updateData.kelasId = resolvedKelasId;
          if (recordedByUserId) updateData.recordedByUserId = recordedByUserId;
          if (recordedByGuruId) updateData.recordedByGuruId = recordedByGuruId;

          affectedKeys.add(key);

          if (existing) {
            toUpdate.push({ id: existing.id, updateData });
          } else {
            toCreate.push({
              studentId: rec.studentId,
              kelasId: resolvedKelasId,
              tahunAjarId: activeTa?.id || null,
              recordedByUserId,
              recordedByGuruId,
              date: targetDate,
              statusPagi: cleanSession === 'sore' ? null : nextPagi,
              statusSore: cleanSession === 'pagi' ? null : nextSore,
            });
          }
        }

        if (conflicts.length > 0) {
          return { conflict: true, conflicts };
        }

        if (toCreate.length > 0) {
          await tx.absensi.createMany({ data: toCreate, skipDuplicates: true });
        }

        // Batch existing-row updates in parallel chunks of 20
        const CHUNK_SIZE = 20;
        for (let i = 0; i < toUpdate.length; i += CHUNK_SIZE) {
          const chunk = toUpdate.slice(i, i + CHUNK_SIZE);
          await Promise.all(
            chunk.map(item =>
              tx.absensi.update({
                where: { id: item.id },
                data: item.updateData,
              })
            )
          );
        }

        if (affectedKeys.size === 0) {
          return { conflict: false, saved: [] };
        }

        const refreshed = await tx.absensi.findMany({
          where: {
            studentId: { in: uniqueStudentIds },
            date: { in: uniqueDates },
          },
          select: {
            id: true,
            studentId: true,
            kelasId: true,
            date: true,
            statusPagi: true,
            statusSore: true,
            recordedByUserId: true,
            recordedByGuruId: true,
            updatedAt: true,
          },
        });

        const saved = refreshed
          .filter(row => affectedKeys.has(`${row.studentId}_${row.date.toISOString().split('T')[0]}`))
          .map(row => ({
            id: row.id,
            studentId: row.studentId,
            kelasId: row.kelasId || null,
            date: row.date.toISOString().split('T')[0],
            statusPagi: row.statusPagi,
            statusSore: row.statusSore,
            recordedByUserId: row.recordedByUserId || null,
            recordedByGuruId: row.recordedByGuruId || null,
            updatedAt: row.updatedAt?.toISOString() || null,
          }));

        return { conflict: false, saved };
      }, { timeout: 15000 });

      if (result.conflict) {
        return res.status(409).json({
          success: false,
          conflict: true,
          error: 'Data absensi sesi ini baru saja diperbarui oleh petugas lain. Muat ulang data terbaru sebelum menyimpan.',
          conflicts: result.conflicts,
        });
      }

      if (result.saved.length === 0) {
        return res.status(400).json({ success: false, error: 'Tidak ada data siswa atau status absensi yang valid.' });
      }

      res.json({
        success: true,
        savedCount: result.saved.length,
        records: result.saved,
        message: 'Absensi piket berhasil disimpan.',
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Helper internal: bangun profil kehadiran + status risiko (hijau/kuning/merah) untuk 1 siswa
  async function buildStudentAttendanceBundle(studentId, month) {
    const siswa = await prisma.siswa.findUnique({
      where: { id: studentId },
      include: {
        riwayatKelas: {
          include: { kelas: { include: { waliKelas: true } }, tahunAjar: true },
          where: { tahunAjar: { isActive: true } },
        },
      },
    });
    if (!siswa) return null;

    const dateFilter = {};
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-');
      const start = new Date(`${y}-${m}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCMonth(end.getUTCMonth() + 1);
      dateFilter.date = { gte: start, lt: end };
    }

    const [piketRows, mapelRows] = await Promise.all([
      prisma.absensi.findMany({
        where: { studentId, ...dateFilter },
        orderBy: { date: 'desc' },
        take: 100,
      }),
      prisma.absensiMapel.findMany({
        where: { studentId, ...dateFilter },
        include: { mapel: true, guru: true },
        orderBy: [{ date: 'desc' }, { jamKe: 'asc' }],
        take: 200,
      }),
    ]);

    const piketRecords = piketRows.map(a => ({
      id: a.id,
      date: a.date.toISOString().split('T')[0],
      statusPagi: a.statusPagi || '-',
      statusSore: a.statusSore || '-',
      updatedAt: a.updatedAt ? a.updatedAt.toISOString() : null,
    }));

    const mapelRecords = mapelRows.map(a => ({
      id: a.id,
      date: a.date.toISOString().split('T')[0],
      jamKe: a.jamKe,
      mapelId: a.mapelId,
      subject: a.mapel?.nama || '-',
      teacherName: a.guru?.name || '-',
      class: a.kelasName,
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

    const activeKelas = siswa.riwayatKelas?.[0]?.kelas || null;
    const riskStatus = computeAttendanceRiskTier({ piketSummary, mapelSummary });

    return {
      success: true,
      month: month || 'all',
      student: {
        id: siswa.id,
        nomor: siswa.nomor || '-',
        name: siswa.name,
        class: activeKelas?.name || '-',
        gender: siswa.gender || 'L',
        status: siswa.status || 'aktif',
        phone: siswa.phone || '-',
        phone_parent: siswa.phone_parent || '-',
        alamat: siswa.alamat || '-',
        sekolah_asal: siswa.sekolah_asal || '-',
      },
      homeroomTeacher: activeKelas?.waliKelas
        ? { id: activeKelas.waliKelas.id, name: activeKelas.waliKelas.name, phone: activeKelas.waliKelas.phone || '-' }
        : null,
      summary: {
        piket: piketSummary,
        mapel: mapelSummary,
      },
      riskStatus,
      piketRecords,
      mapelRecords,
    };
  }

  // Relasi dasar profil kehadiran per siswa (strict ownership untuk wali_murid)
  router.get('/siswa/:id/absensi', requireStudentReadAccess, async (req, res) => {
    try {
      const bundle = await buildStudentAttendanceBundle(req.params.id, req.query.month);
      if (!bundle) {
        return res.status(404).json({ success: false, error: 'Data siswa tidak ditemukan.' });
      }
      res.json(bundle);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Portal Wali Murid: strictly scoped to req.authUser.studentId (read-only)
  router.get('/guardian/overview', requireRole('wali_murid', 'admin'), async (req, res) => {
    try {
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

      const bundle = await buildStudentAttendanceBundle(targetStudentId, req.query.month);
      if (!bundle) {
        return res.status(404).json({ success: false, error: 'Data siswa yang terhubung tidak ditemukan.' });
      }
      res.json(bundle);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Monitoring Wali Kelas: strictly scoped to classes where Kelas.teacherId === req.authUser.teacherId for role 'guru'
  router.get('/monitoring/homeroom', requireRole('guru', 'admin', 'kepsek', 'staff'), async (req, res) => {
    try {
      const { month, kelas: kelasQuery } = req.query;
      const whereKelas = {};
      if (req.authUser.role === 'guru') {
        if (!req.authUser.teacherId) {
          return res.json({ success: true, month: month || 'all', classes: [], students: [], summary: { total: 0, hijau: 0, kuning: 0, merah: 0 } });
        }
        whereKelas.teacherId = req.authUser.teacherId;
      }

      const assignedClasses = await prisma.kelas.findMany({
        where: whereKelas,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, grade: true, major: true },
      });

      if (assignedClasses.length === 0) {
        return res.json({ success: true, month: month || 'all', classes: [], students: [], summary: { total: 0, hijau: 0, kuning: 0, merah: 0 } });
      }

      const allowedClassNames = new Set(assignedClasses.map(c => c.name));
      const selectedClassName = kelasQuery && allowedClassNames.has(kelasQuery)
        ? kelasQuery
        : assignedClasses[0].name;

      const siswaList = await prisma.siswa.findMany({
        where: {
          status: 'aktif',
          riwayatKelas: {
            some: { kelas: { name: selectedClassName }, tahunAjar: { isActive: true } },
          },
        },
        orderBy: { name: 'asc' },
      });

      const dateFilter = {};
      if (month && /^\d{4}-\d{2}$/.test(month)) {
        const [y, m] = month.split('-');
        const start = new Date(`${y}-${m}-01T00:00:00.000Z`);
        const end = new Date(start);
        end.setUTCMonth(end.getUTCMonth() + 1);
        dateFilter.date = { gte: start, lt: end };
      }

      const studentIds = siswaList.map(s => s.id);
      const [piketAll, mapelAll] = studentIds.length > 0
        ? await Promise.all([
            prisma.absensi.findMany({
              where: { studentId: { in: studentIds }, ...dateFilter },
              select: { studentId: true, statusPagi: true, statusSore: true },
            }),
            prisma.absensiMapel.findMany({
              where: { studentId: { in: studentIds }, ...dateFilter },
              select: { studentId: true, status: true },
            }),
          ])
        : [[], []];

      // O(N + M) grouping by studentId instead of O(N * M) nested .filter()
      const piketByStudent = new Map();
      for (const row of piketAll) {
        const list = piketByStudent.get(row.studentId);
        if (list) list.push(row);
        else piketByStudent.set(row.studentId, [row]);
      }
      const mapelByStudent = new Map();
      for (const row of mapelAll) {
        const list = mapelByStudent.get(row.studentId);
        if (list) list.push(row);
        else mapelByStudent.set(row.studentId, [row]);
      }

      const tierRank = { merah: 0, kuning: 1, hijau: 2 };
      const rows = siswaList.map(s => {
        const pRows = piketByStudent.get(s.id) || [];
        const mRows = mapelByStudent.get(s.id) || [];
        const piketSummary = {
          totalHari: pRows.length,
          hadir: pRows.filter(r => r.statusPagi === 'hadir').length,
          izin: pRows.filter(r => r.statusPagi === 'izin').length,
          sakit: pRows.filter(r => r.statusPagi === 'sakit').length,
          alpha: pRows.filter(r => r.statusPagi === 'alpha').length,
          bolos: pRows.filter(r => r.statusPagi === 'hadir' && r.statusSore === 'alpha').length,
        };
        const mHadir = mRows.filter(r => r.status === 'hadir').length;
        const mapelSummary = {
          totalSesi: mRows.length,
          hadir: mHadir,
          izin: mRows.filter(r => r.status === 'izin').length,
          sakit: mRows.filter(r => r.status === 'sakit').length,
          alpha: mRows.filter(r => r.status === 'alpha').length,
          persentase: mRows.length > 0 ? Math.round((mHadir / mRows.length) * 100) : 0,
        };
        const riskStatus = computeAttendanceRiskTier({ piketSummary, mapelSummary });
        return {
          id: s.id,
          nomor: s.nomor || '-',
          name: s.name,
          class: selectedClassName,
          phone_parent: s.phone_parent || '-',
          piket: piketSummary,
          mapel: mapelSummary,
          riskStatus,
        };
      }).sort((a, b) => (tierRank[a.riskStatus.tier] ?? 2) - (tierRank[b.riskStatus.tier] ?? 2) || a.name.localeCompare(b.name));

      res.json({
        success: true,
        month: month || 'all',
        selectedClass: selectedClassName,
        classes: assignedClasses,
        summary: {
          total: rows.length,
          hijau: rows.filter(r => r.riskStatus.tier === 'hijau').length,
          kuning: rows.filter(r => r.riskStatus.tier === 'kuning').length,
          merah: rows.filter(r => r.riskStatus.tier === 'merah').length,
        },
        students: rows,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 6. MONITORING KELAS (CCTV REAL-TIME API)
  // ==========================================
  router.get('/monitoring/kelas', requireRole('admin', 'guru', 'staff', 'kepsek'), async (req, res) => {
    try {
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const now = new Date();
      const jktDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
      const day = req.query.day || days[now.getDay()] || 'Senin';
      const jamKe = Number(req.query.jamKe) || 1;
      const dateStr = req.query.date || jktDateStr;
      const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

      const [kelasList, jadwalList, absenGuruList, absenMapelList] = await Promise.all([
        prisma.kelas.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, major: true } }),
        prisma.jadwal.findMany({
          where: { day, jamKe },
          include: { subject: { select: { nama: true } }, teacher: { select: { name: true } } },
        }),
        prisma.absensiGuru.findMany({
          where: { tanggal: targetDate },
          select: { guruId: true, status: true, jamMasuk: true },
        }),
        prisma.absensiMapel.findMany({
          where: { date: targetDate, jamKe },
          select: { kelasName: true, mapelId: true },
        }),
      ]);

      const guruPresentSet = new Set(absenGuruList.filter(a => a.status === 'hadir' || a.jamMasuk).map(a => a.guruId));

      const items = kelasList.map(k => {
        const sched = jadwalList.find(j => j.className === k.name);
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
        const mapelEntries = absenMapelList.filter(a => a.kelasName === k.name && a.mapelId === sched.subjectId);
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
            subject: sched.subject?.nama || '-',
            teacherId: sched.teacherId,
            teacher: sched.teacher?.name || '-',
            room: sched.room || '-',
            jamKe: sched.jamKe,
          },
        };
      });

      res.json({ day, jamKe, date: dateStr, updatedAt: new Date().toISOString(), items });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 7. NILAI SISWA (CRUD)
  // ==========================================
  router.get('/nilai', requireAuth, async (req, res) => {
    try {
      const { studentId, mapelId, kelas, subject, type } = req.query;
      const where = {};
      if (req.authUser.role === 'wali_murid') {
        where.siswaId = req.authUser.studentId || '__no_linked_student__';
      } else if (studentId) {
        where.siswaId = studentId;
      }
      if (mapelId) where.mapelId = mapelId;
      if (type) where.jenis = type;

      const list = await prisma.nilai.findMany({
        where,
        include: {
          siswa: {
            include: {
              riwayatKelas: { include: { kelas: true }, where: { tahunAjar: { isActive: true } } },
            },
          },
          mapel: true,
          tahunAjar: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      let mapped = list.map(n => ({
        id: n.id,
        studentId: n.siswaId,
        studentName: n.siswa?.name || '-',
        class: n.siswa?.riwayatKelas?.[0]?.kelas?.name || '-',
        mapelId: n.mapelId,
        subject: n.mapel?.nama || '-',
        type: n.jenis,
        score: n.score,
        maxScore: n.maxScore,
        semester: n.tahunAjar?.semester || 1,
        createdAt: n.createdAt,
      }));
      if (kelas) mapped = mapped.filter(m => m.class === kelas);
      if (subject) mapped = mapped.filter(m => m.subject === subject);
      res.json(mapped);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/nilai', requireRole('admin', 'guru'), async (req, res) => {
    try {
      const { studentId, mapelId, subject, type, score, maxScore } = req.body || {};
      const numScore = Number(score);
      let resolvedMapelId = mapelId;
      if (!resolvedMapelId && subject) {
        const foundMapel = await prisma.mataPelajaran.findFirst({ where: { nama: String(subject).trim() } });
        resolvedMapelId = foundMapel?.id;
      }
      if (!studentId || !resolvedMapelId || !type || Number.isNaN(numScore) || numScore < 0 || numScore > 100) {
        return res.status(400).json({ success: false, error: 'Siswa, mapel, jenis, dan nilai (0–100) wajib diisi dengan benar.' });
      }
      const activeTa = await resolveActiveTahunAjar();
      if (!activeTa) return res.status(400).json({ success: false, error: 'Belum ada Tahun Ajar aktif.' });

      const created = await prisma.nilai.create({
        data: {
          siswaId: studentId,
          mapelId: resolvedMapelId,
          tahunAjarId: activeTa.id,
          jenis: String(type).trim(),
          score: Math.round(numScore),
          maxScore: Number(maxScore) || 100,
        },
        include: { siswa: true, mapel: true },
      });
      res.json({
        success: true,
        data: {
          id: created.id,
          studentId: created.siswaId,
          studentName: created.siswa?.name || '-',
          mapelId: created.mapelId,
          subject: created.mapel?.nama || '-',
          type: created.jenis,
          score: created.score,
          maxScore: created.maxScore,
          semester: activeTa.semester || 1,
        },
        message: 'Nilai siswa berhasil disimpan.',
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.put('/nilai/:id', requireRole('admin', 'guru'), async (req, res) => {
    try {
      const { mapelId, subject, type, score, maxScore } = req.body || {};
      const numScore = Number(score);
      if (Number.isNaN(numScore) || numScore < 0 || numScore > 100) {
        return res.status(400).json({ success: false, error: 'Nilai harus berada di rentang 0–100.' });
      }
      let resolvedMapelId = mapelId;
      if (!resolvedMapelId && subject) {
        const foundMapel = await prisma.mataPelajaran.findFirst({ where: { nama: String(subject).trim() } });
        resolvedMapelId = foundMapel?.id;
      }
      await prisma.nilai.update({
        where: { id: req.params.id },
        data: {
          ...(resolvedMapelId ? { mapelId: resolvedMapelId } : {}),
          ...(type ? { jenis: String(type).trim() } : {}),
          score: Math.round(numScore),
          ...(maxScore ? { maxScore: Number(maxScore) } : {}),
        },
      });
      res.json({ success: true, message: 'Nilai siswa berhasil diperbarui.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.delete('/nilai/:id', requireRole('admin', 'guru'), async (req, res) => {
    try {
      await prisma.nilai.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Data nilai berhasil dihapus.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 8. ATURAN POIN & POIN SIKAP
  // ==========================================
  router.get('/aturan-poin', async (req, res) => {
    try {
      const rules = await prisma.aturanPoin.findMany({ orderBy: [{ kategori: 'asc' }, { nama: 'asc' }] });
      res.json(rules);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/aturan-poin', requireRole('admin'), async (req, res) => {
    try {
      const { kategori, nama, poin, deskripsi } = req.body || {};
      if (!nama || poin === undefined) return res.status(400).json({ success: false, error: 'Nama aturan dan poin wajib diisi.' });
      const created = await prisma.aturanPoin.create({
        data: {
          kategori: kategori === 'negatif' ? 'negatif' : 'positif',
          nama: String(nama).trim(),
          poin: Number(poin),
          deskripsi: deskripsi ? String(deskripsi).trim() : null,
        },
      });
      res.json({ success: true, data: created, message: 'Aturan poin berhasil ditambahkan.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.put('/aturan-poin/:id', requireRole('admin'), async (req, res) => {
    try {
      const { kategori, nama, poin, deskripsi } = req.body || {};
      await prisma.aturanPoin.update({
        where: { id: req.params.id },
        data: {
          kategori: kategori === 'negatif' ? 'negatif' : 'positif',
          nama: String(nama || '').trim(),
          poin: Number(poin),
          deskripsi: deskripsi ? String(deskripsi).trim() : null,
        },
      });
      res.json({ success: true, message: 'Aturan poin berhasil diperbarui.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.delete('/aturan-poin/:id', requireRole('admin'), async (req, res) => {
    try {
      await prisma.aturanPoin.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Aturan poin berhasil dihapus.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/poin-sikap', requireAuth, async (req, res) => {
    try {
      const { siswaId } = req.query;
      const where = req.authUser.role === 'wali_murid'
        ? { siswaId: req.authUser.studentId || '__no_linked_student__' }
        : (siswaId ? { siswaId } : {});
      const items = await prisma.poinSikap.findMany({
        where,
        include: {
          siswa: {
            include: {
              riwayatKelas: { include: { kelas: true }, where: { tahunAjar: { isActive: true } } },
            },
          },
          aturanPoin: true,
        },
        orderBy: { tanggal: 'desc' },
      });
      res.json(items.map(p => ({
        id: p.id,
        siswaId: p.siswaId,
        siswaName: p.siswa?.name || '-',
        class: p.siswa?.riwayatKelas?.[0]?.kelas?.name || '-',
        tanggal: p.tanggal.toISOString().split('T')[0],
        aturanPoinId: p.aturanPoinId,
        aturanNama: p.aturanPoin?.nama || '-',
        poin: p.poin,
        keterangan: p.keterangan || '',
        pencatat: p.pencatat || 'Admin',
      })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/poin-sikap', requireRole('admin', 'guru'), async (req, res) => {
    try {
      const { siswaId, aturanPoinId, tanggal, keterangan, pencatat } = req.body || {};
      if (!siswaId || !aturanPoinId) return res.status(400).json({ success: false, error: 'Siswa dan aturan poin wajib dipilih.' });
      const aturan = await prisma.aturanPoin.findUnique({ where: { id: aturanPoinId } });
      if (!aturan) return res.status(404).json({ success: false, error: 'Aturan poin tidak ditemukan.' });
      const activeTa = await resolveActiveTahunAjar();

      const created = await prisma.poinSikap.create({
        data: {
          siswaId,
          aturanPoinId,
          tahunAjarId: activeTa?.id || null,
          tanggal: new Date(`${tanggal || new Date().toISOString().split('T')[0]}T00:00:00.000Z`),
          poin: aturan.poin,
          keterangan: keterangan ? String(keterangan).trim() : null,
          pencatat: pencatat || req.authUser?.name || 'Admin',
        },
        include: { siswa: true, aturanPoin: true },
      });
      res.json({
        success: true,
        data: {
          id: created.id,
          siswaId: created.siswaId,
          siswaName: created.siswa?.name || '-',
          tanggal: created.tanggal.toISOString().split('T')[0],
          aturanPoinId: created.aturanPoinId,
          aturanNama: created.aturanPoin?.nama || '-',
          poin: created.poin,
          keterangan: created.keterangan || '',
          pencatat: created.pencatat || 'Admin',
        },
        message: 'Poin sikap berhasil dicatat.',
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.delete('/poin-sikap/:id', requireRole('admin', 'guru'), async (req, res) => {
    try {
      await prisma.poinSikap.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Catatan poin sikap berhasil dihapus.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 9. BERITA PUBLIK & ADMIN CRUD
  // ==========================================
  router.get('/berita', async (req, res) => {
    try {
      let list = await prisma.berita.findMany({ orderBy: { date: 'desc' } });
      if (list.length === 0) {
        return res.json(MOCK_NEWS);
      }
      res.json(list.map(b => ({
        ...b,
        date: b.date.toISOString().split('T')[0],
      })));
    } catch {
      res.json(MOCK_NEWS);
    }
  });

  router.get('/berita/:id', async (req, res) => {
    try {
      const item = await prisma.berita.findUnique({ where: { id: req.params.id } });
      if (item) {
        return res.json({ ...item, date: item.date.toISOString().split('T')[0] });
      }
    } catch {
      // fall back to static seed if table not yet migrated
    }
    const fallback = MOCK_NEWS.find(n => n.id === req.params.id);
    if (!fallback) return res.status(404).json({ error: 'Berita tidak ditemukan' });
    res.json(fallback);
  });

  router.post('/berita', requireRole('admin', 'staff'), async (req, res) => {
    try {
      const { title, excerpt, content, category, author, date, image, isPublished } = req.body || {};
      if (!title || !content) return res.status(400).json({ success: false, error: 'Judul dan isi berita wajib diisi.' });
      const created = await prisma.berita.create({
        data: {
          title: String(title).trim(),
          excerpt: String(excerpt || content.slice(0, 150)).trim(),
          content: String(content).trim(),
          category: category || 'Pengumuman',
          author: author || req.authUser?.name || 'Admin',
          date: new Date(`${date || new Date().toISOString().split('T')[0]}T00:00:00.000Z`),
          image: sanitizeSafeUrl(image),
          isPublished: isPublished !== false,
        },
      });
      res.json({
        success: true,
        data: { ...created, date: created.date.toISOString().split('T')[0] },
        message: 'Berita berhasil diterbitkan.',
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.put('/berita/:id', requireRole('admin', 'staff'), async (req, res) => {
    try {
      const { title, excerpt, content, category, author, date, image, isPublished } = req.body || {};
      const updated = await prisma.berita.update({
        where: { id: req.params.id },
        data: {
          ...(title ? { title: String(title).trim() } : {}),
          ...(excerpt !== undefined ? { excerpt: String(excerpt).trim() } : {}),
          ...(content ? { content: String(content).trim() } : {}),
          ...(category ? { category } : {}),
          ...(author ? { author } : {}),
          ...(date ? { date: new Date(`${date}T00:00:00.000Z`) } : {}),
          ...(image !== undefined ? { image: sanitizeSafeUrl(image) } : {}),
          ...(isPublished !== undefined ? { isPublished: Boolean(isPublished) } : {}),
        },
      });
      res.json({
        success: true,
        data: { ...updated, date: updated.date.toISOString().split('T')[0] },
        message: 'Berita berhasil diperbarui.',
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.delete('/berita/:id', requireRole('admin', 'staff'), async (req, res) => {
    try {
      await prisma.berita.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Berita berhasil dihapus.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 10. PPDB (PUBLIC SUBMIT + ADMIN VERIFICATION)
  // ==========================================
  router.post('/ppdb', async (req, res) => {
    try {
      const { name, nisn, gender, schoolOrigin, majorChoice, phoneStudent, phoneParent, email, address, track } = req.body || {};
      if (!name || !String(name).trim() || !phoneStudent || !String(phoneStudent).trim()) {
        return res.status(400).json({ success: false, error: 'Nama lengkap dan nomor WhatsApp siswa wajib diisi.' });
      }
      const now = new Date();
      const regNumber = `PPDB-${now.getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
      const created = await prisma.ppdbRegistration.create({
        data: {
          regNumber,
          name: String(name).trim(),
          nisn: nisn ? String(nisn).trim() : null,
          gender: gender === 'P' ? 'P' : 'L',
          schoolOrigin: schoolOrigin ? String(schoolOrigin).trim() : '-',
          majorChoice: majorChoice ? String(majorChoice).trim() : 'TKR',
          phoneStudent: String(phoneStudent).trim(),
          phoneParent: phoneParent ? String(phoneParent).trim() : '-',
          email: email ? String(email).trim() : null,
          address: address ? String(address).trim() : '-',
          track: track || 'Reguler',
          status: 'Menunggu Verifikasi',
        },
      });
      res.json({
        success: true,
        data: { ...created, timestamp: created.createdAt.toISOString() },
        message: 'Pendaftaran Anda berhasil dikirim! Silakan simpan nomor pendaftaran Anda.',
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/ppdb', requireRole('admin', 'staff', 'kepsek'), async (req, res) => {
    try {
      const list = await prisma.ppdbRegistration.findMany({ orderBy: { createdAt: 'desc' } });
      res.json(list.map(p => ({ ...p, timestamp: p.createdAt.toISOString() })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/ppdb/:id/status', requireRole('admin', 'staff'), async (req, res) => {
    try {
      const { status, notes } = req.body || {};
      if (!VALID_PPDB_STATUSES.has(status)) {
        return res.status(400).json({ success: false, error: 'Status verifikasi PPDB tidak valid.' });
      }
      const updated = await prisma.ppdbRegistration.update({
        where: { id: req.params.id },
        data: { status, ...(notes !== undefined ? { notes: notes ? String(notes).trim() : null } : {}) },
      });
      res.json({ success: true, data: updated, message: `Status pendaftar diperbarui menjadi "${status}".` });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.delete('/ppdb/:id', requireRole('admin'), async (req, res) => {
    try {
      await prisma.ppdbRegistration.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Data pendaftar PPDB berhasil dihapus.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 11. DASHBOARD AGGREGATED STATS
  // ==========================================
  router.get('/dashboard/stats', async (req, res) => {
    try {
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const now = new Date();
      const todayName = days[now.getDay()];
      const jktDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
      const todayDate = new Date(`${jktDateStr}T00:00:00.000Z`);

      const [totalStudents, totalTeachers, totalClasses, activeYear, todaySchedules, guruAbsen, siswaAbsen] = await Promise.all([
        prisma.siswa.count({ where: { status: 'aktif' } }).catch(() => prisma.siswa.count()),
        prisma.guru.count(),
        prisma.kelas.count(),
        resolveActiveTahunAjar(),
        prisma.jadwal.findMany({
          where: { day: todayName },
          include: { subject: { select: { nama: true } }, teacher: { select: { name: true } } },
          orderBy: { jamKe: 'asc' },
        }),
        prisma.absensiGuru.findMany({ where: { tanggal: todayDate }, select: { status: true } }),
        prisma.absensi.findMany({ where: { date: todayDate }, select: { statusPagi: true, statusSore: true } }),
      ]);

      let upcomingEvents = MOCK_NEWS.slice(0, 3);
      let ppdbPendingCount = 0;
      let totalUsers = 0;
      try {
        const [dbNews, pendingPpdb, userCount] = await Promise.all([
          prisma.berita.findMany({ orderBy: { date: 'desc' }, take: 3 }).catch(() => []),
          prisma.ppdbRegistration.count({ where: { status: 'Menunggu Verifikasi' } }).catch(() => 0),
          prisma.user.count().catch(() => 0),
        ]);
        if (dbNews.length > 0) {
          upcomingEvents = dbNews.map(b => ({ ...b, date: b.date.toISOString().split('T')[0] }));
        }
        ppdbPendingCount = pendingPpdb;
        totalUsers = userCount;
      } catch {
        // use fallback defaults
      }

      const guruHadir = guruAbsen.filter(a => a.status === 'hadir').length;
      const guruIzin = guruAbsen.filter(a => a.status === 'izin').length;
      const guruSakit = guruAbsen.filter(a => a.status === 'sakit').length;
      const guruAlpha = Math.max(0, totalTeachers - guruHadir - guruIzin - guruSakit);

      const siswaHadir = siswaAbsen.filter(a => a.statusPagi === 'hadir').length;
      const siswaIzin = siswaAbsen.filter(a => a.statusPagi === 'izin').length;
      const siswaSakit = siswaAbsen.filter(a => a.statusPagi === 'sakit').length;
      const siswaAlpha = siswaAbsen.filter(a => a.statusPagi === 'alpha').length;
      const siswaBolos = siswaAbsen.filter(a => a.statusPagi === 'hadir' && a.statusSore === 'alpha').length;

      res.json({
        totalStudents,
        totalTeachers,
        totalClasses,
        todayScheduleCount: todaySchedules.length,
        activeAcademicYear: activeYear ? `${activeYear.nama} Smt ${activeYear.semester}` : '-',
        teacherAttendanceToday: { hadir: guruHadir, izin: guruIzin, sakit: guruSakit, alpha: guruAlpha },
        studentAttendanceToday: { hadir: siswaHadir, izin: siswaIzin, sakit: siswaSakit, alpha: siswaAlpha, bolos: siswaBolos },
        upcomingEvents,
        todayDuty: [],
        ppdbPendingCount,
        totalUsers,
        todaySchedule: todaySchedules.slice(0, 5).map(s => ({
          id: s.id,
          day: s.day,
          time: s.time,
          jamKe: s.jamKe,
          subject: s.subject?.nama || '-',
          teacher: s.teacher?.name || '-',
          class: s.className,
          room: s.room || '-',
        })),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
