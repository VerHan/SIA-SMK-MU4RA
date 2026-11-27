import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

// Lazy session signing key (evaluated on demand AFTER dotenv.config() has run):
// 1. Primary: explicit server-side JWT_SECRET
// 2. Serverless / preview stability fallback: deterministic HMAC derived from stable server env
//    (DATABASE_URL / DIRECT_URL in production, or APPLET_ID / VERCEL_PROJECT_ID / K_SERVICE / APP_URL)
//    so multi-instance deployments and container restarts share the exact same signing key.
// 3. Local bare fallback (no env configured): process-scoped random 32-byte key.
let cachedEphemeralSecret = null;
let warnedSecretFallback = false;

export function getSessionSecret() {
  const explicit = (process.env.JWT_SECRET || '').trim();
  if (explicit) {
    return explicit;
  }
  const envSeed = (
    process.env.DATABASE_URL ||
    process.env.DIRECT_URL ||
    process.env.APPLET_ID ||
    process.env.VERCEL_PROJECT_ID ||
    process.env.K_SERVICE ||
    process.env.APP_URL ||
    ''
  ).trim();
  if (envSeed) {
    if (process.env.NODE_ENV === 'production' && !warnedSecretFallback) {
      warnedSecretFallback = true;
      console.warn('[SIA Security] Notice: JWT_SECRET belum diset; menggunakan kunci sesi deterministik dari server env. Disarankan tetap menambahkan JWT_SECRET terpisah.');
    }
    return crypto
      .createHmac('sha256', 'sia-smk-mu4ra-session-key-v1')
      .update(envSeed)
      .digest('hex');
  }
  if (!cachedEphemeralSecret) {
    if (process.env.NODE_ENV === 'production' && !warnedSecretFallback) {
      warnedSecretFallback = true;
      console.warn('[SIA Security] WARNING: JWT_SECRET dan DATABASE_URL belum diset; sesi hanya bertahan selama proses server hidup.');
    }
    cachedEphemeralSecret = crypto.randomBytes(32).toString('hex');
  }
  return cachedEphemeralSecret;
}

export const SESSION_COOKIE_NAME = 'sia_session';
const SHORT_TOKEN_TTL_SECONDS = 60 * 60 * 12; // 12 hours (non-persistent session)
const REMEMBER_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days (PWA persistent session)

const VALID_ROLES = new Set(['admin', 'guru', 'staff', 'kepsek', 'wali_murid']);

export function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toLowerCase() : '';
}

export function isValidRole(role) {
  return VALID_ROLES.has(normalizeRole(role));
}

/**
 * Hash a password with per-user random salt using Node.js scrypt.
 * Format: scrypt$<saltHex>$<derivedKeyHex>
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function isHashedPassword(stored) {
  return typeof stored === 'string' && stored.startsWith('scrypt$') && stored.split('$').length === 3;
}

/**
 * Verify password against stored hash (or legacy plaintext for seamless DB migration).
 * Returns { valid: boolean, needsRehash: boolean }.
 */
export function verifyPassword(password, stored) {
  if (!password || !stored) return { valid: false, needsRehash: false };

  if (isHashedPassword(stored)) {
    const [, salt, hashHex] = stored.split('$');
    try {
      const derived = crypto.scryptSync(String(password), salt, 64);
      const expected = Buffer.from(hashHex, 'hex');
      if (derived.length !== expected.length) return { valid: false, needsRehash: false };
      const valid = crypto.timingSafeEqual(derived, expected);
      return { valid, needsRehash: false };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }

  // Legacy plaintext compatibility (existing Supabase seed rows): constant-time compare + flag rehash
  const a = Buffer.from(String(password));
  const b = Buffer.from(String(stored));
  if (a.length !== b.length) return { valid: false, needsRehash: false };
  const valid = crypto.timingSafeEqual(a, b);
  return { valid, needsRehash: valid };
}

/**
 * Non-blocking scrypt password hash (offloaded to Node libuv threadpool
 * so concurrent logins never block the event loop).
 */
export async function hashPasswordAsync(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scryptAsync(String(password), salt, 64);
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

/**
 * Non-blocking scrypt password verification with legacy plaintext upgrade detection.
 */
export async function verifyPasswordAsync(password, stored) {
  if (!password || !stored) return { valid: false, needsRehash: false };

  if (isHashedPassword(stored)) {
    const [, salt, hashHex] = stored.split('$');
    try {
      const derived = await scryptAsync(String(password), salt, 64);
      const expected = Buffer.from(hashHex, 'hex');
      if (derived.length !== expected.length) return { valid: false, needsRehash: false };
      const valid = crypto.timingSafeEqual(derived, expected);
      return { valid, needsRehash: false };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }

  const a = Buffer.from(String(password));
  const b = Buffer.from(String(stored));
  if (a.length !== b.length) return { valid: false, needsRehash: false };
  const valid = crypto.timingSafeEqual(a, b);
  return { valid, needsRehash: valid };
}

const COMMON_WEAK_PASSWORDS = new Set([
  'admin123',
  'guru123',
  'staff123',
  'wali123',
  '12345678',
  '123456789',
  'password',
  'password123',
  'qwerty123',
  'smkmu4ra',
]);

/**
 * Validate a newly chosen password against basic length and known breached demo defaults.
 */
export function validateNewPassword(newPassword, currentPassword = '') {
  const clean = typeof newPassword === 'string' ? newPassword.trim() : '';
  if (clean.length < 8) {
    return { valid: false, error: 'Password baru minimal harus 8 karakter.' };
  }
  if (COMMON_WEAK_PASSWORDS.has(clean.toLowerCase())) {
    return { valid: false, error: 'Password ini terlalu umum/tercatat bocor. Gunakan kombinasi unik (huruf besar, kecil, dan angka).' };
  }
  if (currentPassword && clean === String(currentPassword).trim()) {
    return { valid: false, error: 'Password baru tidak boleh sama dengan password lama.' };
  }
  return { valid: true, value: clean };
}

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

/**
 * Compute deterministic capability flags from user role, picket duty flag,
 * and homeroom classes derived from Kelas.teacherId.
 */
export function buildUserCapabilities(user, homeroomClasses = []) {
  const role = normalizeRole(user?.role);
  const isAdmin = role === 'admin';
  const isStaff = role === 'staff';
  const isKepsek = role === 'kepsek';
  const isGuru = role === 'guru';
  const isGuardian = role === 'wali_murid';
  const isPiket = isGuru && Boolean(user?.isPiket);
  const safeHomeroom = Array.isArray(homeroomClasses) ? homeroomClasses : [];
  const hasHomeroom = safeHomeroom.length > 0;

  return {
    canAccessAdmin: isAdmin,
    canManageUsers: isAdmin,
    canInputPiket: isAdmin || isStaff || isPiket,
    canInputMapel: isAdmin || isGuru,
    canMonitorSchool: isAdmin || isStaff || isKepsek,
    canMonitorHomeroom: isAdmin || isStaff || isKepsek || (isGuru && hasHomeroom),
    canMonitorOwnChild: isGuardian && Boolean(user?.studentId),
  };
}

/**
 * Compute student attendance early-warning tier (hijau / kuning / merah)
 * from Piket and Mapel attendance summaries.
 */
export function computeAttendanceRiskTier({ piketSummary = {}, mapelSummary = {} } = {}) {
  const piketTotal = Number(piketSummary.totalHari) || 0;
  const piketHadir = Number(piketSummary.hadir) || 0;
  const piketAlpha = Number(piketSummary.alpha) || 0;
  const piketBolos = Number(piketSummary.bolos) || 0;

  const mapelTotal = Number(mapelSummary.totalSesi) || 0;
  const mapelAlpha = Number(mapelSummary.alpha) || 0;
  const mapelRate = mapelTotal > 0 ? Number(mapelSummary.persentase || 0) : null;
  const piketRate = piketTotal > 0 ? Math.round((piketHadir / piketTotal) * 100) : null;

  if (piketTotal === 0 && mapelTotal === 0) {
    return {
      tier: 'hijau',
      label: 'Belum Ada Catatan',
      rate: 100,
      alphaTotal: 0,
      bolosTotal: 0,
      reason: 'Belum ada catatan ketidakhadiran pada periode ini.',
    };
  }

  const rates = [piketRate, mapelRate].filter(r => r !== null);
  const combinedRate = rates.length > 0
    ? Math.round(rates.reduce((sum, r) => sum + r, 0) / rates.length)
    : 100;
  const alphaTotal = piketAlpha + mapelAlpha;

  if (combinedRate < 85 || alphaTotal >= 3 || piketBolos >= 2) {
    return {
      tier: 'merah',
      label: 'Perlu Konseling',
      rate: combinedRate,
      alphaTotal,
      bolosTotal: piketBolos,
      reason: piketBolos >= 2
        ? `Terdeteksi ${piketBolos}x indikasi bolos (hadir pagi, alpha sore).`
        : alphaTotal >= 3
          ? `Tercatat ${alphaTotal}x alpha tanpa keterangan.`
          : `Persentase kehadiran ${combinedRate}% (di bawah ambang 85%).`,
    };
  }

  if (combinedRate < 95 || alphaTotal >= 1 || piketBolos >= 1) {
    return {
      tier: 'kuning',
      label: 'Perlu Pemantauan',
      rate: combinedRate,
      alphaTotal,
      bolosTotal: piketBolos,
      reason: piketBolos >= 1
        ? `Terdapat ${piketBolos}x indikasi bolos yang perlu dikonfirmasi.`
        : alphaTotal >= 1
          ? `Terdapat ${alphaTotal}x catatan alpha.`
          : `Persentase kehadiran ${combinedRate}% (di bawah 95%).`,
    };
  }

  return {
    tier: 'hijau',
    label: 'Kondisi Baik',
    rate: combinedRate,
    alphaTotal,
    bolosTotal: piketBolos,
    reason: `Kehadiran stabil di angka ${combinedRate}%.`,
  };
}

/**
 * Sign a compact HS256 JWT token carrying role, picket flag, and homeroom bindings.
 */
export function signToken(user, { rememberMe = true } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const ttl = rememberMe ? REMEMBER_TOKEN_TTL_SECONDS : SHORT_TOKEN_TTL_SECONDS;
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const homeroomClasses = Array.isArray(user.homeroomClasses)
    ? user.homeroomClasses.map(c => ({ id: c.id, name: c.name }))
    : [];
  const role = normalizeRole(user.role);
  const isPiket = role === 'guru' ? Boolean(user.isPiket) : false;
  const tokenVersion = Number.isInteger(Number(user.tokenVersion)) && Number(user.tokenVersion) > 0
    ? Number(user.tokenVersion)
    : 1;
  const payload = base64UrlEncode(JSON.stringify({
    sub: user.id,
    username: user.username,
    name: user.name,
    role,
    isPiket,
    tv: tokenVersion,
    teacherId: user.teacherId || null,
    studentId: user.studentId || null,
    homeroomClasses,
    rm: Boolean(rememberMe),
    iat: now,
    exp: now + ttl,
  }));
  const signature = base64UrlEncode(
    crypto.createHmac('sha256', getSessionSecret()).update(`${header}.${payload}`).digest()
  );
  return `${header}.${payload}.${signature}`;
}

/**
 * Verify compact HS256 JWT token and return normalized auth user payload or null.
 */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;

  try {
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', getSessionSecret()).update(`${header}.${payload}`).digest()
    );
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const decoded = JSON.parse(base64UrlDecode(payload));
    const now = Math.floor(Date.now() / 1000);
    if (!decoded.exp || decoded.exp < now) return null;

    const role = normalizeRole(decoded.role);
    const homeroomClasses = Array.isArray(decoded.homeroomClasses) ? decoded.homeroomClasses : [];
    const tokenVersion = Number.isInteger(Number(decoded.tv)) && Number(decoded.tv) > 0
      ? Number(decoded.tv)
      : 1;
    const baseUser = {
      id: decoded.sub,
      username: decoded.username,
      name: decoded.name,
      role,
      isPiket: role === 'guru' ? Boolean(decoded.isPiket) : false,
      tokenVersion,
      teacherId: decoded.teacherId || null,
      studentId: decoded.studentId || null,
      homeroomClasses,
    };

    return {
      ...baseUser,
      capabilities: buildUserCapabilities(baseUser, homeroomClasses),
    };
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader) {
  const result = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try {
        result[key] = decodeURIComponent(val);
      } catch {
        result[key] = val;
      }
    }
  }
  return result;
}

export function isHttpsRequest(req) {
  const headers = req?.headers || {};
  const forwardedProto = String(headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  if (req?.secure || forwardedProto === 'https' || String(headers['x-forwarded-ssl'] || '').toLowerCase() === 'on') {
    return true;
  }
  const origin = String(headers.origin || '').trim().toLowerCase();
  const referer = String(headers.referer || '').trim().toLowerCase();
  if (origin.startsWith('https://') || referer.startsWith('https://')) {
    return true;
  }
  return false;
}

export function setAuthNoStoreHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Vary', 'Cookie, Authorization');
}

/**
 * Emit HttpOnly session cookie (with Secure; SameSite=None; Partitioned over HTTPS
 * for iframe + installed PWA compatibility, or HttpOnly; SameSite=Lax on local HTTP).
 */
export function setSessionCookie(req, res, token, { rememberMe = true } = {}) {
  const isHttps = isHttpsRequest(req);
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
  ];
  if (rememberMe) {
    parts.push(`Max-Age=${REMEMBER_TOKEN_TTL_SECONDS}`);
  }
  if (isHttps) {
    parts.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  res.append('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(req, res) {
  const isHttps = isHttpsRequest(req);
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];
  if (isHttps) {
    parts.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  res.append('Set-Cookie', parts.join('; '));
}

function passesCookieCsrfCheck(req) {
  const method = String(req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
  if (req.headers['x-requested-with']) return true;
  const origin = req.headers.origin;
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
  if (origin && host) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      if (originHost === host) return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Express middleware: parse Authorization Bearer token first, then fall back to
 * signed HttpOnly session cookie (with CSRF check on cookie-authenticated mutations).
 */
export function attachAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const user = verifyToken(token);
    if (user) {
      req.authUser = user;
      req.authViaCookie = false;
      return next();
    }
  }

  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies[SESSION_COOKIE_NAME];
  if (cookieToken) {
    const user = verifyToken(cookieToken);
    if (user) {
      if (!passesCookieCsrfCheck(req)) {
        return res.status(403).json({
          success: false,
          error: 'Permintaan ditolak oleh verifikasi asal sesi.',
        });
      }
      req.authUser = user;
      req.authViaCookie = true;
    }
  }
  next();
}

/**
 * Express middleware: enforce valid signed Bearer session.
 */
export function requireAuth(req, res, next) {
  if (!req.authUser) {
    return res.status(401).json({ success: false, error: 'Sesi login tidak valid atau telah berakhir. Silakan login kembali.' });
  }
  next();
}

/**
 * Express middleware: enforce role-based access control.
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.authUser) {
      return res.status(401).json({ success: false, error: 'Autentikasi diperlukan. Silakan login kembali.' });
    }
    if (!allowedRoles.includes(req.authUser.role)) {
      return res.status(403).json({ success: false, error: 'Anda tidak memiliki izin untuk melakukan tindakan ini.' });
    }
    next();
  };
}

/**
 * Express middleware: enforce capability-based access control.
 */
export function requireCapability(...requiredCapabilities) {
  return (req, res, next) => {
    if (!req.authUser) {
      return res.status(401).json({ success: false, error: 'Autentikasi diperlukan. Silakan login kembali.' });
    }
    const caps = req.authUser.capabilities || buildUserCapabilities(req.authUser, req.authUser.homeroomClasses);
    const allowed = requiredCapabilities.some(cap => Boolean(caps[cap]));
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Akun Anda tidak memiliki hak tugas untuk fitur ini.' });
    }
    next();
  };
}

/**
 * Express middleware: allow only Admin, Staff, or Teachers explicitly assigned as Guru Piket.
 */
export function requirePiketAccess(req, res, next) {
  if (!req.authUser) {
    return res.status(401).json({ success: false, error: 'Autentikasi diperlukan. Silakan login kembali.' });
  }
  const caps = req.authUser.capabilities || buildUserCapabilities(req.authUser, req.authUser.homeroomClasses);
  if (!caps.canInputPiket) {
    return res.status(403).json({
      success: false,
      error: 'Akses ditolak. Hanya Guru dengan tugas Piket, Staff, atau Admin yang dapat menginput absensi piket.',
    });
  }
  next();
}

/**
 * Express middleware: enforce strict ownership when reading a single student's records.
 * Guardians (wali_murid) may ONLY inspect their own linked studentId.
 */
export function requireStudentReadAccess(req, res, next) {
  if (!req.authUser) {
    return res.status(401).json({ success: false, error: 'Autentikasi diperlukan. Silakan login kembali.' });
  }
  if (req.authUser.role === 'wali_murid') {
    const targetId = req.params.id || req.query.studentId;
    if (!req.authUser.studentId || req.authUser.studentId !== targetId) {
      return res.status(403).json({
        success: false,
        error: 'Akses ditolak. Wali murid hanya dapat melihat data kehadiran anak sendiri.',
      });
    }
  }
  next();
}

/**
 * Express middleware: explicitly deny specific roles from an endpoint.
 */
export function denyRoles(...blockedRoles) {
  return (req, res, next) => {
    if (!req.authUser) {
      return res.status(401).json({ success: false, error: 'Autentikasi diperlukan. Silakan login kembali.' });
    }
    if (blockedRoles.includes(req.authUser.role)) {
      return res.status(403).json({ success: false, error: 'Anda tidak memiliki izin untuk mengakses data ini.' });
    }
    next();
  };
}

/**
 * Sanitize optional URL fields (block javascript: and data: URI schemes).
 */
export function sanitizeSafeUrl(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
  } catch {
    return null;
  }
  return null;
}

function isPrivateOrBlockedHost(hostname) {
  const host = String(hostname || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '::' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal'
  ) {
    return true;
  }

  // IPv6 private / link-local / unique-local ranges
  if (host.includes(':')) {
    if (
      host.startsWith('fc') ||
      host.startsWith('fd') ||
      host.startsWith('fe8') ||
      host.startsWith('fe9') ||
      host.startsWith('fea') ||
      host.startsWith('feb') ||
      host.startsWith('::ffff:127.') ||
      host.startsWith('::ffff:10.') ||
      host.startsWith('::ffff:169.254.') ||
      host.startsWith('::ffff:192.168.')
    ) {
      return true;
    }
    return false;
  }

  // IPv4 literal checks (loopback, RFC1918, link-local / cloud metadata, CGNAT)
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [a, b] = [Number(ipv4Match[1]), Number(ipv4Match[2])];
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Validate outbound webhook URL (HTTPS preferred; strictly blocks loopback, private LAN,
 * and cloud metadata endpoints to prevent outbound request forgery).
 */
export function validateSafeWebhookUrl(rawUrl) {
  if (rawUrl === null || rawUrl === undefined || String(rawUrl).trim() === '') {
    return { valid: true, url: '' };
  }
  const trimmed = String(rawUrl).trim();
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Format URL webhook tidak valid. Gunakan alamat https:// yang lengkap.' };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, error: 'URL webhook hanya mendukung protokol https:// atau http://.' };
  }
  if (parsed.username || parsed.password) {
    return { valid: false, error: 'URL webhook tidak boleh mengandung kredensial langsung di alamat.' };
  }
  if (isPrivateOrBlockedHost(parsed.hostname)) {
    return {
      valid: false,
      error: 'URL webhook ke jaringan lokal/internal tidak diizinkan demi keamanan server.',
    };
  }
  return { valid: true, url: parsed.toString() };
}

/**
 * Restricted CORS helper (avoids wildcard '*' on authenticated APIs).
 * Supports same-origin custom domains, local dev, Cloud Run, Vercel, and .sch.id hosts.
 */
export function createCorsOptions() {
  return (req, callback) => {
    const origin = req.headers?.origin;
    const baseOptions = {
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    };
    if (!origin) return callback(null, { ...baseOptions, origin: true });
    try {
      const parsed = new URL(origin);
      const originHost = parsed.host.toLowerCase();
      const host = parsed.hostname.toLowerCase();
      const reqHost = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '')
        .split(',')[0]
        .trim()
        .toLowerCase();
      let appUrlHost = '';
      if (process.env.APP_URL) {
        try {
          appUrlHost = new URL(process.env.APP_URL).hostname.toLowerCase();
        } catch {
          appUrlHost = '';
        }
      }
      const isAllowed =
        (reqHost && originHost === reqHost) ||
        (appUrlHost && host === appUrlHost) ||
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.endsWith('.run.app') ||
        host.endsWith('.vercel.app') ||
        host.endsWith('.sch.id');
      return callback(null, { ...baseOptions, origin: isAllowed });
    } catch {
      return callback(null, { ...baseOptions, origin: false });
    }
  };
}

export const DEFAULT_SCHOOL_GEOFENCE = {
  latitude: -6.5194526,
  longitude: 110.7783316,
  radiusMeters: 250,
};

export function calculateHaversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function validateGeofenceCoords(coords) {
  if (!coords || typeof coords !== 'object') return null;
  const rawLat = coords.latitude ?? coords.lat;
  const rawLng = coords.longitude ?? coords.lng;
  const latitude = Number(rawLat);
  const longitude = Number(rawLng);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return { latitude, longitude };
}

export function validateGeofenceConfig(input) {
  const coords = validateGeofenceCoords(input);
  if (!coords) return null;
  const radiusMeters = Math.round(Number(input?.radiusMeters));
  if (!Number.isFinite(radiusMeters) || radiusMeters < 20 || radiusMeters > 2000) {
    return null;
  }
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    radiusMeters,
  };
}

export function formatJakartaTimeHHMM(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find(p => p.type === 'hour')?.value || '00';
  const minute = parts.find(p => p.type === 'minute')?.value || '00';
  return `${hour}:${minute}`;
}

/**
 * Extract client IP behind reverse proxy (Vercel / Cloud Run / Nginx).
 */
export function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Lightweight, memory-bounded sliding-window rate limiter middleware.
 * Protects login & public submission routes without external Redis dependency.
 */
export function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 15,
  maxBuckets = 2000,
  keyGenerator = (req) => getClientIp(req),
  message = 'Terlalu banyak percobaan. Silakan tunggu beberapa menit lalu coba lagi.',
} = {}) {
  const buckets = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = String(keyGenerator(req) || 'unknown');

    // Prune expired entries opportunistically when bucket count grows
    if (buckets.size >= maxBuckets) {
      for (const [k, timestamps] of buckets.entries()) {
        const active = timestamps.filter(ts => now - ts < windowMs);
        if (active.length === 0) buckets.delete(k);
        else buckets.set(k, active);
      }
      if (buckets.size >= maxBuckets) {
        const oldestKey = buckets.keys().next().value;
        if (oldestKey) buckets.delete(oldestKey);
      }
    }

    const existing = buckets.get(key) || [];
    const recent = existing.filter(ts => now - ts < windowMs);

    if (recent.length >= max) {
      const oldestTs = recent[0] || now;
      const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldestTs)) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        success: false,
        error: message,
        retryAfterSeconds: retryAfterSec,
      });
    }

    recent.push(now);
    buckets.set(key, recent);
    next();
  };
}

/**
 * Baseline HTTP security headers compatible with embedded preview iframes & PWA geolocation.
 * Intentionally omits X-Frame-Options so iframe embeds remain functional.
 */
export function securityHeadersMiddleware(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  next();
}


