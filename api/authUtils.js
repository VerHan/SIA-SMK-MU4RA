import crypto from 'crypto';

// Session signing key: read from server env or fall back to an ephemeral in-memory random key
const SESSION_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_SECONDS = 60 * 60 * 12; // 12 hours

const VALID_ROLES = new Set(['admin', 'guru', 'staff', 'kepsek', 'wali_murid']);

export function isValidRole(role) {
  return typeof role === 'string' && VALID_ROLES.has(role);
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
 * Sign a compact HS256 JWT token.
 */
export function signToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({
    sub: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    teacherId: user.teacherId || null,
    studentId: user.studentId || null,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  }));
  const signature = base64UrlEncode(
    crypto.createHmac('sha256', SESSION_SECRET).update(`${header}.${payload}`).digest()
  );
  return `${header}.${payload}.${signature}`;
}

/**
 * Verify compact HS256 JWT token and return payload or null.
 */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;

  try {
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', SESSION_SECRET).update(`${header}.${payload}`).digest()
    );
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const decoded = JSON.parse(base64UrlDecode(payload));
    const now = Math.floor(Date.now() / 1000);
    if (!decoded.exp || decoded.exp < now) return null;

    return {
      id: decoded.sub,
      username: decoded.username,
      name: decoded.name,
      role: decoded.role,
      teacherId: decoded.teacherId || null,
      studentId: decoded.studentId || null,
    };
  } catch {
    return null;
  }
}

/**
 * Express middleware: parse Authorization Bearer token if present.
 */
export function attachAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const user = verifyToken(token);
    if (user) {
      req.authUser = user;
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

/**
 * Restricted CORS helper (avoids wildcard '*' on authenticated APIs).
 */
export function createCorsOptions() {
  return {
    origin(origin, callback) {
      // Allow same-origin / server-to-server requests with no Origin header
      if (!origin) return callback(null, true);
      try {
        const parsed = new URL(origin);
        const host = parsed.hostname.toLowerCase();
        const isAllowed =
          host === 'localhost' ||
          host === '127.0.0.1' ||
          host.endsWith('.run.app') ||
          host.endsWith('.vercel.app') ||
          host.endsWith('.sch.id');
        return callback(null, isAllowed);
      } catch {
        return callback(null, false);
      }
    },
    credentials: false,
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
}
