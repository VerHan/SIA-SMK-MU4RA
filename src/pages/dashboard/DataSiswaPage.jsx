/* ============================================================
   DataSiswaPage — Master Data Siswa & Management Rombel/Kelas
   
   Fitur:
   - Tambah Data Siswa Baru (Form Modal)
   - Filter berdasarkan Kelas/Rombel & Pencarian (Nama/NIS)
   - Edit & Hapus Siswa
   - Export & Import Excel (Bulk Add)
   ============================================================ */

import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { getStudents, addStudent, deleteStudent, getClasses, importStudents } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Toast from '../../components/ui/Toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function DataSiswaPage() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('Semua');
  const [selectedClass, setSelectedClass] = useState('Semua');

  /* Modal state */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  
  /* Input file ref for Import Excel */
  const fileInputRef = useRef(null);

  /* Form state */
  const [formData, setFormData] = useState({
    class: 'X TKJ 1',
    name: '',
    phone: '',
    phone_parent: '',
    pekerjaan_ortu: '',
    alamat: '',
    sekolah_asal: '',
    nomor: '',
    gender: 'L',
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([getStudents(), getClasses()]).then(([studentsData, classesData]) => {
      setStudents(studentsData);
      setClasses(classesData);
      if (classesData.length > 0 && !formData.class) {
        setFormData(prev => ({ ...prev, class: classesData[0].name }));
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.name.trim()) {
      setToast({ type: 'error', message: 'Nama Siswa wajib diisi.' });
      return;
    }

    const tempId = 'temp_' + Date.now();
    const newStudentData = {
      ...formData,
      id: tempId,
      nomor: formData.nomor || '-',
      nis: formData.nomor || '-'
    };

    // Optimistic UI: langsung tambahkan ke list dan tutup modal seketika
    setStudents(prev => [newStudentData, ...prev]);
    setIsModalOpen(false);
    setToast({ type: 'success', message: 'Siswa berhasil ditambahkan' });

    const submittedData = { ...formData };
    setFormData({
      class: classes[0]?.name || 'X TKJ 1',
      name: '',
      phone: '',
      phone_parent: '',
      pekerjaan_ortu: '',
      alamat: '',
      sekolah_asal: '',
      nomor: '',
      gender: 'L',
    });

    // Kirim ke background
    addStudent(submittedData).then(res => {
      if (res && res.success) {
        const persisted = res.student || res.data;
        if (persisted) {
          setStudents(prev => prev.map(s => s.id === tempId ? { ...s, id: persisted.id, nomor: persisted.nomor || s.nomor, nis: persisted.nomor || s.nis } : s));
        }
      } else {
        setStudents(prev => prev.filter(s => s.id !== tempId));
        setToast({ type: 'error', message: res?.error || 'Gagal menambahkan data siswa ke server.' });
      }
    });
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus siswa "${name}"?`)) {
      const prevStudents = [...students];
      setStudents(prev => prev.filter(s => s.id !== id));
      setToast({ type: 'success', message: `Siswa "${name}" berhasil dihapus` });

      deleteStudent(id).then(res => {
        if (res && !res.success) {
          setStudents(prevStudents);
          setToast({ type: 'error', message: res.error || 'Gagal menghapus siswa' });
        }
      });
    }
  };  /* === Fitur Export & Import Excel === */
  const handleExport = () => {
    let exportData = students.map(s => ({
      'Kelas': s.class || '',
      'Nama Lengkap': s.name || '',
      'Nomer HP': s.phone || '',
      'Nomer HP Ortu': s.phone_parent || '',
      'Pekerjaan Ortu': s.pekerjaan_ortu || '',
      'Alamat': s.alamat || '',
      'Asal Sekolah': s.sekolah_asal || '',
    }));

    if (exportData.length === 0) {
      exportData = [{
        'Kelas': 'X TKJ 1',
        'Nama Lengkap': 'Muhammad Rizki',
        'Nomer HP': '081234567890',
        'Nomer HP Ortu': '089876543210',
        'Pekerjaan Ortu': 'Wiraswasta',
        'Alamat': 'Jl. Pemuda No. 10 Bangsri',
        'Asal Sekolah': 'SMPN 1 Bangsri'
      }];
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
    XLSX.writeFile(wb, "Data_Siswa.xlsx");
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        /* Map data Excel ke schema internal */
        const mappedData = data.map(row => ({
          class: row['Kelas'] || row['class'],
          name: row['Nama Lengkap'] || row['Nama'] || row['name'],
          phone: (row['Nomer HP'] || row['No HP'] || row['No WA Sendiri'] || row['phone'])?.toString(),
          phone_parent: (row['Nomer HP Ortu'] || row['No WA Ortu'] || row['HP Ortu'] || row['phone_parent'])?.toString(),
          pekerjaan_ortu: row['Pekerjaan Ortu'] || row['pekerjaan_ortu'] || '',
          alamat: row['Alamat'] || row['alamat'] || '',
          sekolah_asal: row['Asal Sekolah'] || row['Sekolah Asal'] || row['sekolah_asal'] || '',
          nomor: (row['Nomor'] || row['NIS'] || row['NISN'])?.toString() || null,
          gender: row['L/P'] || row['Gender'] || 'L',
        }));

        setSubmitting(true);
        const res = await importStudents(mappedData);
        setSubmitting(false);

        if (res.success) {
          setToast({ type: 'success', message: res.message });
          loadData();
        } else {
          setToast({ type: 'error', message: res.error });
        }
      } catch (err) {
        setToast({ type: 'error', message: 'Gagal memproses file Excel.' });
      }
    };
    reader.readAsBinaryString(file);
    // Reset file input agar bisa upload file yang sama lagi jika perlu
    e.target.value = null;
  };

  /* Filter list */
  const filteredStudents = students.filter(s => {
    const sClass = s.class || '';
    const sGrade = sClass ? sClass.split(' ')[0] : ''; // 'X', 'XI', 'XII'
    const matchGrade = selectedGrade === 'Semua' || sGrade === selectedGrade;
    const matchClass = selectedClass === 'Semua' || sClass === selectedClass;
    const matchSearch = (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (s.nomor && s.nomor.includes(searchQuery));
    return matchSearch && matchGrade && matchClass;
  });

  const availableClasses = classes.filter(c => {
    if (selectedGrade === 'Semua') return true;
    return (c.name || '').split(' ')[0] === selectedGrade;
  });

  const columns = [
    { key: 'no', label: 'No', width: '40px', render: (_, row, i) => i + 1 },
    { key: 'class', label: 'Kelas', width: '95px', render: (val) => <Badge variant="primary">{val}</Badge> },
    { key: 'name', label: 'Nama Lengkap', cellStyle: { fontWeight: 'var(--font-weight-semibold)' } },
    { key: 'phone', label: 'Nomer HP', width: '120px', render: (val) => val || '-' },
    { key: 'phone_parent', label: 'Nomer HP Ortu', width: '120px', render: (val) => val || '-' },
    { key: 'pekerjaan_ortu', label: 'Pekerjaan Ortu', width: '130px', render: (val) => <span style={{ fontSize: '12px' }}>{val || '-'}</span> },
    { key: 'alamat', label: 'Alamat', render: (val) => <span style={{ fontSize: '12px' }}>{val || '-'}</span> },
    { key: 'sekolah_asal', label: 'Asal Sekolah', width: '130px', render: (val) => <span style={{ fontSize: '12px' }}>{val || '-'}</span> },
    {
      key: 'actions',
      label: 'Aksi',
      width: '90px',
      render: (_, row) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleDelete(row.id, row.name)}
          style={{ color: 'var(--color-danger)' }}
        >
          Hapus
        </Button>
      ),
    },
  ];

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: 'var(--space-1)' }}>
            Data Siswa
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Kelola data master seluruh siswa (Export/Import Excel didukung)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {/* Hidden File Input for Excel Import */}
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleImportExcel}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} size="sm">
            ⬇️ Import Excel
          </Button>
          <Button variant="outline" onClick={handleExport} size="sm">
            ⬆️ Export Excel
          </Button>
          <Button onClick={() => setIsModalOpen(true)} size="sm">
            ➕ Tambah Siswa
          </Button>
        </div>
      </div>

      {/* Tabs Angkatan (Tingkat) */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', borderBottom: '2px solid var(--color-border-light)' }}>
        {['Semua', 'X', 'XI', 'XII'].map(grade => (
          <button
            key={grade}
            onClick={() => {
              setSelectedGrade(grade);
              setSelectedClass('Semua');
            }}
            style={{
              padding: 'var(--space-3) var(--space-6)',
              background: 'transparent',
              border: 'none',
              borderBottom: selectedGrade === grade ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: selectedGrade === grade ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontWeight: selectedGrade === grade ? 'var(--font-weight-bold)' : 'var(--font-weight-medium)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              marginBottom: '-2px'
            }}
          >
            {grade === 'Semua' ? 'Semua Angkatan' : `Kelas ${grade}`}
          </button>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <Card style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
              Cari Nama / Nomor
            </label>
            <input
              type="text"
              placeholder="Ketik nama atau nomor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                border: '1.5px solid var(--color-border)',
                fontSize: 'var(--font-size-sm)',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
              Filter Kelas
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                border: '1.5px solid var(--color-border)',
                fontSize: 'var(--font-size-sm)',
                background: 'var(--color-surface)',
                outline: 'none',
              }}
            >
              <option value="Semua">Semua Kelas ({filteredStudents.length} Siswa)</option>
              {availableClasses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Student Table */}
      <Card padding="0">
        {loading || submitting ? (
          <LoadingSpinner message={submitting ? "Memproses data..." : "Memuat data siswa..."} />
        ) : (
          <Table columns={columns} data={filteredStudents} emptyMessage="Tidak ada data siswa ditemukan." />
        )}
      </Card>

      {/* Modal Form Tambah Siswa */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Data Siswa Baru">
        <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* 1. Dropdown Kelas */}
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
          
          {/* 2. Nama Lengkap */}
          <Input
            label="Nama Lengkap"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Masukkan nama lengkap siswa"
            required
          />

          {/* 3. Nomer HP Siswa & Nomer HP Ortu */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Input
              label="Nomer HP Siswa"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Contoh: 08123456789"
            />
            <Input
              label="Nomer HP Ortu"
              value={formData.phone_parent}
              onChange={(e) => setFormData({ ...formData, phone_parent: e.target.value })}
              placeholder="Contoh: 08987654321"
            />
          </div>

          {/* 4. Pekerjaan Ortu */}
          <Input
            label="Pekerjaan Ortu"
            value={formData.pekerjaan_ortu}
            onChange={(e) => setFormData({ ...formData, pekerjaan_ortu: e.target.value })}
            placeholder="Contoh: Wiraswasta, PNS, Petani, Karyawan"
          />

          {/* 5. Alamat */}
          <Input
            label="Alamat"
            value={formData.alamat}
            onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
            placeholder="Contoh: Ds. Bangsri RT 02/RW 03, Jepara"
          />

          {/* 6. Asal Sekolah */}
          <Input
            label="Asal Sekolah"
            value={formData.sekolah_asal}
            onChange={(e) => setFormData({ ...formData, sekolah_asal: e.target.value })}
            placeholder="Contoh: SMPN 1 Bangsri"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" loading={submitting}>Simpan Siswa</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
