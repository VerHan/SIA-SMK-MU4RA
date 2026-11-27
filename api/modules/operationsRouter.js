import express from 'express';
import { requireAuth, requireRole } from '../authUtils.js';
import { realtimeHub } from './realtimeHub.js';
import { buildPaginationMeta, parsePaginationParams } from '../academicRolloverUtils.js';
import {
  paymentCreateSchema,
  paymentUpdateSchema,
  prayerAttendanceBatchSchema,
  validateBody,
} from '../validators/schemas.js';
import { computePaymentStatus } from './auditService.js';

function getJakartaDateString() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

/**
 * Modular router replacing legacy local dummy modules with real API-backed operations:
 * - Pembayaran SPP / Keuangan Siswa (/api/pembayaran)
 * - Absen Sholat Dzuhur & Ashar (/api/absen-sholat)
 */
export function createOperationsRouter({
  listPayments,
  createPayment,
  updatePayment,
  deletePayment,
  listPrayerAttendance,
  savePrayerAttendanceBatch,
  logAudit,
}) {
  const router = express.Router();

  // ==========================================
  // 1. PEMBAYARAN SPP & KEUANGAN SISWA
  // ==========================================
  router.get('/pembayaran', requireAuth, async (req, res) => {
    try {
      const { status, kelas, search } = req.query;
      const { page, limit } = parsePaginationParams(req.query, { defaultLimit: 50, maxLimit: 200 });
      const forcedStudentId =
        req.authUser.role === 'wali_murid'
          ? req.authUser.studentId || '__none__'
          : req.query.studentId
            ? String(req.query.studentId).trim()
            : null;

      const result = await listPayments({
        status: status && status !== 'all' ? String(status).trim().toLowerCase() : null,
        kelas: kelas && kelas !== 'all' && kelas !== 'Semua' ? String(kelas).trim() : null,
        search: search ? String(search).trim() : '',
        studentId: forcedStudentId,
        page,
        limit,
      });

      res.json({
        success: true,
        data: result.items || [],
        summary: result.summary || {
          totalTagihan: 0,
          totalTerbayar: 0,
          totalTunggakan: 0,
          countLunas: 0,
          countCicilan: 0,
          countBelum: 0,
        },
        pagination: buildPaginationMeta(result.total || 0, page, limit),
      });
    } catch (err) {
      console.error('GET /api/pembayaran error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post(
    '/pembayaran',
    requireRole('admin', 'staff'),
    validateBody(paymentCreateSchema),
    async (req, res) => {
      try {
        const body = req.validatedBody;
        const status = computePaymentStatus(body.amount, body.paid);
        const created = await createPayment({
          ...body,
          status,
          date: body.date || (body.paid > 0 ? getJakartaDateString() : null),
        });

        await logAudit(req, {
          action: 'PAYMENT_CREATE',
          target: `${created.studentName || body.studentId} (${body.type} ${body.month})`,
          detail: { amount: body.amount, paid: body.paid, status },
        });

        res.json({ success: true, data: created, message: 'Tagihan pembayaran berhasil ditambahkan.' });
      } catch (err) {
        console.error('POST /api/pembayaran error:', err);
        res.status(400).json({ success: false, error: err.message });
      }
    }
  );

  router.put(
    '/pembayaran/:id',
    requireRole('admin', 'staff'),
    validateBody(paymentUpdateSchema),
    async (req, res) => {
      try {
        const updated = await updatePayment(req.params.id, req.validatedBody);
        if (!updated) {
          return res.status(404).json({ success: false, error: 'Data pembayaran tidak ditemukan.' });
        }

        await logAudit(req, {
          action: 'PAYMENT_UPDATE',
          target: `${updated.studentName || updated.studentId} (${updated.type} ${updated.month})`,
          detail: { amount: updated.amount, paid: updated.paid, status: updated.status },
        });

        res.json({ success: true, data: updated, message: 'Status pembayaran berhasil diperbarui.' });
      } catch (err) {
        console.error('PUT /api/pembayaran/:id error:', err);
        res.status(500).json({ success: false, error: err.message });
      }
    }
  );

  router.delete('/pembayaran/:id', requireRole('admin', 'staff'), async (req, res) => {
    try {
      const deleted = await deletePayment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Data pembayaran tidak ditemukan.' });
      }

      await logAudit(req, {
        action: 'PAYMENT_DELETE',
        target: `${deleted.studentName || deleted.studentId} (${deleted.type} ${deleted.month})`,
        detail: { id: deleted.id, amount: deleted.amount },
      });

      res.json({ success: true, message: 'Data pembayaran berhasil dihapus.' });
    } catch (err) {
      console.error('DELETE /api/pembayaran/:id error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 2. ABSENSI SHOLAT (DZUHUR & ASHAR)
  // ==========================================
  router.get('/absen-sholat', requireAuth, async (req, res) => {
    try {
      const dateStr = req.query.date ? String(req.query.date).split('T')[0] : getJakartaDateString();
      const kelas = req.query.kelas && req.query.kelas !== 'all' ? String(req.query.kelas).trim() : null;
      const studentId =
        req.authUser.role === 'wali_murid'
          ? req.authUser.studentId || '__none__'
          : null;

      const result = await listPrayerAttendance({ date: dateStr, kelas, studentId });

      res.json({
        success: true,
        date: dateStr,
        kelas: kelas || 'Semua',
        data: result.items || [],
        summary: result.summary || { totalStudents: 0, dzuhurCount: 0, asharCount: 0, lengkapCount: 0 },
      });
    } catch (err) {
      console.error('GET /api/absen-sholat error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post(
    '/absen-sholat',
    requireRole('admin', 'guru', 'staff'),
    validateBody(prayerAttendanceBatchSchema),
    async (req, res) => {
      try {
        const { date, records } = req.validatedBody;
        const saved = await savePrayerAttendanceBatch({
          date,
          records,
          recordedByUserId: req.authUser?.id || null,
          recordedByGuruId: req.authUser?.teacherId || null,
        });

        await logAudit(req, {
          action: 'PRAYER_ATTENDANCE_SAVE',
          target: `Tanggal ${date} (${saved.count} siswa)`,
          detail: { date, count: saved.count },
        });

        realtimeHub.publish({
          type: 'prayer-attendance:updated',
          classNames: [],
          studentIds: records.map((r) => r.studentId).filter(Boolean),
          date,
          updatedBy: req.authUser?.name || null,
        });

        res.json({
          success: true,
          count: saved.count,
          date,
          message: `Absensi sholat untuk ${saved.count} siswa berhasil disimpan.`,
        });
      } catch (err) {
        console.error('POST /api/absen-sholat error:', err);
        res.status(500).json({ success: false, error: err.message });
      }
    }
  );

  return router;
}
