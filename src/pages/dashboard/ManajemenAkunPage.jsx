/* ============================================================
   ManajemenAkunPage — CRUD Akun Pengguna SIA (Admin Only)
   ============================================================ */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, addUser, updateUser, deleteUser, getTeachers, getStudents } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS, USER_ROLES } from '../../config/constants';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Toast from '../../components/ui/Toast';

const ROLE_OPTIONS = [
  { value: USER_ROLES.ADMIN, label: ROLE_LABELS[USER_ROLES.ADMIN], variant: 'danger' },
  { value: USER_ROLES.GURU, label: ROLE_LABELS[USER_ROLES.GURU], variant: 'primary' },
  { value: USER_ROLES.STAFF, label: ROLE_LABELS[USER_ROLES.STAFF], variant: 'info' },
  { value: USER_ROLES.KEPSEK, label: ROLE_LABELS[USER_ROLES.KEPSEK], variant: 'warning' },
  { value: USER_ROLES.WALI_MURID, label: ROLE_LABELS[USER_ROLES.WALI_MURID], variant: 'success' },
];

const getRoleMeta = (role) => ROLE_OPTIONS.find(r => r.value === role) || { label: role, variant: 'default' };

const EMPTY_FORM = {
  name: '',
  username: '',
  password: '',
  role: USER_ROLES.GURU,
  isPiket: false,
  teacherId: '',
  studentId: '',
};

const cardStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-xl)',
};

const inputStyle = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: 'var(--font-size-sm)',
};

const labelStyle = {
  display: 'block',
  fontSize: 'var(--font-size-xs)',
  fontWeight: 'var(--font-weight-semibold)',
  color: 'var(--color-text-secondary)',
  marginBottom: '6px',
};

export default function ManajemenAkunPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers-list'],
    queryFn: getTeachers,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => getStudents(),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingUser) {
        return updateUser(editingUser.id, payload);
      }
      return addUser(payload);
    },
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['users'] });
        setIsModalOpen(false);
        setEditingUser(null);
        setFormData(EMPTY_FORM);
        setToast({ message: res.message || 'Akun berhasil disimpan.', type: 'success' });
      } else {
        setToast({ message: res.error || 'Gagal menyimpan akun.', type: 'error' });
      }
    },
    onError: () => {
      setToast({ message: 'Terjadi kesalahan saat menyimpan akun.', type: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteUser(id),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['users'] });
        setDeleteTarget(null);
        setToast({ message: res.message || 'Akun berhasil dihapus.', type: 'success' });
      } else {
        setToast({ message: res.error || 'Gagal menghapus akun.', type: 'error' });
      }
    },
  });

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => {
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchQuery = !q
        || (u.name || '').toLowerCase().includes(q)
        || (u.username || '').toLowerCase().includes(q);
      return matchRole && matchQuery;
    });
  }, [users, search, roleFilter]);

  const roleCounts = useMemo(() => ({
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    guru: users.filter(u => u.role === 'guru').length,
    guruPiket: users.filter(u => u.role === 'guru' && u.isPiket).length,
    waliMurid: users.filter(u => u.role === 'wali_murid').length,
  }), [users]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (account) => {
    setEditingUser(account);
    setFormData({
      name: account.name || '',
      username: account.username || '',
      password: '',
      role: account.role || USER_ROLES.GURU,
      isPiket: Boolean(account.isPiket),
      teacherId: account.teacherId || '',
      studentId: account.studentId || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim()) {
      setToast({ message: 'Nama lengkap dan username wajib diisi.', type: 'error' });
      return;
    }
    if (!editingUser && formData.password.length < 6) {
      setToast({ message: 'Password minimal 6 karakter untuk akun baru.', type: 'error' });
      return;
    }
    if (editingUser && formData.password && formData.password.length < 6) {
      setToast({ message: 'Password baru minimal 6 karakter.', type: 'error' });
      return;
    }
    if (formData.role === USER_ROLES.WALI_MURID && !formData.studentId) {
      setToast({ message: 'Akun Wali Murid wajib dihubungkan ke satu data siswa.', type: 'error' });
      return;
    }

    const payload = {
      name: formData.name.trim(),
      username: formData.username.trim(),
      role: formData.role,
      isPiket: formData.role === USER_ROLES.GURU ? Boolean(formData.isPiket) : false,
      teacherId: formData.role === USER_ROLES.GURU ? (formData.teacherId || null) : null,
      studentId: formData.role === USER_ROLES.WALI_MURID ? (formData.studentId || null) : null,
    };
    if (formData.password) {
      payload.password = formData.password;
    }
    saveMutation.mutate(payload);
  };

  const getLinkedLabel = (account) => {
    if (account.teacherId) {
      const t = teachers.find(g => g.id === account.teacherId);
      const homeroomNames = Array.isArray(account.homeroomClasses) && account.homeroomClasses.length > 0
        ? ` • Wali Kelas: ${account.homeroomClasses.map(c => c.name).join(', ')}`
        : '';
      return `${t ? `Guru: ${t.name}` : `ID Guru: ${account.teacherId}`}${homeroomNames}`;
    }
    if (account.studentId) {
      const s = students.find(st => st.id === account.studentId);
      return s ? `Siswa: ${s.name} (${s.class})` : (account.studentName ? `Siswa: ${account.studentName}` : `ID Siswa: ${account.studentId}`);
    }
    return '—';
  };

  return (
    <div style={{ animation: 'fadeIn 250ms ease' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text)', marginBottom: '4px' }}>
            Manajemen Akun Pengguna
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Kelola akun login, hak akses peran (RBAC), dan reset password dengan enkripsi aman.
          </p>
        </div>
        <Button onClick={openCreateModal}>+ Tambah Akun</Button>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {[
          { label: 'Total Akun Aktif', value: roleCounts.total, color: 'var(--color-primary)' },
          { label: 'Administrator', value: roleCounts.admin, color: '#DC2626' },
          { label: 'Akun Guru (Piket)', value: isLoading ? '—' : `${roleCounts.guru} (${roleCounts.guruPiket} Piket)`, color: '#2563EB' },
          { label: 'Akun Wali Murid', value: roleCounts.waliMurid, color: '#059669' },
        ].map((item) => (
          <div key={item.label} style={{ ...cardStyle, padding: 'var(--space-5)' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '8px' }}>
              {item.label}
            </div>
            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: item.color, fontVariantNumeric: 'tabular-nums' }}>
              {isLoading ? '—' : item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div style={{ ...cardStyle, padding: 'var(--space-4)', marginBottom: 'var(--space-5)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center', justifyContent: 'space-between' }}>
        <input
          type="text"
          placeholder="Cari nama atau username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: '300px' }}
        />
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ ...inputStyle, width: 'auto', minWidth: '180px' }}
            aria-label="Filter peran"
          >
            <option value="all">Semua Peran</option>
            {ROLE_OPTIONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Accounts Table */}
      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Nama Lengkap</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Username</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Peran</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Relasi Data</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                    <td colSpan={5} style={{ padding: '16px' }}>
                      <div style={{ height: '18px', borderRadius: '6px', background: 'var(--color-border-light)', width: '70%' }} />
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Tidak ada akun yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((account) => {
                  const roleMeta = getRoleMeta(account.role);
                  const isSelf = currentUser?.id === account.id;
                  return (
                    <tr key={account.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--color-text)' }}>
                        {account.name}
                        {isSelf && (
                          <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600 }}>
                            (Anda)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>
                        @{account.username}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                          <Badge variant={roleMeta.variant}>{roleMeta.label}</Badge>
                          {account.role === 'guru' && account.isPiket && (
                            <Badge variant="info">Guru Piket</Badge>
                          )}
                          {account.role === 'guru' && Array.isArray(account.homeroomClasses) && account.homeroomClasses.length > 0 && (
                            <Badge variant="success">Wali Kelas</Badge>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                        {getLinkedLabel(account)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <Button variant="secondary" size="xs" onClick={() => openEditModal(account)}>
                            Edit / Reset
                          </Button>
                          <Button
                            variant="danger"
                            size="xs"
                            disabled={isSelf}
                            title={isSelf ? 'Tidak dapat menghapus akun yang sedang digunakan' : 'Hapus akun'}
                            onClick={() => setDeleteTarget(account)}
                          >
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? `Edit Akun — ${editingUser.username}` : 'Tambah Akun Baru'}
        size="md"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label style={labelStyle}>Nama Lengkap *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Ahmad Fauzi, S.Pd."
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label style={labelStyle}>Username *</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.replace(/\s+/g, '') })}
                placeholder="guru_ahmad"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Peran (Role) *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                style={inputStyle}
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>
              {editingUser ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password * (min. 6 karakter)'}
            </label>
            <input
              type="password"
              required={!editingUser}
              minLength={editingUser ? undefined : 6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={editingUser ? 'Biarkan kosong untuk tetap memakai password lama' : 'Minimal 6 karakter'}
              style={inputStyle}
            />
          </div>

          {formData.role === USER_ROLES.GURU && (
            <>
              <div>
                <label style={labelStyle}>Hubungkan ke Data Guru (Wali Kelas otomatis terdeteksi)</label>
                <select
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">— Tidak dihubungkan —</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.nip || 'Non-NIP'})</option>
                  ))}
                </select>
              </div>
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                background: formData.isPiket ? '#EFF6FF' : 'var(--color-bg)',
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={Boolean(formData.isPiket)}
                  onChange={(e) => setFormData({ ...formData, isPiket: e.target.checked })}
                  style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: '#2563EB' }}
                />
                <span>
                  <strong style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
                    Tugas Khusus: Guru Piket
                  </strong>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.4, display: 'block', marginTop: '2px' }}>
                    Aktifkan agar guru ini dapat menginput absensi piket pagi/sore siswa. Tanpa centang ini, guru hanya dapat menginput absen mapel.
                  </span>
                </span>
              </label>
            </>
          )}

          {formData.role === USER_ROLES.WALI_MURID && (
            <div>
              <label style={labelStyle}>Hubungkan ke Data Siswa * (Wajib untuk akses monitoring anak)</label>
              <select
                required
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                style={inputStyle}
              >
                <option value="">— Pilih siswa yang dipantau —</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.class})</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" loading={saveMutation.isPending}>
              {editingUser ? 'Simpan Perubahan' : 'Buat Akun'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Konfirmasi Hapus Akun"
        size="sm"
      >
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-5)', lineHeight: 1.6 }}>
          Apakah Anda yakin ingin menghapus akun <strong>{deleteTarget?.name}</strong> (@{deleteTarget?.username})? Pengguna ini tidak akan bisa login lagi.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Batal</Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            Ya, Hapus Akun
          </Button>
        </div>
      </Modal>
    </div>
  );
}
