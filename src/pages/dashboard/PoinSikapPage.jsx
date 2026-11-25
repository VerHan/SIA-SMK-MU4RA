/* ============================================================
   PoinSikapPage — Aturan Poin & Catatan Perilaku Siswa
   React Query powered + Toast + Modal konfirmasi (tanpa confirm())
   ============================================================ */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import Toast from '../../components/ui/Toast';
import {
  getBehaviorRules,
  addBehaviorRule,
  updateBehaviorRule,
  deleteBehaviorRule,
  getBehaviorPoints,
  addBehaviorPoint,
  deleteBehaviorPoint,
  getStudents,
} from '../../services/api';

export default function PoinSikapPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState('aturan');
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showPointModal, setShowPointModal] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'rule' | 'point', id, label }
  const [toast, setToast] = useState(null);

  const [ruleForm, setRuleForm] = useState({ kategori: 'positif', nama: '', poin: 5, deskripsi: '' });
  const [pointForm, setPointForm] = useState({
    siswaId: '',
    aturanPoinId: '',
    keterangan: '',
    tanggal: new Date().toISOString().split('T')[0],
  });

  const { data: rules = [], isLoading: loadingRules } = useQuery({
    queryKey: ['behavior-rules'],
    queryFn: getBehaviorRules,
  });

  const { data: points = [], isLoading: loadingPoints } = useQuery({
    queryKey: ['behavior-points'],
    queryFn: () => getBehaviorPoints(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => getStudents(),
  });

  const loading = loadingRules || loadingPoints;

  const saveRuleMutation = useMutation({
    mutationFn: async (payload) => (editRule ? updateBehaviorRule(editRule.id, payload) : addBehaviorRule(payload)),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['behavior-rules'] });
        setShowRuleModal(false);
        setEditRule(null);
        setRuleForm({ kategori: 'positif', nama: '', poin: 5, deskripsi: '' });
        setToast({ message: res.message || 'Aturan poin disimpan.', type: 'success' });
      } else {
        setToast({ message: res.error || 'Gagal menyimpan aturan.', type: 'error' });
      }
    },
  });

  const savePointMutation = useMutation({
    mutationFn: (payload) => addBehaviorPoint(payload),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['behavior-points'] });
        setShowPointModal(false);
        setPointForm({ siswaId: '', aturanPoinId: '', keterangan: '', tanggal: new Date().toISOString().split('T')[0] });
        setToast({ message: res.message || 'Poin sikap dicatat.', type: 'success' });
      } else {
        setToast({ message: res.error || 'Gagal mencatat poin.', type: 'error' });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (target) => (target.type === 'rule' ? deleteBehaviorRule(target.id) : deleteBehaviorPoint(target.id)),
    onSuccess: (res, target) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: [target.type === 'rule' ? 'behavior-rules' : 'behavior-points'] });
        setDeleteTarget(null);
        setToast({ message: res.message || 'Data berhasil dihapus.', type: 'success' });
      } else {
        setToast({ message: res.error || 'Gagal menghapus data.', type: 'error' });
      }
    },
  });

  const handleRuleSubmit = (e) => {
    e.preventDefault();
    const poinValue = ruleForm.kategori === 'negatif' ? -Math.abs(ruleForm.poin) : Math.abs(ruleForm.poin);
    saveRuleMutation.mutate({ ...ruleForm, poin: poinValue });
  };

  const handleEditRule = (rule) => {
    setEditRule(rule);
    setRuleForm({ kategori: rule.kategori, nama: rule.nama, poin: Math.abs(rule.poin), deskripsi: rule.deskripsi || '' });
    setShowRuleModal(true);
  };

  const handlePointSubmit = (e) => {
    e.preventDefault();
    savePointMutation.mutate({
      ...pointForm,
      pencatat: user?.name || 'Admin',
    });
  };

  const positifRules = rules.filter(r => r.kategori === 'positif');
  const negatifRules = rules.filter(r => r.kategori === 'negatif');

  const tabStyle = (active) => ({
    padding: '10px 20px',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    color: active ? '#2563EB' : 'var(--color-text-secondary)',
    borderBottom: active ? '2px solid #2563EB' : '2px solid transparent',
    background: 'none',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  });

  return (
    <div style={{ animation: 'fadeIn 250ms ease' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: '4px' }}>
            Poin Sikap
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Kelola aturan poin prestasi/pelanggaran dan catatan perilaku siswa.
          </p>
        </div>
        <Button onClick={() => {
          if (tab === 'aturan') {
            setEditRule(null);
            setRuleForm({ kategori: 'positif', nama: '', poin: 5, deskripsi: '' });
            setShowRuleModal(true);
          } else {
            setPointForm({ siswaId: '', aturanPoinId: '', keterangan: '', tanggal: new Date().toISOString().split('T')[0] });
            setShowPointModal(true);
          }
        }}>
          + {tab === 'aturan' ? 'Tambah Aturan' : 'Catat Poin'}
        </Button>
      </div>

      {/* Tab Header */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-light)', marginBottom: 'var(--space-4)' }}>
        <button style={tabStyle(tab === 'aturan')} onClick={() => setTab('aturan')}>
          Aturan Poin ({rules.length})
        </button>
        <button style={tabStyle(tab === 'catatan')} onClick={() => setTab('catatan')}>
          Catatan Siswa ({points.length})
        </button>
      </div>

      {loading ? (
        <Card><p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-8)' }}>Memuat data poin sikap...</p></Card>
      ) : tab === 'aturan' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--space-4)' }}>
          {/* Positif */}
          <Card>
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, marginBottom: 'var(--space-3)', color: '#059669' }}>
              Poin Positif ({positifRules.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {positifRules.map(rule => (
                <div key={rule.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', background: '#ECFDF5', borderRadius: 'var(--radius-md)', border: '1px solid #A7F3D0',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: '#065F46' }}>
                      {rule.nama}
                      <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 800, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                        +{Math.abs(rule.poin)}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px' }}>{rule.deskripsi}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <Button size="xs" variant="ghost" onClick={() => handleEditRule(rule)}>Edit</Button>
                    <Button size="xs" variant="ghost" onClick={() => setDeleteTarget({ type: 'rule', id: rule.id, label: rule.nama })} style={{ color: 'var(--color-danger)' }}>Hapus</Button>
                  </div>
                </div>
              ))}
              {positifRules.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: '12px', textAlign: 'center', padding: 'var(--space-4)' }}>Belum ada aturan positif.</p>}
            </div>
          </Card>

          {/* Negatif */}
          <Card>
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, marginBottom: 'var(--space-3)', color: '#DC2626' }}>
              Poin Negatif ({negatifRules.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {negatifRules.map(rule => (
                <div key={rule.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', background: '#FEF2F2', borderRadius: 'var(--radius-md)', border: '1px solid #FECACA',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: '#991B1B' }}>
                      {rule.nama}
                      <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 800, color: '#DC2626', fontVariantNumeric: 'tabular-nums' }}>
                        {rule.poin}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '2px' }}>{rule.deskripsi}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <Button size="xs" variant="ghost" onClick={() => handleEditRule(rule)}>Edit</Button>
                    <Button size="xs" variant="ghost" onClick={() => setDeleteTarget({ type: 'rule', id: rule.id, label: rule.nama })} style={{ color: 'var(--color-danger)' }}>Hapus</Button>
                  </div>
                </div>
              ))}
              {negatifRules.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: '12px', textAlign: 'center', padding: 'var(--space-4)' }}>Belum ada aturan negatif.</p>}
            </div>
          </Card>
        </div>
      ) : (
        <Card padding="0">
          <Table
            columns={[
              { key: 'tanggal', label: 'Tanggal', width: '110px' },
              { key: 'siswaName', label: 'Nama Siswa' },
              { key: 'class', label: 'Kelas', width: '100px' },
              { key: 'aturanNama', label: 'Pelanggaran / Prestasi' },
              {
                key: 'poin',
                label: 'Poin',
                width: '75px',
                render: (val) => (
                  <span style={{ fontWeight: 800, color: val > 0 ? '#059669' : '#DC2626', fontSize: 'var(--font-size-sm)', fontVariantNumeric: 'tabular-nums' }}>
                    {val > 0 ? `+${val}` : val}
                  </span>
                ),
              },
              { key: 'keterangan', label: 'Keterangan', render: (val) => <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{val || '—'}</span> },
              { key: 'pencatat', label: 'Pencatat', width: '130px', render: (val) => <span style={{ fontSize: '12px' }}>{val?.split(',')[0] || 'Admin'}</span> },
              {
                key: 'actions',
                label: '',
                width: '70px',
                render: (_, row) => (
                  <Button size="xs" variant="ghost" onClick={() => setDeleteTarget({ type: 'point', id: row.id, label: `${row.siswaName} (${row.aturanNama})` })} style={{ color: 'var(--color-danger)' }}>
                    Hapus
                  </Button>
                ),
              },
            ]}
            data={points}
            emptyMessage="Belum ada catatan poin sikap."
          />
        </Card>
      )}

      {/* Modal Aturan */}
      <Modal isOpen={showRuleModal} onClose={() => { setShowRuleModal(false); setEditRule(null); }} title={editRule ? 'Edit Aturan Poin' : 'Tambah Aturan Poin'}>
        <form onSubmit={handleRuleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--space-1)' }}>Kategori</label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {['positif', 'negatif'].map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setRuleForm({ ...ruleForm, kategori: k })}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid',
                    borderColor: ruleForm.kategori === k ? (k === 'positif' ? '#059669' : '#DC2626') : 'var(--color-border)',
                    background: ruleForm.kategori === k ? (k === 'positif' ? '#ECFDF5' : '#FEF2F2') : 'var(--color-surface)',
                    color: ruleForm.kategori === k ? (k === 'positif' ? '#065F46' : '#991B1B') : 'var(--color-text-secondary)',
                    fontWeight: 600, fontSize: 'var(--font-size-sm)', cursor: 'pointer',
                  }}
                >
                  {k === 'positif' ? '+ Positif' : '− Negatif'}
                </button>
              ))}
            </div>
          </div>
          <Input label="Nama Aturan" placeholder="Misal: Terlambat" value={ruleForm.nama} onChange={(e) => setRuleForm({ ...ruleForm, nama: e.target.value })} required />
          <Input label="Jumlah Poin" type="number" min="1" value={ruleForm.poin} onChange={(e) => setRuleForm({ ...ruleForm, poin: parseInt(e.target.value, 10) || 0 })} required />
          <Input label="Deskripsi" placeholder="Keterangan aturan" value={ruleForm.deskripsi} onChange={(e) => setRuleForm({ ...ruleForm, deskripsi: e.target.value })} />
          <Button type="submit" fullWidth loading={saveRuleMutation.isPending}>{editRule ? 'Simpan Perubahan' : 'Tambah Aturan'}</Button>
        </form>
      </Modal>

      {/* Modal Catatan Poin */}
      <Modal isOpen={showPointModal} onClose={() => setShowPointModal(false)} title="Catat Poin Siswa">
        <form onSubmit={handlePointSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--space-1)' }}>Siswa</label>
            <select
              value={pointForm.siswaId}
              onChange={(e) => setPointForm({ ...pointForm, siswaId: e.target.value })}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)', background: 'var(--color-surface)' }}
            >
              <option value="">Pilih Siswa</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.class})</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--space-1)' }}>Aturan Poin</label>
            <select
              value={pointForm.aturanPoinId}
              onChange={(e) => setPointForm({ ...pointForm, aturanPoinId: e.target.value })}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)', background: 'var(--color-surface)' }}
            >
              <option value="">Pilih Aturan</option>
              <optgroup label="Positif (+)">
                {positifRules.map(r => <option key={r.id} value={r.id}>{r.nama} (+{Math.abs(r.poin)})</option>)}
              </optgroup>
              <optgroup label="Negatif (−)">
                {negatifRules.map(r => <option key={r.id} value={r.id}>{r.nama} ({r.poin})</option>)}
              </optgroup>
            </select>
          </div>
          <Input label="Tanggal" type="date" value={pointForm.tanggal} onChange={(e) => setPointForm({ ...pointForm, tanggal: e.target.value })} required />
          <Input label="Keterangan" placeholder="Detail pelanggaran/prestasi" value={pointForm.keterangan} onChange={(e) => setPointForm({ ...pointForm, keterangan: e.target.value })} />
          <Button type="submit" fullWidth loading={savePointMutation.isPending}>Simpan Catatan</Button>
        </form>
      </Modal>

      {/* Modal Konfirmasi Hapus */}
      <Modal isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Konfirmasi Hapus" size="sm">
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-5)', lineHeight: 1.6 }}>
          Hapus {deleteTarget?.type === 'rule' ? 'aturan poin' : 'catatan sikap'} <strong>{deleteTarget?.label}</strong>?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Batal</Button>
          <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}>
            Ya, Hapus
          </Button>
        </div>
      </Modal>
    </div>
  );
}
