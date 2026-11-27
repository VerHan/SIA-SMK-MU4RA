/* ============================================================
   AbsenSholatPage — Absensi Sholat Dzuhur & Ashar (API-Backed)
   ============================================================ */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPrayerAttendance, savePrayerAttendance, getClasses, getJakartaToday } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';

export default function AbsenSholatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedDate, setSelectedDate] = useState(getJakartaToday());
  const [drafts, setDrafts] = useState({});
  const [toast, setToast] = useState(null);

  const canEdit = ['admin', 'guru', 'staff'].includes(user?.role);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes-sholat'],
    queryFn: getClasses,
  });

  const { data: prayerRes, isLoading } = useQuery({
    queryKey: ['prayer-attendance', selectedClass, selectedDate],
    queryFn: () => getPrayerAttendance(selectedClass, selectedDate),
  });

  const rows = prayerRes?.data || [];

  useEffect(() => {
    const next = {};
    for (const r of rows) {
      next[r.studentId] = { dzuhur: Boolean(r.dzuhur), ashar: Boolean(r.ashar) };
    }
    setDrafts(next);
  }, [prayerRes]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const records = rows.map((r) => ({
        studentId: r.studentId,
        dzuhur: Boolean(drafts[r.studentId]?.dzuhur),
        ashar: Boolean(drafts[r.studentId]?.ashar),
      }));
      return savePrayerAttendance(selectedDate, records);
    },
    onSuccess: (res) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ['prayer-attendance'] });
        queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
        setToast({ type: 'success', message: res.message || 'Absensi sholat berhasil disimpan.' });
      } else {
        setToast({ type: 'error', message: res?.error || 'Gagal menyimpan absensi sholat.' });
      }
    },
  });

  const togglePrayer = (studentId, field) => {
    if (!canEdit) return;
    setDrafts((prev) => ({
      ...prev,
      [studentId]: {
        dzuhur: Boolean(prev[studentId]?.dzuhur),
        ashar: Boolean(prev[studentId]?.ashar),
        [field]: !prev[studentId]?.[field],
      },
    }));
  };

  const markAll = (field, value) => {
    if (!canEdit) return;
    setDrafts((prev) => {
      const next = { ...prev };
      for (const r of rows) {
        next[r.studentId] = {
          dzuhur: Boolean(prev[r.studentId]?.dzuhur),
          ashar: Boolean(prev[r.studentId]?.ashar),
          [field]: value,
        };
      }
      return next;
    });
  };

  const dzuhurCount = rows.filter((r) => drafts[r.studentId]?.dzuhur).length;
  const asharCount = rows.filter((r) => drafts[r.studentId]?.ashar).length;
  const lengkapCount = rows.filter((r) => drafts[r.studentId]?.dzuhur && drafts[r.studentId]?.ashar).length;

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: 'var(--space-1)' }}>
            Absensi Sholat Berjamaah
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Rekap dan input kehadiran sholat Dzuhur & Ashar berjamaah siswa per kelas.
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={rows.length === 0}
          >
            Simpan Absen Sholat
          </Button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          aria-label="Tanggal absen sholat"
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            fontSize: 'var(--font-size-sm)',
            background: 'var(--color-surface)',
          }}
        />
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          aria-label="Pilih kelas"
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            fontSize: 'var(--font-size-sm)',
            background: 'var(--color-surface)',
            minWidth: '170px',
          }}
        >
          <option value="all">Semua Kelas</option>
          {classes.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>

        {canEdit && rows.length > 0 && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <Button variant="outline" size="sm" onClick={() => markAll('dzuhur', true)}>
              Semua Hadir Dzuhur
            </Button>
            <Button variant="outline" size="sm" onClick={() => markAll('ashar', true)}>
              Semua Hadir Ashar
            </Button>
          </div>
        )}
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <Card>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Sholat Dzuhur
          </div>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-primary)' }}>
            {dzuhurCount} / {rows.length}
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Sholat Ashar
          </div>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-info)' }}>
            {asharCount} / {rows.length}
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Lengkap (Dzuhur & Ashar)
          </div>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-success)' }}>
            {lengkapCount} / {rows.length}
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card padding="0" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px' }}>Nama Siswa</th>
                <th style={{ padding: '12px 16px' }}>Kelas</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Dzuhur</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Ashar</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    Memuat data absensi sholat...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '28px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    Belum ada siswa aktif pada filter kelas ini.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const d = drafts[r.studentId] || { dzuhur: false, ashar: false };
                  const statusMeta = d.dzuhur && d.ashar
                    ? { label: 'Lengkap', variant: 'success' }
                    : d.dzuhur || d.ashar
                      ? { label: 'Sebagian', variant: 'warning' }
                      : { label: 'Belum', variant: 'danger' };
                  return (
                    <tr key={r.studentId} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.studentName}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>{r.class}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={d.dzuhur}
                          onChange={() => togglePrayer(r.studentId, 'dzuhur')}
                          aria-label={`Dzuhur ${r.studentName}`}
                          style={{ width: '18px', height: '18px', cursor: canEdit ? 'pointer' : 'default' }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={d.ashar}
                          onChange={() => togglePrayer(r.studentId, 'ashar')}
                          aria-label={`Ashar ${r.studentName}`}
                          style={{ width: '18px', height: '18px', cursor: canEdit ? 'pointer' : 'default' }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
