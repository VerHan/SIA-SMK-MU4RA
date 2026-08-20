/* ============================================================
   MobileNilaiPage.jsx — Nilai Siswa (Mobile Read View)
   ============================================================ */

import { useState, useEffect } from 'react';
import { getClasses, getStudents, getGrades } from '../../services/api';

export default function MobileNilaiPage() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => { getClasses().then(setClasses); }, []);

  const handleSelectClass = async (cls) => {
    setSelectedClass(cls);
    const studs = await getStudents(cls);
    setStudents(studs);
    setStep(2);
  };

  const handleSelectStudent = async (stu) => {
    setSelectedStudent(stu);
    setLoading(true);
    const data = await getGrades(stu.id);
    setGrades(data);
    setLoading(false);
    setStep(3);
  };

  const getGradeBadge = (score) => {
    if (score >= 90) return { label: 'A', color: '#34D399', bg: 'rgba(5,150,105,0.2)' };
    if (score >= 80) return { label: 'B', color: '#60A5FA', bg: 'rgba(59,130,246,0.2)' };
    if (score >= 70) return { label: 'C', color: '#FBBF24', bg: 'rgba(245,158,11,0.2)' };
    return { label: 'D', color: '#F87171', bg: 'rgba(239,68,68,0.2)' };
  };

  // Step 3: Nilai siswa
  if (step === 3 && selectedStudent) {
    const avg = grades.length > 0 ? Math.round(grades.reduce((s, g) => s + (g.score || 0), 0) / grades.length) : 0;
    const badge = getGradeBadge(avg);
    return (
      <div style={{ padding: '16px 20px', animation: 'fadeInUp 0.4s ease' }}>
        <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ← Kembali
        </button>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>{selectedStudent.name}</h2>
        <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px' }}>
          {selectedStudent.class} · NIS: {selectedStudent.nis}
        </p>

        {/* Average Badge */}
        <div style={{
          padding: '20px', borderRadius: '20px', marginBottom: '16px', textAlign: 'center',
          background: badge.bg, border: `1px solid ${badge.color}44`,
        }}>
          <div style={{ fontSize: '48px', fontWeight: 800, color: badge.color }}>{avg}</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: badge.color }}>Rata-rata Nilai — Grade {badge.label}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {grades.map((g, i) => {
            const b = getGradeBadge(g.score);
            return (
              <div key={i} style={{
                padding: '12px 14px', borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }}>{g.subject}</p>
                  <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>{g.semester}</p>
                </div>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                  background: b.bg, border: `1px solid ${b.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', fontWeight: 700, color: b.color,
                }}>
                  {g.score}
                </div>
              </div>
            );
          })}
        </div>
        <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
      </div>
    );
  }

  // Step 2: Pilih Siswa
  if (step === 2) {
    return (
      <div style={{ padding: '16px 20px', animation: 'fadeInUp 0.4s ease' }}>
        <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ← Kembali
        </button>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>Pilih Siswa — {selectedClass}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {students.map((stu, i) => (
            <button key={stu.id} onClick={() => handleSelectStudent(stu)} style={{
              padding: '12px 14px', borderRadius: '14px', textAlign: 'left',
              background: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                background: 'linear-gradient(135deg, #D97706, #92400E)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700, color: 'white',
              }}>{i + 1}</div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', margin: 0 }}>{stu.name}</p>
                <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>{stu.nis}</p>
              </div>
              <svg style={{ marginLeft: 'auto' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ))}
        </div>
        <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
      </div>
    );
  }

  // Step 1: Pilih Kelas
  return (
    <div style={{ padding: '16px 20px', animation: 'fadeInUp 0.4s ease' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Nilai Siswa</h2>
      <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px' }}>Pilih kelas terlebih dahulu</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        {classes.map(cls => (
          <button key={cls.id} onClick={() => handleSelectClass(cls.name)} style={{
            padding: '20px 14px', borderRadius: '16px', textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
            cursor: 'pointer', transition: 'all 0.2s ease',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'white'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)'}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🏫</div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }}>{cls.name}</p>
            <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>{cls.totalStudents} siswa</p>
          </button>
        ))}
      </div>
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
