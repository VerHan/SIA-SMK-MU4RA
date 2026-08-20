/* ============================================================
   App.jsx — Root Component & Pure SIA Router Configuration
   ============================================================ */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import LoadingSpinner from './components/shared/LoadingSpinner';

/* Inisialisasi React Query Client untuk Caching dan Auto-refresh */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // otomatis refresh saat user buka tab ini lagi
      staleTime: 60 * 1000, // cache dianggap usang setelah 1 menit
    },
  },
});

/* Layout Components (Eager Load agar layout cepat tampil) */
import DashboardLayout from './components/layout/DashboardLayout';
import MobileLayout from './components/mobile/MobileLayout';
import ProtectedRoute from './components/shared/ProtectedRoute';

/* ── SIA Admin Pages (Lazy Loading) ── */
const LoginPage = lazy(() => import('./pages/public/LoginPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const AbsenGuruGPSPage = lazy(() => import('./pages/dashboard/AbsenGuruGPSPage'));
const DataSiswaPage = lazy(() => import('./pages/dashboard/DataSiswaPage'));
const JadwalPage = lazy(() => import('./pages/dashboard/JadwalPage'));
const WaliKelasPage = lazy(() => import('./pages/dashboard/WaliKelasPage'));
const AbsensiPage = lazy(() => import('./pages/dashboard/AbsensiPage'));
const AbsenMapelPage = lazy(() => import('./pages/dashboard/AbsenMapelPage'));
const MonitoringMapelPage = lazy(() => import('./pages/dashboard/MonitoringMapelPage'));
const AbsenSholatPage = lazy(() => import('./pages/dashboard/AbsenSholatPage'));
const PembayaranPage = lazy(() => import('./pages/dashboard/PembayaranPage'));
const NilaiPage = lazy(() => import('./pages/dashboard/NilaiPage'));
const PengaturanPage = lazy(() => import('./pages/dashboard/PengaturanPage'));
const ManajemenGuruPage = lazy(() => import('./pages/dashboard/ManajemenGuruPage'));
const TahunAjarPage = lazy(() => import('./pages/dashboard/TahunAjarPage'));
const MataPelajaranPage = lazy(() => import('./pages/dashboard/MataPelajaranPage'));
const PoinSikapPage = lazy(() => import('./pages/dashboard/PoinSikapPage'));
const AbsensiGuruPage = lazy(() => import('./pages/dashboard/AbsensiGuruPage'));
const GuruAbsenPiketPage = lazy(() => import('./pages/dashboard/GuruAbsenPiketPage'));
const GuruAbsenMapelPage = lazy(() => import('./pages/dashboard/GuruAbsenMapelPage'));
const KalenderAkademikPage = lazy(() => import('./pages/dashboard/KalenderAkademikPage'));
const ManajemenJadwalPage = lazy(() => import('./pages/dashboard/ManajemenJadwalPage'));

/* ── Mobile Client Pages (Lazy Loading) ── */
const MobileHomePage = lazy(() => import('./pages/mobile/MobileHomePage'));
const MobileAbsenGPSPage = lazy(() => import('./pages/mobile/MobileAbsenGPSPage'));
const MobileAbsenMapelPage = lazy(() => import('./pages/mobile/MobileAbsenMapelPage'));
const MobileJadwalPage = lazy(() => import('./pages/mobile/MobileJadwalPage'));
const MobileNilaiPage = lazy(() => import('./pages/mobile/MobileNilaiPage'));
const MobileSikapPage = lazy(() => import('./pages/mobile/MobileSikapPage'));
const MobileNotifPage = lazy(() => import('./pages/mobile/MobileNotifPage'));
const MobileProfilPage = lazy(() => import('./pages/mobile/MobileProfilPage'));
const MobileSettingsPage = lazy(() => import('./pages/mobile/MobileSettingsPage'));

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
  );
}
