import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import PaginationBar from '../ui/PaginationBar';
import {
  downloadSystemBackup,
  getAuditLogs,
  triggerDailyBackup,
  updateSchoolConfig,
} from '../../services/api';

const ACTION_BADGE_MAP = {
  USER_REVOKE_SESSIONS: { label: 'Putus Sesi', variant: 'danger' },
  USER_DEACTIVATE: { label: 'Nonaktifkan Akun', variant: 'danger' },
  USER_PASSWORD_RESET: { label: 'Reset Password', variant: 'warning' },
  AUTH_CHANGE_PASSWORD: { label: 'Ganti Password', variant: 'warning' },
  USER_CREATE: { label: 'Buat Akun', variant: 'info' },
  USER_UPDATE: { label: 'Ubah Akun', variant: 'info' },
  USER_DELETE: { label: 'Hapus Akun', variant: 'danger' },
  ATTENDANCE_BACKDATED_EDIT: { label: 'Ubah Absen Lampau', variant: 'warning' },
  GRADE_UPDATE: { label: 'Edit Nilai', variant: 'warning' },
  GRADE_DELETE: { label: 'Hapus Nilai', variant: 'danger' },
  SCHOOL_CONFIG_UPDATE: { label: 'Ubah Konfigurasi', variant: 'info' },
  SCHOOL_GEOFENCE_CONFIG: { label: 'Ubah Geofence', variant: 'info' },
  BULK_ACADEMIC_ROLLOVER: { label: 'Kenaikan Kelas', variant: 'success' },
  SYSTEM_BACKUP_EXPORT: { label: 'Unduh Backup', variant: 'success' },
  SYSTEM_DAILY_BACKUP: { label: 'Backup Harian', variant: 'success' },
  NOTIFICATION_WEBHOOK_TEST: { label: 'Tes Webhook', variant: 'info' },
  PAYMENT_CREATE: { label: 'Tambah Tagihan', variant: 'info' },
  PAYMENT_UPDATE: { label: 'Ubah Pembayaran', variant: 'success' },
  PRAYER_ATTENDANCE_SAVE: { label: 'Absen Sholat', variant: 'info' },
};

function formatDetailPreview(detail) {
  if (!detail) return '-';
  let text = '';
  if (typeof detail !== 'string') {
    text = JSON.stringify(detail);
  } else {
    try {
      const parsed = JSON.parse(detail);
      if (parsed && typeof parsed === 'object') {
        text = Object.entries(parsed)
          .filter(([, v]) => v !== undefined && v !== null)
          .slice(0, 4)
          .map(([k, v]) => {
            if (typeof v === 'object') {
              if (Array.isArray(v)) return `${k}: ${v.length} item`;
              const keys = Object.keys(v);
              return `${k}: ${keys.length} entitas`;
            }
            return `${k}: ${v}`;
          })
          .join(' • ');
      } else {
        text = detail;
      }
    } catch {
      text = detail;
    }
  }
  return text.length > 110 ? `${text.slice(0, 107)}…` : text;
}

export default function AuditBackupPanel({ config, onConfigSaved, onToast }) {
  const queryClient = useQueryClient();
  const [actionFilter, setActionFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [downloading, setDownloading] = useState(false);

  const [backupSchedule, setBackupSchedule] = useState({
    dailyBackupEnabled: true,
    dailyBackupTime: '02:00',
  });

  useEffect(() => {
    if (!config) return;
    setBackupSchedule({
      dailyBackupEnabled: config.dailyBackupEnabled !== false,
      dailyBackupTime: config.dailyBackupTime || '02:00',
    });
  }, [config]);

  const { data: logsRes, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', actionFilter, search, page],
    queryFn: () => getAuditLogs({ action: actionFilter, search, page, limit: 20 }),
  });

  const saveScheduleMutation = useMutation({
    mutationFn: () => updateSchoolConfig(backupSchedule),
    onSuccess: (res) => {
      if (res?.success) {
        onConfigSaved?.(res.data);
        queryClient.invalidateQueries({ queryKey: ['school-config'] });
        queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
        onToast?.({ type: 'success', message: 'Jadwal backup harian berhasil disimpan.' });
      } else {
        onToast?.({ type: 'error', message: res?.error || 'Gagal menyimpan jadwal backup.' });
      }
    },
  });

  const verifyBackupMutation = useMutation({
    mutationFn: triggerDailyBackup,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['school-config'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      if (res?.success) {
        onToast?.({ type: 'success', message: res.message || 'Verifikasi backup harian selesai.' });
      } else {
        onToast?.({ type: 'error', message: res?.error || 'Gagal menjalankan verifikasi backup.' });
      }
    },
  });

  const handleDownloadBackup = async () => {
    setDownloading(true);
    const res = await downloadSystemBackup();
    setDownloading(false);
    queryClient.invalidateQueries({ queryKey: ['school-config'] });
    queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    if (res.success) {
      onToast?.({ type: 'success', message: res.message });
    } else {
      onToast?.({ type: 'error', message: res.error || 'Gagal mengunduh backup.' });
    }
  };

  const logs = logsRes?.data || [];
  const availableActions = logsRes?.actions || [];
  const pagination = logsRes?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Backup Snapshot & Automated Schedule */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: 0 }}>
              Automated Backup Harian & Snapshot Database
            </h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: '4px', marginBottom: 0 }}>
              Unduh arsip JSON seluruh data operasional sekolah (tanpa menyimpan kata sandi pengguna) atau atur jadwal backup harian otomatis.
            </p>
          </div>
          <Badge variant={backupSchedule.dailyBackupEnabled ? 'success' : 'neutral'}>
            {backupSchedule.dailyBackupEnabled ? `Otomatis ${backupSchedule.dailyBackupTime} WIB` : 'Backup Otomatis Nonaktif'}
          </Badge>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', alignItems: 'end', marginBottom: 'var(--space-4)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={backupSchedule.dailyBackupEnabled}
              onChange={(e) => setBackupSchedule(prev => ({ ...prev, dailyBackupEnabled: e.target.checked }))}
              style={{ width: '16px', height: '16px' }}
            />
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Aktifkan Backup Harian</span>
          </label>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, marginBottom: '4px', color: 'var(--color-text-secondary)' }}>
              Waktu Backup Harian (WIB)
            </label>
            <input
              type="time"
              value={backupSchedule.dailyBackupTime}
              onChange={(e) => setBackupSchedule(prev => ({ ...prev, dailyBackupTime: e.target.value }))}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: 'var(--font-size-sm)',
                background: 'var(--color-surface)',
              }}
            />
          </div>

          <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Backup Terakhir Tercatat</div>
            <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', marginTop: '2px' }}>
              {config?.lastBackupAt ? new Date(config.lastBackupAt).toLocaleString('id-ID') : 'Belum pernah dijalankan'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Button onClick={handleDownloadBackup} loading={downloading}>
            Unduh Backup Database (JSON)
          </Button>
          <Button
            variant="secondary"
            onClick={() => verifyBackupMutation.mutate()}
            loading={verifyBackupMutation.isPending}
          >
            Verifikasi Backup Harian
          </Button>
          <Button
            variant="outline"
            onClick={() => saveScheduleMutation.mutate()}
            loading={saveScheduleMutation.isPending}
          >
            Simpan Jadwal
          </Button>
        </div>
      </Card>

      {/* Audit Trail Log Viewer */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: 0 }}>
              Audit Trail & Log Aktivitas Sensitif
            </h3>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
              Rekam jejak otomatis untuk perubahan akun, reset password, pemutusan sesi, ubah absen lampau, edit nilai, dan perubahan pengaturan.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Segarkan Log
          </Button>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
          <input
            type="search"
            placeholder="Cari pelaku, target, atau detail aktivitas..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{
              flex: '1 1 240px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontSize: 'var(--font-size-sm)',
              background: 'var(--color-surface)',
            }}
          />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter jenis aktivitas audit"
            style={{
              minWidth: '210px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontSize: 'var(--font-size-sm)',
              background: 'var(--color-surface)',
            }}
          >
            <option value="all">Semua Aktivitas</option>
            {availableActions.map((act) => (
              <option key={act} value={act}>
                {ACTION_BADGE_MAP[act]?.label || act}
              </option>
            ))}
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>Waktu</th>
                <th style={{ padding: '10px 12px' }}>Pelaku</th>
                <th style={{ padding: '10px 12px' }}>Aksi</th>
                <th style={{ padding: '10px 12px' }}>Target</th>
                <th style={{ padding: '10px 12px' }}>Detail</th>
                <th style={{ padding: '10px 12px' }}>IP</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    Memuat catatan audit...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '28px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    Belum ada catatan aktivitas yang cocok.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const meta = ACTION_BADGE_MAP[log.action] || { label: log.action, variant: 'neutral' };
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                        {log.createdAt ? new Date(log.createdAt).toLocaleString('id-ID') : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                        {log.userName || 'Sistem'}
                      </td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-size-xs)' }}>
                        {log.target || '-'}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', maxWidth: '280px', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                        {formatDetailPreview(log.detail)}
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                        {log.ipAddress || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div style={{ marginTop: 'var(--space-4)' }}>
            <PaginationBar
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={setPage}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
