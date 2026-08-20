/* ============================================================
   MobileSettingsPage.jsx — Pengaturan Akun Mobile
   ============================================================ */

import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function MobileSettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const SETTING_SECTIONS = [
    {
      title: 'Akun',
      items: [
        { icon: '👤', label: 'Edit Profil', sublabel: 'Ubah nama dan foto profil' },
        { icon: '🔒', label: 'Ganti Password', sublabel: 'Perbarui kata sandi Anda' },
      ],
    },
    {
      title: 'Aplikasi',
      items: [
        { icon: '🔔', label: 'Notifikasi', sublabel: 'Atur preferensi notifikasi' },
        { icon: '🌙', label: 'Tema', sublabel: 'Dark mode (default)' },
        { icon: '📱', label: 'Tampilan', sublabel: 'Ukuran teks & aksesibilitas' },
      ],
    },
    {
      title: 'Informasi',
      items: [
        { icon: '📌', label: 'Tentang Aplikasi', sublabel: 'SIA Mu4ra v1.0.0' },
        { icon: '📞', label: 'Kontak Admin', sublabel: 'Laporkan masalah atau pertanyaan' },
      ],
    },
  ];

  return (
    <div style={{ padding: '16px 20px', animation: 'fadeInUp 0.4s ease' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: '0 0 20px' }}>Pengaturan</h2>

      {SETTING_SECTIONS.map((section, si) => (
        <div key={si} style={{ marginBottom: '20px' }}>
          <p style={{
            fontSize: '11px', fontWeight: 700, color: '#64748B',
            textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 8px',
          }}>
            {section.title}
          </p>
          <div style={{
            borderRadius: '16px', background: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          }}>
            {section.items.map((item, ii) => (
              <button key={ii} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                width: '100%', padding: '14px 16px',
                background: 'none', border: 'none',
                borderBottom: ii < section.items.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <span style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'rgba(0,0,0,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '17px', flexShrink: 0,
                }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{item.label}</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>{item.sublabel}</div>
                </div>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* User info card */}
      <div style={{
        padding: '14px 16px', borderRadius: '14px',
        background: 'rgba(124, 58, 237, 0.05)', border: '1px solid rgba(124, 58, 237, 0.2)',
        marginBottom: '16px',
      }}>
        <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 2px' }}>Login sebagai</p>
        <p style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{user?.name}</p>
        <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>{user?.username}</p>
      </div>

      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
