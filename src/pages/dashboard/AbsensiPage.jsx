/* AbsensiPage — Monitoring Absensi Siswa (Piket & Mapel) */

import { useState, useEffect, useMemo, Fragment } from 'react';
import {
  getAttendance,
  getAttendanceSummary,
  getSubjectAttendance,
  getSubjectAttendanceRekap,
  getClasses,
  getSubjects,
  getStudents,
  getAcademicYears,
} from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StudentDetailModal from '../../components/ui/StudentDetailModal';
import Toast from '../../components/ui/Toast';
import PaginationBar from '../../components/ui/PaginationBar';
import AttendanceTrendChart from '../../components/dashboard/AttendanceTrendChart';

export default function AbsensiPage() {
  const [activeTab, setActiveTab] = useState('piket'); // 'piket' | 'mapel'

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  // View Mode: 'daily' | 'monthly' | 'summary' (DB-aggregated annual/semester rekap + pagination)
  const [viewMode, setViewMode] = useState('daily');
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
  const [rekapMapelData, setRekapMapelData] = useState([]);
  const [rekapLoading, setRekapLoading] = useState(false);
  const [availableMonths, setAvailableMonths] = useState([]);

  // DB-Aggregated Annual/Semester Summary + Server Pagination States
  const [summaryClass, setSummaryClass] = useState('Semua');
  const [summaryMonth, setSummaryMonth] = useState('all'); // 'all' | 'YYYY-MM'
  const [summarySearch, setSummarySearch] = useState('');
  const [debouncedSummarySearch, setDebouncedSummarySearch] = useState('');
  const [summaryPage, setSummaryPage] = useState(1);
  const [summaryLimit, setSummaryLimit] = useState(25);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryResult, setSummaryResult] = useState(null);

  // Modal States
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [realtimeTick, setRealtimeTick] = useState(0);

  useEffect(() => {
    let debounceTimer = null;
    const handleRealtime = (event) => {
      const type = event?.detail?.type;
      if (type === 'attendance:updated' || type === 'subject-attendance:updated' || type === 'sync:resumed') {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          setRealtimeTick((t) => t + 1);
        }, 150);
      }
    };
    window.addEventListener('sia-realtime-update', handleRealtime);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('sia-realtime-update', handleRealtime);
    };
  }, []);

  const openStudentProfile = (studentId) => {
    setSelectedProfileId(studentId);
    setIsProfileModalOpen(true);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSummarySearch(summarySearch);
      setSummaryPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [summarySearch]);

  useEffect(() => {
    Promise.all([getClasses(), getSubjects(), getAcademicYears()]).then(([clsData, subData, yearsData]) => {
      setClasses(clsData);
      setSubjects(subData);
      setAcademicYears(yearsData);
      if (clsData.length > 0) setSelectedClass(clsData[0].name);
      if (subData.length > 0) setSelectedSubject(subData[0].nama || subData[0].name || '');

      const activeYear = yearsData.find(y => y.isActive) || yearsData[0];
      if (activeYear?.id) {
        setSelectedYearId(activeYear.id);
      }
    });
  }, []);

  // Recompute available months whenever selected academic year changes
  useEffect(() => {
    const chosenYear = academicYears.find(y => y.id === selectedYearId);
    if (chosenYear && chosenYear.startDate && chosenYear.endDate) {
      const start = new Date(chosenYear.startDate);
      const end = new Date(chosenYear.endDate);
      const months = [];
      const current = new Date(start.getFullYear(), start.getMonth(), 1);
      while (current <= end) {
        months.push({
          value: current.toISOString().substring(0, 7),
          label: current.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
        });
        current.setMonth(current.getMonth() + 1);
      }
      setAvailableMonths(months);
      setRekapMonth(prev => (months.some(m => m.value === prev) ? prev : (months[0]?.value || prev)));
    } else {
      setAvailableMonths([]);
    }
  }, [academicYears, selectedYearId]);

  // Fetch Piket Daily
  useEffect(() => {
    if (selectedClass && activeTab === 'piket' && viewMode === 'daily') {
      if (realtimeTick === 0) setLoadingPiket(true);
      getAttendance(selectedClass, selectedDate, null, { tahunAjarId: selectedYearId || undefined }).then(data => {
        setAttendancePiket(data);
        setLoadingPiket(false);
      });
    }
  }, [selectedClass, selectedDate, selectedYearId, activeTab, viewMode, realtimeTick]);

  // Fetch Mapel (Daily)
  useEffect(() => {
    if (selectedClass && selectedSubject && activeTab === 'mapel' && viewMode === 'daily') {
      if (realtimeTick === 0) setLoadingMapel(true);
      getSubjectAttendance(selectedClass, selectedDate, selectedSubject, null, { tahunAjarId: selectedYearId || undefined }).then(data => {
        setAttendanceMapel(data);
        setLoadingMapel(false);
      });
    }
  }, [selectedClass, selectedDate, selectedSubject, selectedYearId, activeTab, viewMode, realtimeTick]);

  // Fetch Rekap (Monthly Matrix)
  useEffect(() => {
    if (selectedClass && viewMode === 'monthly') {
      if (realtimeTick === 0) setRekapLoading(true);
      const yearOpts = { tahunAjarId: selectedYearId || undefined };
      if (activeTab === 'piket') {
        Promise.all([
          getStudents(selectedClass, yearOpts),
          getAttendance(selectedClass, null, rekapMonth, yearOpts),
        ]).then(([studentsData, attData]) => {
          setStudents(studentsData);
          setRekapData(attData);
          setRekapLoading(false);
        });
      } else if (activeTab === 'mapel') {
        Promise.all([
          getStudents(selectedClass, yearOpts),
          getSubjectAttendance(selectedClass, null, selectedSubject, rekapMonth, yearOpts),
        ]).then(([studentsData, attData]) => {
          setStudents(studentsData);
          setRekapMapelData(attData);
          setRekapLoading(false);
        });
      }
    }
  }, [selectedClass, selectedSubject, rekapMonth, selectedYearId, activeTab, viewMode, realtimeTick]);

  // Fetch DB-Aggregated Annual / Semester Summary + Pagination
  useEffect(() => {
    if (viewMode !== 'summary') return;
    let cancelled = false;
    setSummaryLoading(true);

    const fetcher =
      activeTab === 'piket'
        ? getAttendanceSummary({
            tahunAjarId: selectedYearId || undefined,
            kelas: summaryClass,
            month: summaryMonth,
            sesi,
            search: debouncedSummarySearch,
            page: summaryPage,
            limit: summaryLimit,
          })
        : getSubjectAttendanceRekap({
            tahunAjarId: selectedYearId || undefined,
            kelas: summaryClass,
            month: summaryMonth,
            mapel: selectedSubject || 'Semua',
            search: debouncedSummarySearch,
            page: summaryPage,
            limit: summaryLimit,
          });

    fetcher.then(res => {
      if (cancelled) return;
      setSummaryResult(res);
      setSummaryLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [viewMode, activeTab, selectedYearId, summaryClass, summaryMonth, sesi, selectedSubject, debouncedSummarySearch, summaryPage, summaryLimit, realtimeTick]);

  // Index rekap records in O(1) Maps for fast monthly grid render & Excel export
  const rekapPiketMap = useMemo(() => {
    const map = new Map();
    for (const row of rekapData) {
      map.set(`${row.studentId}_${row.date}`, row);
    }
    return map;
  }, [rekapData]);

  const rekapMapelMap = useMemo(() => {
    const map = new Map();
    for (const row of rekapMapelData) {
      map.set(`${row.studentId}_${row.date}`, row);
    }
    return map;
  }, [rekapMapelData]);

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

  const handleExport = async () => {
    let exportData = [];
    let fileName = '';

    if (viewMode === 'summary') {
      if (activeTab === 'piket') {
        const fullRes = await getAttendanceSummary({
          tahunAjarId: selectedYearId || undefined,
          kelas: summaryClass,
          month: summaryMonth,
          sesi,
          search: debouncedSummarySearch,
          page: 1,
          limit: 200,
        });
        exportData = (fullRes?.items || []).map((row, idx) => ({
          'No': idx + 1,
          'NIS': row.nis || '-',
          'Nama Siswa': row.studentName,
          'Kelas': row.class,
          'Hadir': row.hadir,
          'Izin': row.izin,
          'Sakit': row.sakit,
          'Alpha': row.alpha,
          'Bolos Sore': row.bolos || 0,
          'Total Tercatat': row.totalRecords,
          '% Kehadiran': `${row.attendanceRate}%`,
        }));
        fileName = `Rekap_Periode_Piket_${sesi.toUpperCase()}_${summaryClass}_${summaryMonth}.xlsx`;
      } else {
        const fullRes = await getSubjectAttendanceRekap({
          tahunAjarId: selectedYearId || undefined,
          kelas: summaryClass,
          month: summaryMonth,
          mapel: selectedSubject || 'Semua',
          search: debouncedSummarySearch,
          page: 1,
          limit: 200,
        });
        exportData = (fullRes?.rekap || []).map((row, idx) => ({
          'No': idx + 1,
          'NIS': row.nis || '-',
          'Nama Siswa': row.studentName,
          'Kelas': row.class,
          'Hadir': row.hadir,
          'Izin': row.izin,
          'Sakit': row.sakit,
          'Alpha': row.alpha,
          'Total Sesi': row.totalSesi,
          '% Kehadiran': `${row.persentase}%`,
        }));
        fileName = `Rekap_Periode_Mapel_${summaryClass}_${summaryMonth}.xlsx`;
      }
    } else if (activeTab === 'piket') {
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
            const att = rekapPiketMap.get(`${s.id}_${dateStr}`);
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
      if (viewMode === 'monthly') {
        const [yearStr, monthStr] = rekapMonth.split('-');
        const daysCount = getDaysInMonth(parseInt(yearStr), parseInt(monthStr));
        const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

        exportData = students.map(s => {
          const row = { 'Nama Siswa': s.name, 'Kelas': s.class, 'Mata Pelajaran': selectedSubject };
          let totalH = 0, totalI = 0, totalS = 0, totalA = 0;

          daysArray.forEach(day => {
            const dateStr = `${rekapMonth}-${String(day).padStart(2, '0')}`;
            const att = rekapMapelMap.get(`${s.id}_${dateStr}`);
            const status = att?.status;
            
            if (status === 'hadir') totalH++;
            else if (status === 'izin') totalI++;
            else if (status === 'sakit') totalS++;
            else if (status === 'alpha') totalA++;

            row[day.toString()] = status ? status.charAt(0).toUpperCase() : '-';
          });

          const totalDays = totalH + totalI + totalS + totalA;
          const percentage = totalDays > 0 ? Math.round((totalH / totalDays) * 100) : 0;
          
          row['Total Hadir (H)'] = totalH;
          row['Total Izin (I)'] = totalI;
          row['Total Sakit (S)'] = totalS;
          row['Total Alpha (A)'] = totalA;
          row['% Kehadiran'] = `${percentage}%`;
          
          return row;
        });
        fileName = `Rekap_Bulanan_Mapel_${selectedSubject}_${selectedClass}_${rekapMonth}.xlsx`;
      } else {
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
    }

    if (exportData.length === 0) {
      setToast({ message: 'Tidak ada data absensi untuk diekspor pada filter ini.', type: 'warning' });
      return;
    }

    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Absensi");
    XLSX.writeFile(wb, fileName);
  };

  const mapelColumns = [
    { key: 'no', label: 'No', width: '50px', render: (_, row, i) => i + 1 },
    { key: 'studentName', label: 'Nama Siswa', render: (_, row) => (
      <button onClick={() => openStudentProfile(row.studentId)} style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}>
        {row.studentName}
      </button>
    ) },
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
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border-light)', borderRight: '1px solid var(--color-border-light)', fontSize: '13px', fontWeight: '500', position: 'sticky', left: 0, background: 'var(--color-surface)', zIndex: 1 }}>
                      <button onClick={() => openStudentProfile(s.id)} style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', padding: 0, textAlign: 'left', width: '100%' }}>
                        {s.name}
                      </button>
                    </td>
                    {daysArray.map(day => {
                      const dateStr = `${rekapMonth}-${String(day).padStart(2, '0')}`;
                      const att = rekapPiketMap.get(`${s.id}_${dateStr}`);
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

  // Render Rekap Mapel Table
  const renderRekapMapelTable = () => {
    if (rekapLoading) return <LoadingSpinner message="Memuat rekap mapel..." />;
    
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
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border-light)', borderRight: '1px solid var(--color-border-light)', fontSize: '13px', fontWeight: '500', position: 'sticky', left: 0, background: 'var(--color-surface)', zIndex: 1 }}>
                      <button onClick={() => openStudentProfile(s.id)} style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', padding: 0, textAlign: 'left', width: '100%' }}>
                        {s.name}
                      </button>
                    </td>
                    {daysArray.map(day => {
                      const dateStr = `${rekapMonth}-${String(day).padStart(2, '0')}`;
                      const att = rekapMapelMap.get(`${s.id}_${dateStr}`);
                      const attStatus = att?.status;
                      
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
      <div style={{ marginBottom: 'var(--space-5)', display: 'flex', gap: 'var(--space-4)', borderBottom: '1px solid var(--color-border-light)' }}>
        <button
          style={mainTabStyle(activeTab === 'piket')}
          onClick={() => {
            setActiveTab('piket');
            setSummaryPage(1);
          }}
        >
          Absensi Piket
        </button>
        <button
          style={mainTabStyle(activeTab === 'mapel')}
          onClick={() => {
            setActiveTab('mapel');
            setSummaryPage(1);
          }}
        >
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
        gap: 'var(--space-3)',
      }}>
        {/* Left side filters */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* Tahun Ajaran Filter (Scoping across all reports) */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tahun Ajaran
            </label>
            <select
              value={selectedYearId}
              onChange={(e) => {
                setSelectedYearId(e.target.value);
                setSummaryMonth('all');
                setSummaryPage(1);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: 'var(--font-size-sm)',
                background: 'var(--color-surface)',
                minWidth: '185px',
              }}
            >
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>
                  {y.nama} Smt {y.semester} {y.isActive ? '(Aktif)' : ''}
                </option>
              ))}
              <option value="all">Semua Periode</option>
            </select>
          </div>

          {/* Kelas Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Kelas
            </label>
            {viewMode === 'summary' ? (
              <select
                value={summaryClass}
                onChange={(e) => {
                  setSummaryClass(e.target.value);
                  setSummaryPage(1);
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: 'var(--font-size-sm)',
                  background: 'var(--color-surface)',
                  minWidth: '150px',
                }}
              >
                <option value="Semua">Semua Kelas</option>
                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            ) : (
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: 'var(--font-size-sm)',
                  background: 'var(--color-surface)',
                  minWidth: '150px',
                }}
              >
                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            )}
          </div>

          {viewMode === 'summary' ? (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Rentang Bulan
                </label>
                <select
                  value={summaryMonth}
                  onChange={(e) => {
                    setSummaryMonth(e.target.value);
                    setSummaryPage(1);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--font-size-sm)',
                    background: 'var(--color-surface)',
                    minWidth: '175px',
                  }}
                >
                  <option value="all">Seluruh Semester / Tahun</option>
                  {availableMonths.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Cari Siswa
                </label>
                <input
                  type="text"
                  placeholder="Nama atau NIS..."
                  value={summarySearch}
                  onChange={(e) => setSummarySearch(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--font-size-sm)',
                    background: 'var(--color-surface)',
                    minWidth: '165px',
                  }}
                />
              </div>
            </>
          ) : viewMode === 'monthly' ? (
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
                    background: 'var(--color-surface)', minWidth: '150px',
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
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setSummaryPage(1);
                }}
                style={{
                  padding: '8px 14px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)',
                  background: 'var(--color-surface)', minWidth: '185px',
                }}
              >
                {viewMode === 'summary' && <option value="Semua">Semua Mapel</option>}
                {subjects.map(s => {
                  const label = s.nama || s.name;
                  return <option key={s.id} value={label}>{label}</option>;
                })}
              </select>
            </div>
          )}
        </div>

        {/* Right side: 3-Mode View Switcher */}
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--color-surface-alt)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            gap: '4px',
          }}
        >
          {[
            { id: 'daily', label: 'Harian' },
            { id: 'monthly', label: 'Matriks Bulanan' },
            { id: 'summary', label: 'Rekap Periode / Tahunan' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setViewMode(tab.id);
                if (tab.id === 'summary') setSummaryPage(1);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: viewMode === tab.id ? 'var(--color-primary)' : 'transparent',
                color: viewMode === tab.id ? '#FFFFFF' : 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: viewMode === tab.id ? 700 : 600,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Daily Attendance Trend Visualization (Recharts) — hidden in summary mode to keep focus crisp */}
      {viewMode !== 'summary' && (
        <AttendanceTrendChart
          activeTab={activeTab}
          selectedClass={selectedClass}
          selectedSubject={selectedSubject}
          sesi={sesi}
          tahunAjarId={selectedYearId}
          month={viewMode === 'monthly' ? rekapMonth : (selectedDate ? selectedDate.substring(0, 7) : rekapMonth)}
          selectedDate={selectedDate}
          preloadedRecords={
            viewMode === 'monthly' && !rekapLoading
              ? (activeTab === 'piket' ? rekapData : rekapMapelData)
              : null
          }
          onSelectDate={(dateStr) => {
            setSelectedDate(dateStr);
            setViewMode('daily');
          }}
          onJumpToMonth={(targetMonth, targetDate) => {
            setRekapMonth(targetMonth);
            if (targetDate) setSelectedDate(targetDate);
          }}
        />
      )}

      {/* DB-Aggregated Annual / Semester Summary View */}
      {viewMode === 'summary' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', fontVariantNumeric: 'tabular-nums' }}>
            {[
              { label: 'Tingkat Hadir', value: `${summaryResult?.totals?.attendanceRate ?? 0}%`, color: '#1D4ED8', bg: '#EFF6FF' },
              { label: 'Total Hadir', value: summaryResult?.totals?.hadir ?? 0, color: '#059669', bg: '#ECFDF5' },
              { label: 'Izin', value: summaryResult?.totals?.izin ?? 0, color: '#0284C7', bg: '#F0F9FF' },
              { label: 'Sakit', value: summaryResult?.totals?.sakit ?? 0, color: '#D97706', bg: '#FFFBEB' },
              { label: 'Alpha', value: summaryResult?.totals?.alpha ?? 0, color: '#DC2626', bg: '#FEF2F2' },
              activeTab === 'piket'
                ? { label: 'Bolos Sore', value: summaryResult?.totals?.bolos ?? 0, color: '#991B1B', bg: '#FEE2E2' }
                : { label: 'Sesi Guru', value: summaryResult?.totalSesiGuru ?? 0, color: '#4338CA', bg: '#EEF2FF' },
            ].map((item) => (
              <div key={item.label} style={{ padding: '12px', textAlign: 'center', background: item.bg, borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-extrabold)', color: item.color }}>{item.value}</div>
                <div style={{ fontSize: '11px', color: item.color, fontWeight: 'var(--font-weight-semibold)', marginTop: '2px' }}>{item.label}</div>
              </div>
            ))}
          </div>

          <Card padding="0">
            {summaryLoading ? (
              <LoadingSpinner message="Menghitung agregasi absensi periode..." />
            ) : (
              <>
                <Table
                  columns={
                    activeTab === 'piket'
                      ? [
                          {
                            key: 'no',
                            label: 'No',
                            width: '48px',
                            render: (_, __, i) => (
                              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                {((summaryResult?.pagination?.page || 1) - 1) * (summaryResult?.pagination?.limit || summaryLimit) + i + 1}
                              </span>
                            ),
                          },
                          {
                            key: 'studentName',
                            label: 'Nama Siswa',
                            render: (_, row) => (
                              <div>
                                <button
                                  onClick={() => openStudentProfile(row.studentId)}
                                  style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0, textAlign: 'left' }}
                                >
                                  {row.studentName}
                                </button>
                                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                                  NIS: {row.nis || '-'}
                                </div>
                              </div>
                            ),
                          },
                          { key: 'class', label: 'Kelas', width: '110px', render: (val) => <Badge variant="primary">{val || '-'}</Badge> },
                          { key: 'hadir', label: 'H', width: '58px', cellStyle: { textAlign: 'center', fontWeight: 700, color: '#059669' } },
                          { key: 'izin', label: 'I', width: '58px', cellStyle: { textAlign: 'center', fontWeight: 700, color: '#2563EB' } },
                          { key: 'sakit', label: 'S', width: '58px', cellStyle: { textAlign: 'center', fontWeight: 700, color: '#D97706' } },
                          { key: 'alpha', label: 'A', width: '58px', cellStyle: { textAlign: 'center', fontWeight: 700, color: '#DC2626' } },
                          {
                            key: 'bolos',
                            label: 'Bolos',
                            width: '72px',
                            cellStyle: { textAlign: 'center' },
                            render: (val) => (val > 0 ? <Badge variant="danger">{val}x</Badge> : <span style={{ color: 'var(--color-text-muted)' }}>0</span>),
                          },
                          {
                            key: 'attendanceRate',
                            label: '% Hadir',
                            width: '92px',
                            cellStyle: { textAlign: 'center' },
                            render: (val) => (
                              <Badge variant={val >= 85 ? 'success' : val >= 70 ? 'warning' : 'danger'}>
                                {val}%
                              </Badge>
                            ),
                          },
                        ]
                      : [
                          {
                            key: 'no',
                            label: 'No',
                            width: '48px',
                            render: (_, __, i) => (
                              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                {((summaryResult?.pagination?.page || 1) - 1) * (summaryResult?.pagination?.limit || summaryLimit) + i + 1}
                              </span>
                            ),
                          },
                          {
                            key: 'studentName',
                            label: 'Nama Siswa',
                            render: (_, row) => (
                              <button
                                onClick={() => openStudentProfile(row.studentId)}
                                style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0 }}
                              >
                                {row.studentName}
                              </button>
                            ),
                          },
                          { key: 'class', label: 'Kelas', width: '110px', render: (val) => <Badge variant="primary">{val || '-'}</Badge> },
                          { key: 'hadir', label: 'H', width: '58px', cellStyle: { textAlign: 'center', fontWeight: 700, color: '#059669' } },
                          { key: 'izin', label: 'I', width: '58px', cellStyle: { textAlign: 'center', fontWeight: 700, color: '#2563EB' } },
                          { key: 'sakit', label: 'S', width: '58px', cellStyle: { textAlign: 'center', fontWeight: 700, color: '#D97706' } },
                          { key: 'alpha', label: 'A', width: '58px', cellStyle: { textAlign: 'center', fontWeight: 700, color: '#DC2626' } },
                          { key: 'totalSesi', label: 'Total Sesi', width: '90px', cellStyle: { textAlign: 'center', fontWeight: 600 } },
                          {
                            key: 'persentase',
                            label: '% Hadir',
                            width: '92px',
                            cellStyle: { textAlign: 'center' },
                            render: (val) => (
                              <Badge variant={val >= 85 ? 'success' : val >= 70 ? 'warning' : 'danger'}>
                                {val}%
                              </Badge>
                            ),
                          },
                        ]
                  }
                  data={activeTab === 'piket' ? (summaryResult?.items || []) : (summaryResult?.rekap || [])}
                  emptyMessage="Belum ada data rekap absensi pada periode dan filter yang dipilih."
                />
                <PaginationBar
                  pagination={summaryResult?.pagination}
                  onPageChange={(nextPage) => setSummaryPage(nextPage)}
                  onLimitChange={(nextLimit) => {
                    setSummaryLimit(nextLimit);
                    setSummaryPage(1);
                  }}
                  itemLabel="siswa"
                />
              </>
            )}
          </Card>
        </>
      )}

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

      {/* Daily & Monthly Matrix Table */}
      {viewMode !== 'summary' && (
        <Card padding={activeTab === 'piket' && viewMode === 'monthly' ? "var(--space-4) 0 0 0" : "0"}>
          {activeTab === 'piket' ? (
            viewMode === 'daily' ? (
              loadingPiket ? (
                <LoadingSpinner message="Memuat data absensi piket..." />
              ) : (
                <Table
                  columns={[
                    { key: 'no', label: 'No', width: '50px', render: (_, row, i) => i + 1 },
                    { key: 'studentName', label: 'Nama Siswa', render: (_, row) => (
                      <button onClick={() => openStudentProfile(row.studentId)} style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}>
                        {row.studentName}
                      </button>
                    ) },
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
            viewMode === 'daily' ? (
              loadingMapel ? (
                <LoadingSpinner message="Memuat absensi mapel..." />
              ) : attendanceMapel.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
                  Belum ada data absensi untuk mapel {selectedSubject} pada kelas {selectedClass}.
                </div>
              ) : (
                <Table
                  columns={mapelColumns}
                  data={attendanceMapel}
                />
              )
            ) : (
              renderRekapMapelTable()
            )
          )}
        </Card>
      )}

      <StudentDetailModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        studentId={selectedProfileId} 
      />
    </div>
  );
}
