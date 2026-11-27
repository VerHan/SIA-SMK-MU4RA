import express from 'express';
import { requireAuth, requireRole } from '../authUtils.js';
import { buildPaginationMeta, parsePaginationParams } from '../academicRolloverUtils.js';
import { schoolConfigSchema, testWebhookSchema, validateBody } from '../validators/schemas.js';
import { DEFAULT_SCHOOL_CONFIG, dispatchWebhookPayload } from './auditService.js';

/**
 * Modular router for Centralized School Configuration & Notification Channels
 * (School Profile, Jam Masuk/Pulang, Geofence, WhatsApp Webhook, & In-App Alerts).
 */
export function createSchoolConfigRouter({
  getSchoolConfig,
  saveSchoolConfig,
  listNotifications,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  logAudit,
}) {
  const router = express.Router();

  // Unified School Config (operational fields for all users; webhook/backup config for admin)
  router.get('/school-config', async (req, res) => {
    try {
      const cfg = { ...DEFAULT_SCHOOL_CONFIG, ...(await getSchoolConfig()) };
      const isAdmin = req.authUser?.role === 'admin';
      if (!isAdmin) {
        return res.json({
          success: true,
          data: {
            schoolName: cfg.schoolName,
            npsn: cfg.npsn,
            principalName: cfg.principalName,
            address: cfg.address,
            phone: cfg.phone,
            email: cfg.email,
            jamMasuk: cfg.jamMasuk,
            jamPulang: cfg.jamPulang,
            batasTelatMenit: cfg.batasTelatMenit,
            geofenceLat: cfg.geofenceLat,
            geofenceLng: cfg.geofenceLng,
            geofenceRadius: cfg.geofenceRadius,
          },
        });
      }
      res.json({ success: true, data: cfg });
    } catch (err) {
      console.error('GET /api/school-config error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update School Config (Admin only, centralized Zod + SSRF validation)
  router.put('/school-config', requireRole('admin'), validateBody(schoolConfigSchema), async (req, res) => {
    try {
      const updated = await saveSchoolConfig(req.validatedBody);

      await logAudit(req, {
        action: 'SCHOOL_CONFIG_UPDATE',
        target: updated.schoolName || 'Pengaturan Sekolah',
        detail: {
          jamMasuk: updated.jamMasuk,
          jamPulang: updated.jamPulang,
          batasTelatMenit: updated.batasTelatMenit,
          geofenceRadius: updated.geofenceRadius,
          whatsappEnabled: updated.whatsappEnabled,
          notifyOnAlpha: updated.notifyOnAlpha,
          notifyOnBolos: updated.notifyOnBolos,
          dailyBackupEnabled: updated.dailyBackupEnabled,
        },
      });

      res.json({
        success: true,
        data: updated,
        message: 'Konfigurasi sekolah berhasil disimpan.',
      });
    } catch (err) {
      console.error('PUT /api/school-config error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Role-scoped Paginated Notification Feed
  router.get('/notifications', requireAuth, async (req, res) => {
    try {
      const { unreadOnly, eventType } = req.query;
      const { page, limit } = parsePaginationParams(req.query, { defaultLimit: 20, maxLimit: 100 });
      const result = await listNotifications({
        user: req.authUser,
        unreadOnly: unreadOnly === 'true' || unreadOnly === '1',
        eventType: eventType && eventType !== 'all' ? String(eventType).trim().toUpperCase() : null,
        page,
        limit,
      });

      res.json({
        success: true,
        data: result.items || [],
        unreadCount: Number(result.unreadCount) || 0,
        pagination: buildPaginationMeta(result.total || 0, page, limit),
      });
    } catch (err) {
      console.error('GET /api/notifications error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.put('/notifications/read-all', requireAuth, async (req, res) => {
    try {
      const count = await markAllNotificationsRead(req.authUser);
      res.json({ success: true, updated: count, message: 'Semua notifikasi ditandai sudah dibaca.' });
    } catch (err) {
      console.error('PUT /api/notifications/read-all error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.put('/notifications/:id/read', requireAuth, async (req, res) => {
    try {
      const updated = await markNotificationRead(req.params.id, req.authUser);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Notifikasi tidak ditemukan.' });
      }
      res.json({ success: true, data: updated });
    } catch (err) {
      console.error('PUT /api/notifications/:id/read error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Test Notification / WhatsApp Webhook Dispatch (Admin only)
  router.post(
    '/notifications/test-webhook',
    requireRole('admin'),
    validateBody(testWebhookSchema),
    async (req, res) => {
      try {
        const cfg = { ...DEFAULT_SCHOOL_CONFIG, ...(await getSchoolConfig()) };
        const targetUrl =
          req.validatedBody.webhookUrl !== undefined
            ? req.validatedBody.webhookUrl || ''
            : cfg.whatsappWebhookUrl || '';

        const sampleMessage =
          req.validatedBody.sampleMessage ||
          `[${cfg.schoolName}] Uji coba jalur notifikasi WhatsApp/Webhook berhasil dikirim pada ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}.`;

        const payload = {
          event: 'SYSTEM_TEST',
          schoolName: cfg.schoolName,
          sentAt: new Date().toISOString(),
          triggeredBy: req.authUser?.name || 'Admin',
          message: sampleMessage,
        };

        const dispatch = await dispatchWebhookPayload(targetUrl, payload);

        const savedLog = await createNotification({
          recipientRole: 'admin',
          recipientUserId: req.authUser?.id || null,
          recipientName: req.authUser?.name || 'Administrator',
          recipientPhone: cfg.phone || null,
          studentId: null,
          studentName: null,
          className: null,
          eventType: 'SYSTEM_TEST',
          title: targetUrl ? 'Tes Pengiriman Webhook WhatsApp' : 'Simulasi Notifikasi Internal (Tanpa URL Webhook)',
          message: dispatch.error ? `${sampleMessage} — Gagal: ${dispatch.error}` : sampleMessage,
          channel: targetUrl ? 'whatsapp_webhook' : 'in_app',
          deliveryStatus: dispatch.status,
        });

        await logAudit(req, {
          action: 'NOTIFICATION_WEBHOOK_TEST',
          target: targetUrl ? 'Webhook Eksternal' : 'Simulasi Internal',
          detail: {
            deliveryStatus: dispatch.status,
            error: dispatch.error || null,
          },
        });

        if (!dispatch.ok) {
          return res.status(400).json({
            success: false,
            deliveryStatus: dispatch.status,
            notification: savedLog,
            error: dispatch.error || 'Gagal mengirim pesan tes ke URL webhook.',
          });
        }

        res.json({
          success: true,
          deliveryStatus: dispatch.status,
          notification: savedLog,
          message: targetUrl
            ? 'Tes webhook berhasil dikirim dan dicatat di riwayat notifikasi.'
            : 'URL webhook belum diisi — tes disimpan sebagai simulasi notifikasi internal.',
        });
      } catch (err) {
        console.error('POST /api/notifications/test-webhook error:', err);
        res.status(500).json({ success: false, error: err.message });
      }
    }
  );

  return router;
}
