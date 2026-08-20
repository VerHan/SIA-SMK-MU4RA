/* ============================================================
   MobileSikapPage.jsx — Poin Sikap Siswa (Mobile Read View)
   ============================================================ */

import { useState, useEffect } from 'react';
import { getClasses, getStudents, getBehaviorPoints } from '../../services/api';

export default function MobileSikapPage() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [points, setPoints] = useState([]);
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
    const data = await getBehaviorPoints(stu.id);
    setPoints(data);
    setLoading(false);
    setStep(3);
  };

  // Step 3: Detail poin sikap siswa
  if (step === 3 && selectedStudent) {
    const totalPositif = points.filter(p => p.poin > 0).reduce((s, p) => s + p.poin, 0);
    const totalNegatif = points.filter(p => p.poin < 0).reduce((s, p) => s + p.poin, 0);
    const total = totalPositif + totalNegatif;
    const safeScore = Math.max(0, Math.min(100, 100 + total));

    return (
      <div style={{ padding: '16px 20px', animation: 'fadeInUp 0.4s ease' }}>
        <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ← Kembali
        </button>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>{selectedStudent.name}</h2>
        <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px' }}>
          {selectedStudent.class} · Poin Sikap
        </p>

        {/* Score Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
          {[
            { label: 'Positif', value: `+${totalPositif}`, color: '#34D399', bg: 'rgba(5,150,105,0.15)' },
            { label: 'Negatif', value: totalNegatif, color: '#F87171', bg: 'rgba(239,68,68,0.15)' },
            { label: 'Skor', value: safeScore, color: '#60A5FA', bg: 'rgba(59,130,246,0.15)' },
          ].map((stat, i) => (
            <div key={i} style={{
              padding: '14px 10px', borderRadius: '14px', textAlign: 'center',
              background: stat.bg, border: `1px solid ${stat.color}33`,
            }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Points List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {points.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748B', padding: '30px', fontSize: '14px' }}>
              Belum ada catatan poin
            </div>
          ) : points.map((pt, i) => (
            <div key={i} style={{
              padding: '12px 14px', borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                background: pt.poin > 0 ? 'rgba(5,150,105,0.2)' : 'rgba(239,68,68,0.2)',
                border: `1px solid ${pt.poin > 0 ? 'rgba(5,150,105,0.4)' : 'rgba(239,68,68,0.4)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: 700,
                color: pt.poin > 0 ? '#34D399' : '#F87171',
              }}>
                {pt.poin > 0 ? `+${pt.poin}` : pt.poin}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }}>{pt.aturanNama}</p>
                <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>
                  {pt.tanggal} · {pt.pencatat}
                </p>
              </div>
            </div>
          ))}
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
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>Siswa — {selectedClass}</h2>
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
                background: 'linear-gradient(135deg, #DC2626, #991B1B)',
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
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Poin Sikap</h2>
      <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px' }}>Pilih kelas untuk melihat poin sikap siswa</p>
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
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>⭐</div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }}>{cls.name}</p>
            <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>{cls.totalStudents} siswa</p>
          </button>
        ))}
      </div>
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
