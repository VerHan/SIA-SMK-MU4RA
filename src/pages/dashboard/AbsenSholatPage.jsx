/* AbsenSholatPage — Absensi sholat (Dzuhur & Ashar) */

import { useState, useEffect } from 'react';
import { getPrayerAttendance, getClasses } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AbsenSholatPage() {
  const [attendance, setAttendance] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClasses().then(data => {
      setClasses(data);
      if (data.length > 0) setSelectedClass(data[0].name);
    });
  }, []);

  useEffect(() => {
    if (selectedClass) {
      setLoading(true);
      getPrayerAttendance(selectedClass).then(data => {
        setAttendance(data);
        setLoading(false);
      });
    }
  }, [selectedClass]);

  const columns = [
    { header: 'No', render: (_, i) => i + 1, cellStyle: { width: '50px', textAlign: 'center' } },
    { header: 'Nama Siswa', accessor: 'studentName', cellStyle: { fontWeight: 'var(--font-weight-medium)' } },
    { header: 'Kelas', accessor: 'class' },
    {
      header: '🕛 Dzuhur',
      render: (row) => (
        <Badge variant={row.dzuhur ? 'success' : 'danger'}>
          {row.dzuhur ? '✓ Hadir' : '✗ Absen'}
        </Badge>
      ),
    },
    {
      header: '🕐 Ashar',
      render: (row) => (
        <Badge variant={row.ashar ? 'success' : 'danger'}>
          {row.ashar ? '✓ Hadir' : '✗ Absen'}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: 'var(--space-6)' }}>
        🌙 Absensi Sholat
      </h1>

      {/* Class filter */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <label style={{
          display: 'block', fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)',
          color: 'var(--color-text-secondary)',
        }}>
          Kelas
        </label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          style={{
            padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--color-border)', fontSize: 'var(--font-size-sm)',
            background: 'var(--color-surface)', color: 'var(--color-text)', outline: 'none', minWidth: '160px',
          }}
        >
          {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      {/* Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)',
      }}>
        {[
          { label: 'Dzuhur Hadir', value: attendance.filter(a => a.dzuhur).length, icon: '🕛', color: '#10B981' },
          { label: 'Ashar Hadir', value: attendance.filter(a => a.ashar).length, icon: '🕐', color: '#3B82F6' },
          { label: 'Total Siswa', value: attendance.length, icon: '👥', color: '#6366F1' },
        ].map((stat, i) => (
          <Card key={i} hover style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-1)' }}>{stat.icon}</div>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', color: stat.color }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{stat.label}</div>
          </Card>
        ))}
      </div>

      <Card padding="0">
        {loading ? (
          <LoadingSpinner message="Memuat data absensi sholat..." />
        ) : (
          <Table columns={columns} data={attendance} emptyMessage="Belum ada data absensi sholat." />
        )}
      </Card>
    </div>
  );
}
