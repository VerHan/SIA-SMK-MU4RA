import express from 'express';
import { requireRole } from '../authUtils.js';
import { buildPaginationMeta, parsePaginationParams } from '../academicRolloverUtils.js';
import { realtimeHub } from './realtimeHub.js';

/**
 * Modular router for Audit Trail, Instant Session Revocation (tokenVersion),
 * and Automated / On-Demand Database Backup Snapshot.
 */
export function createAuditRouter({
  listAuditLogs,
  revokeUserSessions,
  buildBackupSnapshot,
  recordBackupRun,
  logAudit,
}) {
  const router = express.Router();

  // Paginated Audit Trail viewer (Admin only)
  router.get('/audit-logs', requireRole('admin'), async (req, res) => {
    try {
      const { action, search } = req.query;
      const { page, limit } = parsePaginationParams(req.query, { defaultLimit: 25, maxLimit: 100 });
      const result = await listAuditLogs({
        action: action && action !== 'all' ? String(action).trim().toUpperCase() : null,
        search: search ? String(search).trim() : '',
        page,
        limit,
      });

      res.json({
        success: true,
        data: result.items || [],
        actions: result.actions || [],
        pagination: buildPaginationMeta(result.total || 0, page, limit),
      });
    } catch (err) {
      console.error('GET /api/audit-logs error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Instant session revocation via tokenVersion increment (Admin only)
  router.post('/users/:id/revoke-sessions', requireRole('admin'), async (req, res) => {
    try {
      const targetId = String(req.params.id || '').trim();
      if (!targetId) {
        return res.status(400).json({ success: false, error: 'ID akun tidak valid.' });
      }
      const result = await revokeUserSessions(targetId);
      if (!result) {
        return res.status(404).json({ success: false, error: 'Akun pengguna tidak ditemukan.' });
      }

      realtimeHub.disconnectUser(result.id);

      await logAudit(req, {
        action: 'USER_REVOKE_SESSIONS',
        target: `${result.name} (@${result.username})`,
        detail: {
          userId: result.id,
          newTokenVersion: result.tokenVersion,
          revokedBy: req.authUser?.username,
        },
      });

      res.json({
        success: true,
        data: {
          id: result.id,
          username: result.username,
          tokenVersion: result.tokenVersion,
        },
        message: `Semua sesi aktif akun ${result.name} (@${result.username}) berhasil diputus seketika.`,
      });
    } catch (err) {
      console.error('POST /api/users/:id/revoke-sessions error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Sanitized JSON Database Backup Export (Admin only, zero password hashes)
  router.get('/system/backup-export', requireRole('admin'), async (req, res) => {
    try {
      const snapshot = await buildBackupSnapshot();
      const exportedAt = new Date().toISOString();
      if (typeof recordBackupRun === 'function') {
        await recordBackupRun({ exportedAt, triggeredBy: req.authUser?.name || 'Admin', triggerType: 'MANUAL_EXPORT' });
      }

      await logAudit(req, {
        action: 'SYSTEM_BACKUP_EXPORT',
        target: 'Database Snapshot (JSON)',
        detail: {
          exportedAt,
          counts: snapshot.counts || {},
        },
      });

      const dateTag = exportedAt.split('T')[0];
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="sia-mu4ra-backup-${dateTag}.json"`);
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).send(
        JSON.stringify(
          {
            schemaVersion: '1.0',
            exportedAt,
            exportedBy: req.authUser?.username || 'admin',
            ...snapshot,
          },
          null,
          2
        )
      );
    } catch (err) {
      console.error('GET /api/system/backup-export error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Daily Automated Backup Trigger (Cron Secret OR Admin session)
  router.post('/system/backup-trigger', async (req, res) => {
    try {
      const configuredSecret = (process.env.BACKUP_CRON_SECRET || process.env.CRON_SECRET || '').trim();
      const providedSecret = String(req.headers['x-cron-secret'] || '').trim();
      const isCronAuthorized = Boolean(configuredSecret && providedSecret && providedSecret === configuredSecret);
      const isAdmin = req.authUser?.role === 'admin';

      if (!isCronAuthorized && !isAdmin) {
        return res.status(401).json({
          success: false,
          error: 'Akses ditolak. Diperlukan sesi Admin atau header x-cron-secret yang valid.',
        });
      }

      const snapshot = await buildBackupSnapshot();
      const exportedAt = new Date().toISOString();
      const triggeredBy = isCronAuthorized ? 'Automated Daily Backup Cron' : req.authUser?.name || 'Admin';

      if (typeof recordBackupRun === 'function') {
        await recordBackupRun({ exportedAt, triggeredBy, triggerType: isCronAuthorized ? 'AUTO_DAILY' : 'MANUAL_CHECK' });
      }

      await logAudit(req, {
        action: 'SYSTEM_DAILY_BACKUP',
        target: triggeredBy,
        detail: {
          exportedAt,
          counts: snapshot.counts || {},
        },
      });

      res.json({
        success: true,
        lastBackupAt: exportedAt,
        counts: snapshot.counts || {},
        message: 'Backup snapshot database harian berhasil diverifikasi dan dicatat.',
      });
    } catch (err) {
      console.error('POST /api/system/backup-trigger error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
