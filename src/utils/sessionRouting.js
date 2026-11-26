/* ============================================================
   sessionRouting.js — Role-Aware SIA Landing & Last-Route Helper
   Menyimpan hanya pathname UI terakhir (bukan token/kredensial)
   terikat pada user/role yang login agar:
   - Admin selalu masuk ke Web Operasional Admin (/dashboard/*)
   - Guru/Staff/Kepsek masuk ke SIA Mobile Client (/app/*)
   - Wali Murid masuk ke Monitoring Anak (/app/monitoring-anak)
   ============================================================ */

export const LAST_ROUTE_STORAGE_KEY = 'sia_last_route';

const MOBILE_ROLES = ['guru', 'staff', 'kepsek'];

const GUARDIAN_ALLOWED_ROUTES = new Set([
  '/app/monitoring-anak',
  '/app/profil',
  '/app/notif',
  '/app/settings',
]);

const ADMIN_ONLY_DASHBOARD_PREFIXES = [
  '/dashboard/akun',
  '/dashboard/pengaturan',
  '/dashboard/tahun-ajar',
  '/dashboard/mata-pelajaran',
  '/dashboard/manajemen-jadwal',
  '/dashboard/guru',
  '/dashboard/absensi-guru',
];

export function getRoleDefaultPath(user) {
  if (user?.role === 'admin') return '/dashboard/ringkasan';
  if (user?.role === 'wali_murid') return '/app/monitoring-anak';
  if (MOBILE_ROLES.includes(user?.role)) return '/app/home';
  return '/app/home';
}

export function isRouteAllowedForUser(pathname, user) {
  if (!user || !pathname || typeof pathname !== 'string') return false;
  if (!pathname.startsWith('/') || pathname.startsWith('//')) return false;
  if (pathname === '/' || pathname === '/app' || pathname === '/dashboard' || pathname === '/login') {
    return false;
  }

  // Admin workspace is strictly the Web Operasional Admin (/dashboard/*), never Mobile Client (/app/*)
  if (user.role === 'admin') {
    return pathname.startsWith('/dashboard/');
  }

  if (user.role === 'wali_murid') {
    return GUARDIAN_ALLOWED_ROUTES.has(pathname);
  }

  // Capability-gated routes
  if (pathname === '/app/absen-piket' || pathname === '/dashboard/guru-absen-piket') {
    return Boolean(user.capabilities?.canInputPiket);
  }
  if (pathname === '/app/wali-kelas') {
    return Boolean(user.capabilities?.canMonitorHomeroom);
  }
  if (pathname === '/app/monitoring-anak') {
    return false;
  }

  // Role-restricted mobile routes
  if (pathname === '/app/absen-mapel' || pathname === '/dashboard/guru-absen-mapel') {
    return user.role === 'guru';
  }
  if (pathname === '/app/nilai' || pathname === '/app/sikap') {
    return user.role === 'guru' || user.role === 'kepsek';
  }

  // Role-restricted dashboard routes (Publikasi & PPDB: admin/staff)
  if (pathname === '/dashboard/berita' || pathname === '/dashboard/ppdb') {
    return user.role === 'staff';
  }

  if (pathname.startsWith('/app/')) {
    return true;
  }

  if (pathname.startsWith('/dashboard/')) {
    const isAdminOnly = ADMIN_ONLY_DASHBOARD_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
    if (isAdminOnly) return false;
    return true;
  }

  return false;
}

export function getSafeLastRouteForUser(user) {
  if (!user) return null;
  try {
    const raw = localStorage.getItem(LAST_ROUTE_STORAGE_KEY);
    if (!raw) return null;

    let savedPath = raw;
    if (raw.startsWith('{')) {
      const parsed = JSON.parse(raw);
      if (parsed.role && parsed.role !== user.role) return null;
      if (parsed.userId && user.id && parsed.userId !== user.id) return null;
      savedPath = parsed.path;
    }

    return isRouteAllowedForUser(savedPath, user) ? savedPath : null;
  } catch {
    return null;
  }
}

export function getResumePathForUser(user) {
  return getSafeLastRouteForUser(user) || getRoleDefaultPath(user);
}

export function saveLastRoute(pathname, user = null) {
  if (!pathname || typeof pathname !== 'string') return;
  if (user && !isRouteAllowedForUser(pathname, user)) return;
  if ((pathname.startsWith('/app/') || pathname.startsWith('/dashboard/')) && pathname !== '/app' && pathname !== '/dashboard') {
    try {
      const payload = user
        ? JSON.stringify({ path: pathname, userId: user.id || null, role: user.role || null })
        : pathname;
      localStorage.setItem(LAST_ROUTE_STORAGE_KEY, payload);
    } catch {
      /* Abaikan jika storage tidak tersedia */
    }
  }
}

export function clearLastRoute() {
  try {
    localStorage.removeItem(LAST_ROUTE_STORAGE_KEY);
  } catch {
    /* Abaikan */
  }
}
