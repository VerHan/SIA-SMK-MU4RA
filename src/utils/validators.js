/* ============================================================
   Input Validators & Sanitizers
   
   Fungsi validasi dan sanitasi input pengguna untuk 
   keamanan dan integritas data.
   ============================================================ */

/**
 * Validasi format email
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

/**
 * Validasi panjang minimum password (min 8 karakter)
 * @param {string} password
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePassword(password) {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password minimal 8 karakter.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password harus mengandung minimal 1 huruf besar.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password harus mengandung minimal 1 angka.' };
  }
  return { valid: true, message: '' };
}

/**
 * Sanitasi string input untuk mencegah XSS
 * @param {string} input
 * @returns {string} Input yang sudah disanitasi
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Validasi nomor telepon Indonesia
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  const pattern = /^(\+62|62|0)8[1-9][0-9]{6,10}$/;
  return pattern.test(phone.replace(/[\s-]/g, ''));
}

/**
 * Validasi NIS (Nomor Induk Siswa) — angka, 8-10 digit
 * @param {string} nis
 * @returns {boolean}
 */
export function isValidNIS(nis) {
  return /^\d{8,10}$/.test(nis);
}

/**
 * Validasi NISN (Nomor Induk Siswa Nasional) — 10 digit
 * @param {string} nisn
 * @returns {boolean}
 */
export function isValidNISN(nisn) {
  return /^\d{10}$/.test(nisn);
}

/**
 * Validasi field tidak boleh kosong
 * @param {string} value
 * @param {string} fieldName - Nama field untuk pesan error
 * @returns {{ valid: boolean, message: string }}
 */
export function validateRequired(value, fieldName) {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return { valid: false, message: `${fieldName} wajib diisi.` };
  }
  return { valid: true, message: '' };
}

/**
 * Validasi angka (harus positif)
 * @param {any} value
 * @returns {boolean}
 */
export function isPositiveNumber(value) {
  const num = Number(value);
  return !isNaN(num) && num > 0;
}
