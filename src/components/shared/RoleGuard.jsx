/* ============================================================
   RoleGuard — Komponen pembatas akses berdasarkan role & kapabilitas
   
   Gunakan untuk membungkus konten yang hanya boleh diakses
   oleh role atau tugas tertentu (misal Guru Piket / Wali Kelas /
   Wali Murid). Menampilkan pesan 403 jika izin tidak sesuai.
   ============================================================ */

import { useAuth } from '../../hooks/useAuth';

const CAPABILITY_HINTS = {
  canInputPiket: 'Fitur ini khusus untuk Guru dengan tugas Piket, Staff, atau Admin.',
  canMonitorHomeroom: 'Fitur ini khusus untuk Wali Kelas, Kepsek, Staff, atau Admin.',
  canMonitorOwnChild: 'Akun wali murid belum terhubung dengan data siswa. Hubungi admin sekolah.',
};

export default function RoleGuard({ allowedRoles, requiredCapability, children, fallback }) {
  const { hasRole, hasCapability } = useAuth();

  const roleOk = !allowedRoles || allowedRoles.length === 0 || hasRole(allowedRoles);
  const capOk = !requiredCapability || hasCapability(requiredCapability);

  if (!roleOk || !capOk) {
    if (fallback) return fallback;

    const hintKey = Array.isArray(requiredCapability) ? requiredCapability[0] : requiredCapability;
    const detailMessage = (!capOk && hintKey && CAPABILITY_HINTS[hintKey])
      ? CAPABILITY_HINTS[hintKey]
      : 'Anda tidak memiliki izin untuk mengakses halaman ini. Hubungi administrator jika Anda merasa ini adalah kesalahan.';

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
          maxWidth: '420px',
          lineHeight: 1.6,
        }}>
          {detailMessage}
        </p>
      </div>
    );
  }

  return children;
}
