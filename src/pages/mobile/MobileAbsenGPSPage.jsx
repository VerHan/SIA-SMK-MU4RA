/* ============================================================
   MobileAbsenGPSPage.jsx — Absen GPS untuk Guru (Mobile)
   Wrapper dari AbsenGuruGPSPage dengan styling mobile
   ============================================================ */

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../hooks/useSettings';
import {
  submitTeacherAttendance,
  getTeacherAttendance,
  getCachedAttendance,
  setCachedAttendance,
  getJakartaToday,
} from '../../services/api';
import { SCHOOL_GEOFENCE } from '../../config/constants';

function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const STATUS_COLORS = {
  'hadir': { bg: 'rgba(5,150,105,0.15)', border: 'rgba(5,150,105,0.4)', text: '#34D399' },
  'alpha': { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', text: '#FCA5A5' },
};

export default function MobileAbsenGPSPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const schoolGeofence = settings?.geofence || SCHOOL_GEOFENCE;

  const today = getJakartaToday();

  const [coords, setCoords] = useState(null);
  const [distance, setDistance] = useState(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  /* Baca dari cache lokal terlebih dahulu (0ms delay) */
  const [todayRecord, setTodayRecord] = useState(() => getCachedAttendance(user?.name, today));
  const [permissionStatus, setPermissionStatus] = useState('unknown'); // 'unknown' | 'granted' | 'denied' | 'prompt'

  /* Cek status permission GPS saat halaman dimuat */
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        setPermissionStatus(result.state); // 'granted', 'denied', atau 'prompt'
        result.onchange = () => setPermissionStatus(result.state);
      }).catch(() => {
        setPermissionStatus('unknown');
      });
    }
  }, []);

  /* Sinkronisasi data presensi secara background */
  useEffect(() => {
    if (!user?.name) return;

    // Cek ulang cache jika ada pembaruan
    const cached = getCachedAttendance(user.name, today);
    if (cached) setTodayRecord(cached);

    // Fetch server revalidation di background
    getTeacherAttendance(today, user.name).then(data => {
      const rec = Array.isArray(data)
        ? data.find(r => (r.teacherName === user.name || r.guruName === user.name) && (r.date === today || r.tanggal === today))
        : (data?.teacherName === user.name ? data : null);
      if (rec) {
        setTodayRecord(rec);
        setCachedAttendance(user.name, today, rec);
      }
    }).catch(err => {
      console.warn('Background attendance fetch error:', err);
    });

    // Dengarkan event pembaruan presensi dari tab/halaman lain
    const handleUpdate = (e) => {
      if (e.detail?.teacherName === user.name && e.detail?.date === today) {
        setTodayRecord(e.detail.record);
      }
    };
    window.addEventListener('sia-attendance-updated', handleUpdate);
    return () => window.removeEventListener('sia-attendance-updated', handleUpdate);
  }, [user?.name, today]);

  const getLocation = () => {
    /* Cek apakah browser mendukung Geolocation API */
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Browser Anda tidak mendukung fitur GPS/Geolocation. Gunakan browser Chrome atau Safari terbaru.' });
      return;
    }

    setLocating(true);
    setMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ latitude, longitude });
        const dist = Math.round(calcDistance(latitude, longitude, schoolGeofence.latitude, schoolGeofence.longitude));
        setDistance(dist);
        setLocating(false);
        setPermissionStatus('granted');
        setMessage({ type: 'success', text: `Lokasi berhasil terdeteksi! (Akurasi: ±${Math.round(pos.coords.accuracy)}m)` });
      },
      (err) => {
        setLocating(false);
        let errorText = '';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setPermissionStatus('denied');
            errorText = '⛔ Izin lokasi DITOLAK oleh browser. Silakan aktifkan izin lokasi di pengaturan browser Anda (lihat panduan di bawah).';
            break;
          case err.POSITION_UNAVAILABLE:
            errorText = '📡 Sinyal GPS tidak tersedia. Pastikan GPS/Lokasi sudah diaktifkan di pengaturan HP Anda, lalu coba lagi.';
            break;
          case err.TIMEOUT:
            errorText = '⏱️ Waktu pencarian lokasi habis. Coba pindah ke area terbuka dan tekan tombol lagi.';
            break;
          default:
            errorText = `Gagal mendapatkan lokasi: ${err.message}`;
        }
        setMessage({ type: 'error', text: errorText });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const isWithin = distance !== null && distance <= schoolGeofence.radiusMeters;

  const handleAbsen = async (type) => {
    if (!coords) {
      setMessage({ type: 'error', text: 'Lokasi belum dideteksi. Tekan "Deteksi Lokasi" terlebih dahulu.' });
      return;
    }
    
    if (!isWithin) {
      setMessage({ type: 'error', text: `Anda berada di luar area sekolah (${distance}m). Jarak maksimal yang diizinkan ${schoolGeofence.radiusMeters}m.` });
      return;
    }

    const now = new Date();
    const currentTime = now.toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace('.', ':');

    const previousRecord = todayRecord;

    // 1. OPTIMISTIC UPDATE: Langsung update UI dan simpan ke cache lokal (0ms respon)
    const optimisticRecord = {
      ...(previousRecord || {}),
      teacherName: user?.name,
      guruName: user?.name,
      date: today,
      tanggal: today,
      status: 'hadir',
      timeIn: type === 'in' ? currentTime : (previousRecord?.timeIn || currentTime),
      jamMasuk: type === 'in' ? currentTime : (previousRecord?.jamMasuk || currentTime),
      timeOut: type === 'out' ? currentTime : (previousRecord?.timeOut || null),
      jamPulang: type === 'out' ? currentTime : (previousRecord?.jamPulang || null),
      distanceMeters: distance,
      jarakMeter: distance,
      isWithinGeofence: isWithin,
    };

    setTodayRecord(optimisticRecord);
    setCachedAttendance(user?.name, today, optimisticRecord);
    setSubmitting(true);
    setMessage({ type: 'success', text: `Menyimpan presensi ${type === 'in' ? 'masuk' : 'pulang'}...` });

    // 2. Kirim ke database di background
    try {
      const res = await submitTeacherAttendance({
        teacherName: user?.name,
        teacherId: user?.teacherId || user?.id,
        type,
        distanceMeters: distance,
        isWithinGeofence: isWithin,
        coords,
      });

      if (res.success) {
        setMessage({ type: 'success', text: res.message || 'Presensi berhasil disimpan!' });
        if (res.record) {
          setTodayRecord(res.record);
          setCachedAttendance(user?.name, today, res.record);
        }
      } else {
        if (res.record) {
          setTodayRecord(res.record);
          setCachedAttendance(user?.name, today, res.record);
        } else {
          setTodayRecord(previousRecord);
          setCachedAttendance(user?.name, today, previousRecord);
        }
        setMessage({ type: 'error', text: res.error || 'Gagal menyimpan presensi.' });
      }
    } catch (err) {
      console.warn('Submit attendance network fallback:', err);
      setMessage({ type: 'success', text: 'Presensi tersimpan lokal dan akan disinkronkan ke server.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '16px 20px', animation: 'fadeInUp 0.4s ease' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Absen GPS</h2>
      <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px' }}>
        Absensi berbasis geolokasi sekolah
      </p>

      {/* Permission Warning */}
      {permissionStatus === 'denied' && (
        <div style={{
          padding: '16px', borderRadius: '16px', marginBottom: '16px',
          background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239,68,68,0.2)',
        }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#DC2626', margin: '0 0 8px' }}>
            ⛔ Izin Lokasi Ditolak
          </p>
          <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 8px', lineHeight: '1.5' }}>
            Browser memblokir akses lokasi. Untuk mengaktifkan:
          </p>
          <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.6' }}>
            <div><strong>Chrome Android:</strong></div>
            <div style={{ paddingLeft: '8px', marginBottom: '4px' }}>
              Tap ikon 🔒 di address bar → Izin → Lokasi → Izinkan
            </div>
            <div><strong>Safari iOS:</strong></div>
            <div style={{ paddingLeft: '8px', marginBottom: '4px' }}>
              Pengaturan → Safari → Lokasi → Izinkan
            </div>
            <div><strong>Lalu refresh halaman ini.</strong></div>
          </div>
        </div>
      )}

      {/* Status Card */}
      {todayRecord && (
        <div style={{
          padding: '16px', borderRadius: '16px', marginBottom: '16px',
          background: 'rgba(5, 150, 105, 0.05)', border: '1px solid rgba(5,150,105,0.2)',
        }}>
          <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 4px' }}>Status Hari Ini</p>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#059669', margin: 0 }}>
            ✅ {todayRecord.status}
          </p>
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748B' }}>Masuk</span>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{todayRecord.timeIn || '--:--'}</p>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748B' }}>Pulang</span>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{todayRecord.timeOut || '--:--'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Lokasi */}
      <div style={{
        padding: '20px', borderRadius: '20px', marginBottom: '16px',
        background: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>
          {coords ? (isWithin ? '✅' : '⚠️') : '📍'}
        </div>

        {coords ? (
          <>
            <p style={{ fontSize: '15px', fontWeight: 600, color: isWithin ? '#059669' : '#D97706', margin: '0 0 4px' }}>
              {isWithin ? 'Dalam Area Sekolah' : 'Di Luar Area Sekolah'}
            </p>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 6px' }}>
              Jarak: <strong>{distance} m</strong> dari sekolah (radius {schoolGeofence.radiusMeters} m)
            </p>
            <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>
              Koordinat Anda: {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
            </p>
          </>
        ) : (
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
            Tekan tombol di bawah untuk mendeteksi lokasi Anda
          </p>
        )}
      </div>

      {/* Message */}
      {message && (
        <div style={{
          padding: '12px 16px', borderRadius: '12px', marginBottom: '16px',
          background: message.type === 'success' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${message.type === 'success' ? 'rgba(5, 150, 105, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          fontSize: '13px',
          color: message.type === 'success' ? '#059669' : '#DC2626',
          lineHeight: '1.5',
        }}>
          {message.text}
        </div>
      )}

      {/* Buttons */}
      <button onClick={getLocation} disabled={locating} style={{
        width: '100%', padding: '16px', borderRadius: '14px', marginBottom: '10px',
        background: locating ? 'rgba(0,0,0,0.05)' : 'white',
        border: '1px solid rgba(0,0,0,0.1)',
        color: locating ? '#94A3B8' : '#0F172A', fontSize: '15px', fontWeight: 600,
        boxShadow: locating ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
        cursor: locating ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        transition: 'all 0.2s ease',
      }}>
        📍 {locating ? 'Mendeteksi Lokasi...' : 'Deteksi Lokasi'}
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <button onClick={() => handleAbsen('in')} disabled={!coords || submitting || todayRecord?.timeIn || !isWithin} style={{
          padding: '16px 12px', borderRadius: '14px',
          background: coords && !todayRecord?.timeIn && isWithin ? '#059669' : 'rgba(0,0,0,0.05)',
          border: '1px solid rgba(5,150,105,0.1)',
          color: coords && !todayRecord?.timeIn && isWithin ? 'white' : '#94A3B8',
          fontSize: '14px', fontWeight: 600, cursor: coords && !todayRecord?.timeIn && isWithin ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
        }}>
          {todayRecord?.timeIn ? `🟢 Masuk (${todayRecord.timeIn})` : (submitting ? '⏳ Menyimpan...' : '🟢 Absen Masuk')}
        </button>
        <button onClick={() => handleAbsen('out')} disabled={!coords || submitting || !todayRecord?.timeIn || todayRecord?.timeOut || !isWithin} style={{
          padding: '16px 12px', borderRadius: '14px',
          background: coords && todayRecord?.timeIn && !todayRecord?.timeOut && isWithin ? '#D97706' : 'rgba(0,0,0,0.05)',
          border: '1px solid rgba(217,119,6,0.1)',
          color: coords && todayRecord?.timeIn && !todayRecord?.timeOut && isWithin ? 'white' : '#94A3B8',
          fontSize: '14px', fontWeight: 600, cursor: coords && todayRecord?.timeIn && !todayRecord?.timeOut && isWithin ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
        }}>
          {todayRecord?.timeOut ? `🟠 Pulang (${todayRecord.timeOut})` : (submitting && todayRecord?.timeIn ? '⏳ Menyimpan...' : '🟠 Absen Pulang')}
        </button>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

