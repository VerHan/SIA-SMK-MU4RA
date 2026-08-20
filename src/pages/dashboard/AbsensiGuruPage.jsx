/* AbsensiGuruPage — Rekap Absensi Guru (GPS + Manual Input Admin) */

import { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { TEACHER_ATTENDANCE_STATUS } from '../../config/constants';
import {
  getTeacherAttendanceRecap,
  submitManualTeacherAttendance,
  getTeachers,
} from '../../services/api';

export default function AbsensiGuruPage() {
  const [records, setRecords] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [dateFilter, setDateFilter] = useState('2024-07-22');
  const [form, setForm] = useState({ guruId: '', tanggal: '', status: 'hadir', jamMasuk: '', jamPulang: '', keterangan: '' });

  const fetchData = async () => {
    setLoading(true);
    const [recs, tchs] = await Promise.all([
      getTeacherAttendanceRecap(dateFilter),
      getTeachers(),
    ]);
    setRecords(recs);
    setTeachers(tchs);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [dateFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitManualTeacherAttendance(form);
    setShowModal(false);
    setForm({ guruId: '', tanggal: dateFilter, status: 'hadir', jamMasuk: '', jamPulang: '', keterangan: '' });
    fetchData();
  };

  /* Summary */
  const summary = TEACHER_ATTENDANCE_STATUS.map(s => ({
    ...s,
    count: records.filter(r => r.status === s.value).length,
  }));

  const statusBadgeVariant = (status) => {
    const map = { hadir: 'success', izin: 'info', sakit: 'warning', tugas_luar: 'default', alpha: 'danger' };
    return map[status] || 'default';
  };

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: '4px' }}>
            Absensi Guru
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Rekap kehadiran guru (GPS & Manual)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)',
              background: 'var(--color-surface)',
            }}
          />
          <Button onClick={() => {
            setForm({ guruId: '', tanggal: dateFilter, status: 'hadir', jamMasuk: '', jamPulang: '', keterangan: '' });
            setShowModal(true);
          }}>
            + Input Manual
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        {summary.map((s, i) => (
          <div key={i} style={{
            padding: '14px 12px', textAlign: 'center',
            background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border-light)', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-extrabold)', color: s.color, lineHeight: 1 }}>
              {s.count}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 'var(--font-weight-medium)', marginTop: '4px' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <Card><p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-8)' }}>Memuat data...</p></Card>
      ) : (
        <Card padding="0">
          <Table
            columns={[
              { key: 'guruName', label: 'Nama Guru' },
              { key: 'status', label: 'Status', width: '110px',
                render: (val) => <Badge variant={statusBadgeVariant(val)}>{val?.charAt(0).toUpperCase() + val?.slice(1).replace('_', ' ')}</Badge>
              },
              { key: 'sumber', label: 'Sumber', width: '90px',
                render: (val) => (
                  <span style={{
                    padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '11px',
                    fontWeight: 'var(--font-weight-medium)',
                    background: val === 'gps' ? '#EFF6FF' : '#F5F3FF',
                    color: val === 'gps' ? '#1E40AF' : '#5B21B6',
                  }}>
                    {val === 'gps' ? 'GPS' : 'Manual'}
                  </span>
                )
              },
              { key: 'jamMasuk', label: 'Masuk', width: '70px', render: (val) => val || '-' },
              { key: 'jamPulang', label: 'Pulang', width: '70px', render: (val) => val || '-' },
              { key: 'jarakMeter', label: 'Jarak', width: '70px', render: (val) => val ? `${val}m` : '-' },
              { key: 'keterangan', label: 'Keterangan', render: (val) => <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{val || '-'}</span> },
            ]}
            data={records}
            emptyMessage="Tidak ada data absensi untuk tanggal ini."
          />
        </Card>
      )}

      {/* Modal Input Manual */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Input Absensi Manual" size="md">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>Guru</label>
            <select
              value={form.guruId}
              onChange={(e) => setForm({ ...form, guruId: e.target.value })}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)', background: 'var(--color-surface)' }}
            >
              <option value="">Pilih Guru</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <Input label="Tanggal" type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} required />
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)', background: 'var(--color-surface)' }}
            >
              {TEACHER_ATTENDANCE_STATUS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          {form.status === 'hadir' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <Input label="Jam Masuk" type="time" value={form.jamMasuk} onChange={(e) => setForm({ ...form, jamMasuk: e.target.value })} />
              <Input label="Jam Pulang" type="time" value={form.jamPulang} onChange={(e) => setForm({ ...form, jamPulang: e.target.value })} />
            </div>
          )}
          <Input label="Keterangan" placeholder="Opsional" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
          <div style={{ padding: '10px 12px', background: '#EFF6FF', borderRadius: 'var(--radius-md)', fontSize: '12px', color: '#1E40AF', border: '1px solid #DBEAFE' }}>
            ℹ️ Input manual tidak memerlukan verifikasi lokasi GPS. Admin dapat menginput dari mana saja.
          </div>
          <Button type="submit" fullWidth>Simpan Absensi</Button>
        </form>
      </Modal>
    </div>
  );
}
