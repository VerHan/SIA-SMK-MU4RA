import { useState, useEffect } from 'react';
import { getStudents, getClasses, saveSubjectAttendance, getMasterTimeSlots, getSchedule, getAcademicCalendarByDate } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function GuruAbsenMapelPage() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSubject, setSelectedSubject] = useState('Matematika');
  const [selectedJamKe, setSelectedJamKe] = useState(1);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  
  const subjects = ['Matematika', 'Pemrograman Web', 'Jaringan Komputer', 'Bahasa Indonesia', 'Bahasa Inggris', 'PAI', 'PBO', 'Basis Data'];
  const [jamKeOptions, setJamKeOptions] = useState([]);
  const [autoLocked, setAutoLocked] = useState(false);
  const [calendarEvent, setCalendarEvent] = useState(null);

  // State untuk menyimpan absensi sementara sebelum disave
  // Format: { [studentId]: 'hadir' | 'izin' | 'sakit' | 'alpha' }
  const [attendanceInput, setAttendanceInput] = useState({});

  useEffect(() => {
    async function loadInitialData() {
      const classesData = await getClasses();
      setClasses(classesData);
      
      const timeSlots = await getMasterTimeSlots();
      setJamKeOptions(timeSlots.filter(t => t.jamKe).map(t => t.jamKe));

      // Auto-Select Logic
      const now = new Date();
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const today = days[now.getDay()] || 'Senin';
      const schedules = await getSchedule(today);
      
      const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const activeSlot = timeSlots.find(slot => slot.jamKe && currentTimeStr >= slot.start && currentTimeStr <= slot.end);
      
      if (activeSlot) {
        // Find if this teacher has a class right now
        // In reality we filter by user.name/id. Here we just take the first matching jamKe schedule to demo.
        const myClass = schedules.find(s => s.jamKe === activeSlot.jamKe);
        if (myClass) {
          setSelectedJamKe(activeSlot.jamKe);
          setSelectedClass(myClass.class);
          setSelectedSubject(myClass.subject);
          setAutoLocked(true); // Tanda bahwa ini adalah hasil auto-detect
        } else if (classesData.length > 0) {
          setSelectedClass(classesData[0].name);
        }
      } else if (classesData.length > 0) {
        setSelectedClass(classesData[0].name);
      }
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    async function checkCalendarAndLoadStudents() {
      setLoading(true);
      const event = await getAcademicCalendarByDate(selectedDate);
      let isBlocked = false;
      if (event) {
        if (event.isFullDay || (selectedJamKe >= event.jamMulai && selectedJamKe <= event.jamSelesai)) {
          setCalendarEvent(event);
          isBlocked = true;
        } else {
          setCalendarEvent(null);
        }
      } else {
        setCalendarEvent(null);
      }

      if (selectedClass && !isBlocked) {
        getStudents(selectedClass).then(data => {
          setStudents(data);
          const initial = {};
          data.forEach(s => { initial[s.id] = 'hadir'; });
          setAttendanceInput(initial);
          setLoading(false);
        });
      } else {
        setStudents([]);
        setLoading(false);
      }
    }
    checkCalendarAndLoadStudents();
  }, [selectedClass, selectedDate, selectedSubject, selectedJamKe]);

  const handleStatusChange = (studentId, status) => {
    setAttendanceInput(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    setSubmitting(true);
    // Format the payload for saveSubjectAttendance
    const records = students.map(s => ({
      studentId: s.id,
      studentName: s.name,
      class: selectedClass,
      date: selectedDate,
      subject: selectedSubject,
      jamKe: selectedJamKe,
      status: attendanceInput[s.id]
    }));

    const res = await saveSubjectAttendance(records);
    setSubmitting(false);

    if (res.success) {
      setToast({ type: 'success', message: 'Absensi Mata Pelajaran berhasil disimpan!' });
    } else {
      setToast({ type: 'error', message: 'Gagal menyimpan absensi mapel.' });
    }
  };

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
            Input Absen Mata Pelajaran
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Input presensi siswa per jam pelajaran pada kelas yang diajar.
          </p>
          {autoLocked && !calendarEvent && (
            <div style={{ display: 'inline-block', marginTop: '8px', padding: '4px 10px', background: '#ECFDF5', color: '#059669', fontSize: '11px', borderRadius: '4px', fontWeight: 'bold' }}>
              ✨ Kelas terdeteksi otomatis dari Jadwal
            </div>
          )}
          {calendarEvent && (
            <div style={{ display: 'inline-block', marginTop: '8px', padding: '6px 12px', background: '#FEF2F2', color: '#DC2626', fontSize: '12px', borderRadius: '4px', border: '1px solid #FCA5A5', fontWeight: 'bold' }}>
              ⚠️ Agenda: {calendarEvent.judul} ({calendarEvent.keterangan}). Anda tidak perlu mengisi absensi.
            </div>
          )}
        </div>
        <Button onClick={handleSave} loading={submitting} disabled={!!calendarEvent}>
          💾 Simpan Absensi
        </Button>
      </div>

      <Card style={{ marginBottom: 'var(--space-6)', border: autoLocked ? '1px solid #10B981' : '1px solid var(--color-border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-4)', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Kelas</label>
            <select
              value={selectedClass}
              onChange={(e) => { setSelectedClass(e.target.value); setAutoLocked(false); }}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', background: 'var(--color-surface)'
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
              onChange={(e) => { setSelectedDate(e.target.value); setAutoLocked(false); }}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', background: 'var(--color-surface)'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Mata Pelajaran</label>
            <select
              value={selectedSubject}
              onChange={(e) => { setSelectedSubject(e.target.value); setAutoLocked(false); }}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', background: 'var(--color-surface)'
              }}
            >
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Jam Ke-</label>
            <select
              value={selectedJamKe}
              onChange={(e) => { setSelectedJamKe(Number(e.target.value)); setAutoLocked(false); }}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', background: 'var(--color-surface)'
              }}
            >
              {jamKeOptions.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <Card padding="0">
        {loading ? (
          <LoadingSpinner message="Memuat data..." />
        ) : calendarEvent ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>📅</div>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold', color: 'var(--color-text)' }}>Jadwal Diliburkan / Dialihkan</h3>
            <p style={{ marginTop: 'var(--space-2)' }}>Terdapat agenda: <strong>{calendarEvent.judul}</strong>. Tidak ada kelas pada sesi ini.</p>
          </div>
        ) : (
          <Table columns={columns} data={students} emptyMessage="Tidak ada siswa di kelas ini." />
        )}
      </Card>
    </div>
  );
}
