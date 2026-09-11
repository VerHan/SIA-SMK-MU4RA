/* ============================================================
   WaliKelasPage — Data Kelas, Wali Kelas & Manajemen Jurusan Sekolah
   
   Fitur:
   - CRUD Kelas & Wali Kelas
   - Kelola Jurusan Sekolah (Tambah, Edit, Hapus Program Keahlian / Jurusan)
   - Dropdown Jurusan Dinamis berdasarkan Jurusan yang didaftarkan Sekolah
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
  const [editingMajorId, setEditingMajorId] = useState(null);
  const [majorSubmitting, setMajorSubmitting] = useState(false);
  const [majorForm, setMajorForm] = useState({
    kode: '',
    nama: '',
    deskripsi: '',
    color: '#3B82F6'
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
    
    // Set default major in formData jika belum ada
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

    // Cari kecocokan dengan daftar jurusan yang ada di sekolah
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
    setIsSubmitting(true);
    
    const teacher = teachers.find(t => t.id === formData.teacherId);
    const dataToSave = {
      ...formData,
      teacherName: teacher ? teacher.name : '-',
      totalStudents: parseInt(formData.totalStudents) || 0
    };

    let res;
    if (editingId) {
      res = await updateClass(editingId, dataToSave);
    } else {
      res = await addClass(dataToSave);
    }

    if (res.success !== false) {
      setToast({ type: 'success', message: res.message || 'Data kelas berhasil disimpan!' });
      handleCloseModal();
      loadData();
    } else {
      setToast({ type: 'error', message: res.error || 'Terjadi kesalahan.' });
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus kelas ini?')) {
      const res = await deleteClass(id);
      if (res.success !== false) {
        setToast({ type: 'success', message: res.message || 'Kelas berhasil dihapus.' });
        loadData();
      } else {
        setToast({ type: 'error', message: res.error || 'Gagal menghapus kelas.' });
      }
    }
  };

  // ==========================================
  // HANDLERS: MANAJEMEN JURUSAN
  // ==========================================
  const handleOpenMajorModal = () => {
    setEditingMajorId(null);
    setMajorForm({ kode: '', nama: '', deskripsi: '', color: '#3B82F6' });
    setIsMajorModalOpen(true);
  };

  const handleEditMajor = (jurusan) => {
    setEditingMajorId(jurusan.id);
    setMajorForm({
      kode: jurusan.kode,
      nama: jurusan.nama,
      deskripsi: jurusan.deskripsi || '',
      color: jurusan.color || '#3B82F6'
    });
  };

  const handleCancelEditMajor = () => {
    setEditingMajorId(null);
    setMajorForm({ kode: '', nama: '', deskripsi: '', color: '#3B82F6' });
  };

  const handleMajorSubmit = async (e) => {
    e.preventDefault();
    if (!majorForm.kode.trim() || !majorForm.nama.trim()) {
      setToast({ type: 'error', message: 'Kode dan Nama jurusan wajib diisi.' });
      return;
    }

    setMajorSubmitting(true);
    let res;
    if (editingMajorId) {
      res = await updateMajor(editingMajorId, majorForm);
    } else {
      res = await addMajor(majorForm);
    }

    setMajorSubmitting(false);
    if (res.success !== false) {
      setToast({ type: 'success', message: res.message || 'Jurusan berhasil disimpan!' });
      handleCancelEditMajor();
      // Refresh data
      const [newMajors, newClasses] = await Promise.all([getMajors(), getClasses()]);
      setMajors(newMajors);
      setClasses(newClasses);
    } else {
      setToast({ type: 'error', message: res.error || 'Gagal menyimpan jurusan.' });
    }
  };

  const handleDeleteMajor = async (id, kode) => {
    if (window.confirm(`Yakin ingin menghapus jurusan "${kode}"?`)) {
      const res = await deleteMajor(id);
      if (res.success !== false) {
        setToast({ type: 'success', message: res.message || 'Jurusan berhasil dihapus.' });
        const [newMajors, newClasses] = await Promise.all([getMajors(), getClasses()]);
        setMajors(newMajors);
        setClasses(newClasses);
      } else {
        setToast({ type: 'error', message: res.error || 'Gagal menghapus jurusan.' });
      }
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
        const color = majorObj?.color || '#3B82F6';
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '2px 10px',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-bold)',
            background: `${color}18`,
            color: color,
            border: `1px solid ${color}35`
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
            👥 Data Kelas & Wali Kelas
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Kelola rombel belajar, wali kelas pembimbing, serta master jurusan yang ada di sekolah.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            onClick={handleOpenMajorModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)'
            }}
          >
            ⚙️ Kelola Jurusan ({majors.length})
          </Button>
          <Button onClick={() => handleOpenModal()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            ➕ Tambah Kelas
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
              🔍 Filter:
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
        <Modal isOpen={isModalOpen} title={editingId ? "Edit Kelas" : "Tambah Kelas Baru"} onClose={handleCloseModal}>
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
                💡 Tingkat & Jurusan otomatis terdeteksi saat mengetik nama kelas
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>
                  Tingkat (Angkatan)
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
                    Jurusan Sekolah
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
                    + Kelola Jurusan
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
                  {majors.length === 0 && <option value="Umum">Umum / Standar</option>}
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
          MODAL 2: KELOLA JURUSAN / PROGRAM KEAHLIAN SEKOLAH
          ============================================================ */}
      {isMajorModalOpen && (
        <Modal
          isOpen={isMajorModalOpen}
          title="⚙️ Kelola Program Keahlian / Jurusan Sekolah"
          onClose={() => setIsMajorModalOpen(false)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            
            {/* Form Tambah / Edit Jurusan */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)'
            }}>
              <h3 style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-bold)',
                marginBottom: 'var(--space-3)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>{editingMajorId ? '✏️ Edit Jurusan' : '➕ Tambah Jurusan Baru ke Sekolah'}</span>
                {editingMajorId && (
                  <button
                    type="button"
                    onClick={handleCancelEditMajor}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-text-muted)',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    Batal Edit
                  </button>
                )}
              </h3>

              <form onSubmit={handleMajorSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px', gap: 'var(--space-3)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '2px' }}>
                      Kode Jurusan
                    </label>
                    <input
                      type="text"
                      placeholder="Misal: DKV"
                      value={majorForm.kode}
                      onChange={e => setMajorForm({ ...majorForm, kode: e.target.value.toUpperCase() })}
                      required
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        textTransform: 'uppercase',
                        fontWeight: 'var(--font-weight-bold)',
                        fontSize: 'var(--font-size-sm)'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '2px' }}>
                      Nama Lengkap Jurusan
                    </label>
                    <input
                      type="text"
                      placeholder="Misal: Desain Komunikasi Visual"
                      value={majorForm.nama}
                      onChange={e => setMajorForm({ ...majorForm, nama: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        fontSize: 'var(--font-size-sm)'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '2px' }}>
                      Warna
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="color"
                        value={majorForm.color}
                        onChange={e => setMajorForm({ ...majorForm, color: e.target.value })}
                        style={{
                          width: '38px',
                          height: '36px',
                          padding: '2px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border)',
                          cursor: 'pointer'
                        }}
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Tag</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '2px' }}>
                    Deskripsi / Kompetensi Keahlian (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Fokus keahlian desain grafis, animasi, dan multimedia"
                    value={majorForm.deskripsi}
                    onChange={e => setMajorForm({ ...majorForm, deskripsi: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--font-size-sm)'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: '4px' }}>
                  {editingMajorId && (
                    <Button type="button" variant="secondary" size="sm" onClick={handleCancelEditMajor}>
                      Batal
                    </Button>
                  )}
                  <Button type="submit" size="sm" loading={majorSubmitting}>
                    {editingMajorId ? 'Simpan Perubahan Jurusan' : '+ Tambah Jurusan'}
                  </Button>
                </div>
              </form>
            </div>

            {/* Daftar Jurusan yang Tersedia di Sekolah */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-2)'
              }}>
                <h4 style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-bold)',
                  margin: 0
                }}>
                  Daftar Jurusan di Sekolah ({majors.length})
                </h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Jurusan yang digunakan oleh kelas tidak dapat dihapus sembarangan
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: '320px', overflowY: 'auto' }}>
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
                        padding: '10px 14px',
                        background: isEditingThis ? 'rgba(59, 130, 246, 0.08)' : 'var(--color-surface)',
                        border: isEditingThis ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        gap: 'var(--space-3)'
                      }}
                    >
                      {/* Info Jurusan */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1 }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '48px',
                          height: '32px',
                          borderRadius: 'var(--radius-md)',
                          background: `${jurusan.color || '#3B82F6'}20`,
                          color: jurusan.color || '#3B82F6',
                          fontWeight: 'var(--font-weight-extrabold)',
                          fontSize: 'var(--font-size-xs)',
                          border: `1px solid ${jurusan.color || '#3B82F6'}40`,
                          flexShrink: 0
                        }}>
                          {jurusan.kode}
                        </span>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
                            {jurusan.nama}
                          </div>
                          {jurusan.deskripsi && (
                            <div style={{
                              fontSize: '0.75rem',
                              color: 'var(--color-text-muted)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {jurusan.deskripsi}
                            </div>
                          )}
                        </div>

                        {/* Jumlah Kelas Terdaftar */}
                        <Badge variant={classCount > 0 ? 'primary' : 'default'} size="xs">
                          {classCount} kelas
                        </Badge>
                      </div>

                      {/* Tombol Aksi */}
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => handleEditMajor(jurusan)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="xs"
                          variant="danger"
                          onClick={() => handleDeleteMajor(jurusan.id, jurusan.kode)}
                          disabled={classCount > 0}
                          title={classCount > 0 ? 'Tidak bisa dihapus karena masih ada kelas yang menggunakan jurusan ini' : 'Hapus jurusan'}
                        >
                          Hapus
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {majors.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', padding: 'var(--space-4)' }}>
                    Belum ada jurusan yang didaftarkan.
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
              <Button variant="secondary" onClick={() => setIsMajorModalOpen(false)}>
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
