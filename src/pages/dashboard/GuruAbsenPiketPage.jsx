import { useState, useEffect, Fragment } from 'react';
import { getStudents, getClasses, saveAttendance, getAttendance } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function GuruAbsenPiketPage() {
  const [activeTab, setActiveTab] = useState('input'); // 'input' | 'rekap'
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  
  // Tab Input State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sesi, setSesi] = useState('pagi'); // 'pagi' | 'sore'
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  
  const [attendancePagi, setAttendancePagi] = useState({});
  const [attendanceSore, setAttendanceSore] = useState({});

  // Tab Rekap State
  const [rekapMonth, setRekapMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [rekapData, setRekapData] = useState([]); // Attendance data for the month
  const [rekapLoading, setRekapLoading] = useState(false);

  useEffect(() => {
    getClasses().then(data => {
      setClasses(data);
      if (data.length > 0) setSelectedClass(data[0].name);
    });
  }, []);

  // Fetch data for Input Harian
  useEffect(() => {
    if (selectedClass && activeTab === 'input') {
      setLoading(true);
      Promise.all([
        getStudents(selectedClass),
        getAttendance(selectedClass, selectedDate, null)
      ]).then(([studentsData, attData]) => {
        setStudents(studentsData);
        
        const initPagi = {};
        const initSore = {};
        
        studentsData.forEach(s => {
          // Find existing record for this student on this date
          const existing = attData.find(a => a.studentId === s.id);
          initPagi[s.id] = existing?.statusPagi || 'hadir';
          initSore[s.id] = existing?.statusSore || 'hadir';
        });
        
        setAttendancePagi(initPagi);
        setAttendanceSore(initSore);
        setLoading(false);
      });
    }
  }, [selectedClass, selectedDate, activeTab]);

  // Fetch data for Rekap Bulanan
  useEffect(() => {
    if (selectedClass && activeTab === 'rekap') {
      setRekapLoading(true);
      Promise.all([
        getStudents(selectedClass),
        getAttendance(selectedClass, null, rekapMonth)
      ]).then(([studentsData, attData]) => {
        setStudents(studentsData);
        setRekapData(attData);
        setRekapLoading(false);
      });
    }
  }, [selectedClass, rekapMonth, activeTab]);

  const handleStatusChange = (studentId, status) => {
    if (sesi === 'pagi') {
      setAttendancePagi(prev => ({ ...prev, [studentId]: status }));
    } else {
      setAttendanceSore(prev => ({ ...prev, [studentId]: status }));
    }
  };

  const handleSave = async () => {
    setSubmitting(true);
    const records = students.map(s => ({
      studentId: s.id,
      studentName: s.name,
      class: selectedClass,
      date: selectedDate,
      statusPagi: attendancePagi[s.id],
      statusSore: attendanceSore[s.id]
    }));

    const res = await saveAttendance(records);
    setSubmitting(false);

    if (res.success) {
      setToast({ type: 'success', message: 'Absensi berhasil disimpan!' });
    } else {
      setToast({ type: 'error', message: 'Gagal menyimpan absensi.' });
    }
  };

  const mainTabStyle = (active) => ({
    padding: '10px 24px',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-bold)',
    color: active ? '#1E40AF' : 'var(--color-text-secondary)',
    borderBottom: active ? '3px solid #3B82F6' : '3px solid transparent',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  });

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

  const columnsInput = [
    { key: 'no', label: 'No', width: '50px', render: (_, __, i) => i + 1 },
    { key: 'name', label: 'Nama Siswa', cellStyle: { fontWeight: 'var(--font-weight-medium)' } },
    { key: 'nis', label: 'NIS / NISN', render: (val, row) => `${row.nis} / ${row.nisn}`, width: '150px' },
    {
      key: 'input',
      label: `Input Kehadiran (${sesi.toUpperCase()})`,
      width: '300px',
      render: (_, row) => {
        const currentStatus = sesi === 'pagi' ? attendancePagi[row.id] : attendanceSore[row.id];
        return (
          <div style={{ display: 'flex', gap: '6px' }}>
            {['hadir', 'izin', 'sakit', 'alpha'].map(status => (
              <StatusButton
                key={status}
                status={status}
                currentStatus={currentStatus}
                onClick={() => handleStatusChange(row.id, status)}
              />
            ))}
          </div>
        );
      }
    }
  ];

  // Helper untuk mendapatkan jumlah hari dalam bulan
  const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
  
  // Render Rekap Table
  const renderRekapTable = () => {
    if (rekapLoading) return <LoadingSpinner message="Memuat rekap..." />;
    
    const [yearStr, monthStr] = rekapMonth.split('-');
    const daysCount = getDaysInMonth(parseInt(yearStr), parseInt(monthStr));
    const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

    const getStatusInitial = (status) => {
      if (!status) return '-';
      return status.charAt(0).toUpperCase();
    };
    
    const getStatusColor = (status) => {
      if (status === 'hadir') return '#10B981';
      if (status === 'izin') return '#3B82F6';
      if (status === 'sakit') return '#F59E0B';
      if (status === 'alpha') return '#EF4444';
      return 'transparent';
    };

    return (
      <div style={{ overflowX: 'auto', paddingBottom: 'var(--space-4)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
          <thead>
            <tr>
              <th rowSpan="2" style={{ padding: '12px', borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', background: 'var(--color-surface-alt)', textAlign: 'left', minWidth: '200px', position: 'sticky', left: 0, zIndex: 10 }}>Nama Siswa</th>
              {daysArray.map(day => (
                <th key={day} colSpan="2" style={{ padding: '8px', borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', background: 'var(--color-surface-alt)', textAlign: 'center', fontSize: '12px' }}>
                  {day}
                </th>
              ))}
            </tr>
            <tr>
              {daysArray.map(day => (
                <Fragment key={`sub-${day}`}>
                  <th style={{ padding: '6px', borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', background: 'var(--color-surface)', textAlign: 'center', fontSize: '10px', color: 'var(--color-text-secondary)' }}>P</th>
                  <th style={{ padding: '6px', borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', background: 'var(--color-surface)', textAlign: 'center', fontSize: '10px', color: 'var(--color-text-secondary)' }}>S</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={1 + (daysCount * 2)} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Tidak ada data siswa.</td>
              </tr>
            ) : (
              students.map(s => (
                <tr key={s.id}>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border-light)', borderRight: '1px solid var(--color-border-light)', fontSize: '13px', fontWeight: '500', position: 'sticky', left: 0, background: 'var(--color-surface)', zIndex: 1 }}>{s.name}</td>
                  {daysArray.map(day => {
                    const dateStr = `${rekapMonth}-${String(day).padStart(2, '0')}`;
                    const att = rekapData.find(a => a.studentId === s.id && a.date === dateStr);
                    
                    return (
                      <Fragment key={`cell-${s.id}-${day}`}>
                        <td style={{ padding: '4px', borderBottom: '1px solid var(--color-border-light)', borderRight: '1px dotted var(--color-border-light)', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: getStatusColor(att?.statusPagi) }}>
                          {getStatusInitial(att?.statusPagi)}
                        </td>
                        <td style={{ padding: '4px', borderBottom: '1px solid var(--color-border-light)', borderRight: '1px solid var(--color-border-light)', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: getStatusColor(att?.statusSore) }}>
                          {getStatusInitial(att?.statusSore)}
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ marginBottom: 'var(--space-6)', display: 'flex', gap: 'var(--space-4)', borderBottom: '1px solid var(--color-border-light)' }}>
        <button style={mainTabStyle(activeTab === 'input')} onClick={() => setActiveTab('input')}>
          Input Harian
        </button>
        <button style={mainTabStyle(activeTab === 'rekap')} onClick={() => setActiveTab('rekap')}>
          Rekap Bulanan
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)' }}>
            {activeTab === 'input' ? 'Input Absen Piket' : 'Rekap Absen Piket'}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            {activeTab === 'input' 
              ? 'Input presensi kedatangan (pagi) dan kepulangan (sore).' 
              : 'Pantau riwayat absensi siswa secara menyeluruh per bulan.'}
          </p>
        </div>
        {activeTab === 'input' && (
          <Button onClick={handleSave} loading={submitting}>
            💾 Simpan Absensi
          </Button>
        )}
      </div>

      <Card style={{ marginBottom: 'var(--space-4)' }}>
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
          
          {activeTab === 'input' ? (
            <>
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
            </>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Bulan (Rekap)</label>
              <input
                type="month"
                value={rekapMonth}
                onChange={(e) => setRekapMonth(e.target.value)}
                style={{
                  padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)'
                }}
              />
            </div>
          )}
        </div>
      </Card>

      <Card padding={activeTab === 'rekap' ? "var(--space-4) 0 0 0" : "0"}>
        {activeTab === 'input' ? (
          loading ? (
            <LoadingSpinner message="Memuat daftar siswa..." />
          ) : (
            <Table columns={columnsInput} data={students} emptyMessage="Tidak ada siswa di kelas ini." />
          )
        ) : (
          renderRekapTable()
        )}
      </Card>
    </div>
  );
}
