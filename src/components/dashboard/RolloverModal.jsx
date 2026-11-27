/* ============================================================
   RolloverModal — Alur Tutup Semester & Kenaikan Kelas Massal
   (X -> XI -> XII -> Lulus) dengan RiwayatKelas per TahunAjar
   ============================================================ */

import { useState, useEffect, useMemo, useRef } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import {
  getRolloverPreview,
  executeAcademicRollover,
  addAcademicYear,
} from '../../services/api';

const ACTION_OPTIONS = [
  { value: 'promote', label: 'Naik Kelas' },
  { value: 'keep', label: 'Tetap (Tutup Semester)' },
  { value: 'retain', label: 'Tinggal Kelas' },
  { value: 'graduate', label: 'Lulus (Alumni)' },
  { value: 'skip', label: 'Lewati Kelas Ini' },
];

export default function RolloverModal({
  isOpen,
  onClose,
  years = [],
  activeYear = null,
  onSuccess,
}) {
  const [step, setStep] = useState(1); // 1: Periode & Mode, 2: Pemetaan Kelas & Siswa, 3: Konfirmasi
  const [sourceYearId, setSourceYearId] = useState('');
  const [targetYearId, setTargetYearId] = useState('');
  const [mode, setMode] = useState('promote'); // 'promote' | 'semester'
  const [activateTargetYear, setActivateTargetYear] = useState(true);

  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [mappings, setMappings] = useState([]);
  const [retainStudentIds, setRetainStudentIds] = useState([]);
  const [excludedStudentIds, setExcludedStudentIds] = useState([]);
  const [expandedClassId, setExpandedClassId] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Quick-create target year inside modal if admin hasn't created next semester/year yet
  const [creatingTarget, setCreatingTarget] = useState(false);

  const wasOpenRef = useRef(false);

  // Initialize source & suggested target year only on modal open transition (not on years refresh)
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;

    setStep(1);
    setErrorMsg('');
    setRetainStudentIds([]);
    setExcludedStudentIds([]);
    setExpandedClassId(null);

    const src = activeYear || years[0] || null;
    const srcId = src?.id || '';
    setSourceYearId(srcId);

    const otherYears = years.filter(y => y.id !== srcId);
    if (otherYears.length > 0) {
      setTargetYearId(otherYears[0].id);
    } else {
      setTargetYearId('');
    }
    setMode(src?.semester === 1 ? 'semester' : 'promote');
  }, [isOpen, activeYear, years]);

  const sourceYearObj = useMemo(
    () => years.find(y => y.id === sourceYearId) || null,
    [years, sourceYearId]
  );
  const targetYearObj = useMemo(
    () => years.find(y => y.id === targetYearId) || null,
    [years, targetYearId]
  );

  // Fetch preview whenever entering step 2 or changing mode/source/target while in step 2
  const loadPreview = async (srcId = sourceYearId, tgtId = targetYearId, selectedMode = mode) => {
    if (!srcId) return;
    setLoadingPreview(true);
    setErrorMsg('');
    const res = await getRolloverPreview({
      sourceYearId: srcId,
      targetYearId: tgtId,
      mode: selectedMode,
    });
    setLoadingPreview(false);
    if (res?.success) {
      setPreview(res);
      setMappings(res.mappings || []);
    } else {
      setErrorMsg(res?.error || 'Gagal memuat pratinjau kenaikan kelas.');
    }
  };

  const handleQuickCreateNextYear = async () => {
    if (!sourceYearObj) return;
    setCreatingTarget(true);
    setErrorMsg('');

    let nextNama = sourceYearObj.nama || '2026/2027';
    let nextSem = 2;
    let startDate = '2026-01-06';
    let endDate = '2026-06-20';

    if (mode === 'semester' && Number(sourceYearObj.semester) === 1) {
      nextSem = 2;
      if (nextNama.includes('/')) {
        const [, y2] = nextNama.split('/').map(s => s.trim());
        const fullY2 = y2 && y2.length === 2 ? `20${y2}` : (y2 || '2026');
        startDate = `${fullY2}-01-06`;
        endDate = `${fullY2}-06-20`;
      }
    } else {
      nextSem = 1;
      if (nextNama.includes('/')) {
        const [a, b] = nextNama.split('/').map(s => parseInt(s.trim(), 10));
        if (!Number.isNaN(a) && !Number.isNaN(b)) {
          nextNama = `${a + 1}/${b + 1}`;
          startDate = `${a + 1}-07-15`;
          endDate = `${a + 1}-12-20`;
        }
      }
    }

    const res = await addAcademicYear({
      nama: nextNama,
      semester: nextSem,
      startDate,
      endDate,
      isActive: false,
    });
    setCreatingTarget(false);

    if (res?.success && res?.data?.id) {
      setTargetYearId(res.data.id);
      if (onSuccess) onSuccess({ refreshOnly: true, createdYear: res.data });
    } else {
      setErrorMsg(res?.error || 'Gagal membuat tahun ajar tujuan otomatis.');
    }
  };

  const handleGoToStep2 = async () => {
    if (!sourceYearId || !targetYearId) {
      setErrorMsg('Pilih Tahun Ajar sumber dan tujuan terlebih dahulu.');
      return;
    }
    if (sourceYearId === targetYearId) {
      setErrorMsg('Tahun Ajar tujuan harus berbeda dari Tahun Ajar sumber.');
      return;
    }
    setStep(2);
    await loadPreview(sourceYearId, targetYearId, mode);
  };

  const updateMapping = (sourceClassId, patch) => {
    setMappings(prev =>
      prev.map(m => {
        if (m.sourceClassId !== sourceClassId) return m;
        const next = { ...m, ...patch };
        if (patch.action === 'graduate') {
          next.targetClassId = null;
          next.targetClassName = 'Lulus (Alumni)';
        } else if (patch.action === 'skip') {
          next.targetClassId = null;
          next.targetClassName = 'Dilewati';
        } else if (patch.action === 'retain' || patch.action === 'keep') {
          next.targetClassId = m.sourceClassId;
          next.targetClassName = m.sourceClassName;
        }
        return next;
      })
    );
  };

  const toggleStudentRetain = (studentId) => {
    setExcludedStudentIds(prev => prev.filter(id => id !== studentId));
    setRetainStudentIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const toggleStudentExclude = (studentId) => {
    setRetainStudentIds(prev => prev.filter(id => id !== studentId));
    setExcludedStudentIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  // Compute live summary numbers from current mappings + exceptions
  const liveSummary = useMemo(() => {
    const summary = { promote: 0, keep: 0, graduate: 0, retain: 0, skip: 0, missing: 0 };
    if (!preview?.groups) return summary;
    const mappingById = new Map(mappings.map(m => [m.sourceClassId, m]));
    const retainSet = new Set(retainStudentIds);
    const excludeSet = new Set(excludedStudentIds);

    for (const grp of preview.groups) {
      const mapItem = mappingById.get(grp.id);
      if (mapItem?.action === 'promote' && !mapItem.targetClassId) {
        summary.missing++;
      }
      for (const st of grp.students || []) {
        if (excludeSet.has(st.studentId)) {
          summary.skip++;
        } else if (retainSet.has(st.studentId)) {
          summary.retain++;
        } else if (!mapItem || mapItem.action === 'skip') {
          summary.skip++;
        } else if (mapItem.action === 'graduate') {
          summary.graduate++;
        } else if (mapItem.action === 'keep') {
          summary.keep++;
        } else if (mapItem.action === 'retain') {
          summary.retain++;
        } else {
          summary.promote++;
        }
      }
    }
    return summary;
  }, [preview, mappings, retainStudentIds, excludedStudentIds]);

  const handleExecute = async () => {
    if (liveSummary.missing > 0) {
      setErrorMsg('Masih ada kelas yang belum memiliki kelas tujuan. Lengkapi pemetaan terlebih dahulu.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    const res = await executeAcademicRollover({
      sourceYearId,
      targetYearId,
      mode,
      mappings: mappings.map(m => ({
        sourceClassId: m.sourceClassId,
        action: m.action,
        targetClassId: m.targetClassId,
        targetClassName: m.targetClassName,
      })),
      retainStudentIds,
      excludedStudentIds,
      activateTargetYear,
    });
    setSubmitting(false);

    if (res?.success) {
      if (onSuccess) onSuccess({ completed: true, message: res.message, summary: res.summary });
      onClose();
    } else {
      setErrorMsg(res?.error || 'Gagal menjalankan proses kenaikan kelas.');
    }
  };

  const targetYearOptions = years.filter(y => y.id !== sourceYearId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !submitting && onClose()}
      title="Tutup Semester & Kenaikan Kelas Massal"
      size="lg"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Step Indicator */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            padding: '10px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-surface-alt)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          {[
            { num: 1, label: '1. Periode & Mode' },
            { num: 2, label: '2. Pemetaan Kelas' },
            { num: 3, label: '3. Konfirmasi' },
          ].map(s => (
            <div
              key={s.num}
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                fontSize: 'var(--font-size-xs)',
                fontWeight: step === s.num ? 700 : 500,
                background: step === s.num ? 'var(--color-primary)' : 'transparent',
                color: step === s.num ? '#FFFFFF' : step > s.num ? '#059669' : 'var(--color-text-muted)',
              }}
            >
              {step > s.num ? `✓ ${s.label}` : s.label}
            </div>
          ))}
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#991B1B',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* STEP 1: Select Source, Target & Rollover Mode */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                Jenis Proses Akademik
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setMode('promote')}
                  style={{
                    textAlign: 'left',
                    padding: '14px',
                    borderRadius: 'var(--radius-lg)',
                    border: mode === 'promote' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: mode === 'promote' ? 'rgba(37, 99, 235, 0.06)' : 'var(--color-surface)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                    Kenaikan Kelas & Kelulusan
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                    Naikkan siswa X → XI, XI → XII, dan ubah status kelas XII menjadi <strong>Lulus (Alumni)</strong> secara massal.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('semester')}
                  style={{
                    textAlign: 'left',
                    padding: '14px',
                    borderRadius: 'var(--radius-lg)',
                    border: mode === 'semester' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: mode === 'semester' ? 'rgba(37, 99, 235, 0.06)' : 'var(--color-surface)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                    Tutup Semester (1 → 2)
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                    Salin rombel seluruh siswa aktif ke Semester Genap di <strong>kelas yang sama</strong> tanpa mengulang input.
                  </div>
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>
                  Tahun Ajar Sumber (Asal)
                </label>
                <select
                  value={sourceYearId}
                  onChange={(e) => {
                    const nextSrc = e.target.value;
                    setSourceYearId(nextSrc);
                    if (nextSrc === targetYearId) {
                      const other = years.find(y => y.id !== nextSrc);
                      setTargetYearId(other?.id || '');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    fontSize: 'var(--font-size-sm)',
                  }}
                >
                  {years.map(y => (
                    <option key={y.id} value={y.id}>
                      {y.nama} — Smt {y.semester} {y.isActive ? '(Aktif)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    Tahun Ajar Tujuan
                  </label>
                  <button
                    type="button"
                    onClick={handleQuickCreateNextYear}
                    disabled={creatingTarget || !sourceYearObj}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: 'var(--color-primary)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {creatingTarget ? 'Membuat...' : '+ Buat Periode Baru'}
                  </button>
                </div>
                <select
                  value={targetYearId}
                  onChange={(e) => setTargetYearId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    fontSize: 'var(--font-size-sm)',
                  }}
                >
                  {targetYearOptions.length === 0 ? (
                    <option value="">Belum ada periode tujuan — klik &quot;+ Buat Periode Baru&quot;</option>
                  ) : (
                    targetYearOptions.map(y => (
                      <option key={y.id} value={y.id}>
                        {y.nama} — Smt {y.semester} {y.isActive ? '(Aktif)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                fontSize: 'var(--font-size-xs)',
                color: '#1E40AF',
                lineHeight: 1.5,
              }}
            >
              <strong>Keamanan Data Historis:</strong> Riwayat kelas, absensi piket, dan absensi mapel pada periode lama tidak akan dihapus atau tercampur. Sistem membuat entri baru di tabel <code>RiwayatKelas</code> khusus untuk Tahun Ajar tujuan.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border-light)' }}>
              <Button variant="ghost" onClick={onClose}>Batal</Button>
              <Button onClick={handleGoToStep2} disabled={!sourceYearId || !targetYearId}>
                Lanjut ke Pemetaan Kelas →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Class Mapping + Per-student exceptions */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {loadingPreview ? (
              <LoadingSpinner message="Menyiapkan pemetaan rombel dan daftar siswa..." />
            ) : (
              <>
                {/* Live Summary Strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', fontVariantNumeric: 'tabular-nums' }}>
                  {[
                    { label: mode === 'semester' ? 'Pindah Semester' : 'Naik Kelas', value: liveSummary.promote + liveSummary.keep, color: '#1D4ED8', bg: '#EFF6FF' },
                    { label: 'Lulus (Alumni)', value: liveSummary.graduate, color: '#059669', bg: '#ECFDF5' },
                    { label: 'Tinggal Kelas', value: liveSummary.retain, color: '#B45309', bg: '#FFFBEB' },
                    { label: 'Dilewati', value: liveSummary.skip, color: '#475569', bg: '#F1F5F9' },
                  ].map(card => (
                    <div key={card.label} style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: card.bg, textAlign: 'center' }}>
                      <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: card.color }}>{card.value}</div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: card.color }}>{card.label}</div>
                    </div>
                  ))}
                </div>

                {preview?.groups?.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)' }}>
                    Tidak ada siswa aktif yang terdaftar di periode sumber ini.
                  </div>
                ) : (
                  <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid var(--color-border-light)', borderRadius: 'var(--radius-md)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}>
                      <thead>
                        <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border-light)' }}>
                          <th style={{ padding: '10px 12px', textAlign: 'left' }}>Kelas Asal</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left' }}>Aksi</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left' }}>Kelas Tujuan</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right' }}>Pengecualian</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mappings.map(m => {
                          const grp = preview?.groups?.find(g => g.id === m.sourceClassId);
                          const isExpanded = expandedClassId === m.sourceClassId;
                          const studentList = grp?.students || [];
                          const exceptionCount = studentList.filter(
                            s => retainStudentIds.includes(s.studentId) || excludedStudentIds.includes(s.studentId)
                          ).length;

                          return (
                            <FragmentRow
                              key={m.sourceClassId}
                              mapping={m}
                              allClasses={preview?.classes || []}
                              studentList={studentList}
                              isExpanded={isExpanded}
                              exceptionCount={exceptionCount}
                              retainStudentIds={retainStudentIds}
                              excludedStudentIds={excludedStudentIds}
                              onToggleExpand={() => setExpandedClassId(isExpanded ? null : m.sourceClassId)}
                              onUpdateMapping={(patch) => updateMapping(m.sourceClassId, patch)}
                              onToggleRetain={toggleStudentRetain}
                              onToggleExclude={toggleStudentExclude}
                            />
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-sm)', cursor: 'pointer', fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={activateTargetYear}
                    onChange={(e) => setActivateTargetYear(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                  />
                  Otomatis aktifkan <strong>{targetYearObj ? `${targetYearObj.nama} Smt ${targetYearObj.semester}` : 'Tahun Ajar tujuan'}</strong> sebagai periode aktif sekolah setelah selesai
                </label>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--color-border-light)' }}>
                  <Button variant="ghost" onClick={() => setStep(1)}>← Kembali</Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!preview?.groups?.length || liveSummary.missing > 0}
                  >
                    Tinjau & Konfirmasi →
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 3: Final Confirmation */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div
              style={{
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--color-surface-alt)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, marginBottom: '8px' }}>
                Ringkasan Eksekusi Massal
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: 'var(--font-size-xs)' }}>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Periode Sumber:</span>{' '}
                  <strong>{sourceYearObj ? `${sourceYearObj.nama} Smt ${sourceYearObj.semester}` : '-'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Periode Tujuan:</span>{' '}
                  <strong>{targetYearObj ? `${targetYearObj.nama} Smt ${targetYearObj.semester}` : '-'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Dipindahkan / Naik Kelas:</span>{' '}
                  <strong style={{ color: '#1D4ED8' }}>{liveSummary.promote + liveSummary.keep} siswa</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Diluluskan (Alumni):</span>{' '}
                  <strong style={{ color: '#059669' }}>{liveSummary.graduate} siswa</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Tinggal Kelas:</span>{' '}
                  <strong style={{ color: '#B45309' }}>{liveSummary.retain} siswa</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Aktifkan Periode Tujuan:</span>{' '}
                  <strong>{activateTargetYear ? 'Ya, aktifkan otomatis' : 'Tidak (tetap periode lama)'}</strong>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                fontSize: 'var(--font-size-xs)',
                color: '#065F46',
                lineHeight: 1.5,
              }}
            >
              Proses dijalankan secara <strong>atomik (database transaction)</strong> dan dicatat ke Log Aktivitas. Riwayat absensi periode sebelumnya tetap tersimpan terpisah berdasarkan <code>tahunAjarId</code>.
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--color-border-light)' }}>
              <Button variant="ghost" onClick={() => setStep(2)} disabled={submitting}>← Ubah Pemetaan</Button>
              <Button onClick={handleExecute} disabled={submitting}>
                {submitting ? 'Memproses...' : 'Jalankan Sekarang'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function FragmentRow({
  mapping,
  allClasses,
  studentList,
  isExpanded,
  exceptionCount,
  retainStudentIds,
  excludedStudentIds,
  onToggleExpand,
  onUpdateMapping,
  onToggleRetain,
  onToggleExclude,
}) {
  const needsTargetClass = mapping.action === 'promote';
  const isMissingTarget = needsTargetClass && !mapping.targetClassId;

  return (
    <>
      <tr style={{ borderBottom: '1px solid var(--color-border-light)', background: isMissingTarget ? '#FEF2F2' : 'var(--color-surface)' }}>
        <td style={{ padding: '10px 12px', fontWeight: 700 }}>
          {mapping.sourceClassName}
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-muted)' }}>
            {mapping.studentCount} siswa aktif
          </div>
        </td>
        <td style={{ padding: '10px 12px' }}>
          <select
            value={mapping.action}
            onChange={(e) => onUpdateMapping({ action: e.target.value })}
            style={{
              padding: '6px 8px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            {ACTION_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </td>
        <td style={{ padding: '10px 12px' }}>
          {needsTargetClass ? (
            <select
              value={mapping.targetClassId || ''}
              onChange={(e) => {
                const chosen = allClasses.find(c => c.id === e.target.value);
                onUpdateMapping({
                  targetClassId: chosen?.id || null,
                  targetClassName: chosen?.name || null,
                });
              }}
              style={{
                padding: '6px 8px',
                borderRadius: 'var(--radius-md)',
                border: isMissingTarget ? '1px solid #DC2626' : '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                fontSize: 'var(--font-size-xs)',
                minWidth: '140px',
              }}
            >
              <option value="">-- Pilih Kelas Tujuan --</option>
              {allClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          ) : mapping.action === 'graduate' ? (
            <Badge variant="success">Lulus (Alumni)</Badge>
          ) : mapping.action === 'skip' ? (
            <Badge variant="default">Dilewati</Badge>
          ) : (
            <Badge variant="info">{mapping.sourceClassName}</Badge>
          )}
        </td>
        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
          <button
            type="button"
            onClick={onToggleExpand}
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '4px 10px',
              background: exceptionCount > 0 ? '#FFFBEB' : 'var(--color-surface)',
              color: exceptionCount > 0 ? '#B45309' : 'var(--color-text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isExpanded ? 'Tutup' : `Siswa (${studentList.length})${exceptionCount > 0 ? ` • ${exceptionCount} khusus` : ''}`}
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={4} style={{ padding: '10px 14px', background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border-light)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              Tandai siswa tertentu jika perlu <strong>Tinggal Kelas</strong> atau <strong>Lewati</strong>:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '6px' }}>
              {studentList.map(st => {
                const isRetained = retainStudentIds.includes(st.studentId);
                const isExcluded = excludedStudentIds.includes(st.studentId);
                return (
                  <div
                    key={st.studentId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border-light)',
                    }}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                      {st.studentName}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => onToggleRetain(st.studentId)}
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: isRetained ? '1px solid #D97706' : '1px solid var(--color-border)',
                          background: isRetained ? '#FEF3C7' : 'transparent',
                          color: isRetained ? '#92400E' : 'var(--color-text-muted)',
                          fontSize: '10px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Tinggal
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleExclude(st.studentId)}
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: isExcluded ? '1px solid #DC2626' : '1px solid var(--color-border)',
                          background: isExcluded ? '#FEE2E2' : 'transparent',
                          color: isExcluded ? '#991B1B' : 'var(--color-text-muted)',
                          fontSize: '10px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Lewati
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
