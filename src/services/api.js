/* ============================================================
   API Service Layer — Pure SIA Operations
   ============================================================ */

import {
  MOCK_STUDENTS,
  MOCK_TEACHERS,
  MOCK_CLASSES,
  MOCK_SCHEDULE,
  MOCK_ATTENDANCE,
  MOCK_PRAYER_ATTENDANCE,
  MOCK_PAYMENTS,
  MOCK_GRADES,
  MOCK_NEWS,
  MOCK_USERS,
  MOCK_ACADEMIC_YEARS,
  MOCK_SUBJECTS,
  MOCK_SUBJECT_TEACHERS,
  MOCK_TEACHER_DUTIES,
  MOCK_DUTY_SCHEDULE,
  MOCK_TEACHER_ATTENDANCE,
  MOCK_BEHAVIOR_RULES,
  MOCK_BEHAVIOR_POINTS,
  MOCK_TIME_SLOTS,
  MOCK_ACADEMIC_CALENDAR,
  MOCK_STUDENT_ATTITUDE
} from './mockData';
import { delay, generateId } from '../utils/helpers';
import { SUBJECT_GROUPS as DEFAULT_SUBJECT_GROUPS } from '../config/constants';

const SIMULATE_DELAY = true;
const simulateNetwork = () => SIMULATE_DELAY ? delay(150) : Promise.resolve();

/* ============================================================
   Mutable State (prototype — akan diganti backend)
   ============================================================ */
let studentsList = [...MOCK_STUDENTS];
let academicYearsList = [...MOCK_ACADEMIC_YEARS];
let subjectsList = [...MOCK_SUBJECTS];
let subjectTeachersList = [...MOCK_SUBJECT_TEACHERS];
let subjectGroupsList = [...DEFAULT_SUBJECT_GROUPS];
let teacherDutiesList = [...MOCK_TEACHER_DUTIES];
let dutyScheduleList = [...MOCK_DUTY_SCHEDULE];
let teacherAttendanceList = [...MOCK_TEACHER_ATTENDANCE];
let subjectAttendanceList = []; // For storing mapel attendance
let behaviorRulesList = [...MOCK_BEHAVIOR_RULES];
let behaviorPointsList = [...MOCK_BEHAVIOR_POINTS];
let classesList = [...MOCK_CLASSES];
let teachersList = [...MOCK_TEACHERS];
let attendanceList = [...MOCK_ATTENDANCE];
let scheduleList = [...MOCK_SCHEDULE];
let academicCalendarList = [...MOCK_ACADEMIC_CALENDAR];
let timeSlotsList = [...MOCK_TIME_SLOTS];
let studentAttitudeList = MOCK_STUDENT_ATTITUDE ? [...MOCK_STUDENT_ATTITUDE] : [];

/* Legacy GPS teacher attendance (for AbsenGuruGPSPage) */
let teacherGPSAttendanceList = [
  { id: 'tg001', teacherName: 'Ahmad Fauzi, S.Pd.', date: '2024-07-22', timeIn: '06:45', timeOut: '14:00', distanceMeters: 12, isWithinGeofence: true, status: 'Hadir Tepat Waktu' },
  { id: 'tg002', teacherName: 'Siti Nurhaliza, S.Kom.', date: '2024-07-22', timeIn: '06:52', timeOut: null, distanceMeters: 25, isWithinGeofence: true, status: 'Hadir Tepat Waktu' },
];


/* ============================================================
   AUTH
   ============================================================ */
export async function loginUser(username, password) {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password })
    });
    /* Pastikan response berisi JSON sebelum parsing */
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      if (!data.success) {
        return {
          success: false,
          error: data.error || data.message || 'Username atau password salah.'
        };
      }
      return {
        success: true,
        user: data.user
      };
    }
    /* Response bukan JSON — fallback ke mock */
    throw new Error('Backend tidak mengembalikan format JSON');
  } catch (err) {
    /* Fallback: gunakan mock data jika backend mati */
    console.warn('Backend login fallback ke mock:', err.message);
    await simulateNetwork();
    const cleanUsername = (username || '').trim().toLowerCase();
    const user = MOCK_USERS.find(
      u => u.username.toLowerCase() === cleanUsername && u.password === password
    );
    if (user) {
      const { password: _, ...safeUser } = user;
      return { success: true, user: safeUser };
    }
    return { success: false, error: 'Username atau password salah.' };
  }
}


/* ============================================================
   TAHUN AJAR
   ============================================================ */
export async function getAcademicYears() {
  try {
    const res = await fetch('/api/tahun-ajar');
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to get academic years', e); }
  return [...academicYearsList];
}

export async function addAcademicYear(data) {
  try {
    const res = await fetch('/api/tahun-ajar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to add academic year', e); }
  return { success: false, error: 'Gagal menghubungi server' };
}

export async function updateAcademicYear(id, data) {
  try {
    const res = await fetch(`/api/tahun-ajar/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to update academic year', e); }
  return { success: false, error: 'Gagal menghubungi server' };
}

export async function deleteAcademicYear(id) {
  try {
    const res = await fetch(`/api/tahun-ajar/${id}`, { method: 'DELETE' });
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to delete academic year', e); }
  return { success: false, error: 'Gagal menghubungi server' };
}

export async function setActiveAcademicYear(id) {
  try {
    const res = await fetch(`/api/tahun-ajar/${id}/activate`, { method: 'PUT' });
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to set active academic year', e); }
  return { success: false, error: 'Gagal menghubungi server' };
}


/* ============================================================
   MATA PELAJARAN
   ============================================================ */
export async function getSubjects() {
  try {
    const res = await fetch('/api/mapel');
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to get subjects', e); }
  return [...subjectsList];
}

export async function addSubject(data) {
  try {
    const res = await fetch('/api/mapel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to add subject', e); }
  return { success: false, error: 'Gagal menghubungi server' };
}

export async function updateSubject(id, data) {
  try {
    const res = await fetch(`/api/mapel/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to update subject', e); }
  return { success: false, error: 'Gagal menghubungi server' };
}

export async function deleteSubject(id) {
  try {
    const res = await fetch(`/api/mapel/${id}`, { method: 'DELETE' });
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to delete subject', e); }
  return { success: false, error: 'Gagal menghubungi server' };
}


/* ============================================================
   KELOMPOK MATA PELAJARAN (SUBJECT GROUPS)
   ============================================================ */

export async function getSubjectGroups() {
  try {
    const res = await fetch('/api/mapel/kelompok');
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to get subject groups', e); }
  return [...subjectGroupsList];
}

export async function addSubjectGroup(name) {
  try {
    const res = await fetch('/api/mapel/kelompok', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to add subject group', e); }
  return { success: false, error: 'Gagal menghubungi server' };
}

export async function updateSubjectGroup(oldName, newName) {
  try {
    const res = await fetch(`/api/mapel/kelompok/${encodeURIComponent(oldName)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName })
    });
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to update subject group', e); }
  return { success: false, error: 'Gagal menghubungi server' };
}

export async function deleteSubjectGroup(name) {
  try {
    const res = await fetch(`/api/mapel/kelompok/${encodeURIComponent(name)}`, { method: 'DELETE' });
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to delete subject group', e); }
  return { success: false, error: 'Gagal menghubungi server' };
}


/* ============================================================
   MAPPING GURU ↔ MAPEL
   ============================================================ */
export async function getSubjectTeachers() {
  await simulateNetwork();
  return subjectTeachersList.map(st => {
    const guru = teachersList.find(g => g.id === st.guruId);
    const mapel = subjectsList.find(m => m.id === st.mapelId);
    return { ...st, guruName: guru?.name || '-', mapelName: mapel?.nama || '-' };
  });
}

export async function addSubjectTeacher(guruId, mapelId) {
  await simulateNetwork();
  const exists = subjectTeachersList.find(st => st.guruId === guruId && st.mapelId === mapelId);
  if (exists) return { success: false, error: 'Guru sudah mengampu mapel ini.' };
  const newST = { id: generateId(), guruId, mapelId };
  subjectTeachersList.push(newST);
  return { success: true, message: 'Mapel berhasil ditambahkan ke guru.' };
}

export async function removeSubjectTeacher(id) {
  await simulateNetwork();
  subjectTeachersList = subjectTeachersList.filter(st => st.id !== id);
  return { success: true, message: 'Mapel berhasil dihapus dari guru.' };
}


/* ============================================================
   TUGAS GURU
   ============================================================ */
export async function getTeacherDuties(guruIdFilter) {
  await simulateNetwork();
  let data = [...teacherDutiesList];
  if (guruIdFilter) data = data.filter(d => d.guruId === guruIdFilter);
  return data.map(d => {
    const guru = teachersList.find(g => g.id === d.guruId);
    const kelas = classesList.find(c => c.id === d.kelasId);
    return { ...d, guruName: guru?.name || '-', kelasName: kelas?.name || '-' };
  });
}

export async function addTeacherDuty(data) {
  await simulateNetwork();
  const newDuty = { id: generateId(), ...data };
  teacherDutiesList.push(newDuty);
  return { success: true, data: newDuty, message: 'Tugas guru berhasil ditambahkan.' };
}

export async function deleteTeacherDuty(id) {
  await simulateNetwork();
  teacherDutiesList = teacherDutiesList.filter(d => d.id !== id);
  return { success: true, message: 'Tugas guru berhasil dihapus.' };
}


/* ============================================================
   JADWAL PIKET
   ============================================================ */
export async function getDutySchedule(hariFilter) {
  await simulateNetwork();
  let data = [...dutyScheduleList];
  if (hariFilter) data = data.filter(d => d.hari === hariFilter);
  return data;
}

export async function addDutySchedule(data) {
  await simulateNetwork();
  const guru = teachersList.find(g => g.id === data.guruId);
  const newItem = { id: generateId(), ...data, guruName: guru?.name || '-' };
  dutyScheduleList.push(newItem);
  return { success: true, data: newItem, message: 'Jadwal piket berhasil ditambahkan.' };
}

export async function deleteDutySchedule(id) {
  await simulateNetwork();
  dutyScheduleList = dutyScheduleList.filter(d => d.id !== id);
  return { success: true, message: 'Jadwal piket berhasil dihapus.' };
}


/* ============================================================
   STUDENTS (CRUD Master Data Siswa)
   ============================================================ */
export async function getStudents(classFilter) {
  try {
    const url = classFilter ? `/api/siswa?kelas=${encodeURIComponent(classFilter)}` : '/api/siswa';
    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to get students', e); }
  if (classFilter) return studentsList.filter(s => s.class === classFilter);
  return [...studentsList];
}

export async function addStudent(studentData) {
  try {
    const res = await fetch('/api/siswa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData)
    });
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to add student', e); }
  return { success: false, error: 'Gagal menghubungi server' };
}

export async function importStudents(dataArray) {
  try {
    const res = await fetch('/api/siswa/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: dataArray })
    });
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to import students', e); }
  return { success: false, error: 'Gagal menghubungi server' };
}

export async function updateStudent(id, studentData) {
  try {
    const res = await fetch(`/api/siswa/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData)
    });
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to update student', e); }
  return { success: false, error: 'Gagal menghubungi server' };
}

export async function deleteStudent(id) {
  try {
    const res = await fetch(`/api/siswa/${id}`, { method: 'DELETE' });
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to delete student', e); }
  return { success: false, error: 'Gagal menghubungi server' };
}


/* ============================================================
   TEACHERS (CRUD)
   ============================================================ */
export async function getTeachers() {
  try {
    const res = await fetch('/api/guru');
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to get teachers', e); }
  return [...teachersList];
}

export async function addTeacher(data) {
  try {
    const res = await fetch('/api/guru', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to add teacher', e); }
  return { success: false, error: 'Gagal menghubungi server' };
}

export async function updateTeacher(id, data) {
  try {
    const res = await fetch(`/api/guru/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to update teacher', e); }
  return { success: false, error: 'Gagal menghubungi server' };
}

export async function deleteTeacher(id) {
  try {
    const res = await fetch(`/api/guru/${id}`, { method: 'DELETE' });
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to delete teacher', e); }
  return { success: false, error: 'Gagal menghubungi server' };
}


/* ============================================================
   ABSENSI GURU (GPS GEOFENCING — Legacy)
   ============================================================ */
export async function getTeacherAttendance(dateFilter) {
  try {
    const url = dateFilter ? `/api/guru/absen?date=${dateFilter}` : '/api/guru/absen';
    const res = await fetch(url);
    const contentType = res.headers.get('content-type');
    if (res.ok && contentType && contentType.includes('application/json')) {
      const data = await res.json();
      return data;
    }
    throw new Error('Backend tidak tersedia');
  } catch (err) {
    console.warn('Fallback ke mock data untuk absensi guru:', err.message);
    /* Fallback ke mock */
    let data = [...teacherAttendanceList];
    if (dateFilter) data = data.filter(a => a.tanggal === dateFilter);
    return data.map(a => ({
      id: a.id,
      teacherId: a.guruId,
      teacherName: a.guruName,
      date: a.tanggal,
      status: a.status,
      timeIn: a.jamMasuk,
      timeOut: a.jamPulang,
      source: a.sumber,
      distanceMeters: a.jarakMeter
    }));
  }
}

export async function submitTeacherAttendance({ teacherName, type, distanceMeters, isWithinGeofence, coords }) {
  try {
    const res = await fetch('/api/guru/absen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherName, type, distanceMeters, isWithinGeofence, coords })
    });
    const contentType = res.headers.get('content-type');
    if (res.ok && contentType && contentType.includes('application/json')) {
      const data = await res.json();
      if (!data.success) {
        return { success: false, error: data.message };
      }
      return { success: true, message: data.message };
    }
    throw new Error('Backend tidak tersedia');
  } catch (err) {
    console.warn('Fallback untuk submit absensi guru:', err.message);
    
    // Implementasi Mock
    const now = new Date();
    const jktDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
    const today = jktDateStr;
    const currentTime = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
    
    const existingIndex = teacherAttendanceList.findIndex(a => a.guruName === teacherName && a.tanggal === today);
    
    if (type === 'in') {
      if (existingIndex !== -1 && teacherAttendanceList[existingIndex].jamMasuk) {
        return { success: false, error: 'Anda sudah absen masuk hari ini' };
      }
      
      const newRecord = {
        id: generateId(),
        guruId: 'g_mock', // Mock ID
        guruName: teacherName,
        tanggal: today,
        status: isWithinGeofence ? 'hadir' : 'luar_radius',
        sumber: 'gps',
        jamMasuk: currentTime,
        jamPulang: null,
        jarakMeter: distanceMeters,
        keterangan: ''
      };
      
      if (existingIndex !== -1) {
        teacherAttendanceList[existingIndex] = newRecord;
      } else {
        teacherAttendanceList.unshift(newRecord);
      }
      
      return { success: true, message: 'Berhasil Absen Masuk (Offline Mode)!' };
      
    } else if (type === 'out') {
      if (existingIndex === -1 || !teacherAttendanceList[existingIndex].jamMasuk) {
        return { success: false, error: 'Anda belum absen masuk' };
      }
      if (teacherAttendanceList[existingIndex].jamPulang) {
        return { success: false, error: 'Anda sudah absen pulang hari ini' };
      }
      
      teacherAttendanceList[existingIndex].jamPulang = currentTime;
      return { success: true, message: 'Berhasil Absen Pulang (Offline Mode)!' };
    }

    return { success: false, error: 'Tipe absen tidak valid.' };
  }
}


/* ============================================================
   ABSENSI GURU (REKAP ADMIN: GPS + MANUAL)
   ============================================================ */
export async function getTeacherAttendanceRecap(dateFilter) {
  await simulateNetwork();
  let data = [...teacherAttendanceList];
  if (dateFilter) data = data.filter(a => a.tanggal === dateFilter);
  return data;
}

export async function submitManualTeacherAttendance(data) {
  await simulateNetwork();
  const guru = teachersList.find(g => g.id === data.guruId);
  const newRecord = {
    id: generateId(),
    guruId: data.guruId,
    guruName: guru?.name || '-',
    tanggal: data.tanggal,
    status: data.status,
    sumber: 'manual',
    jamMasuk: data.jamMasuk || null,
    jamPulang: data.jamPulang || null,
    jarakMeter: null,
    keterangan: data.keterangan || '',
  };
  teacherAttendanceList.unshift(newRecord);
  return { success: true, message: 'Absensi guru berhasil dicatat.' };
}


/* ============================================================
   CLASSES
   ============================================================ */
export async function getClasses() {
  try {
    const res = await fetch('/api/kelas');
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to get classes', e); }
  return [...classesList];
}

export async function addClass(data) {
  try {
    const res = await fetch('/api/kelas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to add class', e); }
  return { success: false, error: 'Gagal menghubungi server' };
}

export async function updateClass(id, data) {
  try {
    const res = await fetch(`/api/kelas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to update class', e); }
  return { success: false, error: 'Gagal menghubungi server' };
}

export async function deleteClass(id) {
  try {
    const res = await fetch(`/api/kelas/${id}`, { method: 'DELETE' });
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to delete class', e); }
  return { success: false, error: 'Gagal menghubungi server' };
}


/* ============================================================
   SCHEDULE & TIME SLOTS
   ============================================================ */

export async function getSchedule(dayFilter) {
  await simulateNetwork();
  if (dayFilter) {
    return scheduleList.filter(s => s.day === dayFilter);
  }
  return [...scheduleList];
}

export async function addSchedule(data) {
  await simulateNetwork();
  const guru = teachersList.find(g => g.id === data.teacherId);
  const mapel = subjectsList.find(m => m.id === data.subjectId);
  const newSchedule = {
    id: generateId(),
    ...data,
    teacher: guru?.name || '-',
    subject: mapel?.nama || data.subject || '-',
  };
  scheduleList.push(newSchedule);
  return { success: true, data: newSchedule, message: 'Jadwal berhasil ditambahkan.' };
}

export async function deleteSchedule(id) {
  await simulateNetwork();
  scheduleList = scheduleList.filter(s => s.id !== id);
  return { success: true, message: 'Jadwal berhasil dihapus.' };
}

export async function saveScheduleMatrix(day, records) {
  await simulateNetwork();
  // hapus jadwal lama untuk hari dan kelas yang ada di records (untuk overwrite)
  // Atau lebih aman: hapus semua jadwal di hari 'day' yang kelasnya ada dalam records yang kita simpan
  const classesToUpdate = [...new Set(records.map(r => r.class))];
  
  scheduleList = scheduleList.filter(s => !(s.day === day && classesToUpdate.includes(s.class)));
  
  // Masukkan jadwal baru
  records.forEach(r => {
    if (r.subjectId && r.teacherId) {
      const guru = teachersList.find(g => g.id === r.teacherId);
      const mapel = subjectsList.find(m => m.id === r.subjectId);
      scheduleList.push({
        id: generateId(),
        day: day,
        jamKe: r.jamKe,
        class: r.class,
        subjectId: r.subjectId,
        subject: mapel?.nama || '-',
        teacherId: r.teacherId,
        teacher: guru?.name || '-',
        room: r.room || '-',
      });
    }
  });

  return { success: true, message: 'Jadwal berhasil disimpan.' };
}


/* ============================================================
   ATTENDANCE (Siswa - Pagi & Sore)
   ============================================================ */
export async function getAttendance(classFilter, dateFilter, monthFilter) {
  await simulateNetwork();
  let data = [...attendanceList];
  if (classFilter) data = data.filter(a => a.class === classFilter);
  if (dateFilter) data = data.filter(a => a.date === dateFilter);
  if (monthFilter) data = data.filter(a => a.date.startsWith(monthFilter)); // monthFilter is YYYY-MM
  return data;
}

export async function saveAttendance(records) {
  await simulateNetwork();
  records.forEach(record => {
    const existingIndex = attendanceList.findIndex(
      a => a.studentId === record.studentId && a.date === record.date
    );
    if (existingIndex !== -1) {
      attendanceList[existingIndex] = { ...attendanceList[existingIndex], ...record };
    } else {
      attendanceList.push({ id: generateId(), ...record });
    }
  });
  return { success: true, message: 'Absensi berhasil disimpan.' };
}

export async function getSubjectAttendance(classFilter, dateFilter, subjectFilter, monthFilter) {
  try {
    const params = new URLSearchParams();
    if (classFilter) params.set('kelas', classFilter);
    if (dateFilter) params.set('date', dateFilter);
    if (subjectFilter) params.set('mapel', subjectFilter);
    if (monthFilter) params.set('month', monthFilter);
    const res = await fetch(`/api/absensi-mapel?${params.toString()}`);
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to get subject attendance', e); }
  // Fallback ke mock
  await simulateNetwork();
  let data = [...subjectAttendanceList];
  if (classFilter) data = data.filter(a => a.class === classFilter);
  if (dateFilter) data = data.filter(a => a.date === dateFilter);
  if (subjectFilter) data = data.filter(a => a.subject === subjectFilter);
  if (monthFilter) data = data.filter(a => a.date.startsWith(monthFilter));
  return data;
}

export async function saveSubjectAttendance(records) {
  try {
    const res = await fetch('/api/absensi-mapel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records })
    });
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to save subject attendance', e); }
  return { success: false, error: 'Gagal menghubungi server' };
}

export async function getSubjectAttendanceRekap(kelas, month, mapelId) {
  try {
    const params = new URLSearchParams({ kelas, month });
    if (mapelId) params.set('mapel', mapelId);
    const res = await fetch(`/api/absensi-mapel/rekap?${params.toString()}`);
    if (res.ok) return await res.json();
  } catch (e) { console.error('Failed to get subject attendance rekap', e); }
  return { success: false, error: 'Gagal menghubungi server' };
}

export async function getPrayerAttendance(classFilter) {
  await simulateNetwork();
  let data = [...MOCK_PRAYER_ATTENDANCE];
  if (classFilter) data = data.filter(a => a.class === classFilter);
  return data;
}


/* ============================================================
   BEHAVIOR RULES (Aturan Poin — Editable Admin)
   ============================================================ */
export async function getBehaviorRules() {
  await simulateNetwork();
  return [...behaviorRulesList];
}

export async function addBehaviorRule(data) {
  await simulateNetwork();
  const newRule = { id: generateId(), ...data };
  behaviorRulesList.push(newRule);
  return { success: true, data: newRule, message: 'Aturan poin berhasil ditambahkan.' };
}

export async function updateBehaviorRule(id, data) {
  await simulateNetwork();
  const index = behaviorRulesList.findIndex(r => r.id === id);
  if (index !== -1) {
    behaviorRulesList[index] = { ...behaviorRulesList[index], ...data };
    return { success: true, message: 'Aturan poin berhasil diperbarui.' };
  }
  return { success: false, error: 'Aturan tidak ditemukan.' };
}

export async function deleteBehaviorRule(id) {
  await simulateNetwork();
  behaviorRulesList = behaviorRulesList.filter(r => r.id !== id);
  return { success: true, message: 'Aturan poin berhasil dihapus.' };
}


/* ============================================================
   BEHAVIOR POINTS (Catatan Poin Siswa)
   ============================================================ */
export async function getBehaviorPoints(siswaIdFilter) {
  await simulateNetwork();
  let data = [...behaviorPointsList];
  if (siswaIdFilter) data = data.filter(p => p.siswaId === siswaIdFilter);
  return data;
}

export async function addBehaviorPoint(data) {
  await simulateNetwork();
  const siswa = studentsList.find(s => s.id === data.siswaId);
  const aturan = behaviorRulesList.find(r => r.id === data.aturanPoinId);
  const newPoint = {
    id: generateId(),
    siswaId: data.siswaId,
    siswaName: siswa?.name || '-',
    class: siswa?.class || '-',
    tanggal: data.tanggal,
    aturanPoinId: data.aturanPoinId,
    aturanNama: aturan?.nama || '-',
    poin: aturan?.poin || data.poin || 0,
    keterangan: data.keterangan || '',
    pencatat: data.pencatat || 'Admin',
  };
  behaviorPointsList.unshift(newPoint);
  return { success: true, data: newPoint, message: 'Poin sikap berhasil dicatat.' };
}

export async function deleteBehaviorPoint(id) {
  await simulateNetwork();
  behaviorPointsList = behaviorPointsList.filter(p => p.id !== id);
  return { success: true, message: 'Catatan poin berhasil dihapus.' };
}

/* Hitung total poin per siswa */
export async function getStudentBehaviorSummary(siswaId) {
  await simulateNetwork();
  const points = behaviorPointsList.filter(p => p.siswaId === siswaId);
  const totalPositif = points.filter(p => p.poin > 0).reduce((sum, p) => sum + p.poin, 0);
  const totalNegatif = points.filter(p => p.poin < 0).reduce((sum, p) => sum + p.poin, 0);
  return { totalPositif, totalNegatif, totalPoin: totalPositif + totalNegatif, jumlahCatatan: points.length };
}


/* ============================================================
   PAYMENTS
   ============================================================ */
export async function getPayments(studentIdFilter) {
  await simulateNetwork();
  if (studentIdFilter) {
    return MOCK_PAYMENTS.filter(p => p.studentId === studentIdFilter);
  }
  return [...MOCK_PAYMENTS];
}


/* ============================================================
   GRADES
   ============================================================ */
export async function getGrades(studentIdFilter) {
  await simulateNetwork();
  let data = [...MOCK_GRADES];
  if (studentIdFilter) data = data.filter(g => g.studentId === studentIdFilter);
  return data;
}


/* ============================================================
   DASHBOARD STATS
   ============================================================ */
export async function getDashboardStats() {
  await simulateNetwork();

  /* Hitung hari ini */
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const today = days[new Date().getDay()];
  const todaySchedule = scheduleList.filter(s => s.day === today);

  /* Kehadiran guru hari ini */
  const guruHadir = teacherAttendanceList.filter(a => a.status === 'hadir').length;
  const guruIzin = teacherAttendanceList.filter(a => a.status === 'izin').length;
  const guruSakit = teacherAttendanceList.filter(a => a.status === 'sakit').length;
  const guruAlpha = teachersList.length - guruHadir - guruIzin - guruSakit;

  /* Kehadiran siswa hari ini (pagi) */
  const siswaHadir = attendanceList.filter(a => a.statusPagi === 'hadir').length;
  const siswaIzin = attendanceList.filter(a => a.statusPagi === 'izin').length;
  const siswaSakit = attendanceList.filter(a => a.statusPagi === 'sakit').length;
  const siswaAlpha = attendanceList.filter(a => a.statusPagi === 'alpha').length;

  /* Siswa bolos (hadir pagi tapi alpha sore) */
  const siswaBolos = attendanceList.filter(a => a.statusPagi === 'hadir' && a.statusSore === 'alpha').length;

  /* Upcoming events */
  const upcomingEvents = MOCK_NEWS
    .filter(n => n.category === 'Kegiatan' || n.category === 'Pengumuman')
    .slice(0, 3);

  /* Tahun ajar aktif */
  const activeYear = academicYearsList.find(y => y.isActive);

  /* Piket hari ini */
  const todayDuty = dutyScheduleList.filter(d => d.hari === today);

  return {
    totalStudents: studentsList.length,
    totalTeachers: teachersList.length,
    totalClasses: classesList.length,
    todayScheduleCount: todaySchedule.length,
    activeAcademicYear: activeYear ? `${activeYear.nama} Smt ${activeYear.semester}` : '-',
    teacherAttendanceToday: { hadir: guruHadir, izin: guruIzin, sakit: guruSakit, alpha: guruAlpha > 0 ? guruAlpha : 0 },
    studentAttendanceToday: { hadir: siswaHadir, izin: siswaIzin, sakit: siswaSakit, alpha: siswaAlpha, bolos: siswaBolos },
    upcomingEvents,
    todayDuty,
    todaySchedule: todaySchedule.slice(0, 5),
  };
}

/* ============================================================
   PENJADWALAN DINAMIS (Master Sesi & Kalender Akademik)
   ============================================================ */

/* --- Master Sesi Waktu --- */
export async function getMasterTimeSlots() {
  await simulateNetwork();
  return [...timeSlotsList];
}

export async function updateMasterTimeSlot(data) {
  await simulateNetwork();
  // Assume data is an array of new slots for simplicity
  timeSlotsList = [...data];
  return { success: true, message: 'Master Sesi Waktu berhasil diperbarui.' };
}

/* --- Kalender Akademik --- */
export async function getAcademicCalendar() {
  await simulateNetwork();
  return [...academicCalendarList];
}

export async function getAcademicCalendarByDate(dateStr) {
  await simulateNetwork();
  return academicCalendarList.find(c => c.tanggal === dateStr) || null;
}

export async function addAcademicCalendarEvent(data) {
  await simulateNetwork();
  const newEvent = { id: generateId(), ...data };
  academicCalendarList.push(newEvent);
  return { success: true, data: newEvent, message: 'Event berhasil ditambahkan.' };
}

export async function deleteAcademicCalendarEvent(id) {
  await simulateNetwork();
  academicCalendarList = academicCalendarList.filter(c => c.id !== id);
  return { success: true, message: 'Event berhasil dihapus.' };
}

/* ============================================================
   PROFIL SISWA (RAPOR KARAKTER & KEHADIRAN)
   ============================================================ */
export async function getStudentProfile(studentId) {
  await simulateNetwork();
  
  const student = studentsList.find(s => s.id === studentId);
  if (!student) return null;

  // 1. Kehadiran Piket
  const piketRecords = attendanceList.filter(a => a.studentId === studentId);
  let piketSummary = { hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 };
  piketRecords.forEach(att => {
    ['statusPagi', 'statusSore'].forEach(sesi => {
      if (att[sesi] === 'hadir') piketSummary.hadir++;
      else if (att[sesi] === 'izin') piketSummary.izin++;
      else if (att[sesi] === 'sakit') piketSummary.sakit++;
      else if (att[sesi] === 'alpha') piketSummary.alpha++;
    });
  });
  piketSummary.total = piketSummary.hadir + piketSummary.izin + piketSummary.sakit + piketSummary.alpha;

  // 2. Kehadiran Mapel
  const mapelRecords = subjectAttendanceList.filter(a => a.studentId === studentId);
  const mapelSummary = {};
  mapelRecords.forEach(att => {
    if (!mapelSummary[att.subject]) {
      mapelSummary[att.subject] = { hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 };
    }
    if (att.status === 'hadir') mapelSummary[att.subject].hadir++;
    else if (att.status === 'izin') mapelSummary[att.subject].izin++;
    else if (att.status === 'sakit') mapelSummary[att.subject].sakit++;
    else if (att.status === 'alpha') mapelSummary[att.subject].alpha++;
    mapelSummary[att.subject].total++;
  });

  // 3. Jurnal Sikap
  const attitudeRecords = studentAttitudeList.filter(a => a.studentId === studentId);
  
  return {
    student,
    piketSummary,
    mapelSummary,
    attitudeRecords
  };
}
