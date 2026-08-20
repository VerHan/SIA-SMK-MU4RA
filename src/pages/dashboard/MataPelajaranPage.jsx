/* MataPelajaranPage — CRUD Master Mata Pelajaran */

import { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import {
  getSubjects,
  addSubject,
  updateSubject,
  deleteSubject,
  getSubjectTeachers,
  getSubjectGroups,
  addSubjectGroup,
  updateSubjectGroup,
  deleteSubjectGroup
} from '../../services/api';

export default function MataPelajaranPage() {
  const [subjects, setSubjects] = useState([]);
  const [subjectTeachers, setSubjectTeachers] = useState([]);
  const [subjectGroups, setSubjectGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState({ kode: '', nama: '', kelompok: 'Normatif' });
  const [filterGroup, setFilterGroup] = useState('');
  
  // Group Management State
  const [groupForm, setGroupForm] = useState({ oldName: '', newName: '' });

  const fetchData = async () => {
    setLoading(true);
    const [subs, sts, groups] = await Promise.all([getSubjects(), getSubjectTeachers(), getSubjectGroups()]);
    setSubjects(subs);
    setSubjectTeachers(sts);
    setSubjectGroups(groups);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editData) {
      await updateSubject(editData.id, form);
    } else {
      await addSubject(form);
    }
    setShowModal(false);
    setEditData(null);
    setForm({ kode: '', nama: '', kelompok: 'Normatif' });
    fetchData();
  };

  const handleEdit = (subj) => {
    setEditData(subj);
    setForm({ kode: subj.kode, nama: subj.nama, kelompok: subj.kelompok });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Hapus mata pelajaran ini?')) {
      await deleteSubject(id);
      fetchData();
    }
  };

  const filteredSubjects = filterGroup
    ? subjects.filter(s => s.kelompok === filterGroup)
    : subjects;

  const getTeachersForSubject = (subjectId) => {
    return subjectTeachers.filter(st => st.mapelId === subjectId);
  };

  const groupColors = {
    'Normatif': { bg: '#EFF6FF', color: '#1E40AF', border: '#DBEAFE' },
    'Adaptif': { bg: '#F5F3FF', color: '#5B21B6', border: '#E9D5FF' },
    'Produktif': { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    if (groupForm.oldName) {
      await updateSubjectGroup(groupForm.oldName, groupForm.newName);
    } else {
      await addSubjectGroup(groupForm.newName);
    }
    setGroupForm({ oldName: '', newName: '' });
    fetchData(); // refresh groups and subjects (since their group might have changed)
  };

  const handleDeleteGroup = async (name) => {
    if (confirm(`Hapus kelompok "${name}"? Pastikan tidak ada mapel di kelompok ini.`)) {
      await deleteSubjectGroup(name);
      fetchData();
    }
  };

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: '4px' }}>
            Mata Pelajaran
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Kelola daftar mata pelajaran sekolah
          </p>
        </div>
        <Button onClick={() => { setEditData(null); setForm({ kode: '', nama: '', kelompok: 'Normatif' }); setShowModal(true); }}>
          + Tambah Mapel
        </Button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterGroup('')}
          style={{
            padding: '6px 14px', borderRadius: 'var(--radius-full)',
            fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)',
            background: !filterGroup ? '#2563EB' : 'var(--color-bg)',
            color: !filterGroup ? 'white' : 'var(--color-text-secondary)',
            border: !filterGroup ? 'none' : '1px solid var(--color-border)',
            cursor: 'pointer', transition: 'all var(--transition-fast)',
          }}
        >
          Semua ({subjects.length})
        </button>
        {subjectGroups.map(group => {
          const count = subjects.filter(s => s.kelompok === group).length;
          const gc = groupColors[group] || { bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' };
          return (
            <button
              key={group}
              onClick={() => setFilterGroup(group)}
              style={{
                padding: '6px 14px', borderRadius: 'var(--radius-full)',
                fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)',
                background: filterGroup === group ? gc.color : gc.bg,
                color: filterGroup === group ? 'white' : gc.color,
                border: `1px solid ${gc.border}`,
                cursor: 'pointer', transition: 'all var(--transition-fast)',
              }}
            >
              {group} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <Card><p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-8)' }}>Memuat data...</p></Card>
      ) : (
        <Card padding="0">
          <Table
            columns={[
              { key: 'kode', label: 'Kode', width: '80px' },
              { key: 'nama', label: 'Nama Mata Pelajaran' },
              { key: 'kelompok', label: 'Kelompok', width: '1%', cellStyle: { whiteSpace: 'nowrap' },
                render: (val) => {
                  const gc = groupColors[val] || { bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' };
                  return <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 'var(--font-weight-medium)', background: gc.bg, color: gc.color, border: `1px solid ${gc.border}` }}>{val}</span>;
                }
              },
              { key: 'guru', label: 'Guru Pengampu',
                render: (_, row) => {
                  const teachers = getTeachersForSubject(row.id);
                  if (teachers.length === 0) return <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Belum ada</span>;
                  return (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {teachers.map(t => (
                        <span key={t.id} style={{ background: '#EFF6FF', color: '#1E40AF', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '11px', fontWeight: 'var(--font-weight-medium)' }}>
                          {t.guruName?.split(',')[0]}
                        </span>
                      ))}
                    </div>
                  );
                }
              },
              { key: 'actions', label: '', width: '120px',
                render: (_, row) => (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)} style={{ color: 'var(--color-danger)' }}>Hapus</Button>
                  </div>
                )
              },
            ]}
            data={filteredSubjects}
            emptyMessage="Tidak ada mata pelajaran."
          />
        </Card>
      )}

      {/* Modal Form */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditData(null); }} title={editData ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="Kode Mapel"
            placeholder="MTK"
            value={form.kode}
            onChange={(e) => setForm({ ...form, kode: e.target.value.toUpperCase() })}
            required
          />
          <Input
            label="Nama Mata Pelajaran"
            placeholder="Matematika"
            value={form.nama}
            onChange={(e) => setForm({ ...form, nama: e.target.value })}
            required
          />
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
              Kelompok
            </label>
            <select
              value={form.kelompok}
              onChange={(e) => {
                if (e.target.value === '__MANAGE__') {
                  setShowGroupModal(true);
                } else {
                  setForm({ ...form, kelompok: e.target.value });
                }
              }}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)',
                background: 'var(--color-surface)',
              }}
            >
              {subjectGroups.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
              <option value="__MANAGE__">⚙️ Kelola Kelompok...</option>
            </select>
          </div>
          <Button type="submit" fullWidth>{editData ? 'Simpan Perubahan' : 'Tambah Mapel'}</Button>
        </form>
      </Modal>

      {/* Modal Kelola Kelompok */}
      <Modal isOpen={showGroupModal} onClose={() => { setShowGroupModal(false); setGroupForm({ oldName: '', newName: '' }); }} title="Kelola Kelompok Mata Pelajaran">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <form onSubmit={handleSaveGroup} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Input
                label={groupForm.oldName ? `Edit "${groupForm.oldName}"` : "Tambah Kelompok Baru"}
                placeholder="Nama Kelompok"
                value={groupForm.newName}
                onChange={(e) => setGroupForm({ ...groupForm, newName: e.target.value })}
                required
              />
            </div>
            <Button type="submit" style={{ height: '40px' }}>
              {groupForm.oldName ? 'Simpan' : 'Tambah'}
            </Button>
            {groupForm.oldName && (
              <Button type="button" variant="ghost" onClick={() => setGroupForm({ oldName: '', newName: '' })} style={{ height: '40px' }}>
                Batal
              </Button>
            )}
          </form>

          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
              <tbody>
                {subjectGroups.map(group => (
                  <tr key={group} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 12px' }}>{group}</td>
                    <td style={{ padding: '10px 12px', width: '100px', textAlign: 'right' }}>
                      <Button size="sm" variant="ghost" onClick={() => setGroupForm({ oldName: group, newName: group })}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteGroup(group)} style={{ color: 'var(--color-danger)' }}>Hapus</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
}
