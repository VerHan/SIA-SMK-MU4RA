/* ============================================================
   PengaturanPage — Pengaturan Geofence Khusus Admin
   ============================================================ */

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useSettings } from '../../hooks/useSettings';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Toast from '../../components/ui/Toast';

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

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function PengaturanPage() {
  const { settings, updateGeofence } = useSettings();
  const [position, setPosition] = useState({
    lat: settings.geofence.latitude,
    lng: settings.geofence.longitude,
  });
  const [radius, setRadius] = useState(settings.geofence.radiusMeters);
  const [toast, setToast] = useState(null);

  // --- KEEP ALIVE STATES ---
  const [pingHistory, setPingHistory] = useState([]);
  const [lastPingDate, setLastPingDate] = useState(null);
  const [isPinging, setIsPinging] = useState(false);
  const [daysUntilPause, setDaysUntilPause] = useState(7);

  useEffect(() => {
    fetchPingStatus();
  }, []);

  const fetchPingStatus = async () => {
    try {
      const res = await fetch('/api/keep-alive/status');
      const data = await res.json();
      if (data.success && data.history) {
        setPingHistory(data.history);
        if (data.history.length > 0) {
          const lastDate = new Date(data.history[0].createdAt);
          setLastPingDate(lastDate);
          
          const now = new Date();
          const diffTime = Math.abs(now - lastDate);
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          setDaysUntilPause(Math.max(0, 7 - diffDays));
        }
      }
    } catch (err) {
      console.error('Failed to fetch ping status:', err);
    }
  };

  const handleManualPing = async () => {
    setIsPinging(true);
    try {
      const res = await fetch('/api/keep-alive/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pingType: 'MANUAL_ADMIN',
          triggeredBy: 'Admin (Manual)',
          note: 'Manual ping from Settings UI'
        })
      });
      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', message: '⚡ Database berhasil diping! Timer 7 hari telah di-reset' });
        fetchPingStatus();
      } else {
        setToast({ type: 'error', message: data.error || 'Gagal melakukan ping database' });
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Gagal koneksi ke server' });
    } finally {
      setIsPinging(false);
    }
  };

  const handleSave = () => {
    updateGeofence({
      latitude: position.lat,
      longitude: position.lng,
      radiusMeters: Number(radius),
    });
    setToast({ type: 'success', message: 'Pengaturan Geofence berhasil disimpan.' });
  };

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: 'var(--space-1)' }}>
          ⚙️ Pengaturan Geofence Sekolah
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Tentukan titik pusat gerbang/sekolah dan radius maksimal guru bisa melakukan presensi.
        </p>
      </div>

      <style>{`
        .pengaturan-grid-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-6);
        }
        @media (min-width: 900px) {
          .pengaturan-grid-container {
            grid-template-columns: 1fr 300px;
          }
        }
      `}</style>

      <div className="pengaturan-grid-container">
        {/* Map Setup */}
        <Card padding="0" style={{ overflow: 'hidden', height: '500px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 'var(--space-3)', background: 'var(--color-primary-surface)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
            📍 Klik pada peta untuk memindahkan titik pusat sekolah.
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

        {/* Settings Form */}
        <Card>
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-4)' }}>
            Detail Lokasi
          </h3>
          
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <Input 
              label="Latitude" 
              value={position.lat} 
              readOnly 
              style={{ background: 'var(--color-bg)' }}
            />
          </div>
          
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <Input 
              label="Longitude" 
              value={position.lng} 
              readOnly 
              style={{ background: 'var(--color-bg)' }}
            />
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

          <Button fullWidth onClick={handleSave}>
            💾 Simpan Pengaturan
          </Button>

          <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-3)', background: 'var(--color-warning-light)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)', color: '#92400E' }}>
            <strong>Penting:</strong> Pastikan titik koordinat berada pas di area utama sekolah. Semua guru harus berada di dalam lingkaran (radius) untuk bisa absen.
          </div>
        </Card>
      </div>

      {/* Database Health Monitor */}
      <div style={{ marginTop: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-4)' }}>
          🗄️ Database Health & Inactivity Monitor
        </h2>
        
        <div className="pengaturan-grid-container">
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
              <div>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>Status Database</h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                  Mencegah auto-pause dari Supabase Free Tier.
                </p>
              </div>
              <div style={{ 
                padding: '4px 12px', 
                borderRadius: '999px', 
                fontWeight: 'bold', 
                fontSize: 'var(--font-size-sm)',
                background: daysUntilPause > 3 ? '#d1fae5' : '#fef3c7',
                color: daysUntilPause > 3 ? '#065f46' : '#92400e'
              }}>
                {daysUntilPause > 3 ? '🟢 Aktif / Sehat' : '🟠 Waspada / Perlu Ping'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
              <div style={{ background: 'var(--color-bg)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Aktivitas Terakhir</div>
                <div style={{ fontWeight: 'bold' }}>
                  {lastPingDate ? lastPingDate.toLocaleString('id-ID') : 'Belum ada data'}
                </div>
              </div>
              <div style={{ background: 'var(--color-bg)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Estimasi Auto-Pause</div>
                <div style={{ fontWeight: 'bold', color: daysUntilPause <= 3 ? 'red' : 'inherit' }}>
                  {daysUntilPause} Hari lagi
                </div>
              </div>
            </div>

            <Button fullWidth onClick={handleManualPing} disabled={isPinging}>
              {isPinging ? '⏳ Pinging...' : '⚡ Ping Database Sekarang'}
            </Button>
          </Card>

          <Card>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-4)' }}>
              Riwayat Ping Terakhir
            </h3>
            
            {pingHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>
                Belum ada riwayat ping.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {pingHistory.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2)', borderBottom: '1px solid var(--color-border)' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: 'var(--font-size-sm)' }}>
                        {item.pingType === 'AUTO_BOT' ? '🤖 Auto Bot' : '👤 Manual Admin'}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                        {item.triggeredBy} • {item.note}
                      </div>
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                      {new Date(item.createdAt).toLocaleDateString('id-ID')} <br/>
                      {new Date(item.createdAt).toLocaleTimeString('id-ID')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
