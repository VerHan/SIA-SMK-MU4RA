/* ============================================================
   MobileAbsenPiketPage.jsx — Input Absen Piket Mobile (PWA)
   Khusus Guru Piket, Staff, dan Admin. Session-scoped + Conflict-safe.
   ============================================================ */

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getClasses, getStudents, getAttendance, saveAttendance } from '../../services/api';
import { invalidateAttendanceQueries } from '../../hooks/useRealtimeSync';
import Toast from '../../components/ui/Toast';

const STATUS_OPTS = [
  { key: 'hadir', label: 'H', bg: '#10B981' },
  { key: 'izin', label: 'I', bg: '#3B82F6' },
  { key: 'sakit', label: 'S', bg: '#F59E0B' },
  { key: 'alpha', label: 'A', bg: '#EF4444' },
];

export default function MobileAbsenPiketPage() {
  const queryClient = useQueryClient();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sesi, setSesi] = useState('pagi'); // 'pagi' | 'sore'

  const [students, setStudents] = useState([]);
  const [attendancePagi, setAttendancePagi] = useState({});
  const [attendanceSore, setAttendanceSore] = useState({});
  const [recordMeta, setRecordMeta] = useState({});

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [conflictMsg, setConflictMsg] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    getClasses().then((list) => {
      setClasses(list);
      if (list.length > 0) setSelectedClass(list[0].name);
    });
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    let active = true;
    setLoading(true);
    setConflictMsg('');

    Promise.all([
      getStudents(selectedClass),
      getAttendance(selectedClass, selectedDate),
    ]).then(([studentList, attList]) => {
      if (!active) return;
      setStudents(studentList);
      const pagi = {};
      const sore = {};
      const meta = {};
      studentList.forEach(s => {
        const existing = attList.find(a => a.studentId === s.id);
        pagi[s.id] = existing?.statusPagi || 'hadir';
        sore[s.id] = existing?.statusSore || 'hadir';
        meta[s.id] = {
          updatedAt: existing?.updatedAt || null,
          statusPagi: existing?.statusPagi || null,
          statusSore: existing?.statusSore || null,
        };
      });
      setAttendancePagi(pagi);
      setAttendanceSore(sore);
      setRecordMeta(meta);
      setLoading(false);
    });

    return () => { active = false; };
  }, [selectedClass, selectedDate, reloadTick]);

  const setStudentStatus = (studentId, status) => {
    if (sesi === 'pagi') {
      setAttendancePagi(prev => ({ ...prev, [studentId]: status }));
    } else {
      setAttendanceSore(prev => ({ ...prev, [studentId]: status }));
    }
  };

  const handleSave = async () => {
    if (students.length === 0) return;
    setSubmitting(true);
    setConflictMsg('');

    const records = students.map(s => {
      const meta = recordMeta[s.id] || {};
      return {
        studentId: s.id,
        studentName: s.name,
        class: selectedClass,
        date: selectedDate,
        ...(sesi === 'pagi'
          ? { statusPagi: attendancePagi[s.id], expectedStatusPagi: meta.statusPagi }
          : { statusSore: attendanceSore[s.id], expectedStatusSore: meta.statusSore }),
        expectedUpdatedAt: meta.updatedAt || null,
      };
    });

    const res = await saveAttendance(records, { session: sesi });
    setSubmitting(false);

    if (res.success) {
      if (Array.isArray(res.records)) {
        setRecordMeta(prev => {
          const next = { ...prev };
          res.records.forEach(r => {
            next[r.studentId] = {
              updatedAt: r.updatedAt || new Date().toISOString(),
              statusPagi: r.statusPagi || null,
              statusSore: r.statusSore || null,
            };
          });
          return next;
        });
      }
      invalidateAttendanceQueries(queryClient);
      setToast({ message: `Absen piket ${sesi} (${selectedClass}) tersimpan!`, type: 'success' });
    } else if (res.conflict) {
      setConflictMsg(res.error || 'Data sesi ini baru saja diubah petugas piket lain.');
      setToast({ message: 'Konflik data terdeteksi. Muat ulang data terbaru.', type: 'error' });
    } else {
      setToast({ message: res.error || 'Gagal menyimpan absensi piket.', type: 'error' });
    }
  };

  return (
    <div style={{ padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{
        background: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)',
        borderRadius: '18px',
        padding: '16px 18px',
        color: 'white',
      }}>
        <div style={{ fontSize: '11px', opacity: 0.9, fontWeight: 600, textTransform: 'uppercase' }}>
          Tugas Khusus Guru Piket
        </div>
        <h1 style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px', color: '#FFFFFF' }}>
          Absensi Piket Pagi & Sore
        </h1>
        <p style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px', lineHeight: 1.4 }}>
          Input sesi Pagi dan Sore terpisah secara aman — tidak saling menimpa saat dipakai bersamaan.
        </p>
      </div>

      {/* Filters */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '14px',
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
              KELAS
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 10px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
              TANGGAL
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                fontSize: '13px',
              }}
            />
          </div>
        </div>

        {/* Session toggle */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {['pagi', 'sore'].map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSesi(s)}
              style={{
                padding: '10px',
                borderRadius: '10px',
                border: sesi === s ? 'none' : '1px solid #CBD5E1',
                background: sesi === s ? '#0F766E' : '#F8FAFC',
                color: sesi === s ? 'white' : '#475569',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {s === 'pagi' ? 'Sesi Pagi' : 'Sesi Sore'}
            </button>
          ))}
        </div>
      </div>

      {/* Conflict Alert */}
      {conflictMsg && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '14px',
          padding: '12px 14px',
          color: '#991B1B',
          fontSize: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <span>⚠️ {conflictMsg}</span>
          <button
            type="button"
            onClick={() => setReloadTick(t => t + 1)}
            style={{
              alignSelf: 'flex-start',
              padding: '7px 12px',
              borderRadius: '8px',
              border: 'none',
              background: '#DC2626',
              color: 'white',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Muat Ulang Data Terbaru
          </button>
        </div>
      )}

      {/* Student List */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: '#64748B' }}>
            Memuat daftar siswa...
          </div>
        ) : students.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: '#94A3B8' }}>
            Belum ada siswa aktif di kelas ini.
          </div>
        ) : (
          students.map((s, idx) => {
            const current = sesi === 'pagi' ? attendancePagi[s.id] : attendanceSore[s.id];
            return (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px',
                  borderRadius: '12px',
                  background: '#F8FAFC',
                  border: '1px solid #F1F5F9',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {idx + 1}. {s.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    NIS: {s.nis || s.nomor || '-'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  {STATUS_OPTS.map(opt => {
                    const active = current === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setStudentStatus(s.id, opt.key)}
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          border: active ? 'none' : '1px solid #CBD5E1',
                          background: active ? opt.bg : 'white',
                          color: active ? 'white' : '#475569',
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Save Button */}
      <button
        type="button"
        disabled={submitting || loading || students.length === 0}
        onClick={handleSave}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '14px',
          border: 'none',
          background: submitting ? '#94A3B8' : '#0F766E',
          color: 'white',
          fontSize: '14px',
          fontWeight: 700,
          cursor: submitting ? 'not-allowed' : 'pointer',
          boxShadow: '0 6px 16px rgba(15, 118, 110, 0.24)',
        }}
      >
        {submitting ? 'Menyimpan...' : `Simpan Absen Piket (${sesi.toUpperCase()})`}
      </button>
    </div>
  );
}
