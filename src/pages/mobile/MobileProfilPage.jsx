/* ============================================================
   MobileProfilPage.jsx — Profil Pengguna & Logout
   ============================================================ */

import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function getRoleLabel(role) {
  const labels = {
    guru: 'Guru', staff: 'Staff TU', kepsek: 'Kepala Sekolah',
    admin: 'Administrator', wali_murid: 'Wali Murid',
  };
  return labels[role] || role;
}

const MENU_ITEMS = [
  { icon: '👤', label: 'Data Profil', sublabel: 'Lihat & edit profil' },
  { icon: '🔒', label: 'Ganti Password', sublabel: 'Perbarui kata sandi' },
  { icon: '🔔', label: 'Pengaturan Notifikasi', sublabel: 'Kelola notifikasi' },
  { icon: '📱', label: 'Tentang Aplikasi', sublabel: 'Versi 1.0.0 — SIA Mu4ra' },
];

export default function MobileProfilPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (confirm('Yakin ingin keluar?')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <div style={{ padding: '16px 20px', animation: 'fadeInUp 0.4s ease' }}>
      {/* Profile Card */}
      <div style={{
        padding: '24px',
        borderRadius: '20px',
        background: 'rgba(255, 255, 255, 0.8)',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: '150px', height: '150px',
          background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
        }} />

        {/* Avatar */}
        <div style={{
          width: '80px', height: '80px', borderRadius: '24px',
          background: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px', fontWeight: 700, color: 'white',
          boxShadow: '0 8px 24px rgba(124,58,237,0.5)',
          marginBottom: '14px',
        }}>
          {getInitials(user?.name)}
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px', textAlign: 'center' }}>
          {user?.name || 'Pengguna'}
        </h2>
        <span style={{
          padding: '3px 14px',
          borderRadius: '20px',
          background: 'rgba(124,58,237,0.1)',
          border: '1px solid rgba(124,58,237,0.2)',
          fontSize: '12px', fontWeight: 500,
          color: '#7C3AED', marginBottom: '4px',
        }}>
          {getRoleLabel(user?.role)}
        </span>
        {user?.nip && (
          <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0' }}>
            NIP: {user.nip}
          </p>
        )}
      </div>

      {/* Menu Items */}
      <div style={{
        borderRadius: '16px',
        background: 'rgba(255, 255, 255, 0.8)',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
        overflow: 'hidden',
        marginBottom: '16px',
      }}>
        {MENU_ITEMS.map((item, i) => (
          <button
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              width: '100%',
              padding: '16px',
              background: 'none',
              border: 'none',
              borderBottom: i < MENU_ITEMS.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <span style={{
              width: '38px', height: '38px', borderRadius: '11px',
              background: 'rgba(0,0,0,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', flexShrink: 0,
            }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{item.label}</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>{item.sublabel}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        ))}
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        style={{
          width: '100%',
          padding: '15px',
          borderRadius: '14px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#DC2626',
          fontSize: '15px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Keluar dari Aplikasi
      </button>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
