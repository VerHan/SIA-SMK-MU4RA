/* WaliKelasPage — Data kelas dan wali kelas */

import { useState, useEffect } from 'react';
import { getClasses, addClass, updateClass, deleteClass, getTeachers } from '../../services/api';
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
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    grade: 'X',
    teacherId: '',
    totalStudents: 0
  });

  const loadData = async () => {
    setLoading(true);
    const [kelasData, guruData] = await Promise.all([getClasses(), getTeachers()]);
    setClasses(kelasData);
    setTeachers(guruData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (classData = null) => {
    if (classData) {
      setEditingId(classData.id);
      setFormData({
        name: classData.name,
        grade: classData.grade,
        teacherId: classData.teacherId || '',
        totalStudents: classData.totalStudents || 0
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', grade: 'X', teacherId: '', totalStudents: 0 });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Find teacher name for saving
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

    if (res.success) {
      setToast({ type: 'success', message: res.message });
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
      if (res.success) {
        setToast({ type: 'success', message: res.message });
        loadData();
      } else {
        setToast({ type: 'error', message: res.error });
      }
    }
  };

  const columns = [
    { header: 'Kelas', accessor: 'name', cellStyle: { fontWeight: 'var(--font-weight-semibold)' } },
    {
      header: 'Tingkat',
      render: (row) => <Badge variant="primary">{row.grade}</Badge>,
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
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)' }}>
          👥 Data Kelas & Wali Kelas
        </h1>
        <Button onClick={() => handleOpenModal()}>+ Tambah Kelas</Button>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)',
      }}>
        {['X', 'XI', 'XII'].map(grade => {
          const gradeClasses = classes.filter(c => c.grade === grade);
          const totalStudents = gradeClasses.reduce((sum, c) => sum + c.totalStudents, 0);
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
      </div>

      <Card padding="0">
        {loading ? (
          <LoadingSpinner message="Memuat data kelas..." />
        ) : (
          <Table columns={columns} data={classes} />
        )}
      </Card>

      {isModalOpen && (
        <Modal isOpen={isModalOpen} title={editingId ? "Edit Kelas" : "Tambah Kelas Baru"} onClose={handleCloseModal}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>Nama Kelas</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                required 
                placeholder="Misal: X TKJ 1"
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} 
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>Tingkat (Angkatan)</label>
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
              <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>Wali Kelas</label>
              <select 
                value={formData.teacherId} 
                onChange={e => setFormData({...formData, teacherId: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
              >
                <option value="">-- Pilih Guru --</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>Kapasitas / Jumlah Siswa</label>
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
    </div>
  );
}
