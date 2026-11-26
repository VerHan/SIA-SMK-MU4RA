/* ============================================================
   ManajemenPPDBPage — Verifikasi & Export Pendaftar PPDB
   Terhubung langsung ke formulir publik /ppdb via /api/ppdb
   ============================================================ */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPPDBList, updatePPDBStatus, deletePPDB } from '../../services/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Toast from '../../components/ui/Toast';

const STATUS_OPTIONS = [
  { value: 'Menunggu Verifikasi', variant: 'warning' },
  { value: 'Diterima', variant: 'success' },
  { value: 'Cadangan', variant: 'info' },
  { value: 'Ditolak', variant: 'danger' },
];

const getStatusVariant = (status) => STATUS_OPTIONS.find(s => s.value === status)?.variant || 'default';

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

export default function ManajemenPPDBPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [majorFilter, setMajorFilter] = useState('Semua');
  const [selectedItem, setSelectedItem] = useState(null);
  const [editStatus, setEditStatus] = useState('Menunggu Verifikasi');
  const [editNotes, setEditNotes] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const { data: ppdbList = [], isLoading } = useQuery({
    queryKey: ['ppdb-list'],
    queryFn: () => getPPDBList(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, notes }) => updatePPDBStatus(id, { status, notes }),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['ppdb-list'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        setSelectedItem(null);
        setToast({ message: res.message || 'Status pendaftaran diperbarui.', type: 'success' });
      } else {
        setToast({ message: res.error || 'Gagal memperbarui status.', type: 'error' });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deletePPDB(id),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['ppdb-list'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        setDeleteTarget(null);
        setToast({ message: res.message || 'Data pendaftaran dihapus.', type: 'success' });
      } else {
        setToast({ message: res.error || 'Gagal menghapus data.', type: 'error' });
      }
    },
  });

  const majors = useMemo(() => {
    const set = new Set(ppdbList.map(i => i.majorChoice).filter(Boolean));
    return ['Semua', ...Array.from(set)];
  }, [ppdbList]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ppdbList.filter(item => {
      const matchStatus = statusFilter === 'Semua' || item.status === statusFilter;
      const matchMajor = majorFilter === 'Semua' || item.majorChoice === majorFilter;
      const matchQuery = !q
        || (item.name || '').toLowerCase().includes(q)
        || (item.regNumber || '').toLowerCase().includes(q)
        || (item.nisn || '').toLowerCase().includes(q)
        || (item.schoolOrigin || '').toLowerCase().includes(q);
      return matchStatus && matchMajor && matchQuery;
    });
  }, [ppdbList, search, statusFilter, majorFilter]);

  const summary = useMemo(() => ({
    total: ppdbList.length,
    pending: ppdbList.filter(i => i.status === 'Menunggu Verifikasi').length,
    accepted: ppdbList.filter(i => i.status === 'Diterima').length,
    other: ppdbList.filter(i => i.status === 'Cadangan' || i.status === 'Ditolak').length,
  }), [ppdbList]);

  const openDetailModal = (item) => {
    setSelectedItem(item);
    setEditStatus(item.status || 'Menunggu Verifikasi');
    setEditNotes(item.notes || '');
  };

  const handleExportExcel = async () => {
    if (filteredList.length === 0) {
      setToast({ message: 'Tidak ada data untuk diekspor.', type: 'warning' });
      return;
    }
    const rows = filteredList.map((item, idx) => ({
      No: idx + 1,
      'No. Pendaftaran': item.regNumber,
      'Nama Lengkap': item.name,
      NISN: item.nisn || '-',
      'L/P': item.gender,
      'Asal Sekolah': item.schoolOrigin || '-',
      'Pilihan Jurusan': item.majorChoice,
      Jalur: item.track,
      'HP Siswa': item.phoneStudent || '-',
      'HP Orang Tua': item.phoneParent || '-',
      Email: item.email || '-',
      Alamat: item.address || '-',
      Status: item.status,
      Catatan: item.notes || '-',
    }));
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pendaftar PPDB');
    XLSX.writeFile(workbook, `Rekap_PPDB_${new Date().toISOString().split('T')[0]}.xlsx`);
    setToast({ message: `${filteredList.length} data pendaftar diekspor ke Excel.`, type: 'success' });
  };

  return (
    <div style={{ animation: 'fadeIn 250ms ease' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text)', marginBottom: '4px' }}>
            Verifikasi Pendaftaran PPDB
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Pantau formulir pendaftaran calon peserta didik baru, perbarui status verifikasi, dan ekspor data ke Excel.
          </p>
        </div>
        <Button variant="secondary" onClick={handleExportExcel}>Ekspor Excel (.xlsx)</Button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {[
          { label: 'Total Pendaftar', value: summary.total, color: 'var(--color-primary)' },
          { label: 'Menunggu Verifikasi', value: summary.pending, color: '#D97706' },
          { label: 'Diterima', value: summary.accepted, color: '#059669' },
          { label: 'Cadangan / Ditolak', value: summary.other, color: '#64748B' },
        ].map(stat => (
          <div key={stat.label} style={{ ...cardStyle, padding: 'var(--space-5)' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '8px' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: stat.color, fontVariantNumeric: 'tabular-nums' }}>
              {isLoading ? '—' : stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ ...cardStyle, padding: 'var(--space-4)', marginBottom: 'var(--space-5)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center', justifyContent: 'space-between' }}>
        <input
          type="text"
          placeholder="Cari nama, no. pendaftaran, NISN, asal sekolah..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: '340px' }}
        />
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ ...inputStyle, width: 'auto', minWidth: '175px' }}
            aria-label="Filter status PPDB"
          >
            <option value="Semua">Semua Status</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
          </select>
          <select
            value={majorFilter}
            onChange={(e) => setMajorFilter(e.target.value)}
            style={{ ...inputStyle, width: 'auto', minWidth: '140px' }}
            aria-label="Filter jurusan PPDB"
          >
            {majors.map(m => <option key={m} value={m}>{m === 'Semua' ? 'Semua Jurusan' : m}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>No. Daftar</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Calon Siswa</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Asal Sekolah</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Jurusan · Jalur</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                    <td colSpan={6} style={{ padding: '16px' }}>
                      <div style={{ height: '18px', borderRadius: '6px', background: 'var(--color-border-light)', width: '75%' }} />
                    </td>
                  </tr>
                ))
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Belum ada data pendaftar PPDB yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredList.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {item.regNumber}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.name}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        NISN: {item.nisn || '—'} · {item.gender === 'P' ? 'Perempuan' : 'Laki-laki'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--color-text-secondary)' }}>
                      {item.schoolOrigin || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--color-text-secondary)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.majorChoice}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}> · {item.track}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <Button variant="secondary" size="xs" onClick={() => openDetailModal(item)}>
                          Verifikasi
                        </Button>
                        <Button variant="danger" size="xs" onClick={() => setDeleteTarget(item)}>
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Detail Modal */}
      <Modal
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title={`Verifikasi PPDB — ${selectedItem?.regNumber || ''}`}
        size="md"
      >
        {selectedItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '14px', borderRadius: 'var(--radius-lg)', background: 'var(--color-bg)', fontSize: 'var(--font-size-xs)' }}>
              <div><span style={{ color: 'var(--color-text-muted)' }}>Nama:</span><div style={{ fontWeight: 700, color: 'var(--color-text)', marginTop: '2px' }}>{selectedItem.name}</div></div>
              <div><span style={{ color: 'var(--color-text-muted)' }}>NISN:</span><div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginTop: '2px' }}>{selectedItem.nisn || '—'}</div></div>
              <div><span style={{ color: 'var(--color-text-muted)' }}>Asal Sekolah:</span><div style={{ fontWeight: 600, marginTop: '2px' }}>{selectedItem.schoolOrigin || '—'}</div></div>
              <div><span style={{ color: 'var(--color-text-muted)' }}>Pilihan Jurusan:</span><div style={{ fontWeight: 700, color: 'var(--color-primary)', marginTop: '2px' }}>{selectedItem.majorChoice} · {selectedItem.track}</div></div>
              <div><span style={{ color: 'var(--color-text-muted)' }}>HP Siswa:</span><div style={{ fontVariantNumeric: 'tabular-nums', marginTop: '2px' }}>{selectedItem.phoneStudent || '—'}</div></div>
              <div><span style={{ color: 'var(--color-text-muted)' }}>HP Orang Tua:</span><div style={{ fontVariantNumeric: 'tabular-nums', marginTop: '2px' }}>{selectedItem.phoneParent || '—'}</div></div>
              <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--color-text-muted)' }}>Alamat:</span><div style={{ marginTop: '2px' }}>{selectedItem.address || '—'}</div></div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Status Verifikasi
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                style={inputStyle}
              >
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Catatan Panitia (Opsional)
              </label>
              <textarea
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Contoh: Berkas KK & ijazah sudah diverifikasi lengkap."
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button variant="ghost" onClick={() => setSelectedItem(null)}>Tutup</Button>
              <Button
                loading={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ id: selectedItem.id, status: editStatus, notes: editNotes })}
              >
                Simpan Verifikasi
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Data Pendaftar"
        size="sm"
      >
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-5)', lineHeight: 1.6 }}>
          Hapus data pendaftaran <strong>{deleteTarget?.name}</strong> ({deleteTarget?.regNumber}) secara permanen?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Batal</Button>
          <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
            Ya, Hapus
          </Button>
        </div>
      </Modal>
    </div>
  );
}
