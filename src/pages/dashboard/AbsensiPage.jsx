/* AbsensiPage — Monitoring Absensi Siswa (Piket & Mapel) */

import { useState, useEffect, Fragment } from 'react';
import * as XLSX from 'xlsx';
import { getAttendance, getSubjectAttendance, getClasses, getSubjects, getStudents, getAcademicYears } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AbsensiPage() {
  const [activeTab, setActiveTab] = useState('piket'); // 'piket' | 'mapel'

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  
  // Piket States
  const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'monthly'
  const [attendancePiket, setAttendancePiket] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sesi, setSesi] = useState('pagi'); /* 'pagi' | 'sore' */
  const [loadingPiket, setLoadingPiket] = useState(true);

  // Mapel States
  const [attendanceMapel, setAttendanceMapel] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loadingMapel, setLoadingMapel] = useState(false);

  // Rekap Bulanan States
  const [students, setStudents] = useState([]);
  const [rekapMonth, setRekapMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [rekapData, setRekapData] = useState([]);
  const [rekapLoading, setRekapLoading] = useState(false);
  const [availableMonths, setAvailableMonths] = useState([]);

  useEffect(() => {
    Promise.all([getClasses(), getSubjects(), getAcademicYears()]).then(([clsData, subData, yearsData]) => {
      setClasses(clsData);
      setSubjects(subData);
      if (clsData.length > 0) setSelectedClass(clsData[0].name);
      if (subData.length > 0) setSelectedSubject(subData[0].name);

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

  // Fetch Piket Daily
  useEffect(() => {
    if (selectedClass && activeTab === 'piket' && viewMode === 'daily') {
      setLoadingPiket(true);
      getAttendance(selectedClass, selectedDate).then(data => {
        setAttendancePiket(data);
        setLoadingPiket(false);
      });
    }
  }, [selectedClass, selectedDate, activeTab, viewMode]);

  // Fetch Mapel
  useEffect(() => {
    if (selectedClass && selectedSubject && activeTab === 'mapel') {
      setLoadingMapel(true);
      getSubjectAttendance(selectedClass, selectedDate, selectedSubject).then(data => {
        setAttendanceMapel(data);
        setLoadingMapel(false);
      });
    }
  }, [selectedClass, selectedDate, selectedSubject, activeTab]);

  // Fetch Rekap (Monthly)
  useEffect(() => {
    if (selectedClass && activeTab === 'piket' && viewMode === 'monthly') {
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
  }, [selectedClass, rekapMonth, activeTab, viewMode]);

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

  /* Count summary for Piket Daily */
  const pagiField = 'statusPagi';
  const soreField = 'statusSore';
  const currentField = sesi === 'pagi' ? pagiField : soreField;
  const countsPiket = {
    hadir: attendancePiket.filter(a => a[currentField] === 'hadir').length,
    izin: attendancePiket.filter(a => a[currentField] === 'izin').length,
    sakit: attendancePiket.filter(a => a[currentField] === 'sakit').length,
    alpha: attendancePiket.filter(a => a[currentField] === 'alpha').length,
  };

  /* Detect bolos for Piket Daily */
  const bolosCount = attendancePiket.filter(a => a.statusPagi === 'hadir' && a.statusSore === 'alpha').length;

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

  const handleExport = () => {
    let exportData = [];
    let fileName = '';

    if (activeTab === 'piket') {
      if (viewMode === 'daily') {
        exportData = attendancePiket.map((a, i) => ({
          'No': i + 1,
          'Nama Siswa': a.studentName,
          'Kelas': a.class,
          'Tanggal': a.date,
          'Status Pagi': a.statusPagi?.toUpperCase() || '-',
          'Status Sore': a.statusSore?.toUpperCase() || '-',
          'Keterangan': a.statusPagi === 'hadir' && a.statusSore === 'alpha' ? 'Terdeteksi Bolos' : '-'
        }));
        fileName = `Absen_Piket_${selectedClass}_${selectedDate}.xlsx`;
      } else {
        const [yearStr, monthStr] = rekapMonth.split('-');
        const daysCount = getDaysInMonth(parseInt(yearStr), parseInt(monthStr));
        
        exportData = students.map((s, i) => {
          const row = {
            'No': i + 1,
            'Nama Siswa': s.name,
            'Kelas': selectedClass,
            'Bulan': rekapMonth
          };
          let totalH = 0, totalI = 0, totalS = 0, totalA = 0;
          for (let day = 1; day <= daysCount; day++) {
            const dateStr = `${rekapMonth}-${String(day).padStart(2, '0')}`;
            const att = rekapData.find(a => a.studentId === s.id && a.date === dateStr);
            const statusVal = sesi === 'pagi' ? att?.statusPagi : att?.statusSore;
            row[`Tgl ${day}`] = statusVal?.toUpperCase() || '-';
            
            if (statusVal === 'hadir') totalH++;
            else if (statusVal === 'izin') totalI++;
            else if (statusVal === 'sakit') totalS++;
            else if (statusVal === 'alpha') totalA++;
          }
          
          const totalDays = totalH + totalI + totalS + totalA;
          const percentage = totalDays > 0 ? Math.round((totalH / totalDays) * 100) : 0;
          
          row['Total Hadir (H)'] = totalH;
          row['Total Izin (I)'] = totalI;
          row['Total Sakit (S)'] = totalS;
          row['Total Alpha (A)'] = totalA;
          row['% Kehadiran'] = `${percentage}%`;
          
          return row;
        });
        fileName = `Rekap_Bulanan_${sesi.toUpperCase()}_${selectedClass}_${rekapMonth}.xlsx`;
      }
    } else if (activeTab === 'mapel') {
      exportData = attendanceMapel.map((a, i) => ({
        'No': i + 1,
        'Nama Siswa': a.studentName,
        'Kelas': a.class,
        'Mata Pelajaran': a.subject,
        'Tanggal': a.date,
        'Jam Ke': a.jamKe,
        'Status': a.status?.toUpperCase() || '-'
      }));
      fileName = `Absen_Mapel_${selectedSubject}_${selectedClass}_${selectedDate}.xlsx`;
    }

    if (exportData.length === 0) {
      alert('Tidak ada data absensi untuk diekspor pada filter ini.');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Absensi");
    XLSX.writeFile(wb, fileName);
  };

  const mapelColumns = [
    { key: 'no', label: 'No', width: '50px', render: (_, row, i) => i + 1 },
    { key: 'studentName', label: 'Nama Siswa' },
    { key: 'jamKe', label: 'Jam Ke', width: '100px', cellStyle: { textAlign: 'center' } },
    { key: 'status', label: 'Status', width: '120px', render: (val) => statusBadge(val) },
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: '4px' }}>
            Monitoring Absensi Siswa
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Pantau kehadiran harian dan per mata pelajaran
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} size="sm">
          ⬆️ Export Excel
        </Button>
      </div>

      {/* Main Tabs */}
      <div style={{ marginBottom: 'var(--space-6)', display: 'flex', gap: 'var(--space-4)', borderBottom: '1px solid var(--color-border-light)' }}>
        <button style={mainTabStyle(activeTab === 'piket')} onClick={() => {
          setActiveTab('piket');
          setViewMode('daily'); // Reset to daily by default when switching to piket
        }}>
          Absensi Piket
        </button>
        <button style={mainTabStyle(activeTab === 'mapel')} onClick={() => setActiveTab('mapel')}>
          Absen per Mata Pelajaran
        </button>
      </div>

      {/* Filters Row */}
      <div style={{
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end', 
        marginBottom: 'var(--space-4)', 
        flexWrap: 'wrap', 
        gap: 'var(--space-3)'
      }}>
        {/* Left side filters */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
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
          
          {activeTab === 'piket' && viewMode === 'monthly' ? (
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Bulan
              </label>
              {availableMonths.length > 0 ? (
                <select
                  value={rekapMonth}
                  onChange={(e) => setRekapMonth(e.target.value)}
                  style={{
                    padding: '8px 14px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)',
                    background: 'var(--color-surface)', minWidth: '150px'
                  }}
                >
                  {availableMonths.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              ) : (
                <input
                  type="month" value={rekapMonth}
                  onChange={(e) => setRekapMonth(e.target.value)}
                  style={{
                    padding: '8px 14px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)',
                    background: 'var(--color-surface)',
                  }}
                />
              )}
            </div>
          ) : (
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
          )}

          {activeTab === 'piket' && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button style={sesiTabStyle(sesi === 'pagi')} onClick={() => setSesi('pagi')}>Pagi</button>
              <button style={sesiTabStyle(sesi === 'sore')} onClick={() => setSesi('sore')}>Sore</button>
            </div>
          )}

          {activeTab === 'mapel' && (
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Mata Pelajaran
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                style={{
                  padding: '8px 14px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)',
                  background: 'var(--color-surface)', minWidth: '200px',
                }}
              >
                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Right side buttons (Toggle View for Piket) */}
        {activeTab === 'piket' && (
          <div>
            <Button 
              variant="primary" 
              onClick={() => setViewMode(viewMode === 'daily' ? 'monthly' : 'daily')}
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
              {viewMode === 'daily' ? '📊 Lihat Rekap Bulanan' : '📝 Lihat Absen Harian'}
            </Button>
          </div>
        )}
      </div>

      {activeTab === 'piket' && viewMode === 'daily' && (
        <>
          {/* Summary Piket Daily */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            {[
              { label: 'Hadir', value: countsPiket.hadir, color: '#059669', bg: '#ECFDF5' },
              { label: 'Izin', value: countsPiket.izin, color: '#2563EB', bg: '#EFF6FF' },
              { label: 'Sakit', value: countsPiket.sakit, color: '#D97706', bg: '#FFFBEB' },
              { label: 'Alpha', value: countsPiket.alpha, color: '#DC2626', bg: '#FEF2F2' },
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
        </>
      )}

      {/* Table */}
      <Card padding={activeTab === 'piket' && viewMode === 'monthly' ? "var(--space-4) 0 0 0" : "0"}>
        {activeTab === 'piket' ? (
          viewMode === 'daily' ? (
            loadingPiket ? (
              <LoadingSpinner message="Memuat data absensi piket..." />
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
                data={attendancePiket}
                emptyMessage="Belum ada data absensi piket."
              />
            )
          ) : (
            renderRekapTable()
          )
        ) : (
          loadingMapel ? (
            <LoadingSpinner message="Memuat data absensi mapel..." />
          ) : (
            <Table 
              columns={mapelColumns} 
              data={attendanceMapel} 
              emptyMessage="Belum ada data absensi untuk mata pelajaran ini." 
            />
          )
        )}
      </Card>
    </div>
  );
}
