import { useState, useEffect } from 'react';
import { getStudents, getClasses, saveAttendance } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function GuruAbsenPiketPage() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sesi, setSesi] = useState('pagi'); // 'pagi' | 'sore'
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  
  // State untuk menyimpan absensi sementara sebelum disave
  // Format: { [studentId]: 'hadir' | 'izin' | 'sakit' | 'alpha' }
  const [attendanceInput, setAttendanceInput] = useState({});

  useEffect(() => {
    getClasses().then(data => {
      setClasses(data);
      if (data.length > 0) setSelectedClass(data[0].name);
    });
  }, []);

  useEffect(() => {
    if (selectedClass) {
      setLoading(true);
      getStudents(selectedClass).then(data => {
        setStudents(data);
        // Set default hadir
        const initial = {};
        data.forEach(s => { initial[s.id] = 'hadir'; });
        setAttendanceInput(initial);
        setLoading(false);
      });
    }
  }, [selectedClass, selectedDate, sesi]); // Re-fetch or reset when date/sesi changes

  const handleStatusChange = (studentId, status) => {
    setAttendanceInput(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    setSubmitting(true);
    // Format the payload for saveAttendance
    const records = students.map(s => ({
      studentId: s.id,
      studentName: s.name,
      class: selectedClass,
      date: selectedDate,
      // API expects statusPagi and statusSore
      statusPagi: sesi === 'pagi' ? attendanceInput[s.id] : 'hadir', // Mock logic
      statusSore: sesi === 'sore' ? attendanceInput[s.id] : 'hadir'
    }));

    const res = await saveAttendance(records);
    setSubmitting(false);

    if (res.success) {
      setToast({ type: 'success', message: 'Absensi berhasil disimpan!' });
    } else {
      setToast({ type: 'error', message: 'Gagal menyimpan absensi.' });
    }
  };

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

  const StatusButton = ({ status, currentStatus, onClick }) => {
    const isSelected = status === currentStatus;
    const colors = {
      hadir: { bg: '#10B981', color: '#fff' },
      izin: { bg: '#3B82F6', color: '#fff' },
      sakit: { bg: '#F59E0B', color: '#fff' },
      alpha: { bg: '#EF4444', color: '#fff' }
    };
    
    return (
      <button
        onClick={onClick}
        style={{
          padding: '4px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: isSelected ? 'bold' : 'normal',
          border: '1px solid',
          borderColor: isSelected ? colors[status].bg : 'var(--color-border)',
          background: isSelected ? colors[status].bg : 'transparent',
          color: isSelected ? colors[status].color : 'var(--color-text)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          opacity: isSelected ? 1 : 0.6
        }}
      >
        {status.toUpperCase()}
      </button>
    );
  };

  const columns = [
    { key: 'no', label: 'No', width: '50px', render: (_, __, i) => i + 1 },
    { key: 'name', label: 'Nama Siswa', cellStyle: { fontWeight: 'var(--font-weight-medium)' } },
    { key: 'nis', label: 'NIS / NISN', render: (val, row) => `${row.nis} / ${row.nisn}`, width: '150px' },
    {
      key: 'input',
      label: 'Input Kehadiran',
      width: '300px',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          {['hadir', 'izin', 'sakit', 'alpha'].map(status => (
            <StatusButton
              key={status}
              status={status}
              currentStatus={attendanceInput[row.id]}
              onClick={() => handleStatusChange(row.id, status)}
            />
          ))}
        </div>
      )
    }
  ];

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)' }}>
            Input Absen Piket (Harian)
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Input presensi kedatangan (pagi) dan kepulangan (sore).
          </p>
        </div>
        <Button onClick={handleSave} loading={submitting}>
          💾 Simpan Absensi
        </Button>
      </div>

      <Card style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Kelas</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                background: 'var(--color-surface)', minWidth: '150px'
              }}
            >
              {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Tanggal</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                background: 'var(--color-surface)'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="button" style={sesiTabStyle(sesi === 'pagi')} onClick={() => setSesi('pagi')}>Sesi Pagi</button>
            <button type="button" style={sesiTabStyle(sesi === 'sore')} onClick={() => setSesi('sore')}>Sesi Sore</button>
          </div>
        </div>
      </Card>

      <Card padding="0">
        {loading ? (
          <LoadingSpinner message="Memuat daftar siswa..." />
        ) : (
          <Table columns={columns} data={students} emptyMessage="Tidak ada siswa di kelas ini." />
        )}
      </Card>
    </div>
  );
}
