/* GuruAbsenPiketPage — Input Absen Piket Pagi/Sore & Rekap Bulanan */

import { useState, useEffect, Fragment } from 'react';
import { getClasses, getStudents, getAttendance, saveAttendance, getAcademicYears } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Toast from '../../components/ui/Toast';

export default function GuruAbsenPiketPage() {
  const [activeTab, setActiveTab] = useState('input'); // 'input' | 'rekap'

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  
  // States for Input Harian
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sesi, setSesi] = useState('pagi'); /* 'pagi' | 'sore' */
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // States for Kehadiran Pagi & Sore
  const [attendancePagi, setAttendancePagi] = useState({});
  const [attendanceSore, setAttendanceSore] = useState({});

  // States for Rekap Bulanan
  const [rekapMonth, setRekapMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [rekapData, setRekapData] = useState([]);
  const [rekapLoading, setRekapLoading] = useState(false);
  const [availableMonths, setAvailableMonths] = useState([]);

  useEffect(() => {
    Promise.all([getClasses(), getAcademicYears()]).then(([classesData, yearsData]) => {
      setClasses(classesData);
      if (classesData.length > 0) setSelectedClass(classesData[0].name);

      const activeYear = yearsData.find(y => y.isActive);
      if (activeYear && activeYear.startDate && activeYear.endDate) {
        const start = new Date(activeYear.startDate);
        const end = new Date(activeYear.endDate);
        const months = [];
        let current = new Date(start.getFullYear(), start.getMonth(), 1);
        while (current <= end) {
          months.push({
            value: current.toISOString().substring(0, 7),
            label: current.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
          });
          current.setMonth(current.getMonth() + 1);
        }
        setAvailableMonths(months);
        setRekapMonth(prev => months.some(m => m.value === prev) ? prev : (months[0]?.value || prev));
      }
    });
  }, []);

  // Fetch Input Data
  useEffect(() => {
    if (selectedClass && activeTab === 'input') {
      setLoading(true);
      Promise.all([
        getStudents(selectedClass),
        getAttendance(selectedClass, selectedDate)
      ]).then(([studentsData, attData]) => {
        setStudents(studentsData);
        
        // Populate existing data or default to 'hadir'
        const initialPagi = {};
        const initialSore = {};
        studentsData.forEach(s => {
          const existing = attData.find(a => a.studentId === s.id);
          initialPagi[s.id] = existing?.statusPagi || 'hadir';
          initialSore[s.id] = existing?.statusSore || 'hadir';
        });
        
        setAttendancePagi(initialPagi);
        setAttendanceSore(initialSore);
        setLoading(false);
      });
    }
  }, [selectedClass, selectedDate, activeTab]);

  // Fetch Rekap Data
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
      statusSore: attendanceSore[s.id],
    }));

    const result = await saveAttendance(records);
    setSubmitting(false);
    
    if (result.success) {
      setToast({ message: `Absensi ${sesi} kelas ${selectedClass} berhasil disimpan!`, type: 'success' });
    } else {
      setToast({ message: result.error || 'Gagal menyimpan absensi.', type: 'error' });
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
    const isSelected = currentStatus === status;
    const colors = {
      hadir: { bg: '#10B981', color: 'white' },
      izin: { bg: '#3B82F6', color: 'white' },
      sakit: { bg: '#F59E0B', color: 'white' },
      alpha: { bg: '#EF4444', color: 'white' },
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
              <th style={{ padding: '12px', borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', background: 'var(--color-surface-alt)', textAlign: 'left', minWidth: '200px', position: 'sticky', left: 0, zIndex: 10 }}>Nama Siswa</th>
              {daysArray.map(day => (
                <th key={day} style={{ padding: '8px', borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', background: 'var(--color-surface-alt)', textAlign: 'center', fontSize: '12px', minWidth: '30px' }}>
                  {day}
                </th>
              ))}
              <th style={{ padding: '8px', borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', background: '#ECFDF5', color: '#059669', textAlign: 'center', fontSize: '12px', minWidth: '40px' }}>H</th>
              <th style={{ padding: '8px', borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', background: '#EFF6FF', color: '#2563EB', textAlign: 'center', fontSize: '12px', minWidth: '40px' }}>I</th>
              <th style={{ padding: '8px', borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', background: '#FFFBEB', color: '#D97706', textAlign: 'center', fontSize: '12px', minWidth: '40px' }}>S</th>
              <th style={{ padding: '8px', borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', background: '#FEF2F2', color: '#DC2626', textAlign: 'center', fontSize: '12px', minWidth: '40px' }}>A</th>
              <th style={{ padding: '8px', borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', background: 'var(--color-surface-alt)', textAlign: 'center', fontSize: '12px', minWidth: '50px' }}>%</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={1 + daysCount + 5} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Tidak ada data siswa.</td>
              </tr>
            ) : (
              students.map(s => {
                let totalH = 0, totalI = 0, totalS = 0, totalA = 0;
                
                return (
                  <tr key={s.id}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border-light)', borderRight: '1px solid var(--color-border-light)', fontSize: '13px', fontWeight: '500', position: 'sticky', left: 0, background: 'var(--color-surface)', zIndex: 1 }}>{s.name}</td>
                    {daysArray.map(day => {
                      const dateStr = `${rekapMonth}-${String(day).padStart(2, '0')}`;
                      const att = rekapData.find(a => a.studentId === s.id && a.date === dateStr);
                      const attStatus = sesi === 'pagi' ? att?.statusPagi : att?.statusSore;
                      
                      if (attStatus === 'hadir') totalH++;
                      else if (attStatus === 'izin') totalI++;
                      else if (attStatus === 'sakit') totalS++;
                      else if (attStatus === 'alpha') totalA++;
                      
                      return (
                        <td key={`cell-${s.id}-${day}`} style={{ padding: '4px', borderBottom: '1px solid var(--color-border-light)', borderRight: '1px solid var(--color-border-light)', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: getStatusColor(attStatus) }}>
                          {getStatusInitial(attStatus)}
                        </td>
                      );
                    })}
                    {(() => {
                      const totalDays = totalH + totalI + totalS + totalA;
                      const percentage = totalDays > 0 ? Math.round((totalH / totalDays) * 100) : 0;
                      return (
                        <>
                          <td style={{ padding: '4px', borderBottom: '1px solid var(--color-border-light)', borderRight: '1px solid var(--color-border-light)', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', background: '#ECFDF5', color: '#059669' }}>{totalH}</td>
                          <td style={{ padding: '4px', borderBottom: '1px solid var(--color-border-light)', borderRight: '1px solid var(--color-border-light)', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', background: '#EFF6FF', color: '#2563EB' }}>{totalI}</td>
                          <td style={{ padding: '4px', borderBottom: '1px solid var(--color-border-light)', borderRight: '1px solid var(--color-border-light)', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', background: '#FFFBEB', color: '#D97706' }}>{totalS}</td>
                          <td style={{ padding: '4px', borderBottom: '1px solid var(--color-border-light)', borderRight: '1px solid var(--color-border-light)', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', background: '#FEF2F2', color: '#DC2626' }}>{totalA}</td>
                          <td style={{ padding: '4px', borderBottom: '1px solid var(--color-border-light)', borderRight: '1px solid var(--color-border-light)', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', background: 'var(--color-surface)' }}>{percentage}%</td>
                        </>
                      );
                    })()}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)' }}>
            Absen Piket Harian
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Input kehadiran harian dan pantau rekap bulanan kelas.
          </p>
        </div>
        {activeTab === 'input' && (
          <Button onClick={handleSave} loading={submitting}>
            💾 Simpan Absensi
          </Button>
        )}
      </div>

      <Card style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          {/* Left Side Filters */}
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
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Bulan (Rekap)</label>
                {availableMonths.length > 0 ? (
                  <select
                    value={rekapMonth}
                    onChange={(e) => setRekapMonth(e.target.value)}
                    style={{
                      padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)'
                    }}
                  >
                    {availableMonths.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                ) : (
                  <input
                    type="month"
                    value={rekapMonth}
                    onChange={(e) => setRekapMonth(e.target.value)}
                    style={{
                      padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)'
                    }}
                  />
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="button" style={sesiTabStyle(sesi === 'pagi')} onClick={() => setSesi('pagi')}>Sesi Pagi</button>
              <button type="button" style={sesiTabStyle(sesi === 'sore')} onClick={() => setSesi('sore')}>Sesi Sore</button>
            </div>
          </div>

          {/* Right Side Toggle Button */}
          <div>
            <Button 
              variant="primary" 
              onClick={() => setActiveTab(activeTab === 'input' ? 'rekap' : 'input')}
              style={{
                backgroundColor: '#3B82F6', 
                color: 'white',
                border: 'none',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {activeTab === 'input' ? '📊 Lihat Rekap Bulanan' : '📝 Kembali ke Input'}
            </Button>
          </div>
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
