/* PoinSikapPage — Aturan Poin & Catatan Poin Siswa */

import { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
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
  const [tab, setTab] = useState('aturan'); /* 'aturan' | 'catatan' */
  const [rules, setRules] = useState([]);
  const [points, setPoints] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  /* Modal states */
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showPointModal, setShowPointModal] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({ kategori: 'positif', nama: '', poin: 5, deskripsi: '' });
  const [pointForm, setPointForm] = useState({ siswaId: '', aturanPoinId: '', keterangan: '', tanggal: new Date().toISOString().split('T')[0] });

  const fetchData = async () => {
    setLoading(true);
    const [r, p, s] = await Promise.all([getBehaviorRules(), getBehaviorPoints(), getStudents()]);
    setRules(r);
    setPoints(p);
    setStudents(s);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  /* === ATURAN HANDLERS === */
  const handleRuleSubmit = async (e) => {
    e.preventDefault();
    const poinValue = ruleForm.kategori === 'negatif' ? -Math.abs(ruleForm.poin) : Math.abs(ruleForm.poin);
    if (editRule) {
      await updateBehaviorRule(editRule.id, { ...ruleForm, poin: poinValue });
    } else {
      await addBehaviorRule({ ...ruleForm, poin: poinValue });
    }
    setShowRuleModal(false);
    setEditRule(null);
    setRuleForm({ kategori: 'positif', nama: '', poin: 5, deskripsi: '' });
    fetchData();
  };

  const handleEditRule = (rule) => {
    setEditRule(rule);
    setRuleForm({ kategori: rule.kategori, nama: rule.nama, poin: Math.abs(rule.poin), deskripsi: rule.deskripsi });
    setShowRuleModal(true);
  };

  const handleDeleteRule = async (id) => {
    if (confirm('Hapus aturan poin ini?')) {
      await deleteBehaviorRule(id);
      fetchData();
    }
  };

  /* === CATATAN HANDLERS === */
  const handlePointSubmit = async (e) => {
    e.preventDefault();
    await addBehaviorPoint(pointForm);
    setShowPointModal(false);
    setPointForm({ siswaId: '', aturanPoinId: '', keterangan: '', tanggal: new Date().toISOString().split('T')[0] });
    fetchData();
  };

  const handleDeletePoint = async (id) => {
    if (confirm('Hapus catatan poin ini?')) {
      await deleteBehaviorPoint(id);
      fetchData();
    }
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
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: '4px' }}>
            Poin Sikap
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Kelola aturan poin & catatan perilaku siswa
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
        <button style={tabStyle(tab === 'aturan')} onClick={() => setTab('aturan')}>Aturan Poin ({rules.length})</button>
        <button style={tabStyle(tab === 'catatan')} onClick={() => setTab('catatan')}>Catatan Siswa ({points.length})</button>
      </div>

      {loading ? (
        <Card><p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-8)' }}>Memuat data...</p></Card>
      ) : tab === 'aturan' ? (
        /* === TAB ATURAN POIN === */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-4)' }}>
          {/* Positif */}
          <Card>
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-3)', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} />
              Poin Positif ({positifRules.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {positifRules.map(rule => (
                <div key={rule.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', background: '#ECFDF5', borderRadius: 'var(--radius-md)', border: '1px solid #A7F3D0',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: '#065F46' }}>
                      {rule.nama}
                      <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 'var(--font-weight-extrabold)', color: '#059669' }}>
                        +{Math.abs(rule.poin)}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px' }}>{rule.deskripsi}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <Button size="sm" variant="ghost" onClick={() => handleEditRule(rule)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteRule(rule.id)} style={{ color: 'var(--color-danger)' }}>×</Button>
                  </div>
                </div>
              ))}
              {positifRules.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: '12px', textAlign: 'center', padding: 'var(--space-4)' }}>Belum ada aturan positif.</p>}
            </div>
          </Card>

          {/* Negatif */}
          <Card>
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-3)', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#DC2626' }} />
              Poin Negatif ({negatifRules.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {negatifRules.map(rule => (
                <div key={rule.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', background: '#FEF2F2', borderRadius: 'var(--radius-md)', border: '1px solid #FECACA',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: '#991B1B' }}>
                      {rule.nama}
                      <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 'var(--font-weight-extrabold)', color: '#DC2626' }}>
                        {rule.poin}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '2px' }}>{rule.deskripsi}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <Button size="sm" variant="ghost" onClick={() => handleEditRule(rule)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteRule(rule.id)} style={{ color: 'var(--color-danger)' }}>×</Button>
                  </div>
                </div>
              ))}
              {negatifRules.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: '12px', textAlign: 'center', padding: 'var(--space-4)' }}>Belum ada aturan negatif.</p>}
            </div>
          </Card>
        </div>
      ) : (
        /* === TAB CATATAN SISWA === */
        <Card padding="0">
          <Table
            columns={[
              { key: 'tanggal', label: 'Tanggal', width: '100px' },
              { key: 'siswaName', label: 'Nama Siswa' },
              { key: 'class', label: 'Kelas', width: '90px' },
              { key: 'aturanNama', label: 'Pelanggaran/Prestasi' },
              { key: 'poin', label: 'Poin', width: '70px',
                render: (val) => (
                  <span style={{
                    fontWeight: 'var(--font-weight-extrabold)',
                    color: val > 0 ? '#059669' : '#DC2626',
                    fontSize: 'var(--font-size-sm)',
                  }}>
                    {val > 0 ? `+${val}` : val}
                  </span>
                )
              },
              { key: 'keterangan', label: 'Keterangan',
                render: (val) => <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{val || '-'}</span>
              },
              { key: 'pencatat', label: 'Pencatat', width: '130px',
                render: (val) => <span style={{ fontSize: '12px' }}>{val?.split(',')[0]}</span>
              },
              { key: 'actions', label: '', width: '60px',
                render: (_, row) => (
                  <Button size="sm" variant="ghost" onClick={() => handleDeletePoint(row.id)} style={{ color: 'var(--color-danger)' }}>×</Button>
                )
              },
            ]}
            data={points}
            emptyMessage="Belum ada catatan poin."
          />
        </Card>
      )}

      {/* Modal Aturan */}
      <Modal isOpen={showRuleModal} onClose={() => { setShowRuleModal(false); setEditRule(null); }} title={editRule ? 'Edit Aturan Poin' : 'Tambah Aturan Poin'}>
        <form onSubmit={handleRuleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>Kategori</label>
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
                    fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)',
                    cursor: 'pointer', transition: 'all var(--transition-fast)',
                  }}
                >
                  {k === 'positif' ? '+ Positif' : '− Negatif'}
                </button>
              ))}
            </div>
          </div>
          <Input label="Nama Aturan" placeholder="Misal: Terlambat" value={ruleForm.nama} onChange={(e) => setRuleForm({ ...ruleForm, nama: e.target.value })} required />
          <Input label="Jumlah Poin" type="number" min="1" value={ruleForm.poin} onChange={(e) => setRuleForm({ ...ruleForm, poin: parseInt(e.target.value) || 0 })} required />
          <Input label="Deskripsi" placeholder="Keterangan aturan" value={ruleForm.deskripsi} onChange={(e) => setRuleForm({ ...ruleForm, deskripsi: e.target.value })} />
          <Button type="submit" fullWidth>{editRule ? 'Simpan' : 'Tambah Aturan'}</Button>
        </form>
      </Modal>

      {/* Modal Catatan Poin */}
      <Modal isOpen={showPointModal} onClose={() => setShowPointModal(false)} title="Catat Poin Siswa">
        <form onSubmit={handlePointSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>Siswa</label>
            <select
              value={pointForm.siswaId}
              onChange={(e) => setPointForm({ ...pointForm, siswaId: e.target.value })}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)', background: 'var(--color-surface)' }}
            >
              <option value="">Pilih Siswa</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.class})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>Aturan Poin</label>
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
          <Button type="submit" fullWidth>Simpan Catatan</Button>
        </form>
      </Modal>
    </div>
  );
}
