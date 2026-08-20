/* ============================================================
   MobileAbsenMapelPage.jsx — Absen per Mata Pelajaran (Mobile)
   ============================================================ */

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  getSchedule, getStudents, saveSubjectAttendance, getSubjectAttendance
} from '../../services/api';
import { DAYS } from '../../config/constants';

const STATUS_OPTIONS = [
  { value: 'hadir', label: '✅ Hadir', color: '#059669', bg: 'rgba(5,150,105,0.2)', border: 'rgba(5,150,105,0.4)' },
  { value: 'izin', label: '📋 Izin', color: '#3B82F6', bg: 'rgba(59,130,246,0.2)', border: 'rgba(59,130,246,0.4)' },
  { value: 'sakit', label: '🏥 Sakit', color: '#F59E0B', bg: 'rgba(245,158,11,0.2)', border: 'rgba(245,158,11,0.4)' },
  { value: 'alpha', label: '❌ Alpha', color: '#EF4444', bg: 'rgba(239,68,68,0.2)', border: 'rgba(239,68,68,0.4)' },
];

export default function MobileAbsenMapelPage() {
  const { user } = useAuth();
  const todayIdx = new Date().getDay();
  const todayName = DAYS[todayIdx - 1] || 'Senin';
  const todayDate = new Date().toISOString().split('T')[0];

  const [schedule, setSchedule] = useState([]);
  const [selectedSched, setSelectedSched] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [step, setStep] = useState(1); // 1: pilih kelas, 2: input absen

  useEffect(() => {
    getSchedule(todayName).then(data => {
      const myClasses = data.filter(s => s.teacher === user?.name);
      setSchedule(myClasses);
    });
  }, [user?.name, todayName]);

  const handleSelectClass = async (sched) => {
    setSelectedSched(sched);
    setLoading(true);
    const [studs, existingAbsen] = await Promise.all([
      getStudents(sched.class),
      getSubjectAttendance(sched.class),
    ]);
    setStudents(studs);
    // Pre-fill existing attendance
    const initAtt = {};
    studs.forEach(s => {
      const existing = existingAbsen.find(a =>
        a.studentId === s.id && a.date === todayDate && a.subject === sched.subject
      );
      initAtt[s.id] = existing?.status || 'hadir';
    });
    setAttendance(initAtt);
    setLoading(false);
    setStep(2);
    setSaved(false);
  };

  const handleSubmit = async () => {
    setSaving(true);
    const records = students.map(s => ({
      studentId: s.id, studentName: s.name, class: selectedSched.class,
      date: todayDate, subject: selectedSched.subject,
      jamKe: selectedSched.jamKe, status: attendance[s.id] || 'hadir',
      guruId: user?.id,
    }));
    await saveSubjectAttendance(records);
    setSaving(false);
    setSaved(true);
  };

  if (step === 2 && selectedSched) {
    return (
      <div style={{ padding: '16px 20px', animation: 'fadeInUp 0.4s ease' }}>
        <button onClick={() => setStep(1)} style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
          fontSize: '13px', cursor: 'pointer', padding: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          ← Kembali
        </button>

        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>
          {selectedSched.subject}
        </h2>
        <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px' }}>
          Kelas {selectedSched.class} · Jam ke-{selectedSched.jamKe} · {todayDate}
        </p>

        {saved && (
          <div style={{
            padding: '12px 16px', borderRadius: '12px', marginBottom: '14px',
            background: 'rgba(5,150,105,0.15)', border: '1px solid rgba(5,150,105,0.4)',
            fontSize: '13px', color: '#34D399', fontWeight: 500,
          }}>
            ✅ Absensi berhasil disimpan!
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '40px 0' }}>Memuat siswa...</div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {students.map((stu, i) => (
                <div key={stu.id} style={{
                  padding: '12px 14px', borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(0,0,0,0.06)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700, color: 'white', flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', margin: 0 }}>{stu.name}</p>
                      <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>{stu.nis}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {STATUS_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setAttendance(prev => ({ ...prev, [stu.id]: opt.value }))}
                        style={{
                          padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 500,
                          cursor: 'pointer', transition: 'all 0.15s ease',
                          background: attendance[stu.id] === opt.value ? opt.bg : 'rgba(0,0,0,0.03)',
                          border: `1px solid ${attendance[stu.id] === opt.value ? opt.border : 'rgba(0,0,0,0.05)'}`,
                          color: attendance[stu.id] === opt.value ? opt.color : '#64748B',
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleSubmit} disabled={saving} style={{
              width: '100%', padding: '16px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
              border: 'none', color: 'white', fontSize: '15px', fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
            }}>
              {saving ? 'Menyimpan...' : '💾 Simpan Absensi'}
            </button>
          </>
        )}

        <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 20px', animation: 'fadeInUp 0.4s ease' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Absen Mapel</h2>
      <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px' }}>
        Pilih kelas yang sedang diajar hari {todayName}
      </p>

      {schedule.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '40px 20px', borderRadius: '16px',
          background: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📚</div>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>
            Tidak ada jadwal mengajar hari ini
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {schedule.map((sched, i) => (
            <button key={sched.id || i} onClick={() => handleSelectClass(sched)} style={{
              padding: '16px', borderRadius: '16px', textAlign: 'left',
              background: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              cursor: 'pointer', transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', gap: '14px',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'white'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)'}
            >
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
                background: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(124,58,237,0.4)',
              }}>
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)' }}>Jam</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>{sched.jamKe || i + 1}</span>
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: '0 0 3px' }}>{sched.subject}</p>
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>Kelas {sched.class}</p>
              </div>
              <svg style={{ marginLeft: 'auto' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          ))}
        </div>
      )}
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
