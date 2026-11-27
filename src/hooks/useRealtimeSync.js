/* ============================================================
   useRealtimeSync.js — Client SSE Real-Time Synchronization Hook
   Menghubungkan browser/PWA ke stream server (/api/events/stream)
   menggunakan Authorization Bearer + HttpOnly Cookie (tanpa token di URL)
   sehingga perubahan kehadiran & notifikasi langsung tampil di semua
   perangkat terhubung (Wali Kelas, Wali Murid, Admin) tanpa refresh halaman.
   ============================================================ */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { getAuthHeaders, notifyAuthExpired } from '../services/authToken';
import { parseSseBuffer } from '../utils/sseParser';

const ATTENDANCE_QUERY_KEYS = [
  ['homeroom-monitoring'],
  ['guardian-overview'],
  ['dashboard-stats'],
  ['monitoring-kelas'],
  ['attendance-analytics'],
  ['mobile-notifications'],
  ['notifications'],
];

const PRAYER_QUERY_KEYS = [['prayer-attendance']];
const NOTIF_QUERY_KEYS = [['mobile-notifications'], ['notifications']];

export function invalidateAttendanceQueries(queryClient) {
  for (const queryKey of ATTENDANCE_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey, refetchType: 'active' });
  }
}

export function useRealtimeSync() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id || null;
  const connectedOnceRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      connectedOnceRef.current = false;
      return undefined;
    }

    let stopped = false;
    let activeController = null;
    let reconnectTimer = null;
    let backoffMs = 2000;

    const triggerSync = (eventType, data = {}) => {
      if (eventType === 'attendance:updated' || eventType === 'subject-attendance:updated') {
        invalidateAttendanceQueries(queryClient);
      } else if (eventType === 'prayer-attendance:updated') {
        for (const queryKey of PRAYER_QUERY_KEYS) {
          queryClient.invalidateQueries({ queryKey, refetchType: 'active' });
        }
      } else if (eventType === 'notification:created') {
        for (const queryKey of NOTIF_QUERY_KEYS) {
          queryClient.invalidateQueries({ queryKey, refetchType: 'active' });
        }
      } else if (eventType === 'sync:resumed') {
        invalidateAttendanceQueries(queryClient);
        for (const queryKey of PRAYER_QUERY_KEYS) {
          queryClient.invalidateQueries({ queryKey, refetchType: 'active' });
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('sia-realtime-update', {
            detail: { type: eventType, ...data },
          })
        );
      }
    };

    const scheduleReconnect = () => {
      if (stopped) return;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      const delay = backoffMs;
      backoffMs = Math.min(backoffMs * 2, 15000);
      reconnectTimer = setTimeout(() => {
        if (!stopped) connect();
      }, delay);
    };

    const connect = async () => {
      if (stopped) return;
      if (activeController) {
        try {
          activeController.abort();
        } catch {
          /* ignore */
        }
      }
      const controller = new AbortController();
      activeController = controller;

      try {
        const response = await fetch('/api/events/stream', {
          method: 'GET',
          headers: getAuthHeaders({ Accept: 'text/event-stream' }),
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });

        if (response.status === 401) {
          notifyAuthExpired();
          stopped = true;
          return;
        }

        if (!response.ok || !response.body) {
          scheduleReconnect();
          return;
        }

        // Connected cleanly — reset backoff; if this is a reconnect, resync state
        backoffMs = 2000;
        if (connectedOnceRef.current) {
          triggerSync('sync:resumed', { reason: 'reconnected' });
        }
        connectedOnceRef.current = true;

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parsed = parseSseBuffer(buffer);
          buffer = parsed.remainder;

          for (const evt of parsed.events) {
            if (evt.event === 'session:revoked') {
              notifyAuthExpired();
              stopped = true;
              try {
                controller.abort();
              } catch {
                /* ignore */
              }
              return;
            }
            if (evt.event !== 'connected') {
              triggerSync(evt.event, typeof evt.data === 'object' && evt.data ? evt.data : {});
            }
          }
        }

        if (!stopped) {
          scheduleReconnect();
        }
      } catch (err) {
        if (stopped || err?.name === 'AbortError') return;
        scheduleReconnect();
      }
    };

    const handleVisibilityChange = () => {
      if (stopped) return;
      if (document.visibilityState === 'visible') {
        triggerSync('sync:resumed', { reason: 'visibility' });
      }
    };

    const handleOnline = () => {
      if (stopped) return;
      backoffMs = 2000;
      connect();
    };

    connect();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (activeController) {
        try {
          activeController.abort();
        } catch {
          /* ignore */
        }
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [isAuthenticated, userId, queryClient]);
}
