/* ============================================================
   PengaturanPage — Pengaturan Geofence Khusus Admin
   ============================================================ */

import { useState } from 'react';
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
    </div>
  );
}
