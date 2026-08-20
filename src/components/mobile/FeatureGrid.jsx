/* ============================================================
   FeatureGrid.jsx — Icon Grid Fitur Utama Mobile
   Smaller icons (4 per row), cleaner white/blue aesthetic
   ============================================================ */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ALL_FEATURES = [
  {
    key: 'absen-gps',
    label: 'Absen GPS',
    path: '/app/absen-gps',
    roles: ['guru', 'staff'],
    color: '#3B82F6',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    ),
  },
  {
    key: 'absen-mapel',
    label: 'Absen Mapel',
    path: '/app/absen-mapel',
    roles: ['guru', 'admin'],
    color: '#6366F1',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="9" y1="13" x2="15" y2="13"/>
        <line x1="9" y1="17" x2="15" y2="17"/>
      </svg>
    ),
  },
  {
    key: 'jadwal',
    label: 'Jadwal',
    path: '/app/jadwal',
    roles: ['guru', 'staff', 'admin', 'kepsek'],
    color: '#0EA5E9',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    key: 'nilai',
    label: 'Nilai',
    path: '/app/nilai',
    roles: ['guru', 'admin', 'kepsek'],
    color: '#8B5CF6',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    key: 'sikap',
    label: 'Poin Sikap',
    path: '/app/sikap',
    roles: ['guru', 'admin', 'kepsek'],
    color: '#EC4899',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
  {
    key: 'absen-piket',
    label: 'Piket',
    path: '/app/absen-piket',
    roles: ['guru', 'admin'],
    color: '#14B8A6',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
        <line x1="9" y1="12" x2="15" y2="12"/>
        <line x1="9" y1="16" x2="15" y2="16"/>
      </svg>
    ),
  },
];

export default function FeatureGrid() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || 'guru';
  const features = ALL_FEATURES.filter(f => f.roles.includes(role));

  return (
    <div style={{ padding: '0 16px' }}>
      <p style={{
        fontSize: '12px', fontWeight: 600,
        color: '#64748B',
        letterSpacing: '0.6px', textTransform: 'uppercase',
        marginBottom: '12px', padding: '0 4px',
      }}>
        Menu Utama
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
      }}>
        {features.map(feat => (
          <button
            key={feat.key}
            onClick={() => navigate(feat.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '7px',
              padding: '14px 6px 12px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.borderColor = `${feat.color}44`;
              e.currentTarget.style.boxShadow = `0 4px 12px ${feat.color}15`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)';
              e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.02)';
            }}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {/* Icon circle */}
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: `${feat.color}10`,
              border: `1px solid ${feat.color}22`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {/* Re-render icon with the feature color as stroke */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={feat.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {feat.key === 'absen-gps' && <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>}
                {feat.key === 'absen-mapel' && <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></>}
                {feat.key === 'jadwal' && <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>}
                {feat.key === 'nilai' && <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>}
                {feat.key === 'sikap' && <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>}
                {feat.key === 'absen-piket' && <><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/></>}
              </svg>
            </div>

            <span style={{
              fontSize: '11px', fontWeight: 600, color: '#334155',
              lineHeight: 1.2, textAlign: 'center', marginTop: '2px',
            }}>
              {feat.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
