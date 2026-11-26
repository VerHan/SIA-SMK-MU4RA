/* ============================================================
   LoginPage — Halaman login untuk guru, staff, dan wali murid
   
   Desain modern dengan glassmorphism. Menyimpan session
   dan redirect ke dashboard setelah berhasil login.
   ============================================================ */

import { useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { SCHOOL_INFO } from '../../config/constants';
import { getResumePathForUser, isRouteAllowedForUser } from '../../utils/sessionRouting';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import PWAInstallButton from '../../components/shared/PWAInstallButton';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated, isLoading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  /* URL tujuan setelah login (jika ada dan sesuai role) */
  const customRedirect = location.state?.from?.pathname;
  const resolveTargetPath = (targetUser) => {
    if (customRedirect && isRouteAllowedForUser(customRedirect, targetUser)) {
      return customRedirect;
    }
    return getResumePathForUser(targetUser);
  };

  /* Tunggu verifikasi sesi/cookie selesai agar form login tidak berkedip */
  if (authLoading && !loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <LoadingSpinner message="Memeriksa sesi login..." />
      </div>
    );
  }

  /* Jika sudah login, langsung lanjut ke tampilan SIA terakhir / dashboard */
  if (isAuthenticated && user) {
    return <Navigate to={resolveTargetPath(user)} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Username dan password wajib diisi.');
      return;
    }

    setLoading(true);
    const result = await login(username.trim(), password, rememberMe);
    setLoading(false);

    if (result.success) {
      navigate(resolveTargetPath(result.user), { replace: true });
    } else {
      setError(result.error || 'Username atau password salah.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 50%, var(--color-primary-light) 100%)',
      padding: 'var(--space-6)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative elements */}
      <div style={{
        position: 'absolute', top: '10%', left: '5%',
        width: '200px', height: '200px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
      }} />
      <div style={{
        position: 'absolute', bottom: '15%', right: '10%',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.03)',
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.02)',
        transform: 'translate(-50%, -50%)',
      }} />

      {/* Login Card */}
      <div className="animate-scale-in" style={{
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 'var(--radius-2xl)',
        padding: 'var(--space-10)',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.2)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'var(--font-weight-extrabold)',
            fontSize: 'var(--font-size-lg)',
            margin: '0 auto var(--space-4)',
          }}>
            SIA
          </div>
          <h1 style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-bold)',
            marginBottom: 'var(--space-1)',
            color: 'var(--color-text)',
          }}>
            Masuk ke Portal
          </h1>
          <p style={{
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
          }}>
            {SCHOOL_INFO?.name || 'SIA SMK Muhammadiyah 04 Bangsri'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-danger-light)',
            color: '#991B1B',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--font-size-sm)',
            marginBottom: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <Input
            label="Username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Masukkan username"
            required
            icon={<span style={{ fontSize: '16px' }}>👤</span>}
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukkan password"
            required
            icon={<span style={{ fontSize: '16px' }}>🔒</span>}
          />

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: 'var(--space-1)',
            marginBottom: 'var(--space-4)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            userSelect: 'none',
          }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
            />
            <span>Tetap masuk di perangkat ini (30 hari)</span>
          </label>

          <Button
            type="submit"
            fullWidth
            loading={loading}
            size="lg"
            style={{ marginTop: 'var(--space-1)' }}
          >
            Masuk
          </Button>
        </form>

        {/* In-App Install PWA Button (otomatis tersembunyi jika sudah ter-install) */}
        <div style={{ marginTop: 'var(--space-4)' }}>
          <PWAInstallButton fullWidth />
        </div>

        {/* Demo accounts info */}
        <div style={{
          marginTop: 'var(--space-6)',
          padding: 'var(--space-4)',
          background: 'var(--color-primary-surface)',
          borderRadius: 'var(--radius-lg)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-secondary)',
        }}>
          <div style={{
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--space-2)',
            color: 'var(--color-primary)',
          }}>
            🔑 Akun Demo (Prototype)
          </div>
          <div style={{ display: 'grid', gap: '4px' }}>
            <div><strong>Admin:</strong> admin / admin123</div>
            <div><strong>Guru Piket & Wali Kelas:</strong> guru1 / guru123</div>
            <div><strong>Guru Reguler (Non-Piket):</strong> guru2 / guru123</div>
            <div><strong>Staff:</strong> staff1 / staff123</div>
            <div><strong>Wali Murid:</strong> wali1 / wali123</div>
          </div>
        </div>

        {/* Back to public profile */}
        <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
          <Link to="/?view=public" style={{
            color: 'var(--color-text-muted)',
            fontSize: 'var(--font-size-sm)',
          }}>
            ← Lihat Website Profil Sekolah
          </Link>
        </div>
      </div>
    </div>
  );
}
