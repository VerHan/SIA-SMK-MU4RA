import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  getJakartaToday,
  getMasterTimeSlots,
  getSchedule,
  getTeacherAttendance,
} from '../services/api';
import Modal from './ui/Modal';
import Button from './ui/Button';

export default function TeacherPopups() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [showGPSModal, setShowGPSModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [currentClass, setCurrentClass] = useState(null);

  useEffect(() => {
    if (user?.role !== 'guru') return undefined;

    let cancelled = false;
    const today = getJakartaToday();
    const dismissedKey = `sia_gps_reminder_dismissed_${user.id}_${today}`;

    // 1. Check real server teacher attendance status for today
    const checkTeacherAttendance = async () => {
      if (sessionStorage.getItem(dismissedKey)) return;
      try {
        const records = await getTeacherAttendance({
          date: today,
          teacherId: user.teacherId || undefined,
          teacherName: !user.teacherId ? user.name : undefined,
        });
        const hasCheckedInToday = Array.isArray(records) && records.length > 0;
        if (!cancelled && !hasCheckedInToday) {
          setShowGPSModal(true);
        }
      } catch {
        /* Abaikan error jaringan agar tidak mengganggu guru */
      }
    };

    // 2. Check active class schedule from real API
    const checkCurrentClass = async () => {
      try {
        const [timeSlots, schedules] = await Promise.all([
          getMasterTimeSlots(),
          getSchedule(getCurrentDay()),
        ]);
        if (cancelled) return;

        const now = new Date();
        const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const activeSlot = (timeSlots || []).find(
          (slot) => slot.jamKe && currentTimeStr >= slot.start && currentTimeStr <= slot.end
        );
        if (!activeSlot) return;

        const myClass = (schedules || []).find(
          (s) =>
            s.jamKe === activeSlot.jamKe &&
            ((user.teacherId && s.teacherId === user.teacherId) || s.teacher === user.name)
        );
        if (myClass) {
          const confirmKey = `sia_class_reminder_${myClass.id}_${today}`;
          if (!sessionStorage.getItem(confirmKey)) {
            setCurrentClass({
              ...myClass,
              slotStart: activeSlot.start,
              slotEnd: activeSlot.end,
            });
            setShowClassModal(true);
          }
        }
      } catch {
        /* Abaikan error jaringan */
      }
    };

    const gpsTimer = setTimeout(checkTeacherAttendance, 1200);
    checkCurrentClass();
    const interval = setInterval(checkCurrentClass, 60000);

    return () => {
      cancelled = true;
      clearTimeout(gpsTimer);
      clearInterval(interval);
    };
  }, [user]);

  const dismissGPS = () => {
    const today = getJakartaToday();
    if (user?.id) sessionStorage.setItem(`sia_gps_reminder_dismissed_${user.id}_${today}`, '1');
    setShowGPSModal(false);
  };

  const goToGPS = () => {
    dismissGPS();
    navigate('/client/absen-gps');
  };

  const goToMapelAttendance = () => {
    if (currentClass) {
      sessionStorage.setItem(`sia_class_reminder_${currentClass.id}_${getJakartaToday()}`, '1');
    }
    setShowClassModal(false);
    navigate('/client/absen-mapel');
  };

  if (user?.role !== 'guru') return null;

  return (
    <>
      <Modal isOpen={showGPSModal} onClose={dismissGPS} title="Pengingat Presensi Guru (GPS)">
        <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
          <p style={{ marginBottom: 'var(--space-5)', fontSize: '14px', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
            Anda belum tercatat melakukan <strong>Absen Geolokasi (GPS)</strong> hari ini. Silakan buka halaman Absen GPS untuk mencatat jam kedatangan secara akurat.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
            <Button variant="outline" onClick={dismissGPS}>Nanti Saja</Button>
            <Button onClick={goToGPS}>Buka Absen GPS</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showClassModal} onClose={() => setShowClassModal(false)} title="Pengingat Jadwal Mengajar">
        <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 'var(--space-2)' }}>
            Jam Pelajaran Ke-{currentClass?.jamKe} Sedang Berlangsung
          </h3>
          <p style={{ marginBottom: 'var(--space-4)', fontSize: '14px', background: 'var(--color-bg)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', lineHeight: 1.6 }}>
            <strong>Mata Pelajaran:</strong> {currentClass?.subject} <br />
            <strong>Kelas:</strong> {currentClass?.class} <br />
            <strong>Waktu:</strong> {currentClass?.slotStart} - {currentClass?.slotEnd}
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
            <Button variant="outline" onClick={() => setShowClassModal(false)}>Tutup</Button>
            <Button onClick={goToMapelAttendance}>Buka Absen Mapel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function getCurrentDay() {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[new Date().getDay()] || 'Senin';
}
