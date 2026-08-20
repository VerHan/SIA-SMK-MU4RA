import { useState, useEffect } from 'react';
import { getClasses, getSubjects, getTeachers, getMasterTimeSlots, getSchedule, saveScheduleMatrix, getSubjectTeachers } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import Toast from '../ui/Toast';
import { DAYS } from '../../config/constants';

export default function ScheduleMatrix() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const [selectedDay, setSelectedDay] = useState('Senin');
  const [selectedGrade, setSelectedGrade] = useState('X');

  const [classes, setClasses] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjectTeachers, setSubjectTeachers] = useState([]);

  // matrixData shape: { [jamKe]: { [className]: { subjectId, teacherId, room } } }
  const [matrixData, setMatrixData] = useState({});
  const [globalSchedules, setGlobalSchedules] = useState([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [allClasses, allSlots, allSubjects, allTeachers, allSchedules, allSubjectTeachers] = await Promise.all([
        getClasses(),
        getMasterTimeSlots(),
        getSubjects(),
        getTeachers(),
        getSchedule(),
        getSubjectTeachers()
      ]);

      setClasses(allClasses);
      setTimeSlots(allSlots);
      setSubjects(allSubjects);
      setTeachers(allTeachers);
      setGlobalSchedules(allSchedules);
      setSubjectTeachers(allSubjectTeachers);
      setLoading(false);
    }
    loadData();
  }, []);
  
  const lessonSlots = timeSlots.filter(t => t.type === 'pelajaran' && t.jamKe);
  const grades = ['X', 'XI', 'XII'];

  useEffect(() => {
    if (classes.length > 0 && lessonSlots.length > 0 && globalSchedules) {
      const initialMatrix = {};
      lessonSlots.forEach(slot => {
        initialMatrix[slot.jamKe] = {};
        classes.forEach(cls => {
          const existing = globalSchedules.find(s => s.day === selectedDay && s.jamKe === slot.jamKe && s.class === cls.name);
          initialMatrix[slot.jamKe][cls.name] = {
            subjectId: existing?.subjectId || '',
            teacherId: existing?.teacherId || '',
            room: existing?.room || '',
          };
        });
      });
      setMatrixData(initialMatrix);
    }
  }, [selectedDay, globalSchedules, classes, timeSlots]); 

  const handleCellChange = (jamKe, className, field, value) => {
    setMatrixData(prev => {
      const newCell = { ...prev[jamKe][className], [field]: value };
      
      // Jika mengganti mapel, reset pilihan guru karena mungkin guru sebelumnya tidak mengajar mapel ini
      if (field === 'subjectId') {
        newCell.teacherId = '';
      }
      
      return {
        ...prev,
        [jamKe]: {
          ...prev[jamKe],
          [className]: newCell
        }
      };
    });
  };

  const checkClash = (jamKe, className, teacherId) => {
    if (!teacherId) return false;
    
    // Check in the currently edited matrix (all classes)
    for (const cls of classes) {
      if (cls.name !== className) {
        if (matrixData[jamKe]?.[cls.name]?.teacherId === teacherId) {
          return true; // Clashing in the current unsaved matrix
        }
      }
    }

    // Check globally (other days/schedules not in matrix, though everything for this day is in the matrix)
    const existingGlobal = globalSchedules.find(s => 
      s.day === selectedDay && 
      s.jamKe === jamKe && 
      s.teacherId === teacherId && 
      s.class !== className && 
      !classes.some(c => c.name === s.class) 
    );

    return !!existingGlobal;
  };

  const handleSave = async () => {
    setSubmitting(true);
    const recordsToSave = [];
    
    for (const slot of lessonSlots) {
      for (const cls of classes) {
        const cell = matrixData[slot.jamKe]?.[cls.name];
        if (cell && cell.subjectId && cell.teacherId) {
          recordsToSave.push({
            jamKe: slot.jamKe,
            class: cls.name,
            subjectId: cell.subjectId,
            teacherId: cell.teacherId,
            room: cell.room,
          });
        }
      }
    }

    const res = await saveScheduleMatrix(selectedDay, recordsToSave);
    if (res.success) {
      setToast({ type: 'success', message: 'Jadwal berhasil disimpan!' });
      const updatedSchedules = await getSchedule();
      setGlobalSchedules(updatedSchedules);
    } else {
      setToast({ type: 'error', message: res.error || 'Gagal menyimpan.' });
    }
    setSubmitting(false);
  };

  // Helper untuk memfilter guru berdasarkan mata pelajaran yang dipilih
  const getTeachersForSubject = (subjectId) => {
    if (!subjectId) return [];
    // Cari mapping guru yang mengajar mapel ini
    const mappedTeachers = subjectTeachers.filter(st => st.mapelId === subjectId).map(st => st.guruId);
    return teachers.filter(t => mappedTeachers.includes(t.id));
  };

  if (loading) return <LoadingSpinner message="Memuat data matriks jadwal..." />;

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Hari</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', minWidth: '150px' }}
            >
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Angkatan (Kelas)</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', minWidth: '150px' }}
            >
              {grades.map(g => <option key={g} value={g}>Kelas {g}</option>)}
            </select>
          </div>
        </div>
        <Button onClick={handleSave} loading={submitting}>
          💾 Simpan Semua Perubahan
        </Button>
      </div>

      {/* Render 1 tabel untuk Angkatan yang dipilih */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
        {(() => {
          const gradeClasses = classes.filter(c => c.grade === selectedGrade);
          if (gradeClasses.length === 0) return (
            <Card padding="var(--space-6)" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
              Belum ada kelas untuk angkatan {selectedGrade}.
            </Card>
          );

          return (
            <Card padding="0" style={{ overflowX: 'auto' }}>
              <div style={{ padding: 'var(--space-4)', background: '#F8FAFC', borderBottom: '1px solid var(--color-border)', fontWeight: 'bold', fontSize: '16px', color: 'var(--color-primary)' }}>
                Angkatan: Kelas {selectedGrade}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ background: 'var(--color-background)', borderBottom: '2px solid var(--color-border)' }}>
                    <th style={{ padding: 'var(--space-3)', width: '100px', position: 'sticky', left: 0, background: 'var(--color-background)', zIndex: 10 }}>Waktu</th>
                    {gradeClasses.map(cls => (
                      <th key={cls.id} style={{ padding: 'var(--space-3)', minWidth: '200px' }}>{cls.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((slot, index) => {
                    if (slot.type === 'istirahat') {
                      return (
                        <tr key={`ist-${index}`} style={{ background: 'rgba(59, 130, 246, 0.05)', borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: 'var(--space-3)', position: 'sticky', left: 0, background: 'var(--color-surface)' }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{slot.start} - {slot.end}</div>
                          </td>
                          <td colSpan={gradeClasses.length} style={{ padding: 'var(--space-3)', textAlign: 'center', fontWeight: 'bold', color: 'var(--color-text-secondary)', letterSpacing: '2px' }}>
                            {slot.name.toUpperCase()}
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={`jam-${slot.jamKe}`} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: 'var(--space-3)', position: 'sticky', left: 0, background: 'var(--color-surface)', zIndex: 10 }}>
                          <div style={{ fontWeight: 'bold' }}>Jam ke-{slot.jamKe}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{slot.start} - {slot.end}</div>
                        </td>
                        {gradeClasses.map(cls => {
                          const cell = matrixData[slot.jamKe]?.[cls.name] || {};
                          const isClashing = checkClash(slot.jamKe, cls.name, cell.teacherId);
                          
                          // Dapatkan daftar guru yang tersedia untuk mapel yang dipilih
                          const availableTeachers = getTeachersForSubject(cell.subjectId);
                          
                          return (
                            <td key={cls.id} style={{ padding: 'var(--space-3)', verticalAlign: 'top', background: isClashing ? '#FEF2F2' : 'transparent', borderLeft: '1px solid var(--color-border)' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <select
                                  value={cell.subjectId || ''}
                                  onChange={(e) => handleCellChange(slot.jamKe, cls.name, 'subjectId', e.target.value)}
                                  style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--color-border)', width: '100%' }}
                                >
                                  <option value="">-- Pilih Mata Pelajaran --</option>
                                  {subjects.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                                </select>

                                <select
                                  value={cell.teacherId || ''}
                                  onChange={(e) => handleCellChange(slot.jamKe, cls.name, 'teacherId', e.target.value)}
                                  disabled={!cell.subjectId}
                                  style={{ 
                                    padding: '6px 8px', fontSize: '12px', borderRadius: '4px', width: '100%',
                                    border: isClashing ? '1px solid #DC2626' : '1px solid var(--color-border)',
                                    color: isClashing ? '#DC2626' : 'inherit',
                                    background: !cell.subjectId ? '#F3F4F6' : 'white',
                                    cursor: !cell.subjectId ? 'not-allowed' : 'pointer'
                                  }}
                                >
                                  <option value="">-- Pilih Guru --</option>
                                  {availableTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                
                                {isClashing && (
                                  <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: 'bold', marginTop: '2px' }}>⚠️ Bentrok jadwal guru</div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}
