/* ============================================================
   MobileNilaiPage.jsx — Lihat & Input Cepat Nilai Siswa (Mobile)
   ============================================================ */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClasses, getStudents, getGrades, addGrade, getSubjects } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Toast from '../../components/ui/Toast';

const GRADE_TYPES = ['Tugas', 'UH', 'UTS', 'UAS', 'Praktik'];

export default function MobileNilaiPage() {
  const { hasRole } = useAuth();
  const canInput = hasRole(['admin', 'guru']);
  const queryClient = useQueryClient();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [step, setStep] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newType, setNewType] = useState('UH');
  const [newScore, setNewScore] = useState('');
  const [toast, setToast] = useState(null);

  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['classes-list'],
    queryFn: getClasses,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects-list'],
    queryFn: getSubjects,
    enabled: canInput,
  });

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['students-by-class', selectedClass],
    queryFn: () => getStudents(selectedClass),
    enabled: Boolean(selectedClass),
  });

  const { data: grades = [], isLoading: loadingGrades } = useQuery({
    queryKey: ['grades', selectedStudent?.id],
    queryFn: () => getGrades(selectedStudent.id),
    enabled: Boolean(selectedStudent?.id),
  });

  const addMutation = useMutation({
    mutationFn: (payload) => addGrade(payload),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['grades'] });
        setShowAddForm(false);
        setNewScore('');
        setToast({ message: 'Nilai berhasil disimpan.', type: 'success' });
      } else {
        setToast({ message: res.error || 'Gagal menyimpan nilai.', type: 'error' });
      }
    },
  });

  const handleSelectClass = (clsName) => {
    setSelectedClass(clsName);
    setStep(2);
  };

  const handleSelectStudent = (stu) => {
    setSelectedStudent(stu);
    setShowAddForm(false);
    setStep(3);
  };

  const handleAddGrade = (e) => {
    e.preventDefault();
    const numeric = Number(newScore);
    const subjectName = newSubject || subjects[0]?.nama || '';
    if (!subjectName || Number.isNaN(numeric) || numeric < 0 || numeric > 100) {
      setToast({ message: 'Pilih mapel dan isi skor 0–100.', type: 'error' });
      return;
    }
    addMutation.mutate({
      studentId: selectedStudent.id,
      subject: subjectName,
      type: newType,
      score: numeric,
      semester: 1,
    });
  };

  const getGradeBadge = (score) => {
    if (score >= 90) return { label: 'A', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };
    if (score >= 80) return { label: 'B', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' };
    if (score >= 70) return { label: 'C', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' };
    return { label: 'D', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
  };

  const backBtnStyle = {
    minHeight: '44px',
    background: 'none',
    border: 'none',
    color: '#2563EB',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '0 4px',
    marginBottom: '6px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  };

  if (step === 3 && selectedStudent) {
    const avg = grades.length > 0 ? Math.round(grades.reduce((s, g) => s + (g.score || 0), 0) / grades.length) : 0;
    const badge = getGradeBadge(avg);

    return (
      <div style={{ padding: '12px 16px 24px' }}>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <button type="button" onClick={() => setStep(2)} style={backBtnStyle}>
          ← Kembali ke {selectedClass}
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 2px' }}>{selectedStudent.name}</h2>
            <p style={{ fontSize: '12px', color: '#64748B', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
              {selectedStudent.class} · NIS: {selectedStudent.nis || '-'}
            </p>
          </div>
          {canInput && (
            <button
              type="button"
              onClick={() => {
                setNewSubject(subjects[0]?.nama || '');
                setShowAddForm(v => !v);
              }}
              style={{
                minHeight: '44px',
                padding: '0 14px',
                borderRadius: '12px',
                background: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {showAddForm ? 'Tutup' : '+ Nilai'}
            </button>
          )}
        </div>

        {/* Inline Quick Input Form for Teachers */}
        {canInput && showAddForm && (
          <form
            onSubmit={handleAddGrade}
            style={{
              padding: '14px',
              borderRadius: '14px',
              background: '#FFFFFF',
              border: '1px solid #BFDBFE',
              marginBottom: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <select
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              required
              style={{ minHeight: '44px', padding: '0 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', background: '#FFF' }}
            >
              <option value="">Pilih Mata Pelajaran</option>
              {subjects.map(s => <option key={s.id} value={s.nama || s.name}>{s.nama || s.name}</option>)}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                style={{ minHeight: '44px', padding: '0 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', background: '#FFF' }}
              >
                {GRADE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input
                type="number"
                min={0}
                max={100}
                required
                placeholder="Skor (0–100)"
                value={newScore}
                onChange={(e) => setNewScore(e.target.value)}
                style={{ minHeight: '44px', padding: '0 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', fontVariantNumeric: 'tabular-nums' }}
              />
            </div>
            <button
              type="submit"
              disabled={addMutation.isPending}
              style={{
                minHeight: '44px',
                borderRadius: '10px',
                background: '#059669',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {addMutation.isPending ? 'Menyimpan...' : 'Simpan Nilai'}
            </button>
          </form>
        )}

        {/* Average Card */}
        <div style={{
          padding: '18px',
          borderRadius: '16px',
          marginBottom: '14px',
          textAlign: 'center',
          background: badge.bg,
          border: `1px solid ${badge.border}`,
        }}>
          <div style={{ fontSize: '40px', fontWeight: 800, color: badge.color, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
            {grades.length > 0 ? avg : '—'}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: badge.color, marginTop: '4px' }}>
            {grades.length > 0 ? `Rata-rata Nilai · Grade ${badge.label}` : 'Belum ada data nilai'}
          </div>
        </div>

        {/* Grades List */}
        {loadingGrades ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#64748B', fontSize: '13px' }}>Memuat nilai...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {grades.map((g) => {
              const b = getGradeBadge(g.score);
              return (
                <div key={g.id} style={{
                  padding: '12px 14px',
                  borderRadius: '14px',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }}>{g.subject}</p>
                    <p style={{ fontSize: '12px', color: '#64748B', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                      {g.type || 'Nilai'} · Semester {g.semester || 1}
                    </p>
                  </div>
                  <div style={{
                    minWidth: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    flexShrink: 0,
                    background: b.bg,
                    border: `1px solid ${b.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 800,
                    color: b.color,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {g.score}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (step === 2) {
    return (
      <div style={{ padding: '12px 16px 24px' }}>
        <button type="button" onClick={() => setStep(1)} style={backBtnStyle}>
          ← Pilih Kelas Lain
        </button>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 14px' }}>Siswa — {selectedClass}</h2>
        {loadingStudents ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#64748B', fontSize: '14px' }}>Memuat daftar siswa...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {students.map((stu, i) => (
              <button
                key={stu.id}
                type="button"
                onClick={() => handleSelectStudent(stu)}
                style={{
                  minHeight: '56px',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  textAlign: 'left',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  flexShrink: 0,
                  background: '#EFF6FF',
                  color: '#1D4ED8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {i + 1}
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>{stu.name}</p>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: 0, fontVariantNumeric: 'tabular-nums' }}>NIS: {stu.nis || '-'}</p>
                </div>
                <svg style={{ marginLeft: 'auto' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Nilai Siswa</h2>
      <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 18px' }}>Pilih kelas untuk melihat atau menginput nilai</p>
      {loadingClasses ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#64748B', fontSize: '14px' }}>Memuat daftar kelas...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {classes.map(cls => (
            <button
              key={cls.id}
              type="button"
              onClick={() => handleSelectClass(cls.name)}
              style={{
                minHeight: '84px',
                padding: '16px 12px',
                borderRadius: '14px',
                textAlign: 'left',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                cursor: 'pointer',
              }}
            >
              <p style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>{cls.name}</p>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                {cls.totalStudents ?? 0} siswa · {cls.major || 'Umum'}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
