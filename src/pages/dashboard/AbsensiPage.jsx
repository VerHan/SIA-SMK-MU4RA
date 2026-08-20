/* AbsensiPage — Absensi harian siswa (Pagi & Sore) */

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { getAttendance, getClasses, getStudents, saveAttendance } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

export default function AbsensiPage() {
  const [attendance, setAttendance] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState('2024-07-22');
  const [loading, setLoading] = useState(true);
  const [sesi, setSesi] = useState('pagi'); /* 'pagi' | 'sore' */

  useEffect(() => {
    getClasses().then(data => {
      setClasses(data);
      if (data.length > 0) setSelectedClass(data[0].name);
    });
  }, []);

  const fetchData = () => {
    if (selectedClass) {
      setLoading(true);
      getAttendance(selectedClass, selectedDate).then(data => {
        setAttendance(data);
        setLoading(false);
      });
    }
  };

  useEffect(() => { fetchData(); }, [selectedClass, selectedDate]);

  const statusBadge = (status) => {
    const map = {
      hadir: { variant: 'success', label: 'Hadir' },
      izin: { variant: 'info', label: 'Izin' },
      sakit: { variant: 'warning', label: 'Sakit' },
      alpha: { variant: 'danger', label: 'Alpha' },
    };
    const s = map[status] || { variant: 'default', label: '-' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  /* Count summary */
  const pagiField = 'statusPagi';
  const soreField = 'statusSore';
  const currentField = sesi === 'pagi' ? pagiField : soreField;
  const counts = {
    hadir: attendance.filter(a => a[currentField] === 'hadir').length,
    izin: attendance.filter(a => a[currentField] === 'izin').length,
    sakit: attendance.filter(a => a[currentField] === 'sakit').length,
    alpha: attendance.filter(a => a[currentField] === 'alpha').length,
  };

  /* Detect bolos: hadir pagi tapi alpha sore */
  const bolosCount = attendance.filter(a => a.statusPagi === 'hadir' && a.statusSore === 'alpha').length;

  const sesiTabStyle = (active) => ({
    padding: '8px 20px',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    color: active ? 'white' : 'var(--color-text-secondary)',
    background: active ? '#2563EB' : 'transparent',
    borderRadius: 'var(--radius-full)',
    border: active ? 'none' : '1px solid var(--color-border)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  });

  const handleExport = () => {
    let exportData = attendance.map((a, i) => ({
      'No': i + 1,
      'Nama Siswa': a.studentName,
      'Kelas': a.class,
      'Tanggal': a.date,
      'Status Pagi': a.statusPagi.toUpperCase(),
      'Status Sore': a.statusSore.toUpperCase(),
      'Keterangan': a.statusPagi === 'hadir' && a.statusSore === 'alpha' ? 'Terdeteksi Bolos' : '-'
    }));

    if (exportData.length === 0) {
      alert('Tidak ada data absensi untuk diekspor pada filter ini.');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Absensi");
    XLSX.writeFile(wb, `Rekap_Absensi_${selectedClass}_${selectedDate}.xlsx`);
  };

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: '4px' }}>
            Absensi Siswa
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Absensi harian pagi & sore per kelas
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} size="sm">
          ⬆️ Export Excel
        </Button>
      </div>

      {/* Filters Row */}
      <div style={{
        display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Kelas
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            style={{
              padding: '8px 14px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)',
              background: 'var(--color-surface)', minWidth: '150px',
            }}
          >
            {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tanggal
          </label>
          <input
            type="date" value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: '8px 14px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)',
              background: 'var(--color-surface)',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button style={sesiTabStyle(sesi === 'pagi')} onClick={() => setSesi('pagi')}>Pagi</button>
          <button style={sesiTabStyle(sesi === 'sore')} onClick={() => setSesi('sore')}>Sore</button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        {[
          { label: 'Hadir', value: counts.hadir, color: '#059669', bg: '#ECFDF5' },
          { label: 'Izin', value: counts.izin, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Sakit', value: counts.sakit, color: '#D97706', bg: '#FFFBEB' },
          { label: 'Alpha', value: counts.alpha, color: '#DC2626', bg: '#FEF2F2' },
        ].map((item, i) => (
          <div key={i} style={{ padding: '12px', textAlign: 'center', background: item.bg, borderRadius: 'var(--radius-lg)' }}>
            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-extrabold)', color: item.color }}>{item.value}</div>
            <div style={{ fontSize: '10px', color: item.color, fontWeight: 'var(--font-weight-medium)', marginTop: '2px' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Bolos Warning */}
      {bolosCount > 0 && (
        <div style={{
          padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', color: '#991B1B',
          fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-4)',
        }}>
          ⚠️ <strong>{bolosCount} siswa</strong> terdeteksi bolos — hadir pagi tapi alpha di sore hari
        </div>
      )}

      {/* Table */}
      <Card padding="0">
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-8)' }}>Memuat data absensi...</p>
        ) : (
          <Table
            columns={[
              { key: 'no', label: 'No', width: '50px', render: (_, row, i) => i + 1 },
              { key: 'studentName', label: 'Nama Siswa' },
              { key: 'statusPagi', label: 'Pagi', width: '90px', render: (val) => statusBadge(val) },
              { key: 'statusSore', label: 'Sore', width: '90px', render: (val) => statusBadge(val) },
              { key: 'warning', label: '', width: '40px',
                render: (_, row) => (
                  row.statusPagi === 'hadir' && row.statusSore === 'alpha'
                    ? <span title="Terdeteksi bolos" style={{ fontSize: '16px' }}>⚠️</span>
                    : null
                )
              },
            ]}
            data={attendance}
            emptyMessage="Belum ada data absensi."
          />
        )}
      </Card>
    </div>
  );
}
