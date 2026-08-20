/* ============================================================
   RoleGuard — Komponen pembatas akses berdasarkan role
   
   Gunakan untuk membungkus konten yang hanya boleh diakses
   oleh role tertentu. Menampilkan pesan 403 jika role 
   user tidak sesuai.
   ============================================================ */

import { useAuth } from '../../hooks/useAuth';

export default function RoleGuard({ allowedRoles, children, fallback }) {
  const { hasRole, user } = useAuth();

  if (!hasRole(allowedRoles)) {
    /* Jika ada fallback custom, tampilkan itu */
    if (fallback) return fallback;

    /* Default: tampilkan pesan 403 Forbidden */
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: 'var(--space-8)',
      }}>
        <div style={{
          fontSize: '4rem',
          fontWeight: 'var(--font-weight-extrabold)',
          color: 'var(--color-danger)',
          marginBottom: 'var(--space-4)',
        }}>
          403
        </div>
        <h2 style={{
          fontSize: 'var(--font-size-xl)',
          color: 'var(--color-text)',
          marginBottom: 'var(--space-2)',
        }}>
          Akses Ditolak
        </h2>
        <p style={{
          color: 'var(--color-text-secondary)',
          maxWidth: '400px',
        }}>
          Anda tidak memiliki izin untuk mengakses halaman ini.
          Hubungi administrator jika Anda merasa ini adalah kesalahan.
        </p>
      </div>
    );
  }

  return children;
}
