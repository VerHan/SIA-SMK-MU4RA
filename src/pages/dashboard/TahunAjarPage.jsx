/* TahunAjarPage — CRUD Master Tahun Ajar */

import { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import {
  getAcademicYears,
  addAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  setActiveAcademicYear,
} from '../../services/api';

export default function TahunAjarPage() {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState({ nama: '', semester: 1, startDate: '', endDate: '' });

  const fetchData = async () => {
    setLoading(true);
    const data = await getAcademicYears();
    setYears(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editData) {
      await updateAcademicYear(editData.id, form);
    } else {
      await addAcademicYear(form);
    }
    setShowModal(false);
    setEditData(null);
    setForm({ nama: '', semester: 1, startDate: '', endDate: '' });
    fetchData();
  };

  const handleEdit = (year) => {
    setEditData(year);
    setForm({ nama: year.nama, semester: year.semester, startDate: year.startDate, endDate: year.endDate });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Hapus tahun ajar ini?')) {
      await deleteAcademicYear(id);
      fetchData();
    }
  };

  const handleSetActive = async (id) => {
    await setActiveAcademicYear(id);
    fetchData();
  };

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: '4px' }}>
            Tahun Ajar
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Kelola master data tahun ajaran & semester
          </p>
        </div>
        <Button onClick={() => { setEditData(null); setForm({ nama: '', semester: 1, startDate: '', endDate: '' }); setShowModal(true); }}>
          + Tambah
        </Button>
      </div>

      {loading ? (
        <Card><p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-8)' }}>Memuat data...</p></Card>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {years.map((year) => (
            <Card key={year.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flex: 1 }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: 'var(--radius-lg)',
                  background: year.isActive ? 'linear-gradient(135deg, #2563EB, #3B82F6)' : '#F1F5F9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: year.isActive ? 'white' : 'var(--color-text-muted)',
                  fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-xs)',
                  flexShrink: 0,
                }}>
                  S{year.semester}
                </div>
                <div>
                  <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-base)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {year.nama} — Semester {year.semester}
                    {year.isActive && <Badge variant="success">Aktif</Badge>}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {year.startDate} s/d {year.endDate}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                {!year.isActive && (
                  <Button size="sm" variant="outline" onClick={() => handleSetActive(year.id)}>Set Aktif</Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => handleEdit(year)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(year.id)} style={{ color: 'var(--color-danger)' }}>Hapus</Button>
              </div>
            </Card>
          ))}
          {years.length === 0 && (
            <Card><p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-8)' }}>Belum ada data tahun ajar.</p></Card>
          )}
        </div>
      )}

      {/* Modal Form */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditData(null); }} title={editData ? 'Edit Tahun Ajar' : 'Tambah Tahun Ajar'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="Nama Tahun Ajar"
            placeholder="2024/2025"
            value={form.nama}
            onChange={(e) => setForm({ ...form, nama: e.target.value })}
            required
          />
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
              Semester
            </label>
            <select
              value={form.semester}
              onChange={(e) => setForm({ ...form, semester: parseInt(e.target.value) })}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)',
                background: 'var(--color-surface)',
              }}
            >
              <option value={1}>Semester 1 (Ganjil)</option>
              <option value={2}>Semester 2 (Genap)</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Input
              label="Tanggal Mulai"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              required
            />
            <Input
              label="Tanggal Selesai"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              required
            />
          </div>
          <Button type="submit" fullWidth>{editData ? 'Simpan Perubahan' : 'Tambah Tahun Ajar'}</Button>
        </form>
      </Modal>
    </div>
  );
}
