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
  MOCK_ACADEMIC_CALENDAR
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

/* Legacy GPS teacher attendance (for AbsenGuruGPSPage) */
let teacherGPSAttendanceList = [
  { id: 'tg001', teacherName: 'Ahmad Fauzi, S.Pd.', date: '2024-07-22', timeIn: '06:45', timeOut: '14:00', distanceMeters: 12, isWithinGeofence: true, status: 'Hadir Tepat Waktu' },
  { id: 'tg002', teacherName: 'Siti Nurhaliza, S.Kom.', date: '2024-07-22', timeIn: '06:52', timeOut: null, distanceMeters: 25, isWithinGeofence: true, status: 'Hadir Tepat Waktu' },
];


/* ============================================================
   AUTH
   ============================================================ */
export async function loginUser(username, password) {
  await simulateNetwork();
  const user = MOCK_USERS.find(
    u => u.username === username && u.password === password
  );
  if (user) {
    const { password: _, ...safeUser } = user;
    return { success: true, user: safeUser };
  }
  return { success: false, error: 'Username atau password salah.' };
}


/* ============================================================
   TAHUN AJAR
   ============================================================ */
export async function getAcademicYears() {
  await simulateNetwork();
  return [...academicYearsList];
}

export async function addAcademicYear(data) {
  await simulateNetwork();
  const newYear = { id: generateId(), ...data, isActive: false };
  academicYearsList.push(newYear);
  return { success: true, data: newYear, message: 'Tahun ajar berhasil ditambahkan.' };
}

export async function updateAcademicYear(id, data) {
  await simulateNetwork();
  const index = academicYearsList.findIndex(y => y.id === id);
  if (index !== -1) {
    academicYearsList[index] = { ...academicYearsList[index], ...data };
    return { success: true, message: 'Tahun ajar berhasil diperbarui.' };
  }
  return { success: false, error: 'Tahun ajar tidak ditemukan.' };
}

export async function deleteAcademicYear(id) {
  await simulateNetwork();
  academicYearsList = academicYearsList.filter(y => y.id !== id);
  return { success: true, message: 'Tahun ajar berhasil dihapus.' };
}

export async function setActiveAcademicYear(id) {
  await simulateNetwork();
  academicYearsList = academicYearsList.map(y => ({ ...y, isActive: y.id === id }));
  return { success: true, message: 'Tahun ajar aktif berhasil diubah.' };
}


/* ============================================================
   MATA PELAJARAN
   ============================================================ */
export async function getSubjects() {
  await simulateNetwork();
  return [...subjectsList];
}

export async function addSubject(data) {
  await simulateNetwork();
  const newSubject = { id: generateId(), ...data };
  subjectsList.push(newSubject);
  return { success: true, data: newSubject, message: 'Mata pelajaran berhasil ditambahkan.' };
}

export async function updateSubject(id, data) {
  await simulateNetwork();
  const index = subjectsList.findIndex(s => s.id === id);
  if (index !== -1) {
    subjectsList[index] = { ...subjectsList[index], ...data };
    return { success: true, message: 'Mata pelajaran berhasil diperbarui.' };
  }
  return { success: false, error: 'Mata pelajaran tidak ditemukan.' };
}

export async function deleteSubject(id) {
  await simulateNetwork();
  subjectsList = subjectsList.filter(s => s.id !== id);
  subjectTeachersList = subjectTeachersList.filter(st => st.mapelId !== id);
  return { success: true, message: 'Mata pelajaran berhasil dihapus.' };
}


/* ============================================================
   KELOMPOK MATA PELAJARAN (SUBJECT GROUPS)
   ============================================================ */

export async function getSubjectGroups() {
  await simulateNetwork();
  return [...subjectGroupsList];
}

export async function addSubjectGroup(name) {
  await simulateNetwork();
  if (!subjectGroupsList.includes(name)) {
    subjectGroupsList.push(name);
    return { success: true, message: 'Kelompok berhasil ditambahkan.' };
  }
  return { success: false, error: 'Kelompok sudah ada.' };
}

export async function updateSubjectGroup(oldName, newName) {
  await simulateNetwork();
  const index = subjectGroupsList.indexOf(oldName);
  if (index !== -1) {
    if (subjectGroupsList.includes(newName) && oldName !== newName) {
        return { success: false, error: 'Nama kelompok sudah digunakan.' };
    }
    subjectGroupsList[index] = newName;
    // Update existing subjects with the new group name
    subjectsList = subjectsList.map(s => 
      s.kelompok === oldName ? { ...s, kelompok: newName } : s
    );
    return { success: true, message: 'Kelompok berhasil diperbarui.' };
  }
  return { success: false, error: 'Kelompok tidak ditemukan.' };
}

export async function deleteSubjectGroup(name) {
  await simulateNetwork();
  subjectGroupsList = subjectGroupsList.filter(g => g !== name);
  return { success: true, message: 'Kelompok berhasil dihapus.' };
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
  await simulateNetwork();
  if (classFilter) {
    return studentsList.filter(s => s.class === classFilter);
  }
  return [...studentsList];
}

export async function addStudent(studentData) {
  await simulateNetwork();
  const newStudent = {
    id: generateId(),
    nis: studentData.nis,
    nisn: studentData.nisn || '-',
    name: studentData.name,
    class: studentData.class,
    gender: studentData.gender,
    phone_parent: studentData.phone_parent || '-',
    alamat: studentData.alamat || '-',
    sekolah_asal: studentData.sekolah_asal || '-',
  };
  studentsList.unshift(newStudent);
  return { success: true, student: newStudent, message: 'Siswa berhasil ditambahkan.' };
}

export async function importStudents(dataArray) {
  await simulateNetwork();
  
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    return { success: false, error: 'Data kosong atau format tidak valid.' };
  }

  let successCount = 0;
  
  dataArray.forEach(studentData => {
    /* Skip jika NIS atau Nama kosong */
    if (!studentData.nis || !studentData.name) return;

    /* Cek apakah NIS sudah ada untuk mencegah duplikasi */
    const exists = studentsList.find(s => s.nis === String(studentData.nis));
    if (!exists) {
      const newStudent = {
        id: generateId(),
        nis: String(studentData.nis),
        nisn: studentData.nisn ? String(studentData.nisn) : '-',
        name: studentData.name,
        class: studentData.class || '-',
        gender: studentData.gender || 'L',
        phone_parent: studentData.phone_parent ? String(studentData.phone_parent) : '-',
        alamat: studentData.alamat || '-',
        sekolah_asal: studentData.sekolah_asal || '-',
      };
      studentsList.unshift(newStudent);
      successCount++;
    }
  });

  return { 
    success: true, 
    message: `${successCount} data siswa berhasil diimpor.` 
  };
}

export async function updateStudent(id, studentData) {
  await simulateNetwork();
  const index = studentsList.findIndex(s => s.id === id);
  if (index !== -1) {
    studentsList[index] = { ...studentsList[index], ...studentData };
    return { success: true, message: 'Data siswa berhasil diperbarui.' };
  }
  return { success: false, error: 'Siswa tidak ditemukan.' };
}

export async function deleteStudent(id) {
  await simulateNetwork();
  studentsList = studentsList.filter(s => s.id !== id);
  return { success: true, message: 'Siswa berhasil dihapus.' };
}


/* ============================================================
   TEACHERS (CRUD)
   ============================================================ */
export async function getTeachers() {
  await simulateNetwork();
  return [...teachersList];
}

export async function addTeacher(data) {
  await simulateNetwork();
  const newTeacher = { id: generateId(), ...data, role: 'guru' };
  teachersList.push(newTeacher);
  return { success: true, data: newTeacher, message: 'Guru berhasil ditambahkan.' };
}

export async function updateTeacher(id, data) {
  await simulateNetwork();
  const index = teachersList.findIndex(t => t.id === id);
  if (index !== -1) {
    teachersList[index] = { ...teachersList[index], ...data };
    return { success: true, message: 'Data guru berhasil diperbarui.' };
  }
  return { success: false, error: 'Guru tidak ditemukan.' };
}

export async function deleteTeacher(id) {
  await simulateNetwork();
  teachersList = teachersList.filter(t => t.id !== id);
  return { success: true, message: 'Guru berhasil dihapus.' };
}


/* ============================================================
   ABSENSI GURU (GPS GEOFENCING — Legacy)
   ============================================================ */
export async function getTeacherAttendance(dateFilter) {
  await simulateNetwork();
  if (dateFilter) {
    return teacherGPSAttendanceList.filter(t => t.date === dateFilter);
  }
  return [...teacherGPSAttendanceList];
}

export async function submitTeacherAttendance({ teacherName, type, distanceMeters, isWithinGeofence, coords }) {
  await simulateNetwork();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toISOString().split('T')[0];

  let record = teacherGPSAttendanceList.find(t => t.teacherName === teacherName && t.date === dateStr);

  if (type === 'in') {
    if (record) {
      return { success: false, error: 'Anda sudah melakukan Absen Masuk hari ini.' };
    }
    const newRecord = {
      id: generateId(),
      teacherName,
      date: dateStr,
      timeIn: timeStr,
      timeOut: null,
      distanceMeters,
      isWithinGeofence,
      coords,
      status: isWithinGeofence ? 'Hadir Tepat Waktu' : 'Absen Luar Area (GPS)',
    };
    teacherGPSAttendanceList.unshift(newRecord);
    return { success: true, message: `Absen Masuk Berhasil pada jam ${timeStr} (Jarak: ${distanceMeters}m)` };
  } else {
    if (!record) {
      return { success: false, error: 'Anda belum melakukan Absen Masuk hari ini.' };
    }
    record.timeOut = timeStr;
    return { success: true, message: `Absen Pulang Berhasil pada jam ${timeStr}` };
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
  await simulateNetwork();
  return [...classesList];
}

export async function addClass(data) {
  await simulateNetwork();
  const newClass = { id: generateId(), ...data };
  classesList.push(newClass);
  return { success: true, data: newClass, message: 'Kelas berhasil ditambahkan.' };
}

export async function updateClass(id, data) {
  await simulateNetwork();
  const index = classesList.findIndex(c => c.id === id);
  if (index !== -1) {
    classesList[index] = { ...classesList[index], ...data };
    return { success: true, message: 'Kelas berhasil diperbarui.' };
  }
  return { success: false, error: 'Kelas tidak ditemukan.' };
}

export async function deleteClass(id) {
  await simulateNetwork();
  classesList = classesList.filter(c => c.id !== id);
  return { success: true, message: 'Kelas berhasil dihapus.' };
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
export async function getAttendance(classFilter, dateFilter) {
  await simulateNetwork();
  let data = [...attendanceList];
  if (classFilter) data = data.filter(a => a.class === classFilter);
  if (dateFilter) data = data.filter(a => a.date === dateFilter);
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

export async function getSubjectAttendance(classFilter) {
  await simulateNetwork();
  let data = [...subjectAttendanceList];
  if (classFilter) data = data.filter(a => a.class === classFilter);
  return data;
}

export async function saveSubjectAttendance(records) {
  await simulateNetwork();
  records.forEach(record => {
    const existingIndex = subjectAttendanceList.findIndex(
      a => a.studentId === record.studentId && 
           a.date === record.date && 
           a.subject === record.subject && 
           a.jamKe === record.jamKe
    );
    if (existingIndex !== -1) {
      subjectAttendanceList[existingIndex] = { ...subjectAttendanceList[existingIndex], ...record };
    } else {
      subjectAttendanceList.push({ id: generateId(), ...record });
    }
  });
  return { success: true, message: 'Absensi mapel berhasil disimpan.' };
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
