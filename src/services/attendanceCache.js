/* ============================================================
   attendanceCache.js — Instant Local & In-Memory Attendance Cache
   Memungkinkan pembacaan status absensi 0ms saat navigasi menu
   dan sinkronisasi real-time antar halaman melalui CustomEvent.
   ============================================================ */

const CACHE_KEY_PREFIX = 'sia_absen_cache_';
const memoryCache = new Map();

/**
 * Format tanggal hari ini dalam format YYYY-MM-DD (Zona Waktu Jakarta)
 */
export function getJakartaToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

/**
 * Buat cache key unik per tanggal & nama guru
 */
function buildKey(teacherName, date) {
  const cleanDate = date || getJakartaToday();
  const cleanName = (teacherName || '').trim().toLowerCase();
  return `${CACHE_KEY_PREFIX}${cleanDate}_${cleanName}`;
}

/**
 * Ambil data presensi hari ini dari cache lokal (0ms delay)
 * @param {string} teacherName
 * @param {string} [date]
 * @returns {object|null}
 */
export function getCachedAttendance(teacherName, date) {
  if (!teacherName) return null;
  const key = buildKey(teacherName, date);

  // 1. Cek memory cache (paling cepat)
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }

  // 2. Cek localStorage
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryCache.set(key, parsed);
      return parsed;
    }
  } catch (err) {
    console.warn('[attendanceCache] Error reading localStorage:', err);
  }

  return null;
}

/**
 * Simpan data presensi hari ini ke cache lokal & umumkan perubahan
 * @param {string} teacherName
 * @param {string} date
 * @param {object} record
 */
export function setCachedAttendance(teacherName, date, record) {
  if (!teacherName || !record) return;
  const key = buildKey(teacherName, date);

  // Simpan ke memory
  memoryCache.set(key, record);

  // Simpan ke localStorage
  try {
    localStorage.setItem(key, JSON.stringify(record));
  } catch (err) {
    console.warn('[attendanceCache] Error writing localStorage:', err);
  }

  // Dispatch event agar semua komponen yang sedang mount langsung sinkron
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('sia-attendance-updated', {
        detail: {
          teacherName,
          date: date || getJakartaToday(),
          record,
        },
      })
    );
  }
}

/**
 * Hapus cache jika diperlukan (misal saat logout)
 */
export function clearAttendanceCache() {
  memoryCache.clear();
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_KEY_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn('[attendanceCache] Error clearing cache:', e);
  }
}
