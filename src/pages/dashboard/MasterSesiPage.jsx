import { useState, useEffect } from 'react';
import { getMasterTimeSlots, updateMasterTimeSlot } from '../../services/api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function MasterSesiPage({ hideTitle }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadSlots();
  }, []);

  const loadSlots = async () => {
    setLoading(true);
    const data = await getMasterTimeSlots();
    setSlots(data);
    setLoading(false);
  };

  const handleSave = async () => {
    setSubmitting(true);
    const res = await updateMasterTimeSlot(slots);
    setSubmitting(false);
    if (res.success) {
      setToast({ type: 'success', message: 'Master Sesi Waktu berhasil diperbarui!' });
      setIsEditing(false);
    } else {
      setToast({ type: 'error', message: 'Gagal memperbarui Master Sesi Waktu.' });
    }
  };

  const handleSlotChange = (index, field, value) => {
    const updatedSlots = [...slots];
    if (field === 'jamKe') {
      updatedSlots[index][field] = value ? parseInt(value) : null;
    } else {
      updatedSlots[index][field] = value;
    }
    setSlots(updatedSlots);
  };

  const addSlot = () => {
    setSlots([
      ...slots,
      { jamKe: null, type: 'pelajaran', start: '00:00', end: '00:00', name: '' }
    ]);
    setIsEditing(true);
  };

  const removeSlot = (index) => {
    const updatedSlots = slots.filter((_, i) => i !== index);
    setSlots(updatedSlots);
    setIsEditing(true);
  };

  const columns = [
    {
      key: 'jamKe',
      label: 'Jam Ke',
      width: '80px',
      render: (val, row, index) => isEditing ? (
        <input 
          type="number" 
          value={val || ''} 
          onChange={(e) => handleSlotChange(index, 'jamKe', e.target.value)}
          style={{ width: '60px', padding: '4px' }}
        />
      ) : (val || '-')
    },
    {
      key: 'type',
      label: 'Tipe',
      width: '120px',
      render: (val, row, index) => isEditing ? (
        <select 
          value={val} 
          onChange={(e) => handleSlotChange(index, 'type', e.target.value)}
          style={{ padding: '4px' }}
        >
          <option value="pelajaran">Pelajaran</option>
          <option value="istirahat">Istirahat</option>
        </select>
      ) : <span style={{ textTransform: 'capitalize' }}>{val}</span>
    },
    {
      key: 'name',
      label: 'Keterangan (Opsional)',
      render: (val, row, index) => isEditing ? (
        <input 
          type="text" 
          value={val || ''} 
          onChange={(e) => handleSlotChange(index, 'name', e.target.value)}
          placeholder="Cth: Istirahat 1"
          style={{ width: '100%', padding: '4px' }}
        />
      ) : (val || '-')
    },
    {
      key: 'start',
      label: 'Waktu Mulai',
      width: '120px',
      render: (val, row, index) => isEditing ? (
        <input 
          type="time" 
          value={val || ''} 
          onChange={(e) => handleSlotChange(index, 'start', e.target.value)}
          style={{ padding: '4px' }}
        />
      ) : val
    },
    {
      key: 'end',
      label: 'Waktu Selesai',
      width: '120px',
      render: (val, row, index) => isEditing ? (
        <input 
          type="time" 
          value={val || ''} 
          onChange={(e) => handleSlotChange(index, 'end', e.target.value)}
          style={{ padding: '4px' }}
        />
      ) : val
    },
    {
      key: 'action',
      label: 'Aksi',
      width: '80px',
      render: (_, __, index) => isEditing ? (
        <button 
          onClick={() => removeSlot(index)}
          style={{ background: '#EF4444', color: 'white', padding: '4px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
        >
          Hapus
        </button>
      ) : null
    }
  ];

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        {!hideTitle && (
          <div>
            <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)' }}>
              Master Sesi Waktu
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Atur jam pelajaran (ke-1 sampai ke-n) beserta jadwal istirahat.
            </p>
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          {isEditing ? (
            <>
              <Button onClick={() => { setIsEditing(false); loadSlots(); }} variant="secondary">Batal</Button>
              <Button onClick={addSlot} variant="secondary">+ Tambah Sesi</Button>
              <Button onClick={handleSave} loading={submitting}>💾 Simpan Perubahan</Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>✏️ Edit Master Sesi</Button>
          )}
        </div>
      </div>

      <Card padding="0">
        {loading ? (
          <LoadingSpinner message="Memuat Master Sesi..." />
        ) : (
          <Table 
            columns={columns.filter(col => isEditing || col.key !== 'action')} 
            data={slots} 
            emptyMessage="Belum ada data sesi waktu." 
          />
        )}
      </Card>
    </div>
  );
}
