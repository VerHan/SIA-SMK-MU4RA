/* ============================================================
   API Service Layer — Unified Backend Integration
   Semua operasi membaca dan menulis melalui endpoint /api/*
   dengan header Authorization Bearer dari memori JS.
   ============================================================ */

import {
  MOCK_PRAYER_ATTENDANCE,
  MOCK_PAYMENTS,
  MOCK_SUBJECT_TEACHERS,
  MOCK_TEACHER_DUTIES,
  MOCK_DUTY_SCHEDULE,
  MOCK_STUDENT_ATTITUDE,
} from './mockData';
import { generateId } from '../utils/helpers';
import { getAuthHeaders, notifyAuthExpired } from './authToken';
import { setCachedAttendance, removeCachedAttendance, getJakartaToday } from './attendanceCache';
export { getCachedAttendance, setCachedAttendance, removeCachedAttendance, getJakartaToday } from './attendanceCache';

/* ============================================================
   SHARED FETCH HELPER (Bearer Token + JSON Parsing + 401 Handler)
   ============================================================ */
async function apiFetch(url, options = {}) {
  const { headers = {}, body, skipAuthExpiry = false, ...rest } = options;
  const finalHeaders = getAuthHeaders({
    'X-Requested-With': 'XMLHttpRequest',
    ...headers,
  });

  let finalBody = body;
  if (body !== undefined && typeof body !== 'string' && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
    finalBody = JSON.stringify(body);
  }

  const res = await fetch(url, {
    credentials: 'include',
    ...rest,
    headers: finalHeaders,
    body: finalBody,
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;

  if (res.status === 401 && !skipAuthExpiry) {
    notifyAuthExpired();
  }

  return { ok: res.ok, status: res.status, data };
}

function formatMutationResponse(res, fallbackError = 'Permintaan gagal diproses.') {
  if (res.ok && res.data && res.data.success !== false) {
    return res.data;
  }
  return {
    success: false,
    status: res.status,
    conflict: Boolean(res.data?.conflict || res.status === 409),
    conflicts: res.data?.conflicts || [],
    error: res.data?.error || res.data?.message || (res.status === 401 ? 'Sesi habis. Silakan login ulang.' : res.status === 403 ? 'Anda tidak memiliki izin untuk aksi ini.' : fallbackError),
  };
}

/* State lokal ringan untuk modul legacy yang belum punya tabel khusus */
let subjectTeachersList = [...MOCK_SUBJECT_TEACHERS];
let teacherDutiesList = [...MOCK_TEACHER_DUTIES];
let dutyScheduleList = [...MOCK_DUTY_SCHEDULE];
let studentAttitudeList = MOCK_STUDENT_ATTITUDE ? [...MOCK_STUDENT_ATTITUDE] : [];

/* ============================================================
   AUTH & MANAJEMEN AKUN USER
   ============================================================ */
export async function loginUser(username, password, rememberMe = true) {
  try {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      skipAuthExpiry: true,
      body: { username: (username || '').trim(), password, rememberMe: rememberMe !== false },
    });
    if (res.ok && res.data?.success && res.data.user) {
      return {
        success: true,
        token: res.data.token,
        user: res.data.user,
      };
    }
    return {
      success: false,
      error: res.data?.error || res.data?.message || 'Username atau password salah.',
    };
  } catch {
    return { success: false, error: 'Gagal menghubungi server autentikasi.' };
  }
}

export async function logoutUser() {
  try {
    await apiFetch('/api/auth/logout', {
      method: 'POST',
      skipAuthExpiry: true,
    });
  } catch {
    /* Abaikan error jaringan saat logout lokal */
  }
}

export async function getCurrentUser() {
  try {
    const res = await apiFetch('/api/auth/me', { skipAuthExpiry: true });
    if (res.ok && res.data?.success) return res.data;
    return { success: false };
  } catch {
    return { success: false };
  }
}

export async function getUsers() {
  try {
    const res = await apiFetch('/api/users');
    if (res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {
    console.error('Failed to get users:', e);
  }
  return [];
}

export async function addUser(data) {
  try {
    const res = await apiFetch('/api/users', { method: 'POST', body: data });
    return formatMutationResponse(res, 'Gagal menambahkan akun.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function updateUser(id, data) {
  try {
    const res = await apiFetch(`/api/users/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    return formatMutationResponse(res, 'Gagal memperbarui akun.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function deleteUser(id) {
  try {
    const res = await apiFetch(`/api/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return formatMutationResponse(res, 'Gagal menghapus akun.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

/* ============================================================
   TAHUN AJAR
   ============================================================ */
export async function getAcademicYears() {
  try {
    const res = await apiFetch('/api/tahun-ajar');
    if (res.ok && Array.isArray(res.data)) {
      return res.data.map(d => ({
        ...d,
        startDate: typeof d.startDate === 'string' ? d.startDate.split('T')[0] : d.startDate,
        endDate: typeof d.endDate === 'string' ? d.endDate.split('T')[0] : d.endDate,
      }));
    }
  } catch (e) {
    console.error('Failed to get academic years:', e);
  }
  return [];
}

export async function addAcademicYear(data) {
  try {
    const res = await apiFetch('/api/tahun-ajar', { method: 'POST', body: data });
    return formatMutationResponse(res, 'Gagal menambahkan tahun ajar.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function updateAcademicYear(id, data) {
  try {
    const res = await apiFetch(`/api/tahun-ajar/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    return formatMutationResponse(res, 'Gagal memperbarui tahun ajar.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function deleteAcademicYear(id) {
  try {
    const res = await apiFetch(`/api/tahun-ajar/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return formatMutationResponse(res, 'Gagal menghapus tahun ajar.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function setActiveAcademicYear(id) {
  try {
    const res = await apiFetch(`/api/tahun-ajar/${encodeURIComponent(id)}/activate`, { method: 'PUT' });
    return formatMutationResponse(res, 'Gagal mengaktifkan tahun ajar.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

/* ============================================================
   MATA PELAJARAN & KELOMPOK
   ============================================================ */
export async function getSubjects() {
  try {
    const res = await apiFetch('/api/mapel');
    if (res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {
    console.error('Failed to get subjects:', e);
  }
  return [];
}

export async function addSubject(data) {
  try {
    const res = await apiFetch('/api/mapel', { method: 'POST', body: data });
    return formatMutationResponse(res, 'Gagal menambahkan mata pelajaran.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function updateSubject(id, data) {
  try {
    const res = await apiFetch(`/api/mapel/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    return formatMutationResponse(res, 'Gagal memperbarui mata pelajaran.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function deleteSubject(id) {
  try {
    const res = await apiFetch(`/api/mapel/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return formatMutationResponse(res, 'Gagal menghapus mata pelajaran.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function getSubjectGroups() {
  try {
    const res = await apiFetch('/api/mapel/kelompok');
    if (res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {
    console.error('Failed to get subject groups:', e);
  }
  return [];
}

export async function addSubjectGroup(name) {
  try {
    const res = await apiFetch('/api/mapel/kelompok', { method: 'POST', body: { name } });
    return formatMutationResponse(res, 'Gagal menambahkan kelompok mapel.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function updateSubjectGroup(oldName, newName) {
  try {
    const res = await apiFetch(`/api/mapel/kelompok/${encodeURIComponent(oldName)}`, {
      method: 'PUT',
      body: { newName },
    });
    return formatMutationResponse(res, 'Gagal memperbarui kelompok mapel.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function deleteSubjectGroup(name) {
  try {
    const res = await apiFetch(`/api/mapel/kelompok/${encodeURIComponent(name)}`, { method: 'DELETE' });
    return formatMutationResponse(res, 'Gagal menghapus kelompok mapel.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

/* ============================================================
   MAPPING GURU ↔ MAPEL, TUGAS GURU & PIKET (Legacy Helper)
   ============================================================ */
export async function getSubjectTeachers() {
  const [teachers, subjects] = await Promise.all([getTeachers(), getSubjects()]);
  return subjectTeachersList.map(st => {
    const guru = teachers.find(g => g.id === st.guruId);
    const mapel = subjects.find(m => m.id === st.mapelId);
    return { ...st, guruName: guru?.name || '-', mapelName: mapel?.nama || '-' };
  });
}

export async function addSubjectTeacher(guruId, mapelId) {
  const exists = subjectTeachersList.find(st => st.guruId === guruId && st.mapelId === mapelId);
  if (exists) return { success: false, error: 'Guru sudah mengampu mapel ini.' };
  const newST = { id: generateId(), guruId, mapelId };
  subjectTeachersList.push(newST);
  return { success: true, message: 'Mapel berhasil ditambahkan ke guru.' };
}

export async function removeSubjectTeacher(id) {
  subjectTeachersList = subjectTeachersList.filter(st => st.id !== id);
  return { success: true, message: 'Mapel berhasil dihapus dari guru.' };
}

export async function getTeacherDuties(guruIdFilter) {
  const [teachers, classes] = await Promise.all([getTeachers(), getClasses()]);
  let data = [...teacherDutiesList];
  if (guruIdFilter) data = data.filter(d => d.guruId === guruIdFilter);
  return data.map(d => {
    const guru = teachers.find(g => g.id === d.guruId);
    const kelas = classes.find(c => c.id === d.kelasId);
    return { ...d, guruName: guru?.name || '-', kelasName: kelas?.name || '-' };
  });
}

export async function addTeacherDuty(data) {
  const newDuty = { id: generateId(), ...data };
  teacherDutiesList.push(newDuty);
  return { success: true, data: newDuty, message: 'Tugas guru berhasil ditambahkan.' };
}

export async function deleteTeacherDuty(id) {
  teacherDutiesList = teacherDutiesList.filter(d => d.id !== id);
  return { success: true, message: 'Tugas guru berhasil dihapus.' };
}

export async function getDutySchedule(hariFilter) {
  let data = [...dutyScheduleList];
  if (hariFilter) data = data.filter(d => d.hari === hariFilter);
  return data;
}

export async function addDutySchedule(data) {
  const teachers = await getTeachers();
  const guru = teachers.find(g => g.id === data.guruId);
  const newItem = { id: generateId(), ...data, guruName: guru?.name || '-' };
  dutyScheduleList.push(newItem);
  return { success: true, data: newItem, message: 'Jadwal piket berhasil ditambahkan.' };
}

export async function deleteDutySchedule(id) {
  dutyScheduleList = dutyScheduleList.filter(d => d.id !== id);
  return { success: true, message: 'Jadwal piket berhasil dihapus.' };
}

/* ============================================================
   STUDENTS (CRUD Master Data Siswa)
   ============================================================ */
export async function getStudents(classFilter, options = {}) {
  try {
    const params = new URLSearchParams();
    if (classFilter) params.append('kelas', classFilter);
    if (options.status) params.append('status', options.status);
    if (options.includeInactive) params.append('includeInactive', 'true');
    const qs = params.toString();
    const url = `/api/siswa${qs ? `?${qs}` : ''}`;
    const res = await apiFetch(url);
    if (res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {
    console.error('Failed to get students:', e);
  }
  return [];
}

export async function getStudentAttendanceDetail(studentId, month) {
  try {
    const params = new URLSearchParams();
    if (month && month !== 'all') params.append('month', month);
    const qs = params.toString();
    const res = await apiFetch(`/api/siswa/${encodeURIComponent(studentId)}/absensi${qs ? `?${qs}` : ''}`);
    if (res.ok && res.data?.success) return res.data;
  } catch (e) {
    console.error('Failed to get student attendance detail:', e);
  }
  return null;
}

export async function addStudent(studentData) {
  try {
    const res = await apiFetch('/api/siswa', { method: 'POST', body: studentData });
    return formatMutationResponse(res, 'Gagal menambahkan siswa.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function importStudents(dataArray) {
  try {
    const res = await apiFetch('/api/siswa/import', { method: 'POST', body: { data: dataArray } });
    return formatMutationResponse(res, 'Gagal mengimpor data siswa.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function updateStudent(id, studentData) {
  try {
    const res = await apiFetch(`/api/siswa/${encodeURIComponent(id)}`, { method: 'PUT', body: studentData });
    return formatMutationResponse(res, 'Gagal memperbarui data siswa.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function deleteStudent(id) {
  try {
    const res = await apiFetch(`/api/siswa/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return formatMutationResponse(res, 'Gagal menghapus siswa.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

/* ============================================================
   TEACHERS (CRUD)
   ============================================================ */
export async function getTeachers() {
  try {
    const res = await apiFetch('/api/guru');
    if (res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {
    console.error('Failed to get teachers:', e);
  }
  return [];
}

export async function addTeacher(data) {
  try {
    const res = await apiFetch('/api/guru', { method: 'POST', body: data });
    return formatMutationResponse(res, 'Gagal menambahkan guru.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function updateTeacher(id, data) {
  try {
    const res = await apiFetch(`/api/guru/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    return formatMutationResponse(res, 'Gagal memperbarui data guru.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function deleteTeacher(id) {
  try {
    const res = await apiFetch(`/api/guru/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return formatMutationResponse(res, 'Gagal menghapus guru.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

/* ============================================================
   ABSENSI GURU (GPS GEOFENCING & MANUAL ADMIN)
   ============================================================ */
export async function getTeacherAttendance(dateFilter, teacherName, teacherId) {
  try {
    const params = new URLSearchParams();
    if (dateFilter) params.append('date', dateFilter);
    if (teacherName) params.append('teacherName', teacherName);
    if (teacherId) params.append('teacherId', teacherId);
    const qs = params.toString();
    const res = await apiFetch(`/api/guru/absen${qs ? `?${qs}` : ''}`);
    if (res.ok && Array.isArray(res.data)) {
      if (teacherName) {
        const targetDate = dateFilter || getJakartaToday();
        const found = res.data.find(
          r => (r.teacherName === teacherName || r.guruName === teacherName) && (r.date === targetDate || r.tanggal === targetDate)
        );
        if (found) setCachedAttendance(teacherName, targetDate, found);
      }
      return res.data;
    }
  } catch (e) {
    console.error('Failed to get teacher attendance:', e);
  }
  return [];
}

export async function getGeofenceSettings() {
  try {
    const res = await apiFetch('/api/settings/geofence', { skipAuthExpiry: true });
    if (res.ok && res.data?.success && res.data.data) {
      return { success: true, data: res.data.data };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}

export async function updateGeofenceSettings(geofence) {
  try {
    const res = await apiFetch('/api/settings/geofence', {
      method: 'PUT',
      body: geofence,
    });
    return formatMutationResponse(res, 'Gagal menyimpan pengaturan geofence.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function submitTeacherAttendance({ teacherName, teacherId, type, coords }) {
  try {
    const normalizedCoords = coords
      ? {
          latitude: coords.latitude ?? coords.lat,
          longitude: coords.longitude ?? coords.lng,
        }
      : null;
    const res = await apiFetch('/api/guru/absen', {
      method: 'POST',
      body: { teacherName, teacherId, type, coords: normalizedCoords },
    });
    if (res.ok && res.data) {
      if (!res.data.success) {
        return { success: false, error: res.data.message || res.data.error, record: res.data.record };
      }
      if (res.data.record) {
        setCachedAttendance(teacherName || res.data.record.teacherName, res.data.record.date || getJakartaToday(), res.data.record);
      }
      return { success: true, message: res.data.message, record: res.data.record };
    }
    return formatMutationResponse(res, 'Gagal mengirim absensi guru.');
  } catch {
    return {
      success: false,
      networkError: true,
      error: 'Gagal terhubung ke server. Presensi belum tersimpan — periksa koneksi lalu coba lagi.',
    };
  }
}

export async function getTeacherAttendanceRecap(dateFilter) {
  try {
    const url = dateFilter ? `/api/guru/absen?date=${encodeURIComponent(dateFilter)}` : '/api/guru/absen';
    const res = await apiFetch(url);
    if (res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {
    console.error('Failed to get teacher attendance recap:', e);
  }
  return [];
}

export async function submitManualTeacherAttendance(data) {
  try {
    const res = await apiFetch('/api/guru/absen/manual', { method: 'POST', body: data });
    return formatMutationResponse(res, 'Gagal mencatat absensi guru.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

/* ============================================================
   CLASSES & JURUSAN
   ============================================================ */
export async function getClasses() {
  try {
    const res = await apiFetch('/api/kelas');
    if (res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {
    console.error('Failed to get classes:', e);
  }
  return [];
}

export async function addClass(data) {
  try {
    const res = await apiFetch('/api/kelas', { method: 'POST', body: data });
    return formatMutationResponse(res, 'Gagal menambahkan kelas.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function updateClass(id, data) {
  try {
    const res = await apiFetch(`/api/kelas/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    return formatMutationResponse(res, 'Gagal memperbarui kelas.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function deleteClass(id) {
  try {
    const res = await apiFetch(`/api/kelas/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return formatMutationResponse(res, 'Gagal menghapus kelas.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function getMajors() {
  try {
    const res = await apiFetch('/api/jurusan');
    if (res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {
    console.error('Failed to get majors:', e);
  }
  return [];
}

export async function addMajor(data) {
  try {
    const res = await apiFetch('/api/jurusan', { method: 'POST', body: data });
    return formatMutationResponse(res, 'Gagal menambahkan jurusan.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function updateMajor(id, data) {
  try {
    const res = await apiFetch(`/api/jurusan/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    return formatMutationResponse(res, 'Gagal memperbarui jurusan.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function deleteMajor(id) {
  try {
    const res = await apiFetch(`/api/jurusan/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return formatMutationResponse(res, 'Gagal menghapus jurusan.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

/* ============================================================
   JADWAL PELAJARAN, MASTER SESI & KALENDER AKADEMIK
   ============================================================ */
export async function getSchedule(dayFilter, classFilter, teacherIdFilter) {
  try {
    const params = new URLSearchParams();
    if (dayFilter) params.set('day', dayFilter);
    if (classFilter) params.set('kelas', classFilter);
    if (teacherIdFilter) params.set('teacherId', teacherIdFilter);
    const qs = params.toString();
    const res = await apiFetch(`/api/jadwal${qs ? `?${qs}` : ''}`);
    if (res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {
    console.error('Failed to get schedule:', e);
  }
  return [];
}

export async function addSchedule(data) {
  try {
    const res = await apiFetch('/api/jadwal', { method: 'POST', body: data });
    return formatMutationResponse(res, 'Gagal menambahkan jadwal.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function deleteSchedule(id) {
  try {
    const res = await apiFetch(`/api/jadwal/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return formatMutationResponse(res, 'Gagal menghapus jadwal.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function saveScheduleMatrix(day, records) {
  try {
    const res = await apiFetch('/api/jadwal/matrix', { method: 'POST', body: { day, records } });
    return formatMutationResponse(res, 'Gagal menyimpan matriks jadwal.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function getMasterTimeSlots() {
  try {
    const res = await apiFetch('/api/master-sesi');
    if (res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {
    console.error('Failed to get master time slots:', e);
  }
  return [];
}

export async function updateMasterTimeSlot(slots) {
  try {
    const res = await apiFetch('/api/master-sesi', { method: 'PUT', body: { slots } });
    return formatMutationResponse(res, 'Gagal menyimpan Master Sesi Waktu.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function getAcademicCalendar() {
  try {
    const res = await apiFetch('/api/kalender');
    if (res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {
    console.error('Failed to get academic calendar:', e);
  }
  return [];
}

export async function getAcademicCalendarByDate(dateStr) {
  try {
    const res = await apiFetch(`/api/kalender?date=${encodeURIComponent(dateStr)}`);
    if (res.ok && Array.isArray(res.data)) {
      return res.data[0] || null;
    }
  } catch (e) {
    console.error('Failed to get calendar by date:', e);
  }
  return null;
}

export async function addAcademicCalendarEvent(data) {
  try {
    const res = await apiFetch('/api/kalender', { method: 'POST', body: data });
    return formatMutationResponse(res, 'Gagal menambahkan agenda kalender.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function deleteAcademicCalendarEvent(id) {
  try {
    const res = await apiFetch(`/api/kalender/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return formatMutationResponse(res, 'Gagal menghapus agenda kalender.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

/* ============================================================
   ABSENSI SISWA (Piket Pagi/Sore, Mapel, Monitoring CCTV)
   ============================================================ */
export async function getAttendance(classFilter, dateFilter, monthFilter) {
  try {
    const params = new URLSearchParams();
    if (classFilter) params.set('kelas', classFilter);
    if (dateFilter) params.set('date', dateFilter);
    if (monthFilter) params.set('month', monthFilter);
    const qs = params.toString();
    const res = await apiFetch(`/api/absensi${qs ? `?${qs}` : ''}`);
    if (res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {
    console.error('Failed to get attendance:', e);
  }
  return [];
}

export async function saveAttendance(records, options = {}) {
  try {
    const body = { records };
    if (options.session) body.session = options.session;
    if (options.force) body.force = true;
    const res = await apiFetch('/api/absensi', { method: 'POST', body });
    return formatMutationResponse(res, 'Gagal menyimpan absensi piket.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function getGuardianOverview(month) {
  try {
    const params = new URLSearchParams();
    if (month && month !== 'all') params.set('month', month);
    const qs = params.toString();
    const res = await apiFetch(`/api/guardian/overview${qs ? `?${qs}` : ''}`);
    if (res.ok && res.data?.success) return res.data;
    return { success: false, error: res.data?.error || 'Gagal memuat data kehadiran anak.' };
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function getHomeroomMonitoring(kelas, month) {
  try {
    const params = new URLSearchParams();
    if (kelas) params.set('kelas', kelas);
    if (month && month !== 'all') params.set('month', month);
    const qs = params.toString();
    const res = await apiFetch(`/api/monitoring/homeroom${qs ? `?${qs}` : ''}`);
    if (res.ok && res.data?.success) return res.data;
    return { success: false, error: res.data?.error || 'Gagal memuat monitoring kelas.', classes: [], students: [] };
  } catch {
    return { success: false, error: 'Gagal menghubungi server.', classes: [], students: [] };
  }
}

export async function getSubjectAttendance(classFilter, dateFilter, subjectFilter, monthFilter) {
  try {
    const params = new URLSearchParams();
    if (classFilter) params.set('kelas', classFilter);
    if (dateFilter) params.set('date', dateFilter);
    if (subjectFilter) params.set('mapel', subjectFilter);
    if (monthFilter) params.set('month', monthFilter);
    const qs = params.toString();
    const res = await apiFetch(`/api/absensi-mapel${qs ? `?${qs}` : ''}`);
    if (res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {
    console.error('Failed to get subject attendance:', e);
  }
  return [];
}

export async function saveSubjectAttendance(records) {
  try {
    const res = await apiFetch('/api/absensi-mapel', { method: 'POST', body: { records } });
    return formatMutationResponse(res, 'Gagal menyimpan absensi mapel.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function getSubjectAttendanceRekap(kelas, month, mapelId) {
  try {
    const params = new URLSearchParams({ kelas, month });
    if (mapelId) params.set('mapel', mapelId);
    const res = await apiFetch(`/api/absensi-mapel/rekap?${params.toString()}`);
    if (res.ok && res.data) return res.data;
  } catch (e) {
    console.error('Failed to get subject attendance rekap:', e);
  }
  return { success: false, error: 'Gagal menghubungi server.' };
}

export async function getMonitoringClasses({ day, jamKe, date } = {}) {
  try {
    const params = new URLSearchParams();
    if (day) params.set('day', day);
    if (jamKe) params.set('jamKe', String(jamKe));
    if (date) params.set('date', date);
    const qs = params.toString();
    const res = await apiFetch(`/api/monitoring/kelas${qs ? `?${qs}` : ''}`);
    if (res.ok && res.data) return res.data;
  } catch (e) {
    console.error('Failed to get monitoring classes:', e);
  }
  return { date: date || getJakartaToday(), day: day || 'Senin', jamKe: Number(jamKe) || 1, items: [] };
}

export async function getPrayerAttendance(classFilter) {
  let data = [...MOCK_PRAYER_ATTENDANCE];
  if (classFilter) data = data.filter(a => a.class === classFilter);
  return data;
}

/* ============================================================
   ATURAN POIN & POIN SIKAP SISWA
   ============================================================ */
export async function getBehaviorRules() {
  try {
    const res = await apiFetch('/api/aturan-poin');
    if (res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {
    console.error('Failed to get behavior rules:', e);
  }
  return [];
}

export async function addBehaviorRule(data) {
  try {
    const res = await apiFetch('/api/aturan-poin', { method: 'POST', body: data });
    return formatMutationResponse(res, 'Gagal menambahkan aturan poin.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function updateBehaviorRule(id, data) {
  try {
    const res = await apiFetch(`/api/aturan-poin/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    return formatMutationResponse(res, 'Gagal memperbarui aturan poin.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function deleteBehaviorRule(id) {
  try {
    const res = await apiFetch(`/api/aturan-poin/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return formatMutationResponse(res, 'Gagal menghapus aturan poin.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function getBehaviorPoints(siswaIdFilter) {
  try {
    const url = siswaIdFilter ? `/api/poin-sikap?siswaId=${encodeURIComponent(siswaIdFilter)}` : '/api/poin-sikap';
    const res = await apiFetch(url);
    if (res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {
    console.error('Failed to get behavior points:', e);
  }
  return [];
}

export async function addBehaviorPoint(data) {
  try {
    const res = await apiFetch('/api/poin-sikap', { method: 'POST', body: data });
    return formatMutationResponse(res, 'Gagal mencatat poin sikap.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function deleteBehaviorPoint(id) {
  try {
    const res = await apiFetch(`/api/poin-sikap/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return formatMutationResponse(res, 'Gagal menghapus catatan poin.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function getStudentBehaviorSummary(siswaId) {
  const points = await getBehaviorPoints(siswaId);
  const totalPositif = points.filter(p => p.poin > 0).reduce((sum, p) => sum + p.poin, 0);
  const totalNegatif = points.filter(p => p.poin < 0).reduce((sum, p) => sum + p.poin, 0);
  return { totalPositif, totalNegatif, totalPoin: totalPositif + totalNegatif, jumlahCatatan: points.length };
}

/* ============================================================
   PAYMENTS (Legacy)
   ============================================================ */
export async function getPayments(studentIdFilter) {
  if (studentIdFilter) {
    return MOCK_PAYMENTS.filter(p => p.studentId === studentIdFilter);
  }
  return [...MOCK_PAYMENTS];
}

/* ============================================================
   NILAI SISWA (FULL CRUD)
   ============================================================ */
export async function getGrades(studentIdFilter, filters = {}) {
  try {
    const params = new URLSearchParams();
    if (studentIdFilter) params.set('studentId', studentIdFilter);
    if (filters.kelas) params.set('kelas', filters.kelas);
    if (filters.subject) params.set('subject', filters.subject);
    if (filters.type) params.set('type', filters.type);
    const qs = params.toString();
    const res = await apiFetch(`/api/nilai${qs ? `?${qs}` : ''}`);
    if (res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {
    console.error('Failed to get grades:', e);
  }
  return [];
}

export async function addGrade(data) {
  try {
    const res = await apiFetch('/api/nilai', { method: 'POST', body: data });
    return formatMutationResponse(res, 'Gagal menyimpan nilai.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function updateGrade(id, data) {
  try {
    const res = await apiFetch(`/api/nilai/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    return formatMutationResponse(res, 'Gagal memperbarui nilai.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function deleteGrade(id) {
  try {
    const res = await apiFetch(`/api/nilai/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return formatMutationResponse(res, 'Gagal menghapus nilai.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

/* ============================================================
   DASHBOARD STATS (SERVER-AGGREGATED)
   ============================================================ */
export async function getDashboardStats() {
  try {
    const res = await apiFetch('/api/dashboard/stats');
    if (res.ok && res.data) {
      return {
        ...res.data,
        todayDuty: dutyScheduleList.filter(d => d.hari === res.data.today),
      };
    }
  } catch (e) {
    console.error('Failed to get dashboard stats:', e);
  }
  return {
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalNews: 0,
    totalPpdb: 0,
    pendingPpdb: 0,
    todayScheduleCount: 0,
    activeAcademicYear: '-',
    teacherAttendanceToday: { hadir: 0, izin: 0, sakit: 0, alpha: 0 },
    studentAttendanceToday: { hadir: 0, izin: 0, sakit: 0, alpha: 0, bolos: 0 },
    upcomingEvents: [],
    todayDuty: [],
    todaySchedule: [],
  };
}

/* ============================================================
   PROFIL SISWA (RAPOR KARAKTER & KEHADIRAN)
   ============================================================ */
export async function getStudentProfile(studentId) {
  const [students, piketRecords, mapelRecords, points] = await Promise.all([
    getStudents(),
    getAttendance(),
    getSubjectAttendance(),
    getBehaviorPoints(studentId),
  ]);
  const student = students.find(s => s.id === studentId);
  if (!student) return null;

  const studentPiket = piketRecords.filter(a => a.studentId === studentId);
  const piketSummary = { hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 };
  studentPiket.forEach(att => {
    ['statusPagi', 'statusSore'].forEach(sesi => {
      if (att[sesi] === 'hadir') piketSummary.hadir++;
      else if (att[sesi] === 'izin') piketSummary.izin++;
      else if (att[sesi] === 'sakit') piketSummary.sakit++;
      else if (att[sesi] === 'alpha') piketSummary.alpha++;
    });
  });
  piketSummary.total = piketSummary.hadir + piketSummary.izin + piketSummary.sakit + piketSummary.alpha;

  const studentMapel = mapelRecords.filter(a => a.studentId === studentId);
  const mapelSummary = {};
  studentMapel.forEach(att => {
    if (!mapelSummary[att.subject]) {
      mapelSummary[att.subject] = { hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 };
    }
    if (att.status === 'hadir') mapelSummary[att.subject].hadir++;
    else if (att.status === 'izin') mapelSummary[att.subject].izin++;
    else if (att.status === 'sakit') mapelSummary[att.subject].sakit++;
    else if (att.status === 'alpha') mapelSummary[att.subject].alpha++;
    mapelSummary[att.subject].total++;
  });

  const attitudeRecords = points.length > 0
    ? points.map(p => ({
        id: p.id,
        studentId: p.siswaId,
        date: p.tanggal,
        category: p.poin >= 0 ? 'Prestasi' : 'Pelanggaran',
        note: `${p.aturanNama}${p.keterangan ? ` — ${p.keterangan}` : ''}`,
        points: p.poin,
      }))
    : studentAttitudeList.filter(a => a.studentId === studentId);

  return {
    student,
    piketSummary,
    mapelSummary,
    attitudeRecords,
  };
}

/* ============================================================
   BERITA & ARTIKEL PUBLIK (FULL CRUD)
   ============================================================ */
export async function getNews(includeDrafts = false) {
  try {
    const url = includeDrafts ? '/api/berita?all=1' : '/api/berita';
    const res = await apiFetch(url);
    if (res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {
    console.error('Failed to get news:', e);
  }
  return [];
}

export async function getNewsById(id) {
  try {
    const res = await apiFetch(`/api/berita/${encodeURIComponent(id)}`);
    if (res.ok && res.data && res.data.id) return res.data;
  } catch (e) {
    console.error('Failed to get news by id:', e);
  }
  return null;
}

export async function addNews(data) {
  try {
    const res = await apiFetch('/api/berita', { method: 'POST', body: data });
    return formatMutationResponse(res, 'Gagal menerbitkan berita.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function updateNews(id, data) {
  try {
    const res = await apiFetch(`/api/berita/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    return formatMutationResponse(res, 'Gagal memperbarui berita.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function deleteNews(id) {
  try {
    const res = await apiFetch(`/api/berita/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return formatMutationResponse(res, 'Gagal menghapus berita.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

/* ============================================================
   PENDAFTARAN ONLINE (PPDB) + VERIFIKASI ADMIN
   ============================================================ */
export async function submitPPDB(data) {
  try {
    const res = await apiFetch('/api/ppdb', {
      method: 'POST',
      skipAuthExpiry: true,
      body: data,
    });
    const formatted = formatMutationResponse(res, 'Gagal mengirim formulir pendaftaran.');
    if (formatted.success && formatted.data) {
      // Tetap dukung webhook Google Sheets opsional jika dikonfigurasi sekolah
      try {
        const webhookUrl = localStorage.getItem('sia_ppdb_google_webhook_url');
        if (webhookUrl && /^https:\/\//i.test(webhookUrl.trim())) {
          fetch(webhookUrl.trim(), {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formatted.data),
          }).catch(err => console.warn('Webhook Google Sheets PPDB warning:', err));
        }
      } catch {
        /* Abaikan error storage/webhook */
      }
    }
    return formatted;
  } catch {
    return { success: false, error: 'Gagal menghubungi server pendaftaran.' };
  }
}

export async function getPPDBList(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.major) params.set('major', filters.major);
    const qs = params.toString();
    const res = await apiFetch(`/api/ppdb${qs ? `?${qs}` : ''}`);
    if (res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {
    console.error('Failed to get PPDB list:', e);
  }
  return [];
}

export async function updatePPDBStatus(id, { status, notes }) {
  try {
    const res = await apiFetch(`/api/ppdb/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: { status, notes },
    });
    return formatMutationResponse(res, 'Gagal memperbarui status pendaftaran.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}

export async function deletePPDB(id) {
  try {
    const res = await apiFetch(`/api/ppdb/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return formatMutationResponse(res, 'Gagal menghapus data pendaftaran.');
  } catch {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
}
