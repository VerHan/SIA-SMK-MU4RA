import { useState, useEffect } from 'react';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import Badge from './Badge';
import { getStudentProfile } from '../../services/api';

export default function StudentDetailModal({ isOpen, onClose, studentId }) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (isOpen && studentId) {
      setLoading(true);
      getStudentProfile(studentId).then(data => {
        setProfile(data);
        setLoading(false);
      });
    }
  }, [isOpen, studentId]);

  if (!isOpen) return null;

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ padding: 'var(--space-8)' }}>
          <LoadingSpinner message="Memuat detail siswa..." />
        </div>
      );
    }

    if (!profile || !profile.student) {
      return (
        <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Data siswa tidak ditemukan.
        </div>
      );
    }

    const { student, piketSummary, mapelSummary, attitudeRecords } = profile;
    const piketPercentage = piketSummary.total > 0 ? Math.round((piketSummary.hadir / piketSummary.total) * 100) : 0;

    return (
      <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        
        {/* Header Profil */}
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
          <div style={{ 
            width: '64px', height: '64px', borderRadius: '50%', 
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'var(--font-size-2xl)', fontWeight: 'bold'
          }}>
            {student.name.charAt(0)}
          </div>
          <div>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', marginBottom: '4px' }}>{student.name}</h2>
            <div style={{ display: 'flex', gap: '8px', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
              <span>{student.nis}</span> • 
              <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>{student.class}</span> • 
              <span>{student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
            </div>
          </div>
        </div>

        {/* Kehadiran Piket */}
        <div>
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'bold', marginBottom: 'var(--space-3)', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '8px' }}>
            Ringkasan Kehadiran Harian (Piket)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 'var(--space-2)' }}>
            <div style={{ background: '#ECFDF5', padding: '12px', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>{piketSummary.hadir}</div>
              <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px', textTransform: 'uppercase' }}>Hadir</div>
            </div>
            <div style={{ background: '#EFF6FF', padding: '12px', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563EB' }}>{piketSummary.izin}</div>
              <div style={{ fontSize: '11px', color: '#2563EB', marginTop: '4px', textTransform: 'uppercase' }}>Izin</div>
            </div>
            <div style={{ background: '#FFFBEB', padding: '12px', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#D97706' }}>{piketSummary.sakit}</div>
              <div style={{ fontSize: '11px', color: '#D97706', marginTop: '4px', textTransform: 'uppercase' }}>Sakit</div>
            </div>
            <div style={{ background: '#FEF2F2', padding: '12px', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#DC2626' }}>{piketSummary.alpha}</div>
              <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px', textTransform: 'uppercase' }}>Alpha</div>
            </div>
            <div style={{ background: 'var(--color-surface-alt)', padding: '12px', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-text)' }}>{piketPercentage}%</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', textTransform: 'uppercase' }}>Persentase</div>
            </div>
          </div>
        </div>

        {/* Kehadiran per Mapel */}
        <div>
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'bold', marginBottom: 'var(--space-3)', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '8px' }}>
            Kehadiran Mata Pelajaran
          </h3>
          {Object.keys(mapelSummary).length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Belum ada data kehadiran per mapel.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(mapelSummary).map(([subject, counts]) => {
                const mapelPercentage = counts.total > 0 ? Math.round((counts.hadir / counts.total) * 100) : 0;
                return (
                  <div key={subject} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', width: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subject}</div>
                    
                    {/* Progress Bar Container */}
                    <div style={{ flex: 1, margin: '0 16px', height: '6px', background: 'var(--color-border-light)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: mapelPercentage >= 80 ? '#10B981' : mapelPercentage >= 60 ? '#F59E0B' : '#EF4444', width: `${mapelPercentage}%`, borderRadius: '3px' }} />
                    </div>
                    
                    <div style={{ fontSize: '12px', fontWeight: 'bold', minWidth: '40px', textAlign: 'right' }}>{mapelPercentage}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Jurnal Sikap */}
        <div>
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'bold', marginBottom: 'var(--space-3)', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '8px' }}>
            Jurnal Sikap & Karakter
          </h3>
          {attitudeRecords.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Belum ada catatan sikap untuk siswa ini.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {attitudeRecords.map(att => (
                <div key={att.id} style={{ display: 'flex', gap: '12px', padding: '12px', border: '1px solid var(--color-border-light)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '20px' }}>
                    {att.type === 'positif' ? '👍' : '👎'}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text)' }}>{att.note}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      {att.date} • Dicatat oleh: {att.teacherName}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Profil & Rapor Karakter Siswa" size="lg">
      {renderContent()}
    </Modal>
  );
}
