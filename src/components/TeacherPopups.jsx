import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getMasterTimeSlots, getSchedule } from '../services/api';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Toast from './ui/Toast';

export default function TeacherPopups() {
  const { user } = useAuth();
  
  // States
  const [showGPSModal, setShowGPSModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [currentClass, setCurrentClass] = useState(null);
  const [toast, setToast] = useState(null);

  // MOCK LOGIC: We only run these checks if the user is a teacher
  useEffect(() => {
    if (user?.role !== 'guru') return;

    // 1. Check GPS Attendance (has the teacher checked in today?)
    // In a real app, we check the backend or localStorage
    const hasCheckedIn = localStorage.getItem(`gps_checkin_${new Date().toLocaleDateString()}`);
    if (!hasCheckedIn) {
      // Small delay before showing popup for better UX
      setTimeout(() => setShowGPSModal(true), 1500);
    }

    // 2. Check if a class is starting right now based on Master Timeline
    const checkCurrentClass = async () => {
      const timeSlots = await getMasterTimeSlots();
      const today = getCurrentDay();
      const schedules = await getSchedule(today);
      
      // Get current hour:minute
      const now = new Date();
      const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      // Find current active time slot (Mock logic: for testing, let's just assume we found one if we are testing)
      // Since we want this to work regardless of actual real-world time during testing,
      // I'll add a mock trigger if time is within a slot, or just trigger it for demo purposes if localStorage is set.
      
      const activeSlot = timeSlots.find(slot => {
        if (!slot.jamKe) return false; // skip breaks
        return currentTimeStr >= slot.start && currentTimeStr <= slot.end;
      });

      // Find teacher's schedule for this active slot
      if (activeSlot) {
        // Find if this teacher (mock matching by name or just taking the first one for demo)
        // In real app: s.teacherId === user.teacherId
        const myClass = schedules.find(s => s.jamKe === activeSlot.jamKe && s.teacher === user.name);
        
        if (myClass) {
          const hasConfirmedClass = localStorage.getItem(`class_confirm_${myClass.id}_${new Date().toLocaleDateString()}`);
          if (!hasConfirmedClass) {
            setCurrentClass({
              ...myClass,
              slotStart: activeSlot.start,
              slotEnd: activeSlot.end
            });
            setShowClassModal(true);
          }
        }
      }
    };

    checkCurrentClass();
    
    // Set up an interval to check every minute
    const interval = setInterval(checkCurrentClass, 60000);
    return () => clearInterval(interval);

  }, [user]);

  const handleConfirmGPS = () => {
    localStorage.setItem(`gps_checkin_${new Date().toLocaleDateString()}`, 'true');
    setShowGPSModal(false);
    setToast({ type: 'success', message: 'Terima kasih, Anda telah mengkonfirmasi kedatangan.' });
  };

  const handleConfirmClass = () => {
    if (currentClass) {
      localStorage.setItem(`class_confirm_${currentClass.id}_${new Date().toLocaleDateString()}`, 'true');
      
      // Mock API call to update the Admin CCTV (Monitoring Mapel)
      // We will store this in localStorage so MonitoringMapelPage can read it
      const cctvState = JSON.parse(localStorage.getItem('cctv_state') || '{}');
      cctvState[currentClass.id] = 'guru_hadir'; // Status: Guru Hadir, Belum Absen
      localStorage.setItem('cctv_state', JSON.stringify(cctvState));

      setShowClassModal(false);
      setToast({ type: 'success', message: `Kehadiran di kelas ${currentClass.class} telah dicatat. Jangan lupa input absen siswa nanti.` });
    }
  };

  if (user?.role !== 'guru') return null;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* 1. Modal GPS Reminder */}
      <Modal isOpen={showGPSModal} onClose={() => setShowGPSModal(false)} title="Peringatan Kedatangan">
        <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
          <div style={{ fontSize: '40px', marginBottom: 'var(--space-2)' }}>📍</div>
          <p style={{ marginBottom: 'var(--space-4)', fontSize: '15px' }}>
            Anda belum melakukan **Absen Geolokasi (GPS)** hari ini. 
            Mohon segera melakukan absen di menu "Absen Guru (GPS)" untuk merekam jam kedatangan Anda.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
            <Button variant="outline" onClick={() => setShowGPSModal(false)}>Nanti Saja</Button>
            <Button onClick={handleConfirmGPS}>Tandai Hadir Sekarang (Mock)</Button>
          </div>
        </div>
      </Modal>

      {/* 2. Modal Class "I'm Here" Reminder */}
      <Modal isOpen={showClassModal} onClose={() => setShowClassModal(false)} title="Konfirmasi Kelas (I'm Here!)">
        <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
          <div style={{ fontSize: '40px', marginBottom: 'var(--space-2)' }}>🔔</div>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-primary)', marginBottom: 'var(--space-2)' }}>
            Jam Pelajaran Ke-{currentClass?.jamKe} Dimulai!
          </h3>
          <p style={{ marginBottom: 'var(--space-4)', fontSize: '15px', background: 'var(--color-surface)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
            Jadwal Anda saat ini: <br/>
            <strong>Mata Pelajaran:</strong> {currentClass?.subject} <br/>
            <strong>Kelas:</strong> {currentClass?.class} <br/>
            <strong>Waktu:</strong> {currentClass?.slotStart} - {currentClass?.slotEnd}
          </p>
          <p style={{ marginBottom: 'var(--space-5)', fontSize: '13px', color: 'var(--color-danger)' }}>
            *Harap konfirmasi bahwa Anda sudah berada di dalam kelas agar Kepala Sekolah mengetahui status kelas tidak kosong.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
            <Button variant="outline" onClick={() => setShowClassModal(false)}>Tutup</Button>
            <Button onClick={handleConfirmClass}>Ya, Saya Sudah di Kelas</Button>
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
