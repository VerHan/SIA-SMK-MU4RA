/* ============================================================
   DataSiswaPage — Master Data Siswa & Relasi Kehadiran Dasar
   
   Fitur inti (ramping & terstruktur):
   - Master Siswa dengan Status (Aktif / Lulus / Pindah / Nonaktif)
   - Tambah, Edit, Arsip/Hapus Aman (melindungi riwayat absensi)
   - Detail Riwayat Kehadiran Siswa (Absen Piket & Absen Mapel)
   - Export & Import Excel
   ============================================================ */

import { useState, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getStudents,
  addStudent,
  updateStudent,
  deleteStudent,
  getClasses,
  importStudents,
  getStudentAttendanceDetail,
} from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Toast from '../../components/ui/Toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const STUDENT_STATUS_META = {
  aktif: { label: 'Aktif', variant: 'success' },
  lulus: { label: 'Lulus', variant: 'info' },
  pindah: { label: 'Pindah', variant: 'warning' },
  nonaktif: { label: 'Nonaktif', variant: 'danger' },
};

const ATTENDANCE_BADGE = {
  hadir: { label: 'Hadir', variant: 'success' },
  izin: { label: 'Izin', variant: 'info' },
  sakit: { label: 'Sakit', variant: 'warning' },
  alpha: { label: 'Alpha', variant: 'danger' },
};

const EMPTY_FORM = {
  class: '',
  name: '',
  nomor: '',
  gender: 'L',
  status: 'aktif',
  phone: '',
  phone_parent: '',
  pekerjaan_ortu: '',
  alamat: '',
  sekolah_asal: '',
};

export default function DataSiswaPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('Semua');
  const [selectedClass, setSelectedClass] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('aktif');

  /* Modal form (Tambah / Edit) */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  /* Modal konfirmasi hapus/arsip */
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  /* Modal Detail Riwayat Absensi (Piket + Mapel) */
  const [detailStudent, setDetailStudent] = useState(null);
  const [detailMonth, setDetailMonth] = useState('');
  const [detailTab, setDetailTab] = useState('piket');

  const fileInputRef = useRef(null);

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['students', 'all'],
    queryFn: () => getStudents(null, { includeInactive: true }),
  });

  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['classes'],
    queryFn: getClasses,
  });

  const { data: attendanceDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['student-attendance-detail', detailStudent?.id, detailMonth],
    queryFn: () => getStudentAttendanceDetail(detailStudent.id, detailMonth || 'all'),
    enabled: Boolean(detailStudent?.id),
  });

  const invalidateStudents = () => {
    queryClient.invalidateQueries({ queryKey: ['students'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  };

  const openAddModal = () => {
    setEditingStudent(null);
    setFormData({
      ...EMPTY_FORM,
      class: classes[0]?.name || 'X TKJ 1',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      class: student.class && student.class !== '-' ? student.class : (classes[0]?.name || ''),
      name: student.name || '',
      nomor: student.nomor && student.nomor !== '-' ? student.nomor : '',
      gender: student.gender || 'L',
      status: student.status || 'aktif',
      phone: student.phone && student.phone !== '-' ? student.phone : '',
      phone_parent: student.phone_parent && student.phone_parent !== '-' ? student.phone_parent : '',
      pekerjaan_ortu: student.pekerjaan_ortu && student.pekerjaan_ortu !== '-' ? student.pekerjaan_ortu : '',
      alamat: student.alamat && student.alamat !== '-' ? student.alamat : '',
      sekolah_asal: student.sekolah_asal && student.sekolah_asal !== '-' ? student.sekolah_asal : '',
    });
    setIsModalOpen(true);
  };

  const openDetailModal = (student) => {
    setDetailStudent(student);
    setDetailMonth('');
    setDetailTab('piket');
  };

  const handleSaveSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.name.trim()) {
      setToast({ type: 'error', message: 'Nama Siswa wajib diisi.' });
      return;
    }

    setSubmitting(true);
    const res = editingStudent
      ? await updateStudent(editingStudent.id, formData)
      : await addStudent(formData);
    setSubmitting(false);

    if (res?.success) {
      setIsModalOpen(false);
      setEditingStudent(null);
      setToast({
        type: 'success',
        message: res.message || (editingStudent ? 'Data siswa berhasil diperbarui.' : 'Siswa berhasil ditambahkan.'),
      });
      invalidateStudents();
    } else {
      setToast({ type: 'error', message: res?.error || 'Gagal menyimpan data siswa.' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteStudent(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);

    if (res?.success) {
      setToast({
        type: res.archived ? 'info' : 'success',
        message: res.message || 'Data siswa berhasil diperbarui.',
      });
      invalidateStudents();
    } else {
      setToast({ type: 'error', message: res?.error || 'Gagal menghapus siswa.' });
    }
  };

  /* === Export & Import Excel (lazy-loaded on demand) === */
  const handleExport = async () => {
    let exportData = filteredStudents.map(s => ({
      'NIS / Nomor': s.nomor !== '-' ? s.nomor : '',
      'Kelas': s.class || '',
      'Nama Lengkap': s.name || '',
      'Status': STUDENT_STATUS_META[s.status || 'aktif']?.label || 'Aktif',
      'Nomer HP': s.phone !== '-' ? s.phone : '',
      'Nomer HP Ortu': s.phone_parent !== '-' ? s.phone_parent : '',
      'Pekerjaan Ortu': s.pekerjaan_ortu !== '-' ? s.pekerjaan_ortu : '',
      'Alamat': s.alamat !== '-' ? s.alamat : '',
      'Asal Sekolah': s.sekolah_asal !== '-' ? s.sekolah_asal : '',
    }));

    if (exportData.length === 0) {
      exportData = [{
        'NIS / Nomor': '2024001',
        'Kelas': 'X TKJ 1',
        'Nama Lengkap': 'Muhammad Rizki',
        'Status': 'Aktif',
        'Nomer HP': '081234567890',
        'Nomer HP Ortu': '089876543210',
        'Pekerjaan Ortu': 'Wiraswasta',
        'Alamat': 'Jl. Pemuda No. 10 Bangsri',
        'Asal Sekolah': 'SMPN 1 Bangsri',
      }];
    }

    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
    XLSX.writeFile(wb, 'Data_Siswa.xlsx');
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import('xlsx');
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const mappedData = data.map(row => ({
          class: row['Kelas'] || row['class'],
          name: row['Nama Lengkap'] || row['Nama'] || row['name'],
          phone: (row['Nomer HP'] || row['No HP'] || row['No WA Sendiri'] || row['phone'])?.toString(),
          phone_parent: (row['Nomer HP Ortu'] || row['No WA Ortu'] || row['HP Ortu'] || row['phone_parent'])?.toString(),
          pekerjaan_ortu: row['Pekerjaan Ortu'] || row['pekerjaan_ortu'] || '',
          alamat: row['Alamat'] || row['alamat'] || '',
          sekolah_asal: row['Asal Sekolah'] || row['Sekolah Asal'] || row['sekolah_asal'] || '',
          nomor: (row['Nomor'] || row['NIS'] || row['NISN'] || row['NIS / Nomor'])?.toString() || null,
          gender: row['L/P'] || row['Gender'] || 'L',
        }));

        setSubmitting(true);
        const res = await importStudents(mappedData);
        setSubmitting(false);

        if (res.success) {
          setToast({ type: 'success', message: res.message });
          invalidateStudents();
        } else {
          setToast({ type: 'error', message: res.error });
        }
      } catch {
        setToast({ type: 'error', message: 'Gagal memproses file Excel.' });
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  /* Filter list */
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter(s => {
      const sClass = s.class || '';
      const sGrade = sClass ? sClass.split(' ')[0] : '';
      const sStatus = s.status || 'aktif';
      const matchStatus = selectedStatus === 'all' || sStatus === selectedStatus;
      const matchGrade = selectedGrade === 'Semua' || sGrade === selectedGrade;
      const matchClass = selectedClass === 'Semua' || sClass === selectedClass;
      const matchSearch =
        !q ||
        (s.name || '').toLowerCase().includes(q) ||
        (s.nomor && String(s.nomor).toLowerCase().includes(q));
      return matchStatus && matchGrade && matchClass && matchSearch;
    });
  }, [students, selectedStatus, selectedGrade, selectedClass, searchQuery]);

  const statusCounts = useMemo(() => ({
    aktif: students.filter(s => (s.status || 'aktif') === 'aktif').length,
    nonaktif: students.filter(s => (s.status || 'aktif') !== 'aktif').length,
  }), [students]);

  const availableClasses = classes.filter(c => {
    if (selectedGrade === 'Semua') return true;
    return (c.name || '').split(' ')[0] === selectedGrade;
  });

  const columns = [
    { key: 'no', label: 'No', width: '44px', render: (_, __, i) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span> },
    { key: 'class', label: 'Kelas', width: '100px', render: (val) => <Badge variant="primary">{val || '-'}</Badge> },
    {
      key: 'name',
      label: 'Siswa',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>{val}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            NIS: {row.nomor || '-'} · {row.gender === 'P' ? 'Perempuan' : 'Laki-laki'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '96px',
      render: (val) => {
        const meta = STUDENT_STATUS_META[val || 'aktif'] || STUDENT_STATUS_META.aktif;
        return <Badge variant={meta.variant}>{meta.label}</Badge>;
      },
    },
    { key: 'phone', label: 'HP Siswa / Ortu', width: '150px', render: (val, row) => (
      <div style={{ fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}>
        <div>{val || '-'}</div>
        <div style={{ color: 'var(--color-text-muted)' }}>Ortu: {row.phone_parent || '-'}</div>
      </div>
    )},
    { key: 'sekolah_asal', label: 'Asal Sekolah', width: '140px', render: (val) => <span style={{ fontSize: '12px' }}>{val || '-'}</span> },
    {
      key: 'actions',
      label: 'Aksi',
      width: '215px',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <Button size="sm" variant="outline" onClick={() => openDetailModal(row)}>
            Absen
          </Button>
          <Button size="sm" variant="ghost" onClick={() => openEditModal(row)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDeleteTarget(row)}
            style={{ color: 'var(--color-danger)' }}
          >
            Hapus
          </Button>
        </div>
      ),
    },
  ];

  const loading = loadingStudents || loadingClasses;

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: 'var(--space-1)' }}>
            Data Siswa
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', fontVariantNumeric: 'tabular-nums' }}>
            {statusCounts.aktif} siswa aktif · {statusCounts.nonaktif} arsip (lulus/pindah/nonaktif) · Terhubung ke Absen Piket &amp; Mapel
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleImportExcel}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} size="sm">
            Import Excel
          </Button>
          <Button variant="outline" onClick={handleExport} size="sm">
            Export Excel
          </Button>
          <Button onClick={openAddModal} size="sm">
            + Tambah Siswa
          </Button>
        </div>
      </div>

      {/* Tabs Angkatan */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', borderBottom: '2px solid var(--color-border-light)' }}>
        {['Semua', 'X', 'XI', 'XII'].map(grade => (
          <button
            key={grade}
            onClick={() => {
              setSelectedGrade(grade);
              setSelectedClass('Semua');
            }}
            style={{
              padding: 'var(--space-3) var(--space-5)',
              background: 'transparent',
              border: 'none',
              borderBottom: selectedGrade === grade ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: selectedGrade === grade ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontWeight: selectedGrade === grade ? 'var(--font-weight-bold)' : 'var(--font-weight-medium)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              marginBottom: '-2px',
            }}
          >
            {grade === 'Semua' ? 'Semua Angkatan' : `Kelas ${grade}`}
          </button>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <Card style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 'var(--space-4)', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
              Cari Nama / NIS
            </label>
            <input
              type="text"
              placeholder="Ketik nama atau NIS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: 'var(--font-size-sm)',
                background: 'var(--color-surface)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
              Filter Kelas
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: 'var(--font-size-sm)',
                background: 'var(--color-surface)',
              }}
            >
              <option value="Semua">Semua Kelas ({filteredStudents.length} Siswa)</option>
              {availableClasses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
              Status Siswa
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: 'var(--font-size-sm)',
                background: 'var(--color-surface)',
              }}
            >
              <option value="aktif">Aktif Saja</option>
              <option value="all">Semua Status</option>
              <option value="lulus">Lulus</option>
              <option value="pindah">Pindah</option>
              <option value="nonaktif">Nonaktif / Arsip</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Student Table */}
      <Card padding="0">
        {loading || submitting ? (
          <LoadingSpinner message={submitting ? 'Memproses data...' : 'Memuat data siswa...'} />
        ) : (
          <Table columns={columns} data={filteredStudents} emptyMessage="Tidak ada data siswa ditemukan." />
        )}
      </Card>

      {/* Modal Tambah / Edit Siswa */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStudent ? `Edit Data Siswa — ${editingStudent.name}` : 'Tambah Data Siswa Baru'}
      >
        <form onSubmit={handleSaveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
                Kelas <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <select
                value={formData.class}
                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)',
                  background: 'var(--color-surface)',
                }}
                required
              >
                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
                Status Siswa
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)',
                  background: 'var(--color-surface)',
                }}
              >
                <option value="aktif">Aktif</option>
                <option value="lulus">Lulus</option>
                <option value="pindah">Pindah</option>
                <option value="nonaktif">Nonaktif</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-3)' }}>
            <Input
              label="Nama Lengkap"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Masukkan nama lengkap siswa"
              required
            />
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
                Jenis Kelamin
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)',
                  background: 'var(--color-surface)',
                }}
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
          </div>

          <Input
            label="NIS / Nomor Induk"
            value={formData.nomor}
            onChange={(e) => setFormData({ ...formData, nomor: e.target.value })}
            placeholder="Opsional (unik per siswa)"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Input
              label="Nomer HP Siswa"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="08123456789"
            />
            <Input
              label="Nomer HP Ortu"
              value={formData.phone_parent}
              onChange={(e) => setFormData({ ...formData, phone_parent: e.target.value })}
              placeholder="08987654321"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Input
              label="Pekerjaan Ortu"
              value={formData.pekerjaan_ortu}
              onChange={(e) => setFormData({ ...formData, pekerjaan_ortu: e.target.value })}
              placeholder="Wiraswasta, PNS, Petani..."
            />
            <Input
              label="Asal Sekolah"
              value={formData.sekolah_asal}
              onChange={(e) => setFormData({ ...formData, sekolah_asal: e.target.value })}
              placeholder="SMPN 1 Bangsri"
            />
          </div>

          <Input
            label="Alamat"
            value={formData.alamat}
            onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
            placeholder="Ds. Bangsri RT 02/RW 03, Jepara"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" loading={submitting}>
              {editingStudent ? 'Simpan Perubahan' : 'Simpan Siswa'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Konfirmasi Hapus / Arsip Aman */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Konfirmasi Hapus Siswa"
      >
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-5)' }}>
          Anda akan menghapus <strong>{deleteTarget?.name}</strong> ({deleteTarget?.class}).
          Jika siswa sudah memiliki riwayat absensi piket atau mapel, sistem akan otomatis mengubah statusnya menjadi <strong>Nonaktif</strong> agar riwayat kehadiran tidak hilang.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Batal</Button>
          <Button variant="danger" loading={deleting} onClick={handleConfirmDelete}>
            Lanjutkan
          </Button>
        </div>
      </Modal>

      {/* Modal Relasi Detail Kehadiran Siswa (Absen Piket & Absen Mapel) */}
      <Modal
        isOpen={Boolean(detailStudent)}
        onClose={() => setDetailStudent(null)}
        title={`Riwayat Absensi — ${detailStudent?.name || ''}`}
      >
        {detailStudent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Header Info & Filter Bulan */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)', paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <Badge variant="primary">{detailStudent.class || '-'}</Badge>
                  <Badge variant={(STUDENT_STATUS_META[detailStudent.status || 'aktif'] || STUDENT_STATUS_META.aktif).variant}>
                    {(STUDENT_STATUS_META[detailStudent.status || 'aktif'] || STUDENT_STATUS_META.aktif).label}
                  </Badge>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    NIS: {detailStudent.nomor || '-'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="month"
                  value={detailMonth}
                  onChange={(e) => setDetailMonth(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--font-size-xs)',
                    background: 'var(--color-surface)',
                  }}
                />
                {detailMonth && (
                  <Button size="sm" variant="ghost" onClick={() => setDetailMonth('')}>
                    Semua
                  </Button>
                )}
              </div>
            </div>

            {loadingDetail ? (
              <LoadingSpinner message="Memuat riwayat absensi siswa..." />
            ) : (
              <>
                {/* Ringkasan Piket vs Mapel */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Absensi Piket ({attendanceDetail?.summary?.piket?.totalHari || 0} hari)
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ color: '#059669', fontWeight: 700 }}>H: {attendanceDetail?.summary?.piket?.hadir || 0}</span>
                      <span style={{ color: '#0284C7', fontWeight: 600 }}>I: {attendanceDetail?.summary?.piket?.izin || 0}</span>
                      <span style={{ color: '#D97706', fontWeight: 600 }}>S: {attendanceDetail?.summary?.piket?.sakit || 0}</span>
                      <span style={{ color: '#DC2626', fontWeight: 700 }}>A: {attendanceDetail?.summary?.piket?.alpha || 0}</span>
                      {(attendanceDetail?.summary?.piket?.bolos || 0) > 0 && (
                        <span style={{ color: '#B91C1C', fontWeight: 700 }}>Bolos: {attendanceDetail.summary.piket.bolos}</span>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Absensi Mapel ({attendanceDetail?.summary?.mapel?.persentase || 0}% hadir)
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ color: '#059669', fontWeight: 700 }}>H: {attendanceDetail?.summary?.mapel?.hadir || 0}</span>
                      <span style={{ color: '#0284C7', fontWeight: 600 }}>I: {attendanceDetail?.summary?.mapel?.izin || 0}</span>
                      <span style={{ color: '#D97706', fontWeight: 600 }}>S: {attendanceDetail?.summary?.mapel?.sakit || 0}</span>
                      <span style={{ color: '#DC2626', fontWeight: 700 }}>A: {attendanceDetail?.summary?.mapel?.alpha || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Switch Tab Piket / Mapel */}
                <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)' }}>
                  {[
                    { id: 'piket', label: `Absen Piket (${attendanceDetail?.piketRecords?.length || 0})` },
                    { id: 'mapel', label: `Absen Mapel (${attendanceDetail?.mapelRecords?.length || 0})` },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setDetailTab(tab.id)}
                      style={{
                        padding: '8px 14px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: detailTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                        color: detailTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        fontWeight: detailTab === tab.id ? 700 : 500,
                        fontSize: 'var(--font-size-sm)',
                        cursor: 'pointer',
                        marginBottom: '-1px',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tabel Riwayat */}
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {detailTab === 'piket' ? (
                    (attendanceDetail?.piketRecords?.length || 0) === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                        Belum ada catatan absensi piket pada periode ini.
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                            <th style={{ padding: '8px 6px' }}>Tanggal</th>
                            <th style={{ padding: '8px 6px' }}>Pagi</th>
                            <th style={{ padding: '8px 6px' }}>Sore</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceDetail.piketRecords.map(rec => {
                            const pagi = ATTENDANCE_BADGE[rec.statusPagi];
                            const sore = ATTENDANCE_BADGE[rec.statusSore];
                            return (
                              <tr key={rec.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                                <td style={{ padding: '8px 6px', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{rec.date}</td>
                                <td style={{ padding: '8px 6px' }}>
                                  {pagi ? <Badge variant={pagi.variant}>{pagi.label}</Badge> : '—'}
                                </td>
                                <td style={{ padding: '8px 6px' }}>
                                  {sore ? <Badge variant={sore.variant}>{sore.label}</Badge> : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )
                  ) : (
                    (attendanceDetail?.mapelRecords?.length || 0) === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                        Belum ada catatan absensi mata pelajaran pada periode ini.
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                            <th style={{ padding: '8px 6px' }}>Tanggal / Jam</th>
                            <th style={{ padding: '8px 6px' }}>Mata Pelajaran</th>
                            <th style={{ padding: '8px 6px' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceDetail.mapelRecords.map(rec => {
                            const badge = ATTENDANCE_BADGE[rec.status];
                            return (
                              <tr key={rec.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                                <td style={{ padding: '8px 6px', fontVariantNumeric: 'tabular-nums' }}>
                                  <div style={{ fontWeight: 600 }}>{rec.date}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Jam ke-{rec.jamKe}</div>
                                </td>
                                <td style={{ padding: '8px 6px' }}>
                                  <div style={{ fontWeight: 600 }}>{rec.subject}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{rec.teacherName}</div>
                                </td>
                                <td style={{ padding: '8px 6px' }}>
                                  {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : rec.status}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
