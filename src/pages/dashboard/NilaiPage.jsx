/* ============================================================
   NilaiPage — Manajemen Nilai Siswa (Full CRUD + React Query)
   ============================================================ */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGrades, addGrade, updateGrade, deleteGrade, getStudents, getSubjects, getClasses } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Toast from '../../components/ui/Toast';

const GRADE_TYPES = ['Tugas', 'UH', 'UTS', 'UAS', 'Praktik'];

const EMPTY_FORM = {
  studentId: '',
  subject: '',
  type: 'UTS',
  score: '',
  semester: 1,
};

const cardStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-xl)',
};

const inputStyle = {
  width: '100%',
  padding: '0.6rem 0.85rem',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: 'var(--font-size-sm)',
};

const labelStyle = {
  display: 'block',
  fontSize: 'var(--font-size-xs)',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  marginBottom: '6px',
};

export default function NilaiPage() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole(['admin', 'guru']);
  const queryClient = useQueryClient();

  const [selectedSubject, setSelectedSubject] = useState('Semua');
  const [selectedClass, setSelectedClass] = useState('Semua');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const studentFilterId = user?.role === 'wali_murid' ? user.studentId : undefined;

  const { data: grades = [], isLoading } = useQuery({
    queryKey: ['grades', studentFilterId || 'all'],
    queryFn: () => getGrades(studentFilterId),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => getStudents(),
    enabled: canEdit,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects-list'],
    queryFn: getSubjects,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes-list'],
    queryFn: getClasses,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingGrade) return updateGrade(editingGrade.id, payload);
      return addGrade(payload);
    },
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['grades'] });
        setIsModalOpen(false);
        setEditingGrade(null);
        setFormData(EMPTY_FORM);
        setToast({ message: res.message || 'Nilai berhasil disimpan.', type: 'success' });
      } else {
        setToast({ message: res.error || 'Gagal menyimpan nilai.', type: 'error' });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteGrade(id),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['grades'] });
        setDeleteTarget(null);
        setToast({ message: res.message || 'Nilai berhasil dihapus.', type: 'success' });
      } else {
        setToast({ message: res.error || 'Gagal menghapus nilai.', type: 'error' });
      }
    },
  });

  const subjectOptions = useMemo(() => {
    const names = new Set();
    subjects.forEach(s => { if (s.nama || s.name) names.add(s.nama || s.name); });
    grades.forEach(g => { if (g.subject) names.add(g.subject); });
    return ['Semua', ...Array.from(names)];
  }, [subjects, grades]);

  const classOptions = useMemo(() => {
    const names = new Set();
    classes.forEach(c => { if (c.name) names.add(c.name); });
    grades.forEach(g => { if (g.class && g.class !== '-') names.add(g.class); });
    return ['Semua', ...Array.from(names)];
  }, [classes, grades]);

  const filteredGrades = useMemo(() => {
    const q = search.trim().toLowerCase();
    return grades.filter(g => {
      const matchSub = selectedSubject === 'Semua' || g.subject === selectedSubject;
      const matchCls = selectedClass === 'Semua' || g.class === selectedClass;
      const matchQ = !q
        || (g.studentName || '').toLowerCase().includes(q)
        || (g.subject || '').toLowerCase().includes(q)
        || (g.type || '').toLowerCase().includes(q);
      return matchSub && matchCls && matchQ;
    });
  }, [grades, selectedSubject, selectedClass, search]);

  const stats = useMemo(() => {
    if (filteredGrades.length === 0) return { avg: 0, max: '—', min: '—', total: 0 };
    const scores = filteredGrades.map(g => Number(g.score) || 0);
    return {
      avg: Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length),
      max: Math.max(...scores),
      min: Math.min(...scores),
      total: scores.length,
    };
  }, [filteredGrades]);

  const openCreateModal = () => {
    setEditingGrade(null);
    setFormData({
      studentId: students[0]?.id || '',
      subject: subjects[0]?.nama || subjectOptions[1] || '',
      type: 'UTS',
      score: '',
      semester: 1,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingGrade(row);
    setFormData({
      studentId: row.studentId || '',
      subject: row.subject || '',
      type: row.type || 'UTS',
      score: String(row.score ?? ''),
      semester: row.semester || 1,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const numericScore = Number(formData.score);
    if (!formData.studentId || !formData.subject.trim()) {
      setToast({ message: 'Siswa dan mata pelajaran wajib dipilih.', type: 'error' });
      return;
    }
    if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
      setToast({ message: 'Nilai harus berupa angka antara 0 sampai 100.', type: 'error' });
      return;
    }
    saveMutation.mutate({
      studentId: formData.studentId,
      subject: formData.subject.trim(),
      type: formData.type,
      score: numericScore,
      semester: Number(formData.semester) || 1,
    });
  };

  const scoreBadge = (score) => {
    if (score >= 85) return <Badge variant="success">{score}</Badge>;
    if (score >= 75) return <Badge variant="primary">{score}</Badge>;
    if (score >= 65) return <Badge variant="warning">{score}</Badge>;
    return <Badge variant="danger">{score}</Badge>;
  };

  return (
    <div style={{ animation: 'fadeIn 250ms ease' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: '4px', color: 'var(--color-text)' }}>
            Nilai Siswa
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Rekap capaian nilai UH, Tugas, UTS, dan UAS siswa terintegrasi ke basis data.
          </p>
        </div>
        {canEdit && <Button onClick={openCreateModal}>+ Input Nilai</Button>}
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {[
          { label: 'Rata-rata Nilai', value: stats.avg, color: stats.avg >= 75 ? '#059669' : '#D97706' },
          { label: 'Nilai Tertinggi', value: stats.max, color: '#059669' },
          { label: 'Nilai Terendah', value: stats.min, color: '#DC2626' },
          { label: 'Total Catatan', value: stats.total, color: 'var(--color-primary)' },
        ].map(stat => (
          <div key={stat.label} style={{ ...cardStyle, padding: 'var(--space-5)' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '8px' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: stat.color, fontVariantNumeric: 'tabular-nums' }}>
              {isLoading ? '—' : stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ ...cardStyle, padding: 'var(--space-4)', marginBottom: 'var(--space-5)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center', justifyContent: 'space-between' }}>
        <input
          type="text"
          placeholder="Cari nama siswa atau mapel..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: '280px' }}
        />
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: '140px' }} aria-label="Filter kelas">
            {classOptions.map(c => <option key={c} value={c}>{c === 'Semua' ? 'Semua Kelas' : c}</option>)}
          </select>
          <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: '180px' }} aria-label="Filter mata pelajaran">
            {subjectOptions.map(s => <option key={s} value={s}>{s === 'Semua' ? 'Semua Mata Pelajaran' : s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', width: '50px', textAlign: 'center', fontWeight: 600, color: 'var(--color-text-secondary)' }}>No</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Nama Siswa</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Kelas</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Mata Pelajaran</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Jenis · Smt</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Nilai</th>
                {canEdit && <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                    <td colSpan={canEdit ? 7 : 6} style={{ padding: '16px' }}>
                      <div style={{ height: '18px', borderRadius: '6px', background: 'var(--color-border-light)', width: '75%' }} />
                    </td>
                  </tr>
                ))
              ) : filteredGrades.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Tidak ada data nilai pada filter ini.
                  </td>
                </tr>
              ) : (
                filteredGrades.map((row, idx) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                    <td style={{ padding: '13px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>{idx + 1}</td>
                    <td style={{ padding: '13px 16px', fontWeight: 600, color: 'var(--color-text)' }}>{row.studentName}</td>
                    <td style={{ padding: '13px 16px', color: 'var(--color-text-secondary)' }}>{row.class}</td>
                    <td style={{ padding: '13px 16px', color: 'var(--color-text)' }}>{row.subject}</td>
                    <td style={{ padding: '13px 16px', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                      {row.type} · Smt {row.semester || 1}
                    </td>
                    <td style={{ padding: '13px 16px', fontVariantNumeric: 'tabular-nums' }}>{scoreBadge(row.score)}</td>
                    {canEdit && (
                      <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <Button variant="secondary" size="xs" onClick={() => openEditModal(row)}>Edit</Button>
                          <Button variant="danger" size="xs" onClick={() => setDeleteTarget(row)}>Hapus</Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Grade Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGrade ? 'Edit Nilai Siswa' : 'Input Nilai Baru'}
        size="md"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label style={labelStyle}>Siswa *</label>
            <select
              required
              disabled={Boolean(editingGrade)}
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              style={inputStyle}
            >
              <option value="">— Pilih Siswa —</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.class})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Mata Pelajaran *</label>
            <select
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              style={inputStyle}
            >
              <option value="">— Pilih Mata Pelajaran —</option>
              {subjectOptions.filter(s => s !== 'Semua').map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label style={labelStyle}>Jenis Penilaian</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                style={inputStyle}
              >
                {GRADE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Semester</label>
              <select
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) })}
                style={inputStyle}
              >
                <option value={1}>Semester 1</option>
                <option value={2}>Semester 2</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Skor (0–100) *</label>
              <input
                type="number"
                required
                min={0}
                max={100}
                value={formData.score}
                onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                placeholder="85"
                style={{ ...inputStyle, fontVariantNumeric: 'tabular-nums' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" loading={saveMutation.isPending}>
              {editingGrade ? 'Simpan Perubahan' : 'Simpan Nilai'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Data Nilai"
        size="sm"
      >
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-5)', lineHeight: 1.6 }}>
          Hapus nilai <strong>{deleteTarget?.subject} ({deleteTarget?.type})</strong> milik <strong>{deleteTarget?.studentName}</strong>?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Batal</Button>
          <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
            Ya, Hapus
          </Button>
        </div>
      </Modal>
    </div>
  );
}
