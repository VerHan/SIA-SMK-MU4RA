import { DEFAULT_SCHOOL_GEOFENCE } from '../authUtils.js';
import {
  computePaymentStatus,
  createAuditLogger,
  createTokenVersionGuard,
  DEFAULT_SCHOOL_CONFIG,
  detectAttendanceAlerts,
  dispatchWebhookPayload,
} from './auditService.js';
import { createAuditRouter } from './auditRouter.js';
import { createSchoolConfigRouter } from './schoolConfigRouter.js';
import { createOperationsRouter } from './operationsRouter.js';

/**
 * Prisma-backed repository adapters for the modular backend routers
 * (Audit Trail, Session Revocation, Backup, School Config, Notifications, Pembayaran, Absen Sholat).
 */
export function createPrismaBackendModules(prisma, { getActiveTahunAjar, invalidateGeofenceCache } = {}) {
  const resolveActiveYear = getActiveTahunAjar || (() => prisma.tahunAjar.findFirst({ where: { isActive: true } }));

  const tokenVersionGuard = createTokenVersionGuard({
    lookupUserState: async (userId) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, isActive: true, tokenVersion: true },
        });
        return user || null;
      } catch (err) {
        // Backward compatibility if DB migration for tokenVersion/isActive hasn't been pushed yet
        const fallback = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        }).catch(() => null);
        return fallback ? { id: fallback.id, isActive: true, tokenVersion: 1 } : null;
      }
    },
  });

  const logAudit = createAuditLogger({
    writeLog: async ({ userId, userName, action, target, detail, ipAddress }) => {
      try {
        return await prisma.logAktivitas.create({
          data: { userId, userName, action, target, detail, ipAddress },
        });
      } catch {
        // Fallback if target/ipAddress columns not yet pushed
        return await prisma.logAktivitas.create({
          data: {
            userId,
            userName,
            action,
            detail: target ? `[${target}] ${detail || ''}`.trim() : detail,
          },
        });
      }
    },
  });

  async function getSchoolConfig() {
    try {
      const row = await prisma.schoolConfig.findUnique({ where: { id: 'school_default' } });
      if (row) return { ...DEFAULT_SCHOOL_CONFIG, ...row };
    } catch {
      /* Fallback to default / geofence log if table not pushed yet */
    }
    try {
      const latestGeo = await prisma.logAktivitas.findFirst({
        where: { action: 'SCHOOL_GEOFENCE_CONFIG' },
        orderBy: { createdAt: 'desc' },
        select: { detail: true },
      });
      if (latestGeo?.detail) {
        const parsed = JSON.parse(latestGeo.detail);
        return {
          ...DEFAULT_SCHOOL_CONFIG,
          geofenceLat: Number(parsed.latitude) || DEFAULT_SCHOOL_GEOFENCE.latitude,
          geofenceLng: Number(parsed.longitude) || DEFAULT_SCHOOL_GEOFENCE.longitude,
          geofenceRadius: Number(parsed.radiusMeters) || DEFAULT_SCHOOL_GEOFENCE.radiusMeters,
        };
      }
    } catch {
      /* Ignore */
    }
    return { ...DEFAULT_SCHOOL_CONFIG };
  }

  async function saveSchoolConfig(patch) {
    const current = await getSchoolConfig();
    const merged = {
      ...current,
      ...patch,
      id: 'school_default',
      whatsappWebhookUrl: patch.whatsappWebhookUrl !== undefined ? (patch.whatsappWebhookUrl || '') : (current.whatsappWebhookUrl || ''),
    };

    const dbData = {
      schoolName: merged.schoolName,
      npsn: merged.npsn,
      principalName: merged.principalName,
      address: merged.address,
      phone: merged.phone,
      email: merged.email,
      jamMasuk: merged.jamMasuk,
      jamPulang: merged.jamPulang,
      batasTelatMenit: Number(merged.batasTelatMenit) || 15,
      geofenceLat: Number(merged.geofenceLat),
      geofenceLng: Number(merged.geofenceLng),
      geofenceRadius: Number(merged.geofenceRadius) || 250,
      whatsappEnabled: Boolean(merged.whatsappEnabled),
      whatsappWebhookUrl: merged.whatsappWebhookUrl || null,
      notifyOnAlpha: Boolean(merged.notifyOnAlpha),
      notifyOnBolos: Boolean(merged.notifyOnBolos),
      notifyHomeroom: Boolean(merged.notifyHomeroom),
      notifyParent: Boolean(merged.notifyParent),
      dailyBackupEnabled: Boolean(merged.dailyBackupEnabled),
      dailyBackupTime: merged.dailyBackupTime || '02:00',
    };

    let saved = merged;
    try {
      saved = await prisma.schoolConfig.upsert({
        where: { id: 'school_default' },
        update: dbData,
        create: { id: 'school_default', ...dbData },
      });
    } catch {
      // Fallback: sync geofence log if SchoolConfig table hasn't been migrated yet
      await prisma.logAktivitas.create({
        data: {
          action: 'SCHOOL_GEOFENCE_CONFIG',
          detail: JSON.stringify({
            latitude: dbData.geofenceLat,
            longitude: dbData.geofenceLng,
            radiusMeters: dbData.geofenceRadius,
          }),
        },
      }).catch(() => {});
    }

    if (typeof invalidateGeofenceCache === 'function') {
      invalidateGeofenceCache();
    }
    return { ...DEFAULT_SCHOOL_CONFIG, ...saved };
  }

  async function createNotification(entry) {
    try {
      return await prisma.notificationLog.create({
        data: {
          recipientRole: entry.recipientRole || 'admin',
          recipientUserId: entry.recipientUserId || null,
          recipientName: entry.recipientName || null,
          recipientPhone: entry.recipientPhone || null,
          studentId: entry.studentId || null,
          studentName: entry.studentName || null,
          className: entry.className || null,
          eventType: entry.eventType || 'GENERAL',
          title: entry.title,
          message: entry.message,
          channel: entry.channel || 'in_app',
          deliveryStatus: entry.deliveryStatus || 'sent',
        },
      });
    } catch (err) {
      console.warn('[Notifications] Fallback notice:', err.message);
      return { id: `notif-${Date.now()}`, ...entry, createdAt: new Date().toISOString() };
    }
  }

  async function dispatchAttendanceNotifications(savedRecords = []) {
    if (!Array.isArray(savedRecords) || savedRecords.length === 0) return [];
    try {
      const config = await getSchoolConfig();
      const studentIds = [...new Set(savedRecords.map(r => r.studentId).filter(Boolean))];
      const classIds = [...new Set(savedRecords.map(r => r.kelasId).filter(Boolean))];

      const [students, classes, teachers, users] = await Promise.all([
        prisma.siswa.findMany({ where: { id: { in: studentIds } } }),
        classIds.length > 0 ? prisma.kelas.findMany({ where: { id: { in: classIds } } }) : [],
        prisma.guru.findMany({ select: { id: true, name: true, phone: true } }),
        prisma.user.findMany({ select: { id: true, name: true, role: true, teacherId: true, studentId: true } }),
      ]);

      const alerts = detectAttendanceAlerts({
        savedRecords,
        studentsById: new Map(students.map(s => [s.id, s])),
        classesById: new Map(classes.map(c => [c.id, c])),
        teachersById: new Map(teachers.map(t => [t.id, t])),
        users,
        config,
      });

      const createdLogs = [];
      for (const alert of alerts) {
        let deliveryStatus = 'sent';
        let channel = 'in_app';

        if (config.whatsappEnabled && config.whatsappWebhookUrl) {
          channel = 'whatsapp_webhook';
          const hookRes = await dispatchWebhookPayload(config.whatsappWebhookUrl, {
            event: alert.eventType,
            schoolName: config.schoolName,
            recipientRole: alert.recipientRole,
            recipientName: alert.recipientName,
            recipientPhone: alert.recipientPhone,
            studentName: alert.studentName,
            className: alert.className,
            date: alert.date,
            title: alert.title,
            message: alert.message,
          });
          deliveryStatus = hookRes.status;
        }

        const log = await createNotification({ ...alert, channel, deliveryStatus });
        createdLogs.push(log);
      }
      return createdLogs;
    } catch (err) {
      console.warn('[AttendanceNotifier] Non-blocking dispatch error:', err.message);
      return [];
    }
  }

  const auditRouter = createAuditRouter({
    listAuditLogs: async ({ action, search, page, limit }) => {
      const where = {};
      if (action) where.action = action;
      if (search) {
        where.OR = [
          { userName: { contains: search, mode: 'insensitive' } },
          { action: { contains: search, mode: 'insensitive' } },
          { target: { contains: search, mode: 'insensitive' } },
          { detail: { contains: search, mode: 'insensitive' } },
        ];
      }
      const [total, items, distinctActions] = await Promise.all([
        prisma.logAktivitas.count({ where }),
        prisma.logAktivitas.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.logAktivitas.findMany({
          distinct: ['action'],
          select: { action: true },
          orderBy: { action: 'asc' },
        }),
      ]);
      return {
        total,
        items,
        actions: distinctActions.map(a => a.action),
      };
    },
    revokeUserSessions: async (userId) => {
      const existing = await prisma.user.findUnique({ where: { id: userId } });
      if (!existing) return null;
      const nextVersion = (Number(existing.tokenVersion) || 1) + 1;
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { tokenVersion: nextVersion },
      });
      tokenVersionGuard.invalidateUserSession(userId);
      return {
        id: updated.id,
        username: updated.username,
        name: updated.name,
        tokenVersion: updated.tokenVersion,
      };
    },
    buildBackupSnapshot: async () => {
      const [tahunAjar, kelas, guru, siswa, riwayatKelas, mapel, absensi, nilai, pembayaran, absensiSholat, users, schoolConfig] =
        await Promise.all([
          prisma.tahunAjar.findMany({ orderBy: { startDate: 'desc' } }),
          prisma.kelas.findMany({ orderBy: { name: 'asc' } }),
          prisma.guru.findMany({ orderBy: { name: 'asc' } }),
          prisma.siswa.findMany({ orderBy: { name: 'asc' } }),
          prisma.riwayatKelas.findMany(),
          prisma.mataPelajaran.findMany({ orderBy: { nama: 'asc' } }),
          prisma.absensi.findMany({ orderBy: { date: 'desc' }, take: 5000 }),
          prisma.nilai.findMany({ orderBy: { createdAt: 'desc' }, take: 5000 }),
          prisma.pembayaran.findMany({ orderBy: { createdAt: 'desc' }, take: 2000 }),
          prisma.absensiSholat.findMany({ orderBy: { date: 'desc' }, take: 2000 }),
          prisma.user.findMany({
            select: {
              id: true,
              username: true,
              name: true,
              role: true,
              isPiket: true,
              isActive: true,
              tokenVersion: true,
              teacherId: true,
              studentId: true,
              createdAt: true,
            },
          }),
          getSchoolConfig(),
        ]);

      return {
        counts: {
          tahunAjar: tahunAjar.length,
          kelas: kelas.length,
          guru: guru.length,
          siswa: siswa.length,
          riwayatKelas: riwayatKelas.length,
          mapel: mapel.length,
          absensi: absensi.length,
          nilai: nilai.length,
          pembayaran: pembayaran.length,
          absensiSholat: absensiSholat.length,
          users: users.length,
        },
        data: {
          schoolConfig,
          tahunAjar,
          kelas,
          guru,
          siswa,
          riwayatKelas,
          mapel,
          absensi,
          nilai,
          pembayaran,
          absensiSholat,
          users,
        },
      };
    },
    recordBackupRun: async ({ exportedAt }) => {
      try {
        await prisma.schoolConfig.upsert({
          where: { id: 'school_default' },
          update: { lastBackupAt: new Date(exportedAt) },
          create: { id: 'school_default', lastBackupAt: new Date(exportedAt) },
        });
      } catch {
        /* Ignore if table not yet migrated */
      }
    },
    logAudit,
  });

  const schoolConfigRouter = createSchoolConfigRouter({
    getSchoolConfig,
    saveSchoolConfig,
    listNotifications: async ({ user, unreadOnly, eventType, page, limit }) => {
      try {
        const where = {};
        if (eventType) where.eventType = eventType;
        if (unreadOnly) where.readAt = null;
        if (user.role === 'wali_murid') {
          where.OR = [
            { recipientUserId: user.id },
            ...(user.studentId ? [{ studentId: user.studentId, recipientRole: 'wali_murid' }] : []),
          ];
        } else if (user.role === 'guru') {
          const homeroomNames = (user.homeroomClasses || []).map(c => c.name);
          where.OR = [
            { recipientUserId: user.id },
            ...(homeroomNames.length > 0 ? [{ recipientRole: 'guru', className: { in: homeroomNames } }] : []),
          ];
        }

        const unreadWhere = { ...where, readAt: null };
        const [total, unreadCount, items] = await Promise.all([
          prisma.notificationLog.count({ where }),
          prisma.notificationLog.count({ where: unreadWhere }),
          prisma.notificationLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
        ]);
        return { total, unreadCount, items };
      } catch {
        return { total: 0, unreadCount: 0, items: [] };
      }
    },
    createNotification,
    markNotificationRead: async (id, user) => {
      const existing = await prisma.notificationLog.findUnique({ where: { id } }).catch(() => null);
      if (!existing) return null;
      if (user.role === 'wali_murid' && existing.recipientUserId !== user.id && existing.studentId !== user.studentId) {
        return null;
      }
      return prisma.notificationLog.update({
        where: { id },
        data: { readAt: new Date() },
      });
    },
    markAllNotificationsRead: async (user) => {
      const where = { readAt: null };
      if (user.role === 'wali_murid') {
        where.OR = [
          { recipientUserId: user.id },
          ...(user.studentId ? [{ studentId: user.studentId, recipientRole: 'wali_murid' }] : []),
        ];
      } else if (user.role === 'guru') {
        const homeroomNames = (user.homeroomClasses || []).map(c => c.name);
        where.OR = [
          { recipientUserId: user.id },
          ...(homeroomNames.length > 0 ? [{ recipientRole: 'guru', className: { in: homeroomNames } }] : []),
        ];
      }
      const res = await prisma.notificationLog.updateMany({
        where,
        data: { readAt: new Date() },
      }).catch(() => ({ count: 0 }));
      return res.count || 0;
    },
    logAudit,
  });

  const operationsRouter = createOperationsRouter({
    listPayments: async ({ status, kelas, search, studentId, page, limit }) => {
      const activeTa = await resolveActiveYear();
      const where = {};
      if (status) where.status = status;
      if (studentId) where.studentId = studentId;
      if (search) {
        where.OR = [
          { student: { name: { contains: search, mode: 'insensitive' } } },
          { month: { contains: search, mode: 'insensitive' } },
          { type: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (kelas) {
        where.student = {
          ...(where.student || {}),
          riwayatKelas: {
            some: {
              ...(activeTa ? { tahunAjarId: activeTa.id } : {}),
              kelas: { name: kelas },
            },
          },
        };
      }

      const [total, allRows, rows] = await Promise.all([
        prisma.pembayaran.count({ where }),
        prisma.pembayaran.findMany({ where, select: { amount: true, paid: true, status: true } }),
        prisma.pembayaran.findMany({
          where,
          include: {
            student: {
              include: {
                riwayatKelas: {
                  where: activeTa ? { tahunAjarId: activeTa.id } : undefined,
                  include: { kelas: true },
                  take: 1,
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      const summary = allRows.reduce(
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

      return {
        total,
        summary,
        items: rows.map(r => ({
          id: r.id,
          studentId: r.studentId,
          studentName: r.student?.name || '-',
          class: r.student?.riwayatKelas?.[0]?.kelas?.name || '-',
          type: r.type,
          month: r.month,
          amount: r.amount,
          paid: r.paid,
          status: r.status,
          date: r.date ? r.date.toISOString().split('T')[0] : null,
        })),
      };
    },
    createPayment: async (body) => {
      const activeTa = await resolveActiveYear();
      const student = await prisma.siswa.findUnique({ where: { id: body.studentId } });
      if (!student) throw new Error('Data siswa tidak ditemukan.');
      const created = await prisma.pembayaran.create({
        data: {
          studentId: body.studentId,
          tahunAjarId: activeTa?.id || null,
          type: body.type,
          month: body.month,
          amount: body.amount,
          paid: body.paid,
          status: body.status,
          date: body.date ? new Date(`${body.date}T00:00:00.000Z`) : null,
        },
        include: { student: true },
      });
      return {
        id: created.id,
        studentId: created.studentId,
        studentName: created.student?.name || '-',
        type: created.type,
        month: created.month,
        amount: created.amount,
        paid: created.paid,
        status: created.status,
        date: created.date ? created.date.toISOString().split('T')[0] : null,
      };
    },
    updatePayment: async (id, patch) => {
      const existing = await prisma.pembayaran.findUnique({ where: { id }, include: { student: true } });
      if (!existing) return null;
      const nextAmount = patch.amount !== undefined ? patch.amount : existing.amount;
      const nextPaid = patch.paid !== undefined ? patch.paid : existing.paid;
      const nextStatus = patch.status || computePaymentStatus(nextAmount, nextPaid);
      const updated = await prisma.pembayaran.update({
        where: { id },
        data: {
          ...(patch.type ? { type: patch.type } : {}),
          ...(patch.month ? { month: patch.month } : {}),
          amount: nextAmount,
          paid: nextPaid,
          status: nextStatus,
          ...(patch.date !== undefined
            ? { date: patch.date ? new Date(`${patch.date}T00:00:00.000Z`) : null }
            : nextPaid > existing.paid
              ? { date: new Date() }
              : {}),
        },
        include: { student: true },
      });
      return {
        id: updated.id,
        studentId: updated.studentId,
        studentName: updated.student?.name || '-',
        type: updated.type,
        month: updated.month,
        amount: updated.amount,
        paid: updated.paid,
        status: updated.status,
        date: updated.date ? updated.date.toISOString().split('T')[0] : null,
      };
    },
    deletePayment: async (id) => {
      const existing = await prisma.pembayaran.findUnique({ where: { id }, include: { student: true } });
      if (!existing) return null;
      await prisma.pembayaran.delete({ where: { id } });
      return { ...existing, studentName: existing.student?.name || '-' };
    },
    listPrayerAttendance: async ({ date, kelas, studentId }) => {
      const activeTa = await resolveActiveYear();
      const targetDate = new Date(`${date}T00:00:00.000Z`);
      const studentWhere = { status: 'aktif' };
      if (studentId) studentWhere.id = studentId;
      if (kelas) {
        studentWhere.riwayatKelas = {
          some: {
            ...(activeTa ? { tahunAjarId: activeTa.id } : {}),
            kelas: { name: kelas },
          },
        };
      }

      const [students, savedRows] = await Promise.all([
        prisma.siswa.findMany({
          where: studentWhere,
          include: {
            riwayatKelas: {
              where: activeTa ? { tahunAjarId: activeTa.id } : undefined,
              include: { kelas: true },
              take: 1,
            },
          },
          orderBy: { name: 'asc' },
        }),
        prisma.absensiSholat.findMany({
          where: { date: targetDate },
        }),
      ]);

      const rowMap = new Map(savedRows.map(r => [r.studentId, r]));
      const items = students.map(s => {
        const saved = rowMap.get(s.id);
        return {
          id: saved?.id || `prayer-${s.id}-${date}`,
          studentId: s.id,
          studentName: s.name,
          nis: s.nomor || '-',
          class: s.riwayatKelas?.[0]?.kelas?.name || '-',
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
    savePrayerAttendanceBatch: async ({ date, records, recordedByUserId, recordedByGuruId }) => {
      const activeTa = await resolveActiveYear();
      const targetDate = new Date(`${date}T00:00:00.000Z`);
      const studentIds = [...new Set(records.map(r => r.studentId))];
      const students = await prisma.siswa.findMany({
        where: { id: { in: studentIds } },
        select: {
          id: true,
          riwayatKelas: {
            where: activeTa ? { tahunAjarId: activeTa.id } : undefined,
            select: { kelasId: true },
            take: 1,
          },
        },
      });
      const classByStudent = new Map(students.map(s => [s.id, s.riwayatKelas?.[0]?.kelasId || null]));
      let count = 0;

      await prisma.$transaction(async (tx) => {
        for (const rec of records) {
          if (!classByStudent.has(rec.studentId)) continue;
          await tx.absensiSholat.upsert({
            where: {
              studentId_date: {
                studentId: rec.studentId,
                date: targetDate,
              },
            },
            update: {
              dzuhur: Boolean(rec.dzuhur),
              ashar: Boolean(rec.ashar),
              kelasId: classByStudent.get(rec.studentId),
              recordedByUserId,
              recordedByGuruId,
            },
            create: {
              studentId: rec.studentId,
              kelasId: classByStudent.get(rec.studentId),
              tahunAjarId: activeTa?.id || null,
              recordedByUserId,
              recordedByGuruId,
              date: targetDate,
              dzuhur: Boolean(rec.dzuhur),
              ashar: Boolean(rec.ashar),
            },
          });
          count++;
        }
      });

      return { count };
    },
    logAudit,
  });

  return {
    tokenVersionGuard,
    logAudit,
    getSchoolConfig,
    saveSchoolConfig,
    dispatchAttendanceNotifications,
    auditRouter,
    schoolConfigRouter,
    operationsRouter,
  };
}
