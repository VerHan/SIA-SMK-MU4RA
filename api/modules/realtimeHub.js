/* ============================================================
   realtimeHub.js — Server-Authoritative Real-Time SSE Event Hub
   Menyiarkan pembaruan data kehadiran & notifikasi secara langsung
   ke perangkat terhubung (Admin, Guru/Wali Kelas, Wali Murid)
   tanpa perlu refresh halaman, dengan isolasi peran & kepemilikan ketat.
   ============================================================ */

import express from 'express';
import crypto from 'crypto';
import { requireAuth } from '../authUtils.js';

const MAX_CONNECTIONS_PER_USER = 5;
const MAX_TOTAL_CONNECTIONS = 500;
const HEARTBEAT_INTERVAL_MS = 25 * 1000;

/**
 * Pure predicate: determines whether a connected subscriber is authorized
 * to receive a given real-time server event.
 */
export function shouldDeliverEvent(subscriber, event) {
  if (!subscriber || !event || !event.type) return false;

  const role = String(subscriber.role || '').toLowerCase();

  if (event.type === 'session:revoked') {
    return Boolean(event.targetUserId && subscriber.userId === event.targetUserId);
  }

  const classNames = Array.isArray(event.classNames) ? event.classNames : [];
  const studentIds = Array.isArray(event.studentIds) ? event.studentIds : [];
  const recipientUserIds = Array.isArray(event.recipientUserIds) ? event.recipientUserIds : [];
  const homeroomSet = subscriber.homeroomClassNames instanceof Set
    ? subscriber.homeroomClassNames
    : new Set(Array.isArray(subscriber.homeroomClassNames) ? subscriber.homeroomClassNames : []);

  if (role === 'admin' || role === 'kepsek' || role === 'staff') {
    return true;
  }

  if (role === 'wali_murid') {
    if (!subscriber.studentId && !subscriber.userId) return false;
    if (event.type === 'notification:created') {
      return (
        (subscriber.userId && recipientUserIds.includes(subscriber.userId)) ||
        (subscriber.studentId && studentIds.includes(subscriber.studentId))
      );
    }
    // Strictly deliver attendance updates ONLY for the parent's linked child
    return Boolean(subscriber.studentId && studentIds.includes(subscriber.studentId));
  }

  if (role === 'guru') {
    if (event.type === 'notification:created') {
      if (subscriber.userId && recipientUserIds.includes(subscriber.userId)) return true;
      return classNames.some((cls) => homeroomSet.has(cls));
    }
    if (subscriber.isPiket) return true;
    if (classNames.length === 0) return true;
    if (classNames.some((cls) => homeroomSet.has(cls))) return true;
    // Subject teachers also receive subject-attendance updates for live coordination
    if (event.type === 'subject-attendance:updated') return true;
    return false;
  }

  return false;
}

/**
 * Pure sanitizer: strips PII and unrelated identifiers before emitting an SSE
 * event to a specific subscriber. Clients use the minimal signal to refetch
 * their own server-authorized endpoints.
 */
export function sanitizeEventForSubscriber(subscriber, event) {
  const role = String(subscriber?.role || '').toLowerCase();
  const base = {
    type: event.type,
    date: event.date || null,
    session: event.session || null,
    timestamp: event.timestamp || new Date().toISOString(),
  };

  if (event.type === 'session:revoked') {
    return { type: 'session:revoked', timestamp: base.timestamp };
  }

  if (role === 'wali_murid') {
    // Never leak class rosters, other student IDs, or teacher names in broadcast payload
    return base;
  }

  return {
    ...base,
    classNames: Array.isArray(event.classNames) ? event.classNames : [],
    updatedBy: event.updatedBy || null,
  };
}

/**
 * Formats an SSE frame string cleanly.
 */
export function formatSseFrame(eventName, payload) {
  const safeEvent = String(eventName || 'message').replace(/[\r\n]/g, '');
  const json = JSON.stringify(payload ?? {});
  return `event: ${safeEvent}\ndata: ${json}\n\n`;
}

export function createRealtimeHub({
  maxPerUser = MAX_CONNECTIONS_PER_USER,
  maxTotal = MAX_TOTAL_CONNECTIONS,
  heartbeatMs = HEARTBEAT_INTERVAL_MS,
} = {}) {
  /** @type {Map<string, any>} */
  const subscribers = new Map();

  function safeWrite(sub, chunk) {
    try {
      if (sub.res.writableEnded || sub.res.destroyed) {
        removeSubscriber(sub.id);
        return false;
      }
      sub.res.write(chunk);
      if (typeof sub.res.flush === 'function') {
        sub.res.flush();
      }
      return true;
    } catch {
      removeSubscriber(sub.id);
      return false;
    }
  }

  function removeSubscriber(subId) {
    const sub = subscribers.get(subId);
    if (!sub) return;
    if (sub.heartbeatTimer) {
      clearInterval(sub.heartbeatTimer);
    }
    subscribers.delete(subId);
  }

  function subscribe(req, res) {
    const user = req.authUser;
    if (!user || !user.id) {
      return res.status(401).json({ success: false, error: 'Autentikasi diperlukan.' });
    }

    // Enforce global cap by rejecting excess connections cleanly
    if (subscribers.size >= maxTotal) {
      return res.status(503).json({ success: false, error: 'Koneksi real-time sedang penuh.' });
    }

    // Enforce per-user cap by closing the oldest stream for this user
    const sameUserSubs = Array.from(subscribers.values()).filter((s) => s.userId === user.id);
    if (sameUserSubs.length >= maxPerUser) {
      const oldest = sameUserSubs[0];
      try {
        oldest.res.end();
      } catch {
        /* ignore */
      }
      removeSubscriber(oldest.id);
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const subId = crypto.randomUUID();
    const homeroomClassNames = new Set(
      Array.isArray(user.homeroomClasses)
        ? user.homeroomClasses.map((c) => (typeof c === 'string' ? c : c?.name)).filter(Boolean)
        : []
    );

    const subscriber = {
      id: subId,
      userId: user.id,
      role: String(user.role || '').toLowerCase(),
      isPiket: Boolean(user.isPiket),
      studentId: user.studentId || null,
      homeroomClassNames,
      res,
      connectedAt: Date.now(),
      heartbeatTimer: null,
    };

    subscriber.heartbeatTimer = setInterval(() => {
      safeWrite(subscriber, ': ping\n\n');
    }, heartbeatMs);
    if (typeof subscriber.heartbeatTimer.unref === 'function') {
      subscriber.heartbeatTimer.unref();
    }

    subscribers.set(subId, subscriber);

    // Send initial connection confirmation frame
    safeWrite(
      subscriber,
      formatSseFrame('connected', { ok: true, timestamp: new Date().toISOString() })
    );

    req.on('close', () => {
      removeSubscriber(subId);
    });
  }

  function publish(event) {
    if (!event || !event.type) return 0;
    const enriched = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    };
    let delivered = 0;
    for (const sub of Array.from(subscribers.values())) {
      if (!shouldDeliverEvent(sub, enriched)) continue;
      const sanitized = sanitizeEventForSubscriber(sub, enriched);
      const frame = formatSseFrame(enriched.type, sanitized);
      if (safeWrite(sub, frame)) {
        delivered += 1;
      }
    }
    return delivered;
  }

  function disconnectUser(userId) {
    if (!userId) return 0;
    let closed = 0;
    const frame = formatSseFrame('session:revoked', {
      type: 'session:revoked',
      timestamp: new Date().toISOString(),
    });
    for (const sub of Array.from(subscribers.values())) {
      if (sub.userId !== userId) continue;
      safeWrite(sub, frame);
      try {
        sub.res.end();
      } catch {
        /* ignore */
      }
      removeSubscriber(sub.id);
      closed += 1;
    }
    return closed;
  }

  function getStats() {
    return { activeConnections: subscribers.size };
  }

  function createRouter() {
    const router = express.Router();
    router.get('/events/stream', requireAuth, (req, res) => {
      subscribe(req, res);
    });
    return router;
  }

  return {
    subscribe,
    publish,
    disconnectUser,
    getStats,
    createRouter,
  };
}

export const realtimeHub = createRealtimeHub();
