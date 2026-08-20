/* ============================================================
   App.jsx — Root Component & Pure SIA Router Configuration
   ============================================================ */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import LoadingSpinner from './components/shared/LoadingSpinner';
import ErrorBoundary from './components/shared/ErrorBoundary';

/* Inisialisasi React Query Client untuk Caching dan Auto-refresh */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // otomatis refresh saat user buka tab ini lagi
      staleTime: 60 * 1000, // cache dianggap usang setelah 1 menit
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
import ProtectedRoute from './components/shared/ProtectedRoute';

/* ── SIA Admin Pages (Lazy Loading dengan Safe Retry) ── */
const LoginPage = safeLazy(() => import('./pages/public/LoginPage'));
const DashboardPage = safeLazy(() => import('./pages/dashboard/DashboardPage'));
const AbsenGuruGPSPage = safeLazy(() => import('./pages/dashboard/AbsenGuruGPSPage'));
const DataSiswaPage = safeLazy(() => import('./pages/dashboard/DataSiswaPage'));
const JadwalPage = safeLazy(() => import('./pages/dashboard/JadwalPage'));
const WaliKelasPage = safeLazy(() => import('./pages/dashboard/WaliKelasPage'));
const AbsensiPage = safeLazy(() => import('./pages/dashboard/AbsensiPage'));
const AbsenMapelPage = safeLazy(() => import('./pages/dashboard/AbsenMapelPage'));
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

/* Role yang menggunakan tampilan Mobile PWA */
const MOBILE_ROLES = ['guru', 'staff', 'kepsek'];

/**
 * RootRedirect — Mengarahkan pengguna berdasarkan role
 */
function RootRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  /* Admin → Dashboard desktop */
  if (user?.role === 'admin') {
    return <Navigate to="/dashboard/ringkasan" replace />;
  }

  /* Guru / Staff / Kepsek → Mobile PWA */
  if (MOBILE_ROLES.includes(user?.role)) {
    return <Navigate to="/app/home" replace />;
  }

  /* Default fallback */
  return <Navigate to="/app/home" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Root Path (/) langsung mengarahkan ke Login/Dashboard */}
                <Route path="/" element={<RootRedirect />} />
                <Route path="/login" element={<LoginPage />} />

                {/* ── MOBILE CLIENT ROUTES (/app/*) ── */}
                <Route
                  element={
                    <ProtectedRoute>
                      <MobileLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/app" element={<Navigate to="/app/home" replace />} />
                  <Route path="/app/home" element={<MobileHomePage />} />
                  <Route path="/app/absen-gps" element={<MobileAbsenGPSPage />} />
                  <Route path="/app/absen-mapel" element={<MobileAbsenMapelPage />} />
                  <Route path="/app/jadwal" element={<MobileJadwalPage />} />
                  <Route path="/app/nilai" element={<MobileNilaiPage />} />
                  <Route path="/app/sikap" element={<MobileSikapPage />} />
                  <Route path="/app/notif" element={<MobileNotifPage />} />
                  <Route path="/app/profil" element={<MobileProfilPage />} />
                  <Route path="/app/settings" element={<MobileSettingsPage />} />
                </Route>

                {/* ── PROTECTED ADMIN DASHBOARD ROUTES (/dashboard/*) ── */}
                <Route
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
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
                  <Route path="/dashboard/guru-absen-piket" element={<GuruAbsenPiketPage />} />
                  <Route path="/dashboard/guru-absen-mapel" element={<GuruAbsenMapelPage />} />
                  
                  {/* Sistem */}
                  <Route path="/dashboard/pengaturan" element={<PengaturanPage />} />
                  
                  {/* Legacy routes (hidden from menu, still accessible) */}
                  <Route path="/dashboard/absen-mapel" element={<AbsenMapelPage />} />
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
