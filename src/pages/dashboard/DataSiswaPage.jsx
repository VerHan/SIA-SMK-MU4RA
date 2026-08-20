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
    nis: '',
    nisn: '',
    name: '',
    class: 'X TKJ 1',
    gender: 'L',
    phone_parent: '',
    alamat: '',
    sekolah_asal: '',
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([getStudents(), getClasses()]).then(([studentsData, classesData]) => {
      setStudents(studentsData);
      setClasses(classesData);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nis || !formData.name) {
      setToast({ type: 'error', message: 'NIS dan Nama Siswa wajib diisi.' });
      return;
    }

    setSubmitting(true);
    const res = await addStudent(formData);
    setSubmitting(false);

    if (res.success) {
      setToast({ type: 'success', message: res.message });
      setIsModalOpen(false);
      setFormData({ nis: '', nisn: '', name: '', class: 'X TKJ 1', gender: 'L', phone_parent: '', alamat: '', sekolah_asal: '' });
      loadData();
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus siswa "${name}"?`)) {
      const res = await deleteStudent(id);
      if (res.success) {
        setToast({ type: 'success', message: res.message });
        loadData();
      }
    }
  };

  /* === Fitur Export & Import Excel === */
  const handleExport = () => {
    /* Buat mapping data khusus untuk diekspor */
    let exportData = students.map(s => ({
      'NIS': s.nis,
      'NISN': s.nisn,
      'Nama Lengkap': s.name,
      'Kelas': s.class,
      'L/P': s.gender,
      'HP Ortu': s.phone_parent,
      'Alamat': s.alamat || '',
      'Sekolah Asal': s.sekolah_asal || ''
    }));

    /* Jika data kosong, sediakan 1 row dummy sebagai template */
    if (exportData.length === 0) {
      exportData = [{
        'NIS': '2024001',
        'NISN': '0012345601',
        'Nama Lengkap': 'John Doe',
        'Kelas': 'X TKJ 1',
        'L/P': 'L',
        'HP Ortu': '0812345678',
        'Alamat': 'Jl. Merdeka',
        'Sekolah Asal': 'SMPN 1'
      }];
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
    XLSX.writeFile(wb, "Data_Siswa.xlsx");
  };

  const handleImport = (e) => {
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
          nis: row['NIS'],
          nisn: row['NISN'],
          name: row['Nama Lengkap'],
          class: row['Kelas'],
          gender: row['L/P'],
          phone_parent: row['HP Ortu'],
          alamat: row['Alamat'],
          sekolah_asal: row['Sekolah Asal']
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
    const sGrade = s.class.split(' ')[0]; // 'X', 'XI', 'XII'
    const matchGrade = selectedGrade === 'Semua' || sGrade === selectedGrade;
    const matchClass = selectedClass === 'Semua' || s.class === selectedClass;
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.nis.includes(searchQuery);
    return matchGrade && matchClass && matchSearch;
  });

  const availableClasses = classes.filter(c => {
    if (selectedGrade === 'Semua') return true;
    return c.name.split(' ')[0] === selectedGrade;
  });

  const columns = [
    { key: 'no', label: 'No', width: '40px', render: (_, row, i) => i + 1 },
    { key: 'nis', label: 'NIS / NISN', render: (val, row) => <span><strong>{row.nis}</strong> <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>/ {row.nisn}</span></span> },
    { key: 'name', label: 'Nama Lengkap', cellStyle: { fontWeight: 'var(--font-weight-semibold)' } },
    { key: 'class', label: 'Kelas', width: '90px', render: (val) => <Badge variant="primary">{val}</Badge> },
    { key: 'gender', label: 'L/P', width: '90px', render: (val) => <Badge variant={val === 'L' ? 'info' : 'warning'}>{val === 'L' ? 'Laki-laki' : 'Perempuan'}</Badge> },
    { key: 'phone_parent', label: 'HP Ortu', width: '120px' },
    { key: 'alamat', label: 'Alamat', render: (val) => <span style={{ fontSize: '12px' }}>{val || '-'}</span> },
    { key: 'sekolah_asal', label: 'Asal Sekolah', render: (val) => <span style={{ fontSize: '12px' }}>{val || '-'}</span> },
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
            onChange={handleImport}
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
              Cari Nama / NIS
            </label>
            <input
              type="text"
              placeholder="Ketik nama atau NIS..."
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Input
              label="NIS"
              value={formData.nis}
              onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
              placeholder="20240011"
              required
            />
            <Input
              label="NISN"
              value={formData.nisn}
              onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
              placeholder="0012345611"
            />
          </div>
          
          <Input
            label="Nama Lengkap"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Masukkan nama lengkap"
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
                Kelas
              </label>
              <select
                value={formData.class}
                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)',
                  background: 'var(--color-surface)',
                }}
              >
                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>

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
            label="No. HP Orang Tua / Wali"
            value={formData.phone_parent}
            onChange={(e) => setFormData({ ...formData, phone_parent: e.target.value })}
            placeholder="Contoh: 08123456789"
          />

          <Input
            label="Alamat"
            value={formData.alamat}
            onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
            placeholder="Alamat lengkap"
          />

          <Input
            label="Sekolah Asal"
            value={formData.sekolah_asal}
            onChange={(e) => setFormData({ ...formData, sekolah_asal: e.target.value })}
            placeholder="Contoh: SMPN 1 Bangsri"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" loading={submitting}>Simpan Data</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
