import express from 'express';
import {
  hashPassword,
  isValidRole,
  requireAuth,
  requireRole,
  sanitizeSafeUrl,
} from './authUtils.js';
import { MOCK_TIME_SLOTS, MOCK_NEWS } from '../src/services/mockData.js';

const VALID_PPDB_STATUSES = new Set(['Menunggu Verifikasi', 'Diterima', 'Cadangan', 'Ditolak']);
const VALID_ATTENDANCE_STATUSES = new Set(['hadir', 'izin', 'sakit', 'alpha', null, '']);

export function createExtraPrismaRoutes(prisma) {
  const router = express.Router();

  // ==========================================
  // 1. AUTH SESSION & USER CRUD (ADMIN)
  // ==========================================
  router.get('/auth/me', requireAuth, async (req, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.authUser.id } });
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
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/users', requireRole('admin'), async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        include: { guru: true, siswa: true },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      });
      res.json(users.map(u => ({
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        teacherId: u.teacherId || null,
        teacherName: u.guru?.name || null,
        studentId: u.studentId || null,
        studentName: u.siswa?.name || null,
        createdAt: u.createdAt,
      })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/users', requireRole('admin'), async (req, res) => {
    try {
      const { username, password, name, role, teacherId, studentId } = req.body || {};
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

      const created = await prisma.user.create({
        data: {
          username: cleanUsername,
          password: hashPassword(password),
          name: cleanName,
          role,
          teacherId: teacherId ? String(teacherId).trim() : null,
          studentId: studentId ? String(studentId).trim() : null,
        },
      });

      res.json({
        success: true,
        data: {
          id: created.id,
          username: created.username,
          name: created.name,
          role: created.role,
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
      const { name, role, password, teacherId, studentId } = req.body || {};
      const updateData = {};
      if (name && String(name).trim()) updateData.name = String(name).trim();
      if (role !== undefined) {
        if (!isValidRole(role)) return res.status(400).json({ success: false, error: 'Role tidak valid.' });
        updateData.role = role;
      }
      if (password && String(password).trim()) {
        if (String(password).length < 6) {
          return res.status(400).json({ success: false, error: 'Password minimal 6 karakter.' });
        }
        updateData.password = hashPassword(password);
      }
      if (teacherId !== undefined) updateData.teacherId = teacherId ? String(teacherId).trim() : null;
      if (studentId !== undefined) updateData.studentId = studentId ? String(studentId).trim() : null;

      const updated = await prisma.user.update({ where: { id }, data: updateData });
      res.json({
        success: true,
        data: {
          id: updated.id,
          username: updated.username,
          name: updated.name,
          role: updated.role,
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
      const activeTa = await prisma.tahunAjar.findFirst({ where: { isActive: true } });
      const created = await prisma.jadwal.create({
        data: {
          day,
          time: time || `Jam ${jamKe || 1}`,
          jamKe: jamKe ? Number(jamKe) : null,
          subjectId,
          teacherId,
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
      const activeTa = await prisma.tahunAjar.findFirst({ where: { isActive: true } });
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
  // 5. ABSENSI PIKET SISWA (PAGI & SORE)
  // ==========================================
  router.get('/absensi', async (req, res) => {
    try {
      const { kelas, date, month } = req.query;
      const where = {};
      if (date) where.date = new Date(`${date}T00:00:00.000Z`);
      if (month) {
        const [y, m] = month.split('-');
        const start = new Date(`${y}-${m}-01T00:00:00.000Z`);
        const end = new Date(start);
        end.setUTCMonth(end.getUTCMonth() + 1);
        where.date = { gte: start, lt: end };
      }
      if (kelas) {
        where.student = {
          riwayatKelas: { some: { kelas: { name: kelas }, tahunAjar: { isActive: true } } },
        };
      }

      const items = await prisma.absensi.findMany({
        where,
        include: {
          student: {
            include: {
              riwayatKelas: {
                include: { kelas: true },
                where: { tahunAjar: { isActive: true } },
              },
            },
          },
        },
        orderBy: { date: 'desc' },
      });

      res.json(items.map(a => ({
        id: a.id,
        studentId: a.studentId,
        studentName: a.student?.name || '-',
        class: a.student?.riwayatKelas?.[0]?.kelas?.name || kelas || '-',
        date: a.date.toISOString().split('T')[0],
        statusPagi: a.statusPagi,
        statusSore: a.statusSore,
      })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/absensi', requireRole('admin', 'guru', 'staff'), async (req, res) => {
    try {
      const { records } = req.body || {};
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ success: false, error: 'Data absensi kosong.' });
      }
      const activeTa = await prisma.tahunAjar.findFirst({ where: { isActive: true } });

      for (const rec of records) {
        if (!rec.studentId || !rec.date) continue;
        if (!VALID_ATTENDANCE_STATUSES.has(rec.statusPagi) || !VALID_ATTENDANCE_STATUSES.has(rec.statusSore)) {
          continue;
        }
        const targetDate = new Date(`${rec.date}T00:00:00.000Z`);
        const existing = await prisma.absensi.findFirst({
          where: { studentId: rec.studentId, date: targetDate },
        });
        if (existing) {
          await prisma.absensi.update({
            where: { id: existing.id },
            data: {
              ...(rec.statusPagi !== undefined ? { statusPagi: rec.statusPagi } : {}),
              ...(rec.statusSore !== undefined ? { statusSore: rec.statusSore } : {}),
            },
          });
        } else {
          await prisma.absensi.create({
            data: {
              studentId: rec.studentId,
              tahunAjarId: activeTa?.id || null,
              date: targetDate,
              statusPagi: rec.statusPagi || null,
              statusSore: rec.statusSore || null,
            },
          });
        }
      }
      res.json({ success: true, message: 'Absensi piket berhasil disimpan.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 6. MONITORING KELAS (CCTV REAL-TIME API)
  // ==========================================
  router.get('/monitoring/kelas', async (req, res) => {
    try {
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const now = new Date();
      const jktDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
      const day = req.query.day || days[now.getDay()] || 'Senin';
      const jamKe = Number(req.query.jamKe) || 1;
      const dateStr = req.query.date || jktDateStr;
      const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

      const [kelasList, jadwalList, absenGuruList, absenMapelList] = await Promise.all([
        prisma.kelas.findMany({ orderBy: { name: 'asc' }, include: { waliKelas: true } }),
        prisma.jadwal.findMany({ where: { day, jamKe }, include: { subject: true, teacher: true } }),
        prisma.absensiGuru.findMany({ where: { tanggal: targetDate } }),
        prisma.absensiMapel.findMany({ where: { date: targetDate, jamKe } }),
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
  router.get('/nilai', async (req, res) => {
    try {
      const { studentId, mapelId, kelas, subject, type } = req.query;
      const where = {};
      if (studentId) where.siswaId = studentId;
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
      const activeTa = await prisma.tahunAjar.findFirst({ where: { isActive: true } });
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

  router.get('/poin-sikap', async (req, res) => {
    try {
      const { siswaId } = req.query;
      const where = siswaId ? { siswaId } : {};
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
      const activeTa = await prisma.tahunAjar.findFirst({ where: { isActive: true } });

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
        prisma.siswa.count(),
        prisma.guru.count(),
        prisma.kelas.count(),
        prisma.tahunAjar.findFirst({ where: { isActive: true } }),
        prisma.jadwal.findMany({
          where: { day: todayName },
          include: { subject: true, teacher: true },
          orderBy: { jamKe: 'asc' },
        }),
        prisma.absensiGuru.findMany({ where: { tanggal: todayDate } }),
        prisma.absensi.findMany({ where: { date: todayDate } }),
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
