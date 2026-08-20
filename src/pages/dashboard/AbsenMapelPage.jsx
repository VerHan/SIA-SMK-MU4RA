/* AbsenMapelPage — Absensi per mata pelajaran */

import { useState, useEffect } from 'react';
import { getSubjectAttendance, getClasses } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AbsenMapelPage() {
  const [attendance, setAttendance] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(true);

  const subjects = ['Matematika', 'Pemrograman Web', 'Jaringan Komputer', 'Bahasa Indonesia', 'Bahasa Inggris', 'PAI'];

  useEffect(() => {
    getClasses().then(data => {
      setClasses(data);
      if (data.length > 0) setSelectedClass(data[0].name);
    });
    setSelectedSubject(subjects[0]);
  }, []);

  useEffect(() => {
    if (selectedClass) {
      setLoading(true);
      getSubjectAttendance(selectedClass, selectedSubject).then(data => {
        setAttendance(data);
        setLoading(false);
      });
    }
  }, [selectedClass, selectedSubject]);

  const statusBadge = (status) => {
    const map = {
      hadir: { variant: 'success', label: 'Hadir' },
      izin: { variant: 'info', label: 'Izin' },
      sakit: { variant: 'warning', label: 'Sakit' },
      alpha: { variant: 'danger', label: 'Alpha' },
    };
    const s = map[status] || map.hadir;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const columns = [
    { header: 'No', render: (_, i) => i + 1, cellStyle: { width: '50px', textAlign: 'center' } },
    { header: 'Nama Siswa', accessor: 'studentName', cellStyle: { fontWeight: 'var(--font-weight-medium)' } },
    { header: 'Kelas', accessor: 'class' },
    { header: 'Status', render: (row) => statusBadge(row.morningStatus) },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: 'var(--space-6)' }}>
        📖 Absensi Per Mata Pelajaran
      </h1>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
      }}>
        <div>
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

        <div>
          <label style={{
            display: 'block', fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)',
            color: 'var(--color-text-secondary)',
          }}>
            Mata Pelajaran
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            style={{
              padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-lg)',
              border: '1.5px solid var(--color-border)', fontSize: 'var(--font-size-sm)',
              background: 'var(--color-surface)', color: 'var(--color-text)', outline: 'none', minWidth: '200px',
            }}
          >
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <Card padding="0">
        {loading ? (
          <LoadingSpinner message="Memuat data absensi mapel..." />
        ) : (
          <Table columns={columns} data={attendance} emptyMessage="Belum ada data absensi untuk mapel ini." />
        )}
      </Card>
    </div>
  );
}
