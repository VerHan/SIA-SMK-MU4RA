/* ============================================================
   AbsenGuruGPSPage — Absensi Guru Menggunakan Geofencing GPS
   ============================================================ */

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../hooks/useSettings';
import { calculateHaversineDistance } from '../../utils/helpers';
import { getTeacherAttendance, submitTeacherAttendance } from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Toast from '../../components/ui/Toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

/* Fix leaflet icon issue */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Komponen helper untuk recenter map ke user
function MapRecenter({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.setView([coords.lat, coords.lng], map.getZoom());
    }
  }, [coords, map]);
  return null;
}

export default function AbsenGuruGPSPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const schoolGeofence = settings.geofence;
  
  const [coords, setCoords] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [loadingGps, setLoadingGps] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState(null);

  const fetchLocation = () => {
    setLoadingGps(true);
    setGpsError('');

    if (!navigator.geolocation) {
      setGpsError('Browser Anda tidak mendukung fitur Geolocation.');
      setLoadingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setCoords({ lat: userLat, lng: userLng });

        const dist = calculateHaversineDistance(
          userLat,
          userLng,
          schoolGeofence.latitude,
          schoolGeofence.longitude
        );

        setDistance(dist);
        setIsWithinGeofence(dist <= schoolGeofence.radiusMeters);
        setLoadingGps(false);
      },
      (err) => {
        console.warn('GPS Error:', err.message);
        /* Fallback demo mode */
        const mockLat = schoolGeofence.latitude + 0.0001; 
        const mockLng = schoolGeofence.longitude + 0.0001;
        setCoords({ lat: mockLat, lng: mockLng });

        const dist = calculateHaversineDistance(
          mockLat,
          mockLng,
          schoolGeofence.latitude,
          schoolGeofence.longitude
        );
        setDistance(dist);
        setIsWithinGeofence(dist <= schoolGeofence.radiusMeters);
        setGpsError('Lokasi GPS menggunakan mode simulasi (Izinkan akses lokasi browser untuk presisi aktual).');
        setLoadingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    fetchLocation();
    getTeacherAttendance().then(setHistory);
  }, [schoolGeofence]);

  const handleAttendance = async (type) => {
    if (!isWithinGeofence) {
      setToast({ type: 'error', message: `Absen ditolak! Anda berada ${distance}m dari sekolah (Batas radius: ${schoolGeofence.radiusMeters}m).` });
      return;
    }

    setSubmitting(true);
    const res = await submitTeacherAttendance({
      teacherName: user?.name || 'Guru SMK',
      type,
      distanceMeters: distance,
      isWithinGeofence,
      coords,
    });
    setSubmitting(false);

    if (res.success) {
      setToast({ type: 'success', message: res.message });
      getTeacherAttendance().then(setHistory);
    } else {
      setToast({ type: 'error', message: res.error });
    }
  };

  const columns = [
    { header: 'Nama Guru', accessor: 'teacherName', cellStyle: { fontWeight: 'var(--font-weight-medium)' } },
    { header: 'Tanggal', accessor: 'date' },
    { header: 'Jam Masuk', render: (row) => row.timeIn ? <Badge variant="success">🕒 {row.timeIn}</Badge> : '—' },
    { header: 'Jam Pulang', render: (row) => row.timeOut ? <Badge variant="info">🕒 {row.timeOut}</Badge> : '—' },
    { header: 'Jarak GPS', render: (row) => <span>📍 {row.distanceMeters} meter</span> },
    {
      header: 'Status Presensi',
      render: (row) => (
        <Badge variant={row.isWithinGeofence ? 'success' : 'danger'}>
          {row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', marginBottom: 'var(--space-1)' }}>
          📍 Presensi Guru (Geofencing GPS)
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Pastikan Anda berada di dalam lingkaran hijau area sekolah sebelum melakukan absen.
        </p>
      </div>

      <style>{`
        .gps-grid-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-6);
          margin-bottom: var(--space-8);
        }
        @media (min-width: 900px) {
          .gps-grid-container {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>

      <div className="gps-grid-container">
        {/* GPS Control Card */}
        <Card style={{
          background: isWithinGeofence
            ? 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)'
            : 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
          border: isWithinGeofence ? '1.5px solid #3B82F6' : '1.5px solid #EF4444',
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <span style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Status Lokasi GPS Anda
            </span>
            <Button size="sm" variant="ghost" onClick={fetchLocation} loading={loadingGps}>
              🔄 Refresh GPS
            </Button>
          </div>

          {loadingGps ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LoadingSpinner message="Mendeteksi koordinat GPS..." />
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', margin: 'var(--space-4) 0', flex: 1 }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-1)' }}>
                  {isWithinGeofence ? '✅' : '❌'}
                </div>

                <div style={{
                  fontSize: 'var(--font-size-2xl)',
                  fontWeight: 'var(--font-weight-extrabold)',
                  color: isWithinGeofence ? 'var(--color-primary)' : 'var(--color-danger)',
                }}>
                  {distance !== null ? `${distance} Meter` : 'Mendeteksi...'}
                </div>

                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  Jarak Anda dari Titik Sekolah
                </div>

                <div style={{ marginTop: 'var(--space-3)' }}>
                  <Badge variant={isWithinGeofence ? 'success' : 'danger'} size="md">
                    {isWithinGeofence ? '✓ Di Dalam Area Sekolah' : '✕ Di Luar Area Sekolah'}
                  </Badge>
                </div>
              </div>

              {gpsError && (
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning)', background: '#FFFBEB', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
                  ⚠️ {gpsError}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                <Button
                  size="lg"
                  disabled={!isWithinGeofence || submitting}
                  loading={submitting}
                  onClick={() => handleAttendance('in')}
                  style={{ background: 'var(--color-success)', color: 'white' }}
                >
                  🟢 Absen Masuk
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  disabled={!isWithinGeofence || submitting}
                  loading={submitting}
                  onClick={() => handleAttendance('out')}
                  style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                >
                  🔴 Absen Pulang
                </Button>
              </div>
            </>
          )}
        </Card>

        {/* Live Map Display */}
        <Card padding="0" style={{ overflow: 'hidden', height: '400px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 'var(--space-3)', background: 'var(--color-primary-surface)', borderBottom: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🗺️ Peta Geofence Sekolah</span>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>Radius: {schoolGeofence.radiusMeters}m</span>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            {(coords && !loadingGps) ? (
              <MapContainer 
                center={[coords.lat, coords.lng]} 
                zoom={17} 
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap'
                />
                
                {/* School Geofence Circle */}
                <Circle 
                  center={[schoolGeofence.latitude, schoolGeofence.longitude]} 
                  radius={schoolGeofence.radiusMeters} 
                  pathOptions={{ 
                    color: isWithinGeofence ? '#10B981' : '#EF4444', 
                    fillColor: isWithinGeofence ? '#10B981' : '#EF4444', 
                    fillOpacity: 0.15 
                  }}
                />
                
                {/* User Location Marker */}
                <Marker position={[coords.lat, coords.lng]} />
                
                <MapRecenter coords={coords} />
              </MapContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                Menyiapkan peta...
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* History Table */}
      <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-4)' }}>
        📋 Riwayat Presensi Guru Hari Ini
      </h3>
      <Card padding="0">
        <Table columns={columns} data={history} emptyMessage="Belum ada riwayat presensi guru hari ini." />
      </Card>
    </div>
  );
}
