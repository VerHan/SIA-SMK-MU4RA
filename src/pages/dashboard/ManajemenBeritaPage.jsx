/* ============================================================
   ManajemenBeritaPage — CRUD Berita & Pengumuman Publik
   Sinkron langsung dengan halaman Website Publik (/berita & /)
   ============================================================ */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNews, addNews, updateNews, deleteNews } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Toast from '../../components/ui/Toast';

const CATEGORIES = ['Pengumuman', 'Kegiatan', 'Prestasi', 'Akademik'];

const EMPTY_FORM = {
  title: '',
  category: 'Pengumuman',
  author: 'Humas SMK MU4RA',
  date: new Date().toISOString().split('T')[0],
  image: '',
  excerpt: '',
  content: '',
  published: true,
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

export default function ManajemenBeritaPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const { data: newsList = [], isLoading } = useQuery({
    queryKey: ['news-admin'],
    queryFn: () => getNews(true),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingItem) return updateNews(editingItem.id, payload);
      return addNews(payload);
    },
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['news-admin'] });
        queryClient.invalidateQueries({ queryKey: ['news'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        setIsModalOpen(false);
        setEditingItem(null);
        setFormData(EMPTY_FORM);
        setToast({ message: res.message || 'Berita berhasil disimpan.', type: 'success' });
      } else {
        setToast({ message: res.error || 'Gagal menyimpan berita.', type: 'error' });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteNews(id),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['news-admin'] });
        queryClient.invalidateQueries({ queryKey: ['news'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        setDeleteTarget(null);
        setToast({ message: res.message || 'Berita berhasil dihapus.', type: 'success' });
      } else {
        setToast({ message: res.error || 'Gagal menghapus berita.', type: 'error' });
      }
    },
  });

  const filteredNews = useMemo(() => {
    const q = search.trim().toLowerCase();
    return newsList.filter(item => {
      const matchCat = categoryFilter === 'Semua' || item.category === categoryFilter;
      const matchQuery = !q
        || (item.title || '').toLowerCase().includes(q)
        || (item.excerpt || '').toLowerCase().includes(q)
        || (item.author || '').toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [newsList, search, categoryFilter]);

  const stats = useMemo(() => ({
    total: newsList.length,
    published: newsList.filter(n => n.published !== false).length,
    draft: newsList.filter(n => n.published === false).length,
  }), [newsList]);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      ...EMPTY_FORM,
      author: user?.name || 'Humas SMK MU4RA',
      date: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      category: item.category || 'Pengumuman',
      author: item.author || 'Admin',
      date: item.date || new Date().toISOString().split('T')[0],
      image: item.image || '',
      excerpt: item.excerpt || '',
      content: item.content || '',
      published: item.published !== false,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      setToast({ message: 'Judul dan isi berita wajib diisi.', type: 'error' });
      return;
    }
    saveMutation.mutate({
      ...formData,
      title: formData.title.trim(),
      content: formData.content.trim(),
      excerpt: formData.excerpt.trim() || formData.content.trim().slice(0, 150),
      image: formData.image.trim() || null,
    });
  };

  const getCategoryVariant = (cat) => {
    if (cat === 'Prestasi') return 'success';
    if (cat === 'Kegiatan') return 'primary';
    if (cat === 'Akademik') return 'info';
    return 'warning';
  };

  return (
    <div style={{ animation: 'fadeIn 250ms ease' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text)', marginBottom: '4px' }}>
            Manajemen Berita & Pengumuman
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Terbitkan artikel, prestasi, dan pengumuman yang langsung tampil di halaman profil sekolah.
          </p>
        </div>
        <Button onClick={openCreateModal}>+ Tulis Berita Baru</Button>
      </div>

      {/* KPI Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {[
          { label: 'Total Artikel', value: stats.total, color: 'var(--color-primary)' },
          { label: 'Tayang di Publik', value: stats.published, color: '#059669' },
          { label: 'Draft Tersembunyi', value: stats.draft, color: '#D97706' },
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
          placeholder="Cari judul atau penulis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: '300px' }}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ ...inputStyle, width: 'auto', minWidth: '170px' }}
          aria-label="Filter kategori berita"
        >
          <option value="Semua">Semua Kategori</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Judul Artikel</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Kategori</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Tanggal & Penulis</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                    <td colSpan={5} style={{ padding: '16px' }}>
                      <div style={{ height: '18px', borderRadius: '6px', background: 'var(--color-border-light)', width: '75%' }} />
                    </td>
                  </tr>
                ))
              ) : filteredNews.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Belum ada berita pada kategori ini.
                  </td>
                </tr>
              ) : (
                filteredNews.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                    <td style={{ padding: '14px 16px', maxWidth: '380px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: '2px' }}>{item.title}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.excerpt}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <Badge variant={getCategoryVariant(item.category)}>{item.category}</Badge>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', fontVariantNumeric: 'tabular-nums' }}>
                      <div>{item.date}</div>
                      <div style={{ color: 'var(--color-text-muted)' }}>{item.author}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <Badge variant={item.published !== false ? 'success' : 'default'}>
                        {item.published !== false ? 'Tayang' : 'Draft'}
                      </Badge>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <Button variant="secondary" size="xs" onClick={() => openEditModal(item)}>Edit</Button>
                        <Button variant="danger" size="xs" onClick={() => setDeleteTarget(item)}>Hapus</Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Berita' : 'Tulis Berita Baru'}
        size="lg"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label style={labelStyle}>Judul Berita *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Contoh: SMK Muhammadiyah 04 Bangsri Raih Juara LKS Tingkat Provinsi"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
            <div>
              <label style={labelStyle}>Kategori</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={inputStyle}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tanggal Terbit</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Penulis</label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>URL Gambar Sampul (Opsional, https:// atau /images/...)</label>
            <input
              type="text"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="/images/berita-kegiatan.jpg atau https://..."
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Ringkasan Singkat (Opsional)</label>
            <input
              type="text"
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              placeholder="Akan otomatis diambil dari paragraf pertama jika dikosongkan"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Isi Berita *</label>
            <textarea
              required
              rows={6}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Tulis isi artikel berita secara lengkap..."
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.published}
              onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
            />
            Tayangkan langsung di website publik
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" loading={saveMutation.isPending}>
              {editingItem ? 'Simpan Perubahan' : 'Terbitkan Berita'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Berita"
        size="sm"
      >
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-5)', lineHeight: 1.6 }}>
          Hapus artikel <strong>{deleteTarget?.title}</strong>? Artikel ini akan langsung hilang dari halaman berita publik.
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
