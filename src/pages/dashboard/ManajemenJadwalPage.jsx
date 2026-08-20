import { useState } from 'react';
import ScheduleMatrix from '../../components/schedule/ScheduleMatrix';
import MasterSesiPage from './MasterSesiPage';
import KalenderAkademikPage from './KalenderAkademikPage';

export default function ManajemenJadwalPage() {
  const [activeTab, setActiveTab] = useState('plotting');

  const tabs = [
    { id: 'plotting', label: 'Plotting Jadwal' },
    { id: 'sesi', label: 'Master Sesi Waktu' },
    { id: 'kalender', label: 'Kalender Akademik' },
  ];

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)' }}>
          Manajemen Jadwal & Waktu
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Atur jadwal pelajaran, sesi waktu, dan kalender libur akademik.
        </p>
      </div>

      <div style={{ borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-6)', display: 'flex', gap: 'var(--space-6)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: 'var(--space-3) 0',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === tab.id ? 'var(--font-weight-bold)' : 'var(--font-weight-medium)',
              fontSize: 'var(--font-size-sm)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'plotting' && <ScheduleMatrix />}
        {activeTab === 'sesi' && (
          <div style={{ padding: 'var(--space-2)' }}>
            <MasterSesiPage hideTitle={true} />
          </div>
        )}
        {activeTab === 'kalender' && (
          <div style={{ padding: 'var(--space-2)' }}>
            <KalenderAkademikPage hideTitle={true} />
          </div>
        )}
      </div>
    </div>
  );
}
