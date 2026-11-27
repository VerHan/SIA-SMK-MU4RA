/* ============================================================
   App.jsx — Root Component & Pure SIA Router Configuration
   ============================================================ */

import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import { isStandalonePWA } from './hooks/usePWAInstall';
import { getResumePathForUser, saveLastRoute } from './utils/sessionRouting';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import LoadingSpinner from './components/shared/LoadingSpinner';
import ErrorBoundary from './components/shared/ErrorBoundary';
import OfflineIndicator from './components/shared/OfflineIndicator';

/* Inisialisasi React Query Client untuk Caching yang hemat bandwidth & beban server */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // cegah lonjakan request saat guru bolak-balik aplikasi di HP
      staleTime: 60 * 1000, // cache dianggap segar selama 1 menit
      gcTime: 10 * 60 * 1000, // simpan cache di memori selama 10 menit
      retry: 1,
    },
  },
});

/* Helper untuk lazy loading yang aman dari chunk load error pasca deployment baru */
function safeLazy(importFn) {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      console.warn('[LazyLoad] Failed to load chunk, reloading...', error);
      const reloadKey = 'chunk_reload_' + window.location.pathname;
      const alreadyReloaded = sessionStorage.getItem(reloadKey);
      if (!alreadyReloaded) {
        sessionStorage.setItem(reloadKey, 'true');
        window.location.reload();
        return new Promise(() => {});
      }
      sessionStorage.removeItem(reloadKey);
      throw error;
    }
  });
}

/* Layout Components (Eager Load agar layout cepat tampil) */
import DashboardLayout from './components/layout/DashboardLayout';
import MobileLayout from './components/mobile/MobileLayout';
import PublicLayout from './components/layout/PublicLayout';
import ProtectedRoute from './components/shared/ProtectedRoute';
import RoleGuard from './components/shared/RoleGuard';

/* ── Public Website Pages (Lazy Loading) ── */
const HomePage = safeLazy(() => import('./pages/public/HomePage'));
const ProfilPage = safeLazy(() => import('./pages/public/ProfilPage'));
const KejuruanPage = safeLazy(() => import('./pages/public/KejuruanPage'));
const BeritaPage = safeLazy(() => import('./pages/public/BeritaPage'));
const BeritaDetailPage = safeLazy(() => import('./pages/public/BeritaDetailPage'));
const PPDBPage = safeLazy(() => import('./pages/public/PPDBPage'));

/* ── SIA Admin Pages (Lazy Loading dengan Safe Retry) ── */
import LoginPage from './pages/public/LoginPage';
const DashboardPage = safeLazy(() => import('./pages/dashboard/DashboardPage'));
const AbsenGuruGPSPage = safeLazy(() => import('./pages/dashboard/AbsenGuruGPSPage'));
const DataSiswaPage = safeLazy(() => import('./pages/dashboard/DataSiswaPage'));
const JadwalPage = safeLazy(() => import('./pages/dashboard/JadwalPage'));
const WaliKelasPage = safeLazy(() => import('./pages/dashboard/WaliKelasPage'));
const AbsensiPage = safeLazy(() => import('./pages/dashboard/AbsensiPage'));

const MonitoringMapelPage = safeLazy(() => import('./pages/dashboard/MonitoringMapelPage'));
const AbsenSholatPage = safeLazy(() => import('./pages/dashboard/AbsenSholatPage'));
const PembayaranPage = safeLazy(() => import('./pages/dashboard/PembayaranPage'));
const NilaiPage = safeLazy(() => import('./pages/dashboard/NilaiPage'));
const PengaturanPage = safeLazy(() => import('./pages/dashboard/PengaturanPage'));
const ManajemenGuruPage = safeLazy(() => import('./pages/dashboard/ManajemenGuruPage'));
const TahunAjarPage = safeLazy(() => import('./pages/dashboard/TahunAjarPage'));
const MataPelajaranPage = safeLazy(() => import('./pages/dashboard/MataPelajaranPage'));
const PoinSikapPage = safeLazy(() => import('./pages/dashboard/PoinSikapPage'));
const AbsensiGuruPage = safeLazy(() => import('./pages/dashboard/AbsensiGuruPage'));
const GuruAbsenPiketPage = safeLazy(() => import('./pages/dashboard/GuruAbsenPiketPage'));
const GuruAbsenMapelPage = safeLazy(() => import('./pages/dashboard/GuruAbsenMapelPage'));
const KalenderAkademikPage = safeLazy(() => import('./pages/dashboard/KalenderAkademikPage'));
const ManajemenJadwalPage = safeLazy(() => import('./pages/dashboard/ManajemenJadwalPage'));
const ManajemenAkunPage = safeLazy(() => import('./pages/dashboard/ManajemenAkunPage'));
const ManajemenBeritaPage = safeLazy(() => import('./pages/dashboard/ManajemenBeritaPage'));
const ManajemenPPDBPage = safeLazy(() => import('./pages/dashboard/ManajemenPPDBPage'));

/* ── Mobile Client Pages (Lazy Loading dengan Safe Retry) ── */
const MobileHomePage = safeLazy(() => import('./pages/mobile/MobileHomePage'));
const MobileAbsenGPSPage = safeLazy(() => import('./pages/mobile/MobileAbsenGPSPage'));
const MobileAbsenMapelPage = safeLazy(() => import('./pages/mobile/MobileAbsenMapelPage'));
const MobileJadwalPage = safeLazy(() => import('./pages/mobile/MobileJadwalPage'));
const MobileNilaiPage = safeLazy(() => import('./pages/mobile/MobileNilaiPage'));
const MobileSikapPage = safeLazy(() => import('./pages/mobile/MobileSikapPage'));
const MobileNotifPage = safeLazy(() => import('./pages/mobile/MobileNotifPage'));
const MobileProfilPage = safeLazy(() => import('./pages/mobile/MobileProfilPage'));
const MobileSettingsPage = safeLazy(() => import('./pages/mobile/MobileSettingsPage'));
const MobileGuardianPage = safeLazy(() => import('./pages/mobile/MobileGuardianPage'));
const MobileAbsenPiketPage = safeLazy(() => import('./pages/mobile/MobileAbsenPiketPage'));
const MobileWaliKelasPage = safeLazy(() => import('./pages/mobile/MobileWaliKelasPage'));

/**
 * LastRouteTracker — Menyimpan halaman SIA terakhir yang dibuka (preferensi navigasi saja)
 * agar saat aplikasi/PWA dibuka kembali langsung melanjutkan ke ruang kerja SIA.
 */
function LastRouteTracker() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    saveLastRoute(location.pathname, user);
  }, [isAuthenticated, user, location.pathname]);

  return null;
}

/**
 * PublicHomeGate — Memeriksa sesi/JWT pengguna saat membuka halaman utama (/).
 * - Jika sesi login aktif: langsung diarahkan ke tampilan SIA terakhir / dashboard sesuai role
 *   (tanpa kilasan halaman profil), kecuali pengguna sengaja memilih "?view=public".
 * - Jika dibuka dari ikon PWA ter-install tanpa sesi: langsung ke /login.
 * - Jika pengunjung luar (belum login) di browser biasa: tampilkan Web Profil Sekolah.
 */
function PublicHomeGate() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const wantsPublicPreview = params.get('view') === 'public';

  if (!wantsPublicPreview) {
    if (isLoading) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingSpinner message="Memeriksa sesi SIA..." />
        </div>
      );
    }

    if (isAuthenticated && user) {
      return <Navigate to={getResumePathForUser(user)} replace />;
    }

    if (isStandalonePWA()) {
      return <Navigate to="/login" replace />;
    }
  }

  return (
    <PublicLayout>
      <HomePage />
    </PublicLayout>
  );
}

/**
 * RootRedirect — Mengarahkan pengguna berdasarkan sesi & role saat buka /app atau /dashboard
 */
function RootRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <LoadingSpinner message="Memuat ruang kerja SIA..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Navigate to={getResumePathForUser(user)} replace />;
}

function RealtimeSyncBridge() {
  useRealtimeSync();
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RealtimeSyncBridge />
          <BrowserRouter>
            <LastRouteTracker />
            <OfflineIndicator />
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* ── ROOT ENTRY GATE (/) — Auto-resume sesi SIA tanpa kilasan halaman profil ── */}
                <Route path="/" element={<PublicHomeGate />} />

                {/* ── PUBLIC WEBSITE ROUTES ── */}
                <Route element={<PublicLayout />}>
                  <Route path="/profil" element={<ProfilPage />} />
                  <Route path="/kejuruan" element={<KejuruanPage />} />
                  <Route path="/berita" element={<BeritaPage />} />
                  <Route path="/berita/:id" element={<BeritaDetailPage />} />
                  <Route path="/ppdb" element={<PPDBPage />} />
                </Route>

                {/* Portal Login Guru & Admin */}
                <Route path="/login" element={<LoginPage />} />


                {/* ── MOBILE CLIENT ROUTES (/app/*) — Khusus Guru, Staff, Kepsek & Wali Murid (Admin diarahkan ke /dashboard) ── */}
                <Route
                  element={
                    <ProtectedRoute>
                      <RoleGuard
                        allowedRoles={['guru', 'staff', 'kepsek', 'wali_murid']}
                        fallback={<Navigate to="/dashboard/ringkasan" replace />}
                      >
                        <MobileLayout />
                      </RoleGuard>
                    </ProtectedRoute>
                  }
                >
                  <Route path="/app" element={<RootRedirect />} />
                  <Route path="/app/home" element={<RoleGuard allowedRoles={['admin', 'guru', 'staff', 'kepsek']} fallback={<Navigate to="/app/monitoring-anak" replace />}><MobileHomePage /></RoleGuard>} />
                  <Route path="/app/absen-gps" element={<RoleGuard allowedRoles={['admin', 'guru', 'staff', 'kepsek']} fallback={<Navigate to="/app/monitoring-anak" replace />}><MobileAbsenGPSPage /></RoleGuard>} />
                  <Route path="/app/absen-mapel" element={<RoleGuard allowedRoles={['admin', 'guru']}><MobileAbsenMapelPage /></RoleGuard>} />
                  <Route path="/app/absen-piket" element={<RoleGuard requiredCapability="canInputPiket"><MobileAbsenPiketPage /></RoleGuard>} />
                  <Route path="/app/wali-kelas" element={<RoleGuard requiredCapability="canMonitorHomeroom"><MobileWaliKelasPage /></RoleGuard>} />
                  <Route path="/app/monitoring-anak" element={<RoleGuard allowedRoles={['wali_murid', 'admin']}><MobileGuardianPage /></RoleGuard>} />
                  <Route path="/app/jadwal" element={<RoleGuard allowedRoles={['admin', 'guru', 'staff', 'kepsek']} fallback={<Navigate to="/app/monitoring-anak" replace />}><MobileJadwalPage /></RoleGuard>} />
                  <Route path="/app/nilai" element={<RoleGuard allowedRoles={['admin', 'guru', 'kepsek']}><MobileNilaiPage /></RoleGuard>} />
                  <Route path="/app/sikap" element={<RoleGuard allowedRoles={['admin', 'guru', 'kepsek']}><MobileSikapPage /></RoleGuard>} />
                  <Route path="/app/notif" element={<MobileNotifPage />} />
                  <Route path="/app/profil" element={<MobileProfilPage />} />
                  <Route path="/app/settings" element={<MobileSettingsPage />} />
                </Route>

                {/* ── PROTECTED ADMIN DASHBOARD ROUTES (/dashboard/*) ── */}
                <Route
                  element={
                    <ProtectedRoute>
                      <RoleGuard allowedRoles={['admin', 'guru', 'staff', 'kepsek']} fallback={<Navigate to="/app/monitoring-anak" replace />}>
                        <DashboardLayout />
                      </RoleGuard>
                    </ProtectedRoute>
                  }
                >
                  {/* Rute Dasar Dashboard */}
                  <Route path="/dashboard" element={<RootRedirect />} />
                  <Route path="/dashboard/ringkasan" element={<DashboardPage />} />
                  
                  {/* Master Data */}
                  <Route path="/dashboard/tahun-ajar" element={<TahunAjarPage />} />
                  <Route path="/dashboard/mata-pelajaran" element={<MataPelajaranPage />} />
                  <Route path="/dashboard/manajemen-jadwal" element={<ManajemenJadwalPage />} />
                  
                  {/* Akademik */}
                  <Route path="/dashboard/siswa" element={<DataSiswaPage />} />
                  <Route path="/dashboard/guru" element={<ManajemenGuruPage />} />
                  <Route path="/dashboard/wali-kelas" element={<WaliKelasPage />} />
                  <Route path="/dashboard/jadwal" element={<JadwalPage />} />
                  
                  {/* Monitoring */}
                  <Route path="/dashboard/absensi" element={<AbsensiPage />} />
                  <Route path="/dashboard/monitoring-mapel" element={<MonitoringMapelPage />} />
                  <Route path="/dashboard/absensi-guru" element={<AbsensiGuruPage />} />
                  <Route path="/dashboard/nilai" element={<NilaiPage />} />
                  <Route path="/dashboard/poin-sikap" element={<PoinSikapPage />} />
                  
                  {/* Guru Tools */}
                  <Route path="/dashboard/absen-guru" element={<AbsenGuruGPSPage />} />
                  <Route path="/dashboard/guru-absen-piket" element={<RoleGuard requiredCapability="canInputPiket"><GuruAbsenPiketPage /></RoleGuard>} />
                  <Route path="/dashboard/guru-absen-mapel" element={<RoleGuard allowedRoles={['admin', 'guru']}><GuruAbsenMapelPage /></RoleGuard>} />
                  
                  {/* Publikasi & PPDB */}
                  <Route path="/dashboard/berita" element={<RoleGuard allowedRoles={['admin', 'staff']}><ManajemenBeritaPage /></RoleGuard>} />
                  <Route path="/dashboard/ppdb" element={<RoleGuard allowedRoles={['admin', 'staff']}><ManajemenPPDBPage /></RoleGuard>} />

                  {/* Sistem */}
                  <Route path="/dashboard/akun" element={<RoleGuard allowedRoles={['admin']}><ManajemenAkunPage /></RoleGuard>} />
                  <Route path="/dashboard/pengaturan" element={<RoleGuard allowedRoles={['admin']}><PengaturanPage /></RoleGuard>} />
                  
                  {/* Legacy routes (hidden from menu, still accessible) */}

                  <Route path="/dashboard/absen-sholat" element={<AbsenSholatPage />} />
                  <Route path="/dashboard/pembayaran" element={<PembayaranPage />} />
                </Route>

                {/* 404 Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
