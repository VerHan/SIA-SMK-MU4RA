import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCorsOptions,
  getSessionSecret,
  isHttpsRequest,
  normalizeRole,
  setSessionCookie,
  signToken,
  validateNewPassword,
  verifyToken,
} from './authUtils.js';

test('getSessionSecret evaluates lazily after env updates and stays deterministic', () => {
  const prevJwt = process.env.JWT_SECRET;
  const prevDb = process.env.DATABASE_URL;
  const prevApplet = process.env.APPLET_ID;
  try {
    delete process.env.JWT_SECRET;
    process.env.DATABASE_URL = 'postgresql://user:pass@db.example.com:5432/sia';
    const first = getSessionSecret();
    const second = getSessionSecret();
    assert.equal(first, second);
    assert.ok(first.length >= 32);

    process.env.JWT_SECRET = 'explicit-super-secret-value';
    assert.equal(getSessionSecret(), 'explicit-super-secret-value');

    delete process.env.JWT_SECRET;
    delete process.env.DATABASE_URL;
    process.env.APPLET_ID = 'applet-preview-123';
    const previewA = getSessionSecret();
    const previewB = getSessionSecret();
    assert.equal(previewA, previewB);
  } finally {
    if (prevJwt === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = prevJwt;
    if (prevDb === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = prevDb;
    if (prevApplet === undefined) delete process.env.APPLET_ID; else process.env.APPLET_ID = prevApplet;
  }
});

test('signToken and verifyToken normalize uppercase/whitespace roles cleanly', () => {
  const token = signToken({
    id: 'u001',
    username: 'admin',
    name: 'Administrator',
    role: ' ADMIN ',
  });
  const verified = verifyToken(token);
  assert.ok(verified);
  assert.equal(verified.role, 'admin');
  assert.equal(verified.capabilities.canAccessAdmin, true);
  assert.equal(normalizeRole(' Guru '), 'guru');
});

test('isHttpsRequest and setSessionCookie handle HTTPS reverse proxies and local HTTP', () => {
  assert.equal(isHttpsRequest({ headers: { 'x-forwarded-proto': 'https' } }), true);
  assert.equal(isHttpsRequest({ headers: { origin: 'https://ais-dev-demo.run.app' } }), true);
  assert.equal(isHttpsRequest({ headers: { host: 'localhost:3000' }, secure: false }), false);

  const httpsHeaders = [];
  setSessionCookie(
    { headers: { origin: 'https://ais-dev-demo.run.app' } },
    { append: (k, v) => httpsHeaders.push(`${k}: ${v}`) },
    'tok123',
    { rememberMe: true }
  );
  assert.match(httpsHeaders[0], /HttpOnly/);
  assert.match(httpsHeaders[0], /Secure/);
  assert.match(httpsHeaders[0], /SameSite=None/);
  assert.match(httpsHeaders[0], /Partitioned/);

  const httpHeaders = [];
  setSessionCookie(
    { headers: { host: 'localhost:3000' }, secure: false },
    { append: (k, v) => httpHeaders.push(`${k}: ${v}`) },
    'tok123',
    { rememberMe: true }
  );
  assert.match(httpHeaders[0], /SameSite=Lax/);
  assert.doesNotMatch(httpHeaders[0], /Partitioned/);
});

test('validateNewPassword blocks weak breached defaults and accepts strong passwords', () => {
  assert.equal(validateNewPassword('admin123', 'old').valid, false);
  assert.equal(validateNewPassword('short', 'old').valid, false);
  assert.equal(validateNewPassword('Mu4ra#2026Aman', 'Mu4ra#2026Aman').valid, false);
  assert.equal(validateNewPassword('Mu4ra#2026Aman', 'admin123').valid, true);
});

test('createCorsOptions permits same-origin custom domains and rejects untrusted third-party origins', async () => {
  const delegate = createCorsOptions();
  const check = (req) => new Promise((resolve, reject) => {
    delegate(req, (err, opts) => (err ? reject(err) : resolve(opts)));
  });

  const sameOriginCustom = await check({
    headers: { origin: 'https://sia.myschool.com', host: 'sia.myschool.com' },
  });
  assert.equal(sameOriginCustom.origin, true);

  const untrusted = await check({
    headers: { origin: 'https://evil.example.org', host: 'sia.myschool.com' },
  });
  assert.equal(untrusted.origin, false);
});
