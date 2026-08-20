import { useState, useEffect } from 'react';
import { getAcademicCalendar, addAcademicCalendarEvent, deleteAcademicCalendarEvent } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function KalenderAkademikPage({ hideTitle }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    tanggal: '',
    tipe: 'libur',
    judul: '',
    keterangan: '',
    isFullDay: true,
    jamMulai: '',
    jamSelesai: ''
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    const data = await getAcademicCalendar();
    // Sort by date descending
    data.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    setEvents(data);
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    const payload = {
      ...formData,
      jamMulai: formData.isFullDay ? null : parseInt(formData.jamMulai),
      jamSelesai: formData.isFullDay ? null : parseInt(formData.jamSelesai),
    };
    
    const res = await addAcademicCalendarEvent(payload);
    setSubmitting(false);
    
    if (res.success) {
      setToast({ type: 'success', message: res.message });
      setShowForm(false);
      setFormData({ tanggal: '', tipe: 'libur', judul: '', keterangan: '', isFullDay: true, jamMulai: '', jamSelesai: '' });
      loadEvents();
    } else {
      setToast({ type: 'error', message: res.error || 'Terjadi kesalahan' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus agenda ini?')) {
      const res = await deleteAcademicCalendarEvent(id);
      if (res.success) {
        setToast({ type: 'success', message: res.message });
        loadEvents();
      }
    }
  };

  const columns = [
    { key: 'tanggal', label: 'Tanggal', width: '120px' },
    { 
      key: 'tipe', 
      label: 'Tipe', 
      width: '100px',
      render: (val) => (
        <span style={{
          padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
          background: val === 'libur' ? '#FEE2E2' : '#E0E7FF',
          color: val === 'libur' ? '#DC2626' : '#4F46E5',
          textTransform: 'capitalize'
        }}>
          {val}
        </span>
      )
    },
    { key: 'judul', label: 'Nama Acara/Libur' },
    { key: 'keterangan', label: 'Keterangan' },
    { 
      key: 'waktu', 
      label: 'Waktu (Jam Ke-)', 
      width: '150px',
      render: (_, row) => row.isFullDay ? 'Seharian Penuh' : `Jam ke-${row.jamMulai} s/d ${row.jamSelesai}`
    },
    { 
      key: 'action', 
      label: 'Aksi', 
      width: '80px',
      render: (_, row) => (
        <button 
          onClick={() => handleDelete(row.id)}
          style={{ background: '#EF4444', color: 'white', padding: '4px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
        >
          Hapus
        </button>
      )
    }
  ];

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {!hideTitle && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)' }}>
              📅 Kalender Akademik
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Atur hari libur nasional, agenda sekolah, dan pengalihan jam mengajar.
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Batal Tambah' : '+ Tambah Agenda'}
          </Button>
        </div>
      )}
      
      {hideTitle && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Batal Tambah' : '+ Tambah Agenda'}
          </Button>
        </div>
      )}

      {showForm && (
        <Card style={{ marginBottom: 'var(--space-6)', background: '#F9FAFB' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold', marginBottom: 'var(--space-4)' }}>Tambah Agenda Baru</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Tanggal</label>
                <input required type="date" name="tanggal" value={formData.tanggal} onChange={handleInputChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Tipe Agenda</label>
                <select name="tipe" value={formData.tipe} onChange={handleInputChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                  <option value="libur">Hari Libur</option>
                  <option value="acara">Acara Khusus / Kegiatan</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Judul Acara / Libur</label>
                <input required type="text" name="judul" value={formData.judul} onChange={handleInputChange} placeholder="Cth: Libur Semester / Class Meeting" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
              </div>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Keterangan (Opsional)</label>
              <textarea name="keterangan" value={formData.keterangan} onChange={handleInputChange} rows="2" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                <input type="checkbox" name="isFullDay" checked={formData.isFullDay} onChange={handleInputChange} />
                Seharian Penuh (Full Day)
              </label>
            </div>

            {!formData.isFullDay && (
              <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', background: '#fff', padding: '12px', borderRadius: '4px', border: '1px dashed var(--color-border)' }}>
                <span>Override Jadwal dari:</span>
                <div>
                  <label style={{ fontSize: '12px', display: 'block' }}>Jam Ke-</label>
                  <input type="number" required min="1" max="15" name="jamMulai" value={formData.jamMulai} onChange={handleInputChange} style={{ width: '60px', padding: '4px' }} />
                </div>
                <span>s/d</span>
                <div>
                  <label style={{ fontSize: '12px', display: 'block' }}>Jam Ke-</label>
                  <input type="number" required min="1" max="15" name="jamSelesai" value={formData.jamSelesai} onChange={handleInputChange} style={{ width: '60px', padding: '4px' }} />
                </div>
              </div>
            )}

            <div style={{ alignSelf: 'flex-start', marginTop: 'var(--space-2)' }}>
              <Button type="submit" loading={submitting}>Simpan Agenda</Button>
            </div>
          </form>
        </Card>
      )}

      <Card padding="0">
        {loading ? (
          <LoadingSpinner message="Memuat kalender..." />
        ) : (
          <Table columns={columns} data={events} emptyMessage="Tidak ada agenda yang tersimpan." />
        )}
      </Card>
    </div>
  );
}
