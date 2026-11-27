/* ============================================================
   MobileNotifPage.jsx — Notifikasi Real-Time dari Backend API
   ============================================================ */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../services/api';

const EVENT_STYLE = {
  ALPHA_ALERT: { icon: '⚠️', color: '#DC2626', label: 'Alpha' },
  BOLOS_ALERT: { icon: '🚨', color: '#D97706', label: 'Bolos' },
  SYSTEM_TEST: { icon: '📡', color: '#2563EB', label: 'Sistem' },
  GENERAL: { icon: '🔔', color: '#059669', label: 'Info' },
};

export default function MobileNotifPage() {
  const queryClient = useQueryClient();

  const { data: notifRes, isLoading } = useQuery({
    queryKey: ['mobile-notifications'],
    queryFn: () => getNotifications({ page: 1, limit: 30 }),
  });

  const markOneMutation = useMutation({
    mutationFn: (id) => markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mobile-notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mobile-notifications'] }),
  });

  const items = notifRes?.data || [];
  const unreadCount = Number(notifRes?.unreadCount) || 0;

  return (
    <div style={{ padding: '16px 20px', animation: 'fadeInUp 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Notifikasi
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
            {unreadCount} notifikasi belum dibaca
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            style={{
              padding: '7px 12px',
              borderRadius: '10px',
              border: '1px solid rgba(37, 99, 235, 0.25)',
              background: '#EFF6FF',
              color: '#1D4ED8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Tandai Semua Dibaca
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
          Memuat notifikasi terbaru...
        </div>
      ) : items.length === 0 ? (
        <div style={{
          padding: '32px 20px',
          textAlign: 'center',
          borderRadius: '16px',
          background: '#FFFFFF',
          border: '1px solid rgba(0,0,0,0.06)',
          color: '#64748B',
          fontSize: '13px',
        }}>
          Belum ada notifikasi untuk akun Anda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {items.map((notif) => {
            const meta = EVENT_STYLE[notif.eventType] || EVENT_STYLE.GENERAL;
            const isRead = Boolean(notif.readAt);
            return (
              <button
                key={notif.id}
                type="button"
                onClick={() => {
                  if (!isRead) markOneMutation.mutate(notif.id);
                }}
                style={{
                  textAlign: 'left',
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '16px',
                  background: isRead ? 'rgba(255, 255, 255, 0.85)' : 'rgba(37, 99, 235, 0.05)',
                  border: `1px solid ${isRead ? 'rgba(0,0,0,0.06)' : 'rgba(37, 99, 235, 0.22)'}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  cursor: isRead ? 'default' : 'pointer',
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  flexShrink: 0,
                  background: `${meta.color}18`,
                  border: `1px solid ${meta.color}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}>
                  {meta.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: '13px',
                    fontWeight: isRead ? 500 : 700,
                    color: '#0F172A',
                    margin: '0 0 4px',
                    lineHeight: 1.4,
                  }}>
                    {notif.title}
                  </p>
                  <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 6px', lineHeight: 1.45 }}>
                    {notif.message}
                  </p>
                  <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>
                    {notif.createdAt ? new Date(notif.createdAt).toLocaleString('id-ID') : '-'}
                  </p>
                </div>
                {!isRead && (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#2563EB',
                    flexShrink: 0,
                    marginTop: '4px',
                  }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
