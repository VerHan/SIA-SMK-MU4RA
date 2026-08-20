/* ============================================================
   MobileAbsenGPSPage.jsx — Absen GPS untuk Guru (Mobile)
   Wrapper dari AbsenGuruGPSPage dengan styling mobile
   ============================================================ */

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { submitTeacherAttendance, getTeacherAttendance } from '../../services/api';
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
  const [coords, setCoords] = useState(null);
  const [distance, setDistance] = useState(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    getTeacherAttendance(today).then(data => {
      const rec = data.find(r => r.teacherName === user?.name && r.date === today);
      if (rec) setTodayRecord(rec);
    });
  }, [user?.name, today]);

  const getLocation = () => {
    setLocating(true);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ latitude, longitude });
        const dist = Math.round(calcDistance(latitude, longitude, SCHOOL_GEOFENCE.latitude, SCHOOL_GEOFENCE.longitude));
        setDistance(dist);
        setLocating(false);
      },
      (err) => {
        setMessage({ type: 'error', text: 'Gagal mendapatkan lokasi. Pastikan GPS aktif.' });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAbsen = async (type) => {
    if (!coords) { setMessage({ type: 'error', text: 'Lokasi belum dideteksi.' }); return; }
    setSubmitting(true);
    const isWithin = distance !== null && distance <= SCHOOL_GEOFENCE.radiusMeters;
    const res = await submitTeacherAttendance({
      teacherName: user?.name,
      type,
      distanceMeters: distance,
      isWithinGeofence: isWithin,
      coords,
    });
    setMessage({ type: res.success ? 'success' : 'error', text: res.message || res.error });
    if (res.success) {
      getTeacherAttendance(today).then(data => {
        const rec = data.find(r => r.teacherName === user?.name && r.date === today);
        if (rec) setTodayRecord(rec);
      });
    }
    setSubmitting(false);
  };

  const isWithin = distance !== null && distance <= SCHOOL_GEOFENCE.radiusMeters;

  return (
    <div style={{ padding: '16px 20px', animation: 'fadeInUp 0.4s ease' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Absen GPS</h2>
      <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px' }}>
        Absensi berbasis geolokasi sekolah
      </p>

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
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
              Jarak: {distance} m dari sekolah (radius {SCHOOL_GEOFENCE.radiusMeters} m)
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
        <button onClick={() => handleAbsen('in')} disabled={!coords || submitting || todayRecord?.timeIn} style={{
          padding: '16px', borderRadius: '14px',
          background: coords && !todayRecord?.timeIn ? '#059669' : 'rgba(0,0,0,0.05)',
          border: '1px solid rgba(5,150,105,0.1)',
          color: coords && !todayRecord?.timeIn ? 'white' : '#94A3B8',
          fontSize: '14px', fontWeight: 600, cursor: coords && !todayRecord?.timeIn ? 'pointer' : 'not-allowed',
        }}>
          🟢 Absen Masuk
        </button>
        <button onClick={() => handleAbsen('out')} disabled={!coords || submitting || !todayRecord?.timeIn || todayRecord?.timeOut} style={{
          padding: '16px', borderRadius: '14px',
          background: coords && todayRecord?.timeIn && !todayRecord?.timeOut ? '#D97706' : 'rgba(0,0,0,0.05)',
          border: '1px solid rgba(217,119,6,0.1)',
          color: coords && todayRecord?.timeIn && !todayRecord?.timeOut ? 'white' : '#94A3B8',
          fontSize: '14px', fontWeight: 600, cursor: 'pointer',
        }}>
          🟠 Absen Pulang
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
