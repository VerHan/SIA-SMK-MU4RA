/* ============================================================
   WaliKelasPage — Data Kelas, Wali Kelas & Manajemen Jurusan Sekolah
   
   Fitur:
   - CRUD Data Kelas & Wali Kelas
   - Kelola Program Keahlian / Jurusan Sekolah
   - Dropdown Jurusan Dinamis berdasarkan Jurusan Terdaftar
   - Filter Kelas berdasarkan Tingkat & Jurusan
   - Smart Auto-detection Tingkat & Jurusan saat mengetik Nama Kelas
   ============================================================ */

import { useState, useEffect } from 'react';
import {
  getClasses,
  addClass,
  updateClass,
  deleteClass,
  getTeachers,
  getMajors,
  addMajor,
  updateMajor,
  deleteMajor
} from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Toast from '../../components/ui/Toast';

// Pilihan warna preset profesional untuk label jurusan
const PRESET_COLORS = [
  { label: 'Biru', value: '#2563EB' },
  { label: 'Hijau Zamrud', value: '#059669' },
  { label: 'Kuning Amber', value: '#D97706' },
  { label: 'Ungu', value: '#7C3AED' },
  { label: 'Merah Ruby', value: '#DC2626' },
  { label: 'Cyan', value: '#0891B2' },
  { label: 'Indigo', value: '#4F46E5' },
  { label: 'Slate', value: '#475569' },
];

export default function WaliKelasPage() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [majors, setMajors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMajor, setFilterMajor] = useState('Semua');
  const [filterGrade, setFilterGrade] = useState('Semua');

  // Modal State - Kelas
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    grade: 'X',
    major: '',
    teacherId: '',
    totalStudents: 0
  });

  // Modal State - Kelola Jurusan
  const [isMajorModalOpen, setIsMajorModalOpen] = useState(false);
  const [majorTab, setMajorTab] = useState('list'); // 'list' | 'form'
  const [editingMajorId, setEditingMajorId] = useState(null);
  const [majorSubmitting, setMajorSubmitting] = useState(false);
  const [majorForm, setMajorForm] = useState({
    kode: '',
    nama: '',
    deskripsi: '',
    color: '#2563EB'
  });

  const loadData = async () => {
    setLoading(true);
    const [kelasData, guruData, jurusanData] = await Promise.all([
      getClasses(),
      getTeachers(),
      getMajors()
    ]);
    setClasses(Array.isArray(kelasData) ? kelasData : []);
    setTeachers(Array.isArray(guruData) ? guruData : []);
    const loadedMajors = Array.isArray(jurusanData) ? jurusanData : [];
    setMajors(loadedMajors);
    
    if (loadedMajors.length > 0 && !formData.major) {
      setFormData(prev => ({ ...prev, major: loadedMajors[0].kode }));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handler Buka Modal Kelas
  const handleOpenModal = (classData = null) => {
    if (classData) {
      setEditingId(classData.id);
      setFormData({
        name: classData.name || '',
        grade: classData.grade || 'X',
        major: classData.major || (majors[0]?.kode || 'Umum'),
        teacherId: classData.teacherId || '',
        totalStudents: classData.totalStudents || 0
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        grade: 'X',
        major: majors[0]?.kode || 'TKJ',
        teacherId: '',
        totalStudents: 0
      });
    }
    setIsModalOpen(true);
  };

  // Smart Auto-detection saat mengetik nama kelas
  const handleNameChange = (val) => {
    const upper = val.toUpperCase();
    let newGrade = formData.grade;
    if (upper.startsWith('XII') || upper.includes(' 12') || upper.includes(' XII')) newGrade = 'XII';
    else if (upper.startsWith('XI') || upper.includes(' 11') || upper.includes(' XI')) newGrade = 'XI';
    else if (upper.startsWith('X') || upper.includes(' 10') || upper.includes(' X')) newGrade = 'X';

    let newMajor = formData.major;
    for (const m of majors) {
      if (upper.includes(m.kode.toUpperCase())) {
        newMajor = m.kode;
        break;
      }
    }

    setFormData(prev => ({
      ...prev,
      name: val,
      grade: newGrade,
      major: newMajor
    }));
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const teacher = teachers.find(t => t.id === formData.teacherId);
    const dataToSave = {
      ...formData,
      teacherName: teacher ? teacher.name : '-',
      totalStudents: parseInt(formData.totalStudents) || 0
    };

    handleCloseModal();

    if (editingId) {
      // Optimistic update
      const previousClasses = [...classes];
      setClasses(prev => prev.map(c => c.id === editingId ? { ...c, ...dataToSave } : c));
      setToast({ type: 'success', message: 'Data kelas berhasil disimpan.' });

      updateClass(editingId, dataToSave).then(res => {
        if (res && res.success === false) {
          setClasses(previousClasses);
          setToast({ type: 'error', message: res.error || 'Gagal menyimpan perubahan kelas.' });
        }
      });
    } else {
      // Optimistic create
      const tempId = 'cls_' + Date.now();
      const optimisticClass = { ...dataToSave, id: tempId };
      setClasses(prev => [optimisticClass, ...prev]);
      setToast({ type: 'success', message: 'Kelas berhasil ditambahkan.' });

      addClass(dataToSave).then(res => {
        if (res && res.success !== false) {
          const persisted = res.data || { ...optimisticClass, id: res.id || tempId };
          setClasses(prev => prev.map(c => c.id === tempId ? { ...persisted, teacherName: dataToSave.teacherName } : c));
        } else {
          setClasses(prev => prev.filter(c => c.id !== tempId));
          setToast({ type: 'error', message: res?.error || 'Gagal menambahkan kelas.' });
        }
      });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus kelas ini?')) {
      const previousClasses = [...classes];
      setClasses(prev => prev.filter(c => c.id !== id));
      setToast({ type: 'success', message: 'Kelas berhasil dihapus.' });

      deleteClass(id).then(res => {
        if (res && res.success === false) {
          setClasses(previousClasses);
          setToast({ type: 'error', message: res.error || 'Gagal menghapus kelas.' });
        }
      });
    }
  };

  // ==========================================
  // HANDLERS: MANAJEMEN JURUSAN
  // ==========================================
  const handleOpenMajorModal = () => {
    setEditingMajorId(null);
    setMajorForm({ kode: '', nama: '', deskripsi: '', color: '#2563EB' });
    setMajorTab('list');
    setIsMajorModalOpen(true);
  };

  const handleAddNewMajorClick = () => {
    setEditingMajorId(null);
    setMajorForm({ kode: '', nama: '', deskripsi: '', color: '#2563EB' });
    setMajorTab('form');
  };

  const handleEditMajor = (jurusan) => {
    setEditingMajorId(jurusan.id);
    setMajorForm({
      kode: jurusan.kode,
      nama: jurusan.nama,
      deskripsi: jurusan.deskripsi || '',
      color: jurusan.color || '#2563EB'
    });
    setMajorTab('form');
  };

  const handleCancelEditMajor = () => {
    setEditingMajorId(null);
    setMajorForm({ kode: '', nama: '', deskripsi: '', color: '#2563EB' });
    setMajorTab('list');
  };

  const handleMajorSubmit = async (e) => {
    e.preventDefault();
    if (!majorForm.kode.trim() || !majorForm.nama.trim()) {
      setToast({ type: 'error', message: 'Kode dan nama jurusan wajib diisi.' });
      return;
    }

    const cleanKode = majorForm.kode.trim().toUpperCase();
    const cleanNama = majorForm.nama.trim();
    const majorData = { ...majorForm, kode: cleanKode, nama: cleanNama };

    if (editingMajorId) {
      const prevMajors = [...majors];
      const prevClasses = [...classes];
      const oldMajor = majors.find(m => m.id === editingMajorId);

      setMajors(prev => prev.map(m => m.id === editingMajorId ? { ...m, ...majorData } : m));
      if (oldMajor && oldMajor.kode !== cleanKode) {
        setClasses(prev => prev.map(c => c.major === oldMajor.kode ? { ...c, major: cleanKode } : c));
      }
      handleCancelEditMajor();
      setToast({ type: 'success', message: 'Jurusan berhasil diperbarui.' });

      updateMajor(editingMajorId, majorData).then(res => {
        if (res && res.success === false) {
          setMajors(prevMajors);
          setClasses(prevClasses);
          setToast({ type: 'error', message: res.error || 'Gagal menyimpan jurusan.' });
        }
      });
    } else {
      const tempId = 'jur_' + Date.now();
      const newMajorItem = { ...majorData, id: tempId };
      setMajors(prev => [...prev, newMajorItem]);
      handleCancelEditMajor();
      setToast({ type: 'success', message: 'Jurusan berhasil ditambahkan.' });

      addMajor(majorData).then(res => {
        if (res && res.success !== false) {
          const persisted = res.data || { ...newMajorItem, id: res.id || tempId };
          setMajors(prev => prev.map(m => m.id === tempId ? persisted : m));
        } else {
          setMajors(prev => prev.filter(m => m.id !== tempId));
          setToast({ type: 'error', message: res?.error || 'Gagal menambahkan jurusan.' });
        }
      });
    }
  };

  const handleDeleteMajor = async (id, kode) => {
    if (window.confirm(`Yakin ingin menghapus jurusan "${kode}"?`)) {
      const prevMajors = [...majors];
      setMajors(prev => prev.filter(m => m.id !== id));
      setToast({ type: 'success', message: 'Jurusan berhasil dihapus.' });

      deleteMajor(id).then(res => {
        if (res && res.success === false) {
          setMajors(prevMajors);
          setToast({ type: 'error', message: res.error || 'Gagal menghapus jurusan.' });
        }
      });
    }
  };

  // Filter kelas berdasarkan Tingkat & Jurusan
  const filteredClasses = classes.filter(c => {
    const matchGrade = filterGrade === 'Semua' || c.grade === filterGrade;
    const matchMajor = filterMajor === 'Semua' || c.major === filterMajor;
    return matchGrade && matchMajor;
  });

  const columns = [
    { header: 'Kelas', accessor: 'name', cellStyle: { fontWeight: 'var(--font-weight-semibold)' } },
    {
      header: 'Tingkat',
      render: (row) => <Badge variant="primary">{row.grade}</Badge>,
    },
    {
      header: 'Jurusan',
      render: (row) => {
        const majorObj = majors.find(m => m.kode === row.major);
        const color = majorObj?.color || '#2563EB';
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '2px 10px',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            background: `${color}14`,
            color: color,
            border: `1px solid ${color}30`
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
            {row.major || 'Umum'}
          </span>
        );
      }
    },
    { header: 'Wali Kelas', accessor: 'teacherName' },
    {
      header: 'Jumlah Siswa',
      render: (row) => (
        <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-primary)' }}>
          {row.totalStudents} siswa
        </span>
      ),
    },
    {
      header: 'Aksi',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="sm" onClick={() => handleOpenModal(row)}>Edit</Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(row.id)}>Hapus</Button>
        </div>
      ),
    }
  ];

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Header Halaman & Tombol Aksi */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-6)',
        flexWrap: 'wrap',
        gap: 'var(--space-4)'
      }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: '4px' }}>
            Data Kelas & Wali Kelas
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Kelola rombel belajar, wali kelas pembimbing, serta master jurusan yang ada di sekolah.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            onClick={handleOpenMajorModal}
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
          >
            Kelola Jurusan ({majors.length})
          </Button>
          <Button onClick={() => handleOpenModal()}>
            Tambah Kelas
          </Button>
        </div>
      </div>

      {/* Summary Cards Tingkat */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)',
      }}>
        {['X', 'XI', 'XII'].map(grade => {
          const gradeClasses = classes.filter(c => c.grade === grade);
          const totalStudents = gradeClasses.reduce((sum, c) => sum + (c.totalStudents || 0), 0);
          return (
            <Card key={grade} hover style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-muted)',
                fontWeight: 'var(--font-weight-medium)',
                textTransform: 'uppercase',
              }}>
                Kelas {grade}
              </div>
              <div style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-extrabold)',
                color: 'var(--color-primary)',
              }}>
                {totalStudents}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                siswa ({gradeClasses.length} kelas)
              </div>
            </Card>
          );
        })}

        {/* Card Ringkasan Total Jurusan */}
        <Card hover style={{ textAlign: 'center', background: 'rgba(59, 130, 246, 0.04)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <div style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-primary)',
            fontWeight: 'var(--font-weight-semibold)',
            textTransform: 'uppercase',
          }}>
            Program Keahlian
          </div>
          <div style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-extrabold)',
            color: 'var(--color-primary)',
          }}>
            {majors.length}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            jurusan terdaftar
          </div>
        </Card>
      </div>

      {/* Filter Bar: Tingkat & Jurusan */}
      <Card style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)' }}>
              Filter:
            </span>

            {/* Filter Tingkat */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Tingkat:</span>
              <select
                value={filterGrade}
                onChange={e => setFilterGrade(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: 'var(--font-size-xs)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)'
                }}
              >
                <option value="Semua">Semua Tingkat</option>
                <option value="X">Kelas X</option>
                <option value="XI">Kelas XI</option>
                <option value="XII">Kelas XII</option>
              </select>
            </div>

            {/* Filter Jurusan */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Jurusan:</span>
              <select
                value={filterMajor}
                onChange={e => setFilterMajor(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: 'var(--font-size-xs)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)'
                }}
              >
                <option value="Semua">Semua Jurusan</option>
                {majors.map(m => (
                  <option key={m.id || m.kode} value={m.kode}>
                    {m.kode} — {m.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            Menampilkan <b>{filteredClasses.length}</b> dari {classes.length} kelas
          </div>
        </div>
      </Card>

      {/* Tabel Data Kelas */}
      <Card padding="0">
        {loading ? (
          <LoadingSpinner message="Memuat data kelas..." />
        ) : (
          <Table columns={columns} data={filteredClasses} />
        )}
      </Card>

      {/* ============================================================
          MODAL 1: TAMBAH / EDIT KELAS
          ============================================================ */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          title={editingId ? "Edit Kelas" : "Tambah Kelas Baru"}
          onClose={handleCloseModal}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>
                Nama Kelas
              </label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={e => handleNameChange(e.target.value)} 
                required 
                placeholder="Misal: X TKJ 1, XI RPL 2"
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} 
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px', display: 'block' }}>
                Tingkat dan jurusan otomatis terdeteksi saat mengetik nama kelas
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>
                  Tingkat
                </label>
                <select 
                  value={formData.grade} 
                  onChange={e => setFormData({...formData, grade: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                >
                  <option value="X">Kelas X</option>
                  <option value="XI">Kelas XI</option>
                  <option value="XII">Kelas XII</option>
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                    Jurusan
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setIsMajorModalOpen(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                  >
                    Kelola Jurusan
                  </button>
                </div>
                <select 
                  value={formData.major} 
                  onChange={e => setFormData({...formData, major: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                >
                  {majors.map(m => (
                    <option key={m.id || m.kode} value={m.kode}>
                      {m.kode} — {m.nama}
                    </option>
                  ))}
                  {majors.length === 0 && <option value="Umum">Umum</option>}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>
                Wali Kelas
              </label>
              <select 
                value={formData.teacherId} 
                onChange={e => setFormData({...formData, teacherId: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
              >
                <option value="">-- Pilih Guru Wali Kelas --</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>
                Kapasitas / Estimasi Jumlah Siswa
              </label>
              <input 
                type="number" 
                value={formData.totalStudents} 
                onChange={e => setFormData({...formData, totalStudents: e.target.value})} 
                min="0"
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <Button type="button" variant="secondary" onClick={handleCloseModal}>Batal</Button>
              <Button type="submit" loading={isSubmitting}>
                {editingId ? 'Simpan Perubahan' : 'Tambah Kelas'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================
          MODAL 2: KELOLA PROGRAM KEAHLIAN / JURUSAN SEKOLAH
          (Desain Profesional, Rapi, Bebas Ikon Sembarangan)
          ============================================================ */}
      {/* ============================================================
          MODAL 2: KELOLA PROGRAM KEAHLIAN / JURUSAN SEKOLAH
          (Desain Profesional, Rapi, Tabbed Layout, Bebas Ikon Sembarangan)
          ============================================================ */}
      {isMajorModalOpen && (
        <Modal
          isOpen={isMajorModalOpen}
          title="Kelola Program Keahlian"
          size="lg"
          onClose={() => {
            setIsMajorModalOpen(false);
            handleCancelEditMajor();
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            
            {/* Navigasi Tab Segmented: Daftar Jurusan & Form Tambah/Edit */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: 'var(--space-3)',
              flexWrap: 'wrap',
              gap: 'var(--space-2)'
            }}>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  type="button"
                  onClick={() => {
                    setMajorTab('list');
                    if (editingMajorId) handleCancelEditMajor();
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: majorTab === 'list' ? 'var(--color-primary)' : 'var(--color-border)',
                    cursor: 'pointer',
                    fontWeight: 'var(--font-weight-semibold)',
                    fontSize: 'var(--font-size-sm)',
                    background: majorTab === 'list' ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: majorTab === 'list' ? '#ffffff' : 'var(--color-text)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  Daftar Jurusan ({majors.length})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!editingMajorId) {
                      setMajorForm({ kode: '', nama: '', deskripsi: '', color: '#2563EB' });
                    }
                    setMajorTab('form');
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: majorTab === 'form' ? 'var(--color-primary)' : 'var(--color-border)',
                    cursor: 'pointer',
                    fontWeight: 'var(--font-weight-semibold)',
                    fontSize: 'var(--font-size-sm)',
                    background: majorTab === 'form' ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: majorTab === 'form' ? '#ffffff' : 'var(--color-text)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  {editingMajorId ? `Edit Jurusan (${majorForm.kode})` : 'Tambah Jurusan Baru'}
                </button>
              </div>

              {majorTab === 'list' && (
                <Button size="sm" onClick={handleAddNewMajorClick}>
                  Tambah Jurusan
                </Button>
              )}
            </div>

            {/* TAB 1: DAFTAR JURUSAN TERDAFTAR */}
            {majorTab === 'list' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-secondary)',
                  paddingBottom: '2px',
                  flexWrap: 'wrap',
                  gap: 'var(--space-2)'
                }}>
                  <span>Total {majors.length} program keahlian terdaftar pada sistem sekolah.</span>
                  <span>Jurusan yang digunakan kelas aktif diproteksi dari penghapusan.</span>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  paddingRight: '6px',
                  boxSizing: 'border-box'
                }}>
                  {majors.map((jurusan) => {
                    const classCount = classes.filter(c => c.major === jurusan.kode).length;
                    const isEditingThis = editingMajorId === jurusan.id;

                    return (
                      <div
                        key={jurusan.id || jurusan.kode}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          background: isEditingThis ? 'rgba(37, 99, 235, 0.04)' : 'var(--color-surface)',
                          border: isEditingThis ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-lg)',
                          gap: 'var(--space-3)',
                          boxSizing: 'border-box',
                          width: '100%'
                        }}
                      >
                        {/* Info Utama Jurusan */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                          {/* Badge Kode Tag Jurusan */}
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            minWidth: '50px',
                            justifyContent: 'center',
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-md)',
                            background: `${jurusan.color || '#2563EB'}14`,
                            color: jurusan.color || '#2563EB',
                            fontWeight: 'var(--font-weight-bold)',
                            fontSize: 'var(--font-size-xs)',
                            border: `1px solid ${jurusan.color || '#2563EB'}35`,
                            flexShrink: 0
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: jurusan.color || '#2563EB' }} />
                            {jurusan.kode}
                          </span>

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              flexWrap: 'wrap'
                            }}>
                              <span style={{
                                fontWeight: 'var(--font-weight-semibold)',
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-text)'
                              }}>
                                {jurusan.nama}
                              </span>
                              <Badge variant={classCount > 0 ? 'primary' : 'default'} size="xs">
                                {classCount} kelas
                              </Badge>
                            </div>
                            <div style={{
                              fontSize: 'var(--font-size-xs)',
                              color: 'var(--color-text-muted)',
                              marginTop: '2px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {jurusan.deskripsi || 'Belum ada keterangan kompetensi.'}
                            </div>
                          </div>
                        </div>

                        {/* Tombol Aksi (Pasti berada rapi di dalam card) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => handleEditMajor(jurusan)}
                            style={{ padding: '5px 12px' }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="xs"
                            variant="danger"
                            onClick={() => handleDeleteMajor(jurusan.id, jurusan.kode)}
                            disabled={classCount > 0}
                            title={classCount > 0 ? `Tidak dapat dihapus karena digunakan oleh ${classCount} kelas aktif` : 'Hapus jurusan'}
                            style={{ padding: '5px 12px' }}
                          >
                            Hapus
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {majors.length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      padding: 'var(--space-8)',
                      background: 'var(--color-surface-hover, #F8FAFC)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px dashed var(--color-border)'
                    }}>
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', margin: '0 0 var(--space-3)' }}>
                        Belum ada program keahlian yang terdaftar.
                      </p>
                      <Button size="sm" onClick={handleAddNewMajorClick}>
                        Tambah Jurusan Pertama
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: FORM TAMBAH / EDIT JURUSAN */}
            {majorTab === 'form' && (
              <div style={{
                background: 'var(--color-surface-hover, #F8FAFC)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-5)'
              }}>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <h4 style={{
                    fontSize: 'var(--font-size-base)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: 'var(--color-text)',
                    margin: 0
                  }}>
                    {editingMajorId ? `Edit Data Program Keahlian: ${majorForm.kode}` : 'Tambah Program Keahlian Baru'}
                  </h4>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
                    Tentukan singkatan kode resmi, nama lengkap program keahlian, dan warna penanda identitas rombel.
                  </p>
                </div>

                <form onSubmit={handleMajorSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-4)' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '6px' }}>
                        Kode Jurusan
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: DKV"
                        value={majorForm.kode}
                        onChange={e => setMajorForm({ ...majorForm, kode: e.target.value.toUpperCase() })}
                        required
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border)',
                          textTransform: 'uppercase',
                          fontWeight: 'var(--font-weight-bold)',
                          fontSize: 'var(--font-size-sm)',
                          background: 'var(--color-surface)'
                        }}
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                        Singkatan 2 - 6 huruf kapital (misal: TKJ, RPL, AKL)
                      </span>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '6px' }}>
                        Nama Program Keahlian
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Desain Komunikasi Visual"
                        value={majorForm.nama}
                        onChange={e => setMajorForm({ ...majorForm, nama: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border)',
                          fontSize: 'var(--font-size-sm)',
                          background: 'var(--color-surface)'
                        }}
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                        Nama lengkap bidang atau kompetensi keahlian
                      </span>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '6px' }}>
                      Deskripsi / Keterangan Kompetensi (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Fokus pada desain grafis, multimedia, ilustrasi digital, dan fotografi"
                      value={majorForm.deskripsi}
                      onChange={e => setMajorForm({ ...majorForm, deskripsi: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        fontSize: 'var(--font-size-sm)',
                        background: 'var(--color-surface)'
                      }}
                    />
                  </div>

                  {/* Pemilih Warna Tag Preset & Pratinjau */}
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '8px' }}>
                      Warna Penanda Identitas Tag
                    </label>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 'var(--space-3)',
                      padding: '12px 14px',
                      background: 'var(--color-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {PRESET_COLORS.map(c => {
                          const isSelected = majorForm.color === c.value;
                          return (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setMajorForm({ ...majorForm, color: c.value })}
                              title={c.label}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: c.value,
                                border: isSelected ? '2px solid var(--color-surface)' : '2px solid transparent',
                                outline: isSelected ? `2px solid ${c.value}` : 'none',
                                cursor: 'pointer',
                                padding: 0,
                                transition: 'transform 100ms ease',
                                transform: isSelected ? 'scale(1.15)' : 'scale(1)'
                              }}
                            />
                          );
                        })}
                      </div>

                      {/* Live Tag Preview Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                          Pratinjau:
                        </span>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 12px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 'var(--font-weight-semibold)',
                          background: `${majorForm.color}14`,
                          color: majorForm.color,
                          border: `1px solid ${majorForm.color}35`
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: majorForm.color }} />
                          {majorForm.kode || 'KODE'} — {majorForm.nama || 'Pratinjau Tag'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                    <Button type="button" variant="secondary" onClick={handleCancelEditMajor}>
                      Batal
                    </Button>
                    <Button type="submit" loading={majorSubmitting}>
                      {editingMajorId ? 'Simpan Perubahan' : 'Tambah Jurusan'}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Footer Modal: Tombol Tutup */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsMajorModalOpen(false);
                  handleCancelEditMajor();
                }}
              >
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
