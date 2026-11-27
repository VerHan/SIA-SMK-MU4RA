/* ============================================================
   PengaturanPage — Pusat Konfigurasi Sekolah, Notifikasi & Audit
   ============================================================ */

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useSettings } from '../../hooks/useSettings';
import { changeMyPassword, getSchoolConfig, updateSchoolConfig } from '../../services/api';
import { getAuthHeaders } from '../../services/authToken';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Toast from '../../components/ui/Toast';
import SchoolNotificationPanel from '../../components/dashboard/SchoolNotificationPanel';
import AuditBackupPanel from '../../components/dashboard/AuditBackupPanel';

/* Fix leaflet icon issue in react */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  return position === null ? null : <Marker position={position} />;
}

const TABS = [
  { id: 'general', label: 'Identitas, Jam & Geofence' },
  { id: 'notifications', label: 'Notifikasi & Webhook WA' },
  { id: 'audit', label: 'Audit Trail & Backup' },
];

export default function PengaturanPage() {
  const queryClient = useQueryClient();
  const { settings, updateGeofence } = useSettings();
  const [activeTab, setActiveTab] = useState('general');
  const [toast, setToast] = useState(null);

  // --- CENTRALIZED SCHOOL CONFIG ---
  const { data: schoolConfig, refetch: refetchSchoolConfig } = useQuery({
    queryKey: ['school-config'],
    queryFn: getSchoolConfig,
  });

  const [schoolForm, setSchoolForm] = useState({
    schoolName: 'SMK Muhammadiyah 04 Bangsri',
    npsn: '20360584',
    principalName: 'Kepala Sekolah',
    address: 'Jl. KH. Ahmad Dahlan No. 04, Bangsri, Jepara',
    phone: '(0291) 771234',
    email: 'info@smkmu4rabangsri.sch.id',
    jamMasuk: '07:00',
    jamPulang: '15:30',
    batasTelatMenit: 15,
  });
  const [savingSchool, setSavingSchool] = useState(false);

  // --- GEOFENCE STATES ---
  const [position, setPosition] = useState({
    lat: settings.geofence.latitude,
    lng: settings.geofence.longitude,
  });
  const [radius, setRadius] = useState(settings.geofence.radiusMeters);
  const [savingGeofence, setSavingGeofence] = useState(false);

  // --- ACCOUNT PASSWORD CHANGE STATES ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // --- KEEP ALIVE STATES ---
  const [pingHistory, setPingHistory] = useState([]);
  const [lastPingDate, setLastPingDate] = useState(null);
  const [isPinging, setIsPinging] = useState(false);
  const [isFetchingStatus, setIsFetchingStatus] = useState(false);
  const [daysUntilPause, setDaysUntilPause] = useState(7);

  useEffect(() => {
    if (!schoolConfig) return;
    setSchoolForm({
      schoolName: schoolConfig.schoolName || '',
      npsn: schoolConfig.npsn || '',
      principalName: schoolConfig.principalName || '',
      address: schoolConfig.address || '',
      phone: schoolConfig.phone || '',
      email: schoolConfig.email || '',
      jamMasuk: schoolConfig.jamMasuk || '07:00',
      jamPulang: schoolConfig.jamPulang || '15:30',
      batasTelatMenit: Number(schoolConfig.batasTelatMenit ?? 15),
    });
    if (schoolConfig.geofenceLat && schoolConfig.geofenceLng) {
      setPosition({ lat: Number(schoolConfig.geofenceLat), lng: Number(schoolConfig.geofenceLng) });
    }
    if (schoolConfig.geofenceRadius) {
      setRadius(Number(schoolConfig.geofenceRadius));
    }
  }, [schoolConfig]);

  useEffect(() => {
    if (settings?.geofence) {
      setPosition({
        lat: settings.geofence.latitude,
        lng: settings.geofence.longitude,
      });
      setRadius(settings.geofence.radiusMeters);
    }
  }, [settings?.geofence?.latitude, settings?.geofence?.longitude, settings?.geofence?.radiusMeters]);

  useEffect(() => {
    fetchPingStatus();
  }, []);

  const fetchPingStatus = async () => {
    setIsFetchingStatus(true);
    try {
      const res = await fetch('/api/keep-alive/status', {
        credentials: 'include',
        headers: getAuthHeaders({ 'X-Requested-With': 'XMLHttpRequest' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.history) {
        setPingHistory(data.history);
        if (data.history.length > 0) {
          const lastDate = new Date(data.history[0].createdAt);
          setLastPingDate(lastDate);
          const diffDays = Math.floor(Math.abs(Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          setDaysUntilPause(Math.max(0, 7 - diffDays));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch ping status:', err.message);
    } finally {
      setIsFetchingStatus(false);
    }
  };

  const handleManualPing = async () => {
    setIsPinging(true);
    try {
      const res = await fetch('/api/keep-alive/ping', {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        }),
        body: JSON.stringify({
          pingType: 'MANUAL_ADMIN',
          triggeredBy: 'Admin (Manual)',
          note: 'Manual ping from Settings UI',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', message: 'Database berhasil diping! Koneksi tetap aktif.' });
        fetchPingStatus();
      } else {
        setToast({ type: 'error', message: data.error || 'Gagal melakukan ping database' });
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Gagal koneksi ke server API: ' + err.message });
    } finally {
      setIsPinging(false);
    }
  };

  const handleSaveSchoolProfile = async (e) => {
    e.preventDefault();
    setSavingSchool(true);
    const res = await updateSchoolConfig({
      ...schoolForm,
      batasTelatMenit: Number(schoolForm.batasTelatMenit) || 0,
    });
    setSavingSchool(false);
    if (res?.success) {
      queryClient.invalidateQueries({ queryKey: ['school-config'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      setToast({ type: 'success', message: res.message || 'Identitas & jam operasional sekolah berhasil disimpan.' });
    } else {
      setToast({ type: 'error', message: res?.error || 'Gagal menyimpan konfigurasi sekolah.' });
    }
  };

  const handleSaveGeofence = async () => {
    setSavingGeofence(true);
    const res = await updateGeofence({
      latitude: position.lat,
      longitude: position.lng,
      radiusMeters: Number(radius),
    });
    setSavingGeofence(false);
    if (res?.success) {
      queryClient.invalidateQueries({ queryKey: ['school-config'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      setToast({ type: 'success', message: res.message || 'Pengaturan Geofence berhasil disimpan untuk semua perangkat.' });
    } else {
      setToast({ type: 'error', message: res?.error || 'Gagal menyimpan pengaturan Geofence.' });
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setToast({ type: 'error', message: 'Password lama dan password baru wajib diisi.' });
      return;
    }
    if (newPassword.trim().length < 8) {
      setToast({ type: 'error', message: 'Password baru minimal harus 8 karakter.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setToast({ type: 'error', message: 'Konfirmasi password baru tidak cocok.' });
      return;
    }
    setSavingPassword(true);
    const res = await changeMyPassword(currentPassword, newPassword);
    setSavingPassword(false);
    if (res?.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      setToast({ type: 'success', message: res.message || 'Password berhasil diperbarui!' });
    } else {
      setToast({ type: 'error', message: res?.error || 'Gagal memperbarui password.' });
    }
  };

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ marginBottom: 'var(--space-5)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: 'var(--space-1)' }}>
          Pengaturan Sekolah & Keamanan Sistem
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Kelola identitas sekolah, jam masuk/pulang, geofence presensi, notifikasi WhatsApp otomatis, audit trail, dan backup database terpusat.
        </p>
      </div>

      {/* Tab Navigation */}
      <div
        role="tablist"
        aria-label="Kategori Pengaturan"
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: 'var(--space-3)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '9px 16px',
                borderRadius: 'var(--radius-md)',
                border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                background: isActive ? 'var(--color-primary)' : 'var(--color-surface)',
                color: isActive ? '#FFFFFF' : 'var(--color-text)',
                fontWeight: 600,
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <style>{`
        .pengaturan-grid-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-6);
        }
        @media (min-width: 900px) {
          .pengaturan-grid-container {
            grid-template-columns: 1fr 320px;
          }
        }
      `}</style>

      {activeTab === 'general' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Identitas & Jam Operasional Sekolah */}
          <Card>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: '4px' }}>
              Identitas & Kebijakan Jam Operasional Sekolah
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
              Atur profil sekolah, jam masuk, jam pulang, dan toleransi keterlambatan tanpa mengubah kode program.
            </p>
            <form onSubmit={handleSaveSchoolProfile} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
                <Input
                  label="Nama Sekolah *"
                  value={schoolForm.schoolName}
                  onChange={(e) => setSchoolForm(prev => ({ ...prev, schoolName: e.target.value }))}
                  required
                />
                <Input
                  label="NPSN"
                  value={schoolForm.npsn}
                  onChange={(e) => setSchoolForm(prev => ({ ...prev, npsn: e.target.value }))}
                />
                <Input
                  label="Kepala Sekolah"
                  value={schoolForm.principalName}
                  onChange={(e) => setSchoolForm(prev => ({ ...prev, principalName: e.target.value }))}
                />
                <Input
                  label="Telepon Sekolah"
                  value={schoolForm.phone}
                  onChange={(e) => setSchoolForm(prev => ({ ...prev, phone: e.target.value }))}
                />
                <Input
                  label="Email Resmi"
                  type="email"
                  value={schoolForm.email}
                  onChange={(e) => setSchoolForm(prev => ({ ...prev, email: e.target.value }))}
                />
                <Input
                  label="Alamat Lengkap"
                  value={schoolForm.address}
                  onChange={(e) => setSchoolForm(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                <Input
                  label="Jam Masuk (WIB)"
                  type="time"
                  value={schoolForm.jamMasuk}
                  onChange={(e) => setSchoolForm(prev => ({ ...prev, jamMasuk: e.target.value }))}
                  required
                />
                <Input
                  label="Jam Pulang (WIB)"
                  type="time"
                  value={schoolForm.jamPulang}
                  onChange={(e) => setSchoolForm(prev => ({ ...prev, jamPulang: e.target.value }))}
                  required
                />
                <Input
                  label="Batas Toleransi Telat (Menit)"
                  type="number"
                  min="0"
                  max="180"
                  value={schoolForm.batasTelatMenit}
                  onChange={(e) => setSchoolForm(prev => ({ ...prev, batasTelatMenit: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Button type="submit" loading={savingSchool}>
                  Simpan Identitas & Jam Sekolah
                </Button>
              </div>
            </form>
          </Card>

          {/* Geofence Map & Radius */}
          <div className="pengaturan-grid-container">
            <Card padding="0" style={{ overflow: 'hidden', height: '460px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-primary-surface)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                Klik pada peta untuk memindahkan titik pusat presensi GPS sekolah.
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <MapContainer center={[position.lat, position.lng]} zoom={18} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <LocationMarker position={position} setPosition={setPosition} />
                  <Circle
                    center={[position.lat, position.lng]}
                    radius={Number(radius)}
                    pathOptions={{ color: 'var(--color-primary)', fillColor: 'var(--color-primary)', fillOpacity: 0.2 }}
                  />
                </MapContainer>
              </div>
            </Card>

            <Card>
              <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-4)' }}>
                Detail Lokasi Geofence
              </h3>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <Input label="Latitude" value={position.lat} readOnly style={{ background: 'var(--color-bg)' }} />
              </div>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <Input label="Longitude" value={position.lng} readOnly style={{ background: 'var(--color-bg)' }} />
              </div>
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
                  Radius Presensi (Meter)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <input
                    type="range"
                    min="20"
                    max="500"
                    step="10"
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontWeight: 'var(--font-weight-bold)', width: '60px', textAlign: 'right' }}>
                    {radius}m
                  </span>
                </div>
              </div>
              <Button fullWidth onClick={handleSaveGeofence} loading={savingGeofence}>
                Simpan Geofence
              </Button>
            </Card>
          </div>

          {/* Keamanan Akun & Ganti Password */}
          <Card>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: '4px' }}>
              Keamanan Akun Admin & Pemutusan Sesi Otomatis
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
              Mengganti password akan otomatis memutus semua sesi login lama di perangkat lain. Gunakan minimal 8 karakter unik.
            </p>
            <form onSubmit={handlePasswordChange} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', alignItems: 'end' }}>
              <Input
                label="Password Saat Ini"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Masukkan password saat ini"
                required
              />
              <Input
                label="Password Baru (Min. 8 karakter)"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Contoh: Mu4ra#2026Bangsri"
                required
              />
              <Input
                label="Konfirmasi Password Baru"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                required
              />
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <Button type="submit" fullWidth loading={savingPassword}>
                  Simpan Password Baru
                </Button>
              </div>
            </form>
          </Card>

          {/* Database Health & Heartbeat */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: 0 }}>
                  Database Keep-Alive Monitor
                </h2>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', margin: '2px 0 0' }}>
                  Mencegah auto-pause pada Supabase Free Tier ({lastPingDate ? `${daysUntilPause} hari tersisa aman` : 'status standar'}).
                </p>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Button variant="outline" size="sm" onClick={fetchPingStatus} disabled={isFetchingStatus}>
                  {isFetchingStatus ? 'Memeriksa...' : 'Perbarui Status'}
                </Button>
                <Button size="sm" onClick={handleManualPing} disabled={isPinging}>
                  {isPinging ? 'Pinging...' : 'Ping Database Sekarang'}
                </Button>
              </div>
            </div>
            {pingHistory.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                {pingHistory.slice(0, 3).map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border-light)' }}>
                    <span><strong>{item.triggeredBy}</strong> — {item.note}</span>
                    <span>{new Date(item.createdAt).toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'notifications' && (
        <SchoolNotificationPanel
          config={schoolConfig}
          onConfigSaved={() => refetchSchoolConfig()}
          onToast={setToast}
        />
      )}

      {activeTab === 'audit' && (
        <AuditBackupPanel
          config={schoolConfig}
          onConfigSaved={() => refetchSchoolConfig()}
          onToast={setToast}
        />
      )}
    </div>
  );
}
