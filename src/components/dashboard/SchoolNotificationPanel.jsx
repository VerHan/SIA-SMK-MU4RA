import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import PaginationBar from '../ui/PaginationBar';
import {
  getNotifications,
  testNotificationWebhook,
  updateSchoolConfig,
} from '../../services/api';

const EVENT_LABELS = {
  ALPHA_ALERT: { label: 'Alert Alpha', variant: 'danger' },
  BOLOS_ALERT: { label: 'Alert Bolos', variant: 'warning' },
  SYSTEM_TEST: { label: 'Tes Webhook', variant: 'info' },
  GENERAL: { label: 'Umum', variant: 'neutral' },
};

const DELIVERY_LABELS = {
  sent: { label: 'Terkirim', variant: 'success' },
  simulated: { label: 'Simulasi', variant: 'info' },
  failed: { label: 'Gagal', variant: 'danger' },
  skipped: { label: 'Dilewati', variant: 'neutral' },
};

export default function SchoolNotificationPanel({ config, onConfigSaved, onToast }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    whatsappEnabled: false,
    whatsappWebhookUrl: '',
    notifyOnAlpha: true,
    notifyOnBolos: true,
    notifyHomeroom: true,
    notifyParent: true,
  });
  const [page, setPage] = useState(1);
  const [eventFilter, setEventFilter] = useState('all');

  useEffect(() => {
    if (!config) return;
    setForm({
      whatsappEnabled: Boolean(config.whatsappEnabled),
      whatsappWebhookUrl: config.whatsappWebhookUrl || '',
      notifyOnAlpha: config.notifyOnAlpha !== false,
      notifyOnBolos: config.notifyOnBolos !== false,
      notifyHomeroom: config.notifyHomeroom !== false,
      notifyParent: config.notifyParent !== false,
    });
  }, [config]);

  const { data: notifRes, isLoading, refetch } = useQuery({
    queryKey: ['admin-notifications', page, eventFilter],
    queryFn: () => getNotifications({ page, limit: 15, eventType: eventFilter }),
  });

  const saveMutation = useMutation({
    mutationFn: () => updateSchoolConfig(form),
    onSuccess: (res) => {
      if (res?.success) {
        onConfigSaved?.(res.data);
        queryClient.invalidateQueries({ queryKey: ['school-config'] });
        queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
        onToast?.({ type: 'success', message: res.message || 'Kebijakan notifikasi berhasil disimpan.' });
      } else {
        onToast?.({ type: 'error', message: res?.error || 'Gagal menyimpan kebijakan notifikasi.' });
      }
    },
    onError: () => onToast?.({ type: 'error', message: 'Terjadi kesalahan saat menyimpan kebijakan.' }),
  });

  const testMutation = useMutation({
    mutationFn: () => testNotificationWebhook({ webhookUrl: form.whatsappWebhookUrl || '' }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      if (res?.success) {
        onToast?.({ type: 'success', message: res.message || 'Tes notifikasi berhasil dicatat.' });
      } else {
        onToast?.({ type: 'error', message: res?.error || 'Pengiriman tes webhook gagal.' });
      }
    },
    onError: () => onToast?.({ type: 'error', message: 'Gagal menghubungi server notifikasi.' }),
  });

  const notifications = notifRes?.data || [];
  const pagination = notifRes?.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 };

  const toggleBoxStyle = (active) => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: 'var(--radius-md)',
    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    background: active ? 'rgba(59, 130, 246, 0.06)' : 'var(--color-bg)',
    cursor: 'pointer',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: 0 }}>
              Jalur Notifikasi Otomatis & Webhook WhatsApp
            </h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: '4px', marginBottom: 0 }}>
              Kirim pemberitahuan otomatis ke Wali Kelas dan Orang Tua setiap kali siswa tercatat Alpha atau terdeteksi indikasi Bolos.
            </p>
          </div>
          <Badge variant={form.whatsappEnabled ? 'success' : 'neutral'}>
            {form.whatsappEnabled ? 'Webhook WA Aktif' : 'Mode In-App Saja'}
          </Badge>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
          <label style={toggleBoxStyle(form.notifyOnAlpha)}>
            <input
              type="checkbox"
              checked={form.notifyOnAlpha}
              onChange={(e) => setForm(prev => ({ ...prev, notifyOnAlpha: e.target.checked }))}
              style={{ marginTop: '3px', width: '16px', height: '16px' }}
            />
            <span>
              <strong style={{ display: 'block', fontSize: 'var(--font-size-sm)' }}>Peringatan Siswa Alpha</strong>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                Picu notifikasi otomatis saat absensi piket pagi/sore berstatus Alpha.
              </span>
            </span>
          </label>

          <label style={toggleBoxStyle(form.notifyOnBolos)}>
            <input
              type="checkbox"
              checked={form.notifyOnBolos}
              onChange={(e) => setForm(prev => ({ ...prev, notifyOnBolos: e.target.checked }))}
              style={{ marginTop: '3px', width: '16px', height: '16px' }}
            />
            <span>
              <strong style={{ display: 'block', fontSize: 'var(--font-size-sm)' }}>Deteksi Indikasi Bolos</strong>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                Picu peringatan prioritas saat siswa Hadir pagi tetapi Alpha sore.
              </span>
            </span>
          </label>

          <label style={toggleBoxStyle(form.notifyHomeroom)}>
            <input
              type="checkbox"
              checked={form.notifyHomeroom}
              onChange={(e) => setForm(prev => ({ ...prev, notifyHomeroom: e.target.checked }))}
              style={{ marginTop: '3px', width: '16px', height: '16px' }}
            />
            <span>
              <strong style={{ display: 'block', fontSize: 'var(--font-size-sm)' }}>Kirim ke Wali Kelas</strong>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                Tampilkan alert di aplikasi guru wali kelas & sertakan nomor HP wali kelas ke webhook.
              </span>
            </span>
          </label>

          <label style={toggleBoxStyle(form.notifyParent)}>
            <input
              type="checkbox"
              checked={form.notifyParent}
              onChange={(e) => setForm(prev => ({ ...prev, notifyParent: e.target.checked }))}
              style={{ marginTop: '3px', width: '16px', height: '16px' }}
            />
            <span>
              <strong style={{ display: 'block', fontSize: 'var(--font-size-sm)' }}>Kirim ke Orang Tua / Wali</strong>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                Kirim info kehadiran ke akun wali murid & nomor WA orang tua melalui gateway.
              </span>
            </span>
          </label>
        </div>

        <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', marginBottom: 'var(--space-5)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--space-3)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.whatsappEnabled}
              onChange={(e) => setForm(prev => ({ ...prev, whatsappEnabled: e.target.checked }))}
              style={{ width: '16px', height: '16px' }}
            />
            <strong style={{ fontSize: 'var(--font-size-sm)' }}>
              Aktifkan Integrasi Webhook WhatsApp Gateway (Fonnte / Wablas / n8n / Custom HTTPS)
            </strong>
          </label>

          <Input
            label="URL Endpoint Webhook (HTTPS)"
            type="url"
            value={form.whatsappWebhookUrl}
            onChange={(e) => setForm(prev => ({ ...prev, whatsappWebhookUrl: e.target.value }))}
            placeholder="https://gateway-sekolah.contoh.id/webhook/whatsapp"
          />
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
            Sistem memvalidasi alamat tujuan agar hanya mengarah ke layanan publik yang sah dan menolak alamat jaringan internal.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
            Simpan Kebijakan Notifikasi
          </Button>
          <Button
            variant="secondary"
            onClick={() => testMutation.mutate()}
            loading={testMutation.isPending}
          >
            Kirim Tes Notifikasi
          </Button>
        </div>
      </Card>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: 0 }}>
              Riwayat Pengiriman Notifikasi
            </h3>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
              Catatan pengiriman alert Alpha, Bolos, dan uji coba webhook terbaru.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <select
              value={eventFilter}
              onChange={(e) => {
                setEventFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter jenis notifikasi"
              style={{
                padding: '7px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: 'var(--font-size-sm)',
                background: 'var(--color-surface)',
              }}
            >
              <option value="all">Semua Jenis</option>
              <option value="ALPHA_ALERT">Alert Alpha</option>
              <option value="BOLOS_ALERT">Alert Bolos</option>
              <option value="SYSTEM_TEST">Tes Webhook</option>
              <option value="GENERAL">Umum</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Muat Ulang
            </Button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>Waktu</th>
                <th style={{ padding: '10px 12px' }}>Jenis</th>
                <th style={{ padding: '10px 12px' }}>Penerima</th>
                <th style={{ padding: '10px 12px' }}>Pesan</th>
                <th style={{ padding: '10px 12px' }}>Saluran & Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    Memuat riwayat notifikasi...
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '28px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    Belum ada riwayat notifikasi pada filter ini.
                  </td>
                </tr>
              ) : (
                notifications.map((item) => {
                  const ev = EVENT_LABELS[item.eventType] || EVENT_LABELS.GENERAL;
                  const deliv = DELIVERY_LABELS[item.deliveryStatus] || DELIVERY_LABELS.sent;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleString('id-ID') : '-'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Badge variant={ev.variant}>{ev.label}</Badge>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600 }}>{item.recipientName || item.recipientRole}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                          {item.recipientPhone || item.recipientRole}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', maxWidth: '340px' }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-xs)' }}>{item.title}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          {item.message}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <Badge variant={deliv.variant}>{deliv.label}</Badge>
                          <Badge variant="neutral">
                            {item.channel === 'whatsapp_webhook' ? 'WA Webhook' : 'In-App'}
                          </Badge>
                        </div>
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
