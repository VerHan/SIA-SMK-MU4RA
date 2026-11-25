/* ============================================================
   MobileSikapPage.jsx — Poin Sikap & Input Cepat Guru (Mobile)
   ============================================================ */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClasses, getStudents, getBehaviorPoints, getBehaviorRules, addBehaviorPoint, getJakartaToday } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Toast from '../../components/ui/Toast';

export default function MobileSikapPage() {
  const { user, hasRole } = useAuth();
  const canInput = hasRole(['admin', 'guru']);
  const queryClient = useQueryClient();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [step, setStep] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [note, setNote] = useState('');
  const [toast, setToast] = useState(null);

  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['classes-list'],
    queryFn: getClasses,
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['behavior-rules'],
    queryFn: getBehaviorRules,
    enabled: canInput,
  });

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['students-by-class', selectedClass],
    queryFn: () => getStudents(selectedClass),
    enabled: Boolean(selectedClass),
  });

  const { data: points = [], isLoading: loadingPoints } = useQuery({
    queryKey: ['behavior-points', selectedStudent?.id],
    queryFn: () => getBehaviorPoints(selectedStudent.id),
    enabled: Boolean(selectedStudent?.id),
  });

  const addMutation = useMutation({
    mutationFn: (payload) => addBehaviorPoint(payload),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['behavior-points'] });
        setShowAddForm(false);
        setSelectedRuleId('');
        setNote('');
        setToast({ message: 'Catatan poin sikap berhasil disimpan.', type: 'success' });
      } else {
        setToast({ message: res.error || 'Gagal mencatat poin.', type: 'error' });
      }
    },
  });

  const handleAddPoint = (e) => {
    e.preventDefault();
    if (!selectedRuleId) {
      setToast({ message: 'Pilih jenis aturan poin terlebih dahulu.', type: 'error' });
      return;
    }
    addMutation.mutate({
      siswaId: selectedStudent.id,
      aturanPoinId: selectedRuleId,
      keterangan: note.trim(),
      tanggal: getJakartaToday(),
      pencatat: user?.name || 'Guru',
    });
  };

  const backBtnStyle = {
    minHeight: '44px',
    background: 'none',
    border: 'none',
    color: '#2563EB',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '0 4px',
    marginBottom: '6px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  };

  if (step === 3 && selectedStudent) {
    const totalPositif = points.filter(p => p.poin > 0).reduce((s, p) => s + p.poin, 0);
    const totalNegatif = points.filter(p => p.poin < 0).reduce((s, p) => s + p.poin, 0);
    const safeScore = Math.max(0, Math.min(100, 100 + totalPositif + totalNegatif));

    return (
      <div style={{ padding: '12px 16px 24px' }}>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <button type="button" onClick={() => setStep(2)} style={backBtnStyle}>
          ← Kembali ke {selectedClass}
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 2px' }}>{selectedStudent.name}</h2>
            <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>{selectedStudent.class} · Poin Sikap</p>
          </div>
          {canInput && (
            <button
              type="button"
              onClick={() => setShowAddForm(v => !v)}
              style={{
                minHeight: '44px',
                padding: '0 14px',
                borderRadius: '12px',
                background: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {showAddForm ? 'Tutup' : '+ Catat'}
            </button>
          )}
        </div>

        {/* Inline Quick Input Form */}
        {canInput && showAddForm && (
          <form
            onSubmit={handleAddPoint}
            style={{
              padding: '14px',
              borderRadius: '14px',
              background: '#FFFFFF',
              border: '1px solid #BFDBFE',
              marginBottom: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <select
              value={selectedRuleId}
              onChange={(e) => setSelectedRuleId(e.target.value)}
              required
              style={{ minHeight: '44px', padding: '0 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', background: '#FFF' }}
            >
              <option value="">Pilih Pelanggaran / Prestasi</option>
              <optgroup label="Poin Positif (+)">
                {rules.filter(r => r.kategori === 'positif').map(r => (
                  <option key={r.id} value={r.id}>{r.nama} (+{Math.abs(r.poin)})</option>
                ))}
              </optgroup>
              <optgroup label="Poin Negatif (−)">
                {rules.filter(r => r.kategori === 'negatif').map(r => (
                  <option key={r.id} value={r.id}>{r.nama} ({r.poin})</option>
                ))}
              </optgroup>
            </select>
            <input
              type="text"
              placeholder="Catatan tambahan (opsional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ minHeight: '44px', padding: '0 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px' }}
            />
            <button
              type="submit"
              disabled={addMutation.isPending}
              style={{
                minHeight: '44px',
                borderRadius: '10px',
                background: '#059669',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {addMutation.isPending ? 'Menyimpan...' : 'Simpan Catatan Poin'}
            </button>
          </form>
        )}

        {/* Score Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px', fontVariantNumeric: 'tabular-nums' }}>
          {[
            { label: 'Positif', value: `+${totalPositif}`, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
            { label: 'Negatif', value: totalNegatif, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
            { label: 'Skor Akhir', value: safeScore, color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
          ].map((stat) => (
            <div key={stat.label} style={{
              padding: '12px 8px',
              borderRadius: '14px',
              textAlign: 'center',
              background: stat.bg,
              border: `1px solid ${stat.border}`,
            }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Points List */}
        {loadingPoints ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#64748B', fontSize: '13px' }}>Memuat riwayat poin...</div>
        ) : points.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748B', padding: '28px', fontSize: '14px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
            Belum ada catatan poin sikap.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {points.map((pt) => (
              <div key={pt.id} style={{
                padding: '12px 14px',
                borderRadius: '14px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <div style={{
                  minWidth: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  flexShrink: 0,
                  background: pt.poin > 0 ? '#ECFDF5' : '#FEF2F2',
                  border: `1px solid ${pt.poin > 0 ? '#A7F3D0' : '#FECACA'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 800,
                  color: pt.poin > 0 ? '#059669' : '#DC2626',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {pt.poin > 0 ? `+${pt.poin}` : pt.poin}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }}>{pt.aturanNama}</p>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {pt.tanggal} · {pt.pencatat?.split(',')[0] || 'Guru'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (step === 2) {
    return (
      <div style={{ padding: '12px 16px 24px' }}>
        <button type="button" onClick={() => setStep(1)} style={backBtnStyle}>
          ← Pilih Kelas Lain
        </button>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 14px' }}>Siswa — {selectedClass}</h2>
        {loadingStudents ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#64748B', fontSize: '14px' }}>Memuat daftar siswa...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {students.map((stu, i) => (
              <button
                key={stu.id}
                type="button"
                onClick={() => { setSelectedStudent(stu); setShowAddForm(false); setStep(3); }}
                style={{
                  minHeight: '56px',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  textAlign: 'left',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  flexShrink: 0,
                  background: '#FEF2F2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {i + 1}
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>{stu.name}</p>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: 0, fontVariantNumeric: 'tabular-nums' }}>NIS: {stu.nis || '-'}</p>
                </div>
                <svg style={{ marginLeft: 'auto' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Poin Sikap</h2>
      <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 18px' }}>Pilih kelas untuk memantau atau mencatat poin sikap siswa</p>
      {loadingClasses ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#64748B', fontSize: '14px' }}>Memuat daftar kelas...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {classes.map(cls => (
            <button
              key={cls.id}
              type="button"
              onClick={() => { setSelectedClass(cls.name); setStep(2); }}
              style={{
                minHeight: '84px',
                padding: '16px 12px',
                borderRadius: '14px',
                textAlign: 'left',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                cursor: 'pointer',
              }}
            >
              <p style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>{cls.name}</p>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                {cls.totalStudents ?? 0} siswa · {cls.major || 'Umum'}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
