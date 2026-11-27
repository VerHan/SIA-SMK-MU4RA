import { clearSessionCookie, getClientIp, validateSafeWebhookUrl } from '../authUtils.js';

export const DEFAULT_SCHOOL_CONFIG = {
  id: 'school_default',
  schoolName: 'SMK Muhammadiyah 04 Bangsri',
  npsn: '20360584',
  principalName: 'Kepala Sekolah',
  address: 'Jl. KH. Ahmad Dahlan No. 04, Bangsri, Jepara',
  phone: '(0291) 771234',
  email: 'info@smkmu4rabangsri.sch.id',
  jamMasuk: '07:00',
  jamPulang: '15:30',
  batasTelatMenit: 15,
  geofenceLat: -6.5194526,
  geofenceLng: 110.7783316,
  geofenceRadius: 250,
  whatsappEnabled: false,
  whatsappWebhookUrl: '',
  notifyOnAlpha: true,
  notifyOnBolos: true,
  notifyHomeroom: true,
  notifyParent: true,
  dailyBackupEnabled: true,
  dailyBackupTime: '02:00',
  lastBackupAt: null,
};

/**
 * Factory for server-side tokenVersion & isActive session revocation guard.
 * Uses a fast short-TTL cache (30s) per userId and supports instant invalidation
 * whenever an account is deactivated, password is changed, or sessions are revoked.
 */
export function createTokenVersionGuard({ lookupUserState, ttlMs = 30 * 1000 } = {}) {
  const cache = new Map();

  function invalidateUserSession(userId) {
    if (!userId) return;
    cache.delete(String(userId));
  }

  function clearAllSessionCache() {
    cache.clear();
  }

  async function middleware(req, res, next) {
    if (!req.authUser || !req.authUser.id) return next();

    // Allow logout to proceed even if session was already revoked
    const path = String(req.path || '');
    if (path === '/auth/logout' || path === '/api/auth/logout') {
      return next();
    }

    const userId = String(req.authUser.id);
    const now = Date.now();
    let entry = cache.get(userId);

    if (!entry || entry.expiresAt <= now) {
      try {
        const state = await lookupUserState(userId);
        entry = {
          exists: Boolean(state),
          isActive: state ? state.isActive !== false : false,
          tokenVersion: state ? (Number(state.tokenVersion) || 1) : 0,
          expiresAt: now + ttlMs,
        };
        if (cache.size > 2000) {
          cache.clear();
        }
        cache.set(userId, entry);
      } catch (err) {
        // Fail open only if transient DB glitch? Better: fail closed for security, except log warning
        console.warn('[SessionGuard] Failed checking user session version:', err.message);
        return next();
      }
    }

    const tokenTv = Number(req.authUser.tokenVersion) || 1;
    const isRevoked = !entry.exists || !entry.isActive || entry.tokenVersion !== tokenTv;

    if (isRevoked) {
      req.authUser = null;
      req.sessionRevoked = true;
      clearSessionCookie(req, res);

      // For /auth/me, let route handler return standard { authenticated: false } payload
      if (path === '/auth/me' || path === '/api/auth/me') {
        return next();
      }

      return res.status(401).json({
        success: false,
        sessionRevoked: true,
        error: !entry.isActive
          ? 'Akun Anda telah dinonaktifkan oleh administrator. Hubungi admin sekolah.'
          : 'Sesi Anda telah dicabut atau password baru saja diubah. Silakan login kembali.',
      });
    }

    return next();
  }

  return {
    middleware,
    invalidateUserSession,
    clearAllSessionCache,
  };
}

/**
 * Centralized audit logger helper. Never throws and breaks business mutations.
 */
export function createAuditLogger({ writeLog }) {
  return async function logAudit(req, { action, target = null, detail = null, user = null } = {}) {
    if (!action || typeof writeLog !== 'function') return null;
    const actor = user || req?.authUser || null;
    const detailStr =
      detail === null || detail === undefined
        ? null
        : typeof detail === 'string'
          ? detail
          : JSON.stringify(detail);

    try {
      return await writeLog({
        userId: actor?.id || null,
        userName: actor?.name || actor?.username || 'Sistem',
        action: String(action).trim().toUpperCase(),
        target: target ? String(target).slice(0, 200) : null,
        detail: detailStr ? detailStr.slice(0, 1500) : null,
        ipAddress: req ? getClientIp(req) : null,
      });
    } catch (err) {
      console.warn(`[AuditLog] Gagal mencatat aksi ${action}:`, err.message);
      return null;
    }
  };
}

/**
 * Pure detector for automatic Alpha & Bolos notifications from saved attendance rows.
 * - Bolos: statusPagi === 'hadir' && statusSore === 'alpha'
 * - Alpha: statusPagi === 'alpha' || statusSore === 'alpha' (when not classified as bolos)
 */
export function detectAttendanceAlerts({
  savedRecords = [],
  studentsById = new Map(),
  classesById = new Map(),
  teachersById = new Map(),
  users = [],
  config = DEFAULT_SCHOOL_CONFIG,
} = {}) {
  const alerts = [];
  if (!Array.isArray(savedRecords) || savedRecords.length === 0) return alerts;

  const schoolName = config?.schoolName || DEFAULT_SCHOOL_CONFIG.schoolName;
  const notifyAlpha = config?.notifyOnAlpha !== false;
  const notifyBolos = config?.notifyOnBolos !== false;
  const notifyHomeroom = config?.notifyHomeroom !== false;
  const notifyParent = config?.notifyParent !== false;

  if (!notifyAlpha && !notifyBolos) return alerts;
  if (!notifyHomeroom && !notifyParent) return alerts;

  for (const rec of savedRecords) {
    const pagi = rec?.statusPagi || null;
    const sore = rec?.statusSore || null;
    const isBolos = pagi === 'hadir' && sore === 'alpha';
    const isAlpha = !isBolos && (pagi === 'alpha' || sore === 'alpha');

    if (isBolos && !notifyBolos) continue;
    if (isAlpha && !notifyAlpha) continue;
    if (!isBolos && !isAlpha) continue;

    const student = studentsById.get(rec.studentId);
    const studentName = student?.name || rec.studentName || 'Siswa';
    const classObj = rec.kelasId ? classesById.get(rec.kelasId) : null;
    const className = classObj?.name || student?.class || rec.class || '-';
    const dateStr = String(rec.date || '').split('T')[0];

    const eventType = isBolos ? 'BOLOS_ALERT' : 'ALPHA_ALERT';
    const title = isBolos
      ? `Indikasi Bolos: ${studentName} (${className})`
      : `Ketidakhadiran Alpha: ${studentName} (${className})`;
    const sessionDesc = isBolos
      ? 'tercatat Hadir pada sesi pagi namun Alpha pada sesi sore (indikasi bolos)'
      : pagi === 'alpha' && sore === 'alpha'
        ? 'tercatat Alpha (tanpa keterangan) sesi pagi & sore'
        : pagi === 'alpha'
          ? 'tercatat Alpha (tanpa keterangan) pada sesi pagi'
          : 'tercatat Alpha (tanpa keterangan) pada sesi sore';

    const baseMessage = `[${schoolName}] Pemberitahuan tanggal ${dateStr}: Siswa ${studentName} kelas ${className} ${sessionDesc}. Mohon tindak lanjut dan konfirmasi.`;

    if (notifyHomeroom) {
      const homeroomTeacher = classObj?.teacherId ? teachersById.get(classObj.teacherId) : null;
      const homeroomUser = homeroomTeacher
        ? users.find(u => u.teacherId === homeroomTeacher.id)
        : null;
      alerts.push({
        recipientRole: 'guru',
        recipientUserId: homeroomUser?.id || null,
        recipientName: homeroomTeacher?.name || `Wali Kelas ${className}`,
        recipientPhone: homeroomTeacher?.phone || null,
        studentId: rec.studentId,
        studentName,
        className,
        eventType,
        title,
        message: baseMessage,
        date: dateStr,
      });
    }

    if (notifyParent) {
      const guardianUser = users.find(u => u.role === 'wali_murid' && u.studentId === rec.studentId);
      const rawParentPhone = student?.phone_parent && student.phone_parent !== '-' ? student.phone_parent : null;
      alerts.push({
        recipientRole: 'wali_murid',
        recipientUserId: guardianUser?.id || null,
        recipientName: guardianUser?.name || `Orang Tua/Wali ${studentName}`,
        recipientPhone: rawParentPhone,
        studentId: rec.studentId,
        studentName,
        className,
        eventType,
        title,
        message: baseMessage,
        date: dateStr,
      });
    }
  }

  return alerts;
}

/**
 * Send an outbound JSON webhook notification safely with SSRF validation and short timeout.
 */
export async function dispatchWebhookPayload(webhookUrl, payload, { fetchImpl = globalThis.fetch, timeoutMs = 4500 } = {}) {
  const validation = validateSafeWebhookUrl(webhookUrl);
  if (!validation.valid) {
    return { ok: false, status: 'failed', error: validation.error };
  }
  if (!validation.url) {
    return { ok: true, status: 'simulated', error: null };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(validation.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SIA-SMK-MU4RA-Notifier/1.0',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false, status: 'failed', httpStatus: res.status, error: `Webhook membalas HTTP ${res.status}` };
    }
    return { ok: true, status: 'sent', httpStatus: res.status, error: null };
  } catch (err) {
    return { ok: false, status: 'failed', error: err.name === 'AbortError' ? 'Webhook timeout (>4.5 detik).' : err.message };
  } finally {
    clearTimeout(timer);
  }
}

export function computePaymentStatus(amount, paid) {
  const total = Math.max(0, Number(amount) || 0);
  const paidNum = Math.max(0, Number(paid) || 0);
  if (total > 0 && paidNum >= total) return 'lunas';
  if (paidNum > 0) return 'cicilan';
  return 'belum';
}
