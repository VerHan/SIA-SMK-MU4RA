/* ============================================================
   MobileProfilPage.jsx — Profil Pengguna & Logout
   ============================================================ */

import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { changeMyPassword } from '../../services/api';
import PWAInstallButton from '../../components/shared/PWAInstallButton';

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
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdStatus, setPwdStatus] = useState(null);
  const [savingPwd, setSavingPwd] = useState(false);

  const handleLogout = async () => {
    if (!confirmLogout) {
      setConfirmLogout(true);
      return;
    }
    await logout();
    navigate('/login', { replace: true });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdStatus(null);
    if (newPassword.trim().length < 8) {
      setPwdStatus({ type: 'error', message: 'Password baru minimal 8 karakter.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdStatus({ type: 'error', message: 'Konfirmasi password baru tidak cocok.' });
      return;
    }
    setSavingPwd(true);
    const res = await changeMyPassword(currentPassword, newPassword);
    setSavingPwd(false);
    if (res?.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwdStatus({ type: 'success', message: res.message || 'Password berhasil diperbarui!' });
    } else {
      setPwdStatus({ type: 'error', message: res?.error || 'Gagal mengganti password.' });
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
            type="button"
            onClick={() => {
              if (item.label === 'Ganti Password') {
                setPwdStatus(null);
                setShowPwdModal(true);
              }
            }}
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

      {/* In-App Install PWA */}
      <div style={{ marginBottom: '12px' }}>
        <PWAInstallButton fullWidth />
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        style={{
          width: '100%',
          padding: '15px',
          borderRadius: '14px',
          background: confirmLogout ? '#DC2626' : 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          color: confirmLogout ? '#FFFFFF' : '#DC2626',
          fontSize: '15px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.2s ease',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        {confirmLogout ? 'Ketuk Sekali Lagi untuk Keluar' : 'Keluar dari Aplikasi'}
      </button>
      {confirmLogout && (
        <button
          type="button"
          onClick={() => setConfirmLogout(false)}
          style={{
            width: '100%',
            marginTop: '8px',
            padding: '10px',
            borderRadius: '12px',
            background: 'transparent',
            border: '1px solid #CBD5E1',
            color: '#475569',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Batal
        </button>
      )}

      {showPwdModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000,
          }}
          onClick={() => setShowPwdModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '400px',
              background: '#FFFFFF',
              borderRadius: '18px',
              padding: '20px',
              boxShadow: '0 20px 45px rgba(15, 23, 42, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Ganti Password</h3>
              <button
                type="button"
                onClick={() => setShowPwdModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>
            {pwdStatus && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '10px',
                fontSize: '13px',
                marginBottom: '12px',
                background: pwdStatus.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                color: pwdStatus.type === 'success' ? '#065F46' : '#991B1B',
              }}>
                {pwdStatus.message}
              </div>
            )}
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Password saat ini"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                style={{ padding: '11px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px' }}
              />
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Password baru (min. 8 karakter)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                style={{ padding: '11px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px' }}
              />
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Konfirmasi password baru"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{ padding: '11px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px' }}
              />
              <button
                type="submit"
                disabled={savingPwd}
                style={{
                  marginTop: '4px',
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: savingPwd ? 'wait' : 'pointer',
                }}
              >
                {savingPwd ? 'Menyimpan...' : 'Simpan Password Baru'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
