import test from 'node:test';
import assert from 'node:assert/strict';
import { signToken, verifyToken, validateSafeWebhookUrl } from '../authUtils.js';
import {
  schoolConfigSchema,
  userCreateSchema,
  paymentCreateSchema,
  prayerAttendanceBatchSchema,
  validateBody,
} from './schemas.js';
import {
  computePaymentStatus,
  createTokenVersionGuard,
  detectAttendanceAlerts,
} from '../modules/auditService.js';

test('validateSafeWebhookUrl blocks SSRF private, loopback, metadata, and invalid protocols', () => {
  const blocked = [
    'http://127.0.0.1:3000/hook',
    'http://localhost/api/secret',
    'http://169.254.169.254/latest/meta-data/',
    'http://10.0.0.5/internal',
    'http://192.168.1.10/webhook',
    'http://172.16.0.9/webhook',
    'http://[::1]:8080/hook',
    'http://metadata.google.internal/computeMetadata/v1/',
    'javascript:alert(1)',
    'file:///etc/passwd',
    'https://user:pass@hooks.example.com/wa',
  ];

  for (const url of blocked) {
    const result = validateSafeWebhookUrl(url);
    assert.equal(result.valid, false, `Expected ${url} to be rejected`);
  }

  assert.equal(validateSafeWebhookUrl('').valid, true);
  assert.equal(validateSafeWebhookUrl('https://api.fonnte.com/send').valid, true);
  assert.equal(validateSafeWebhookUrl('https://hooks.smkmu4rabangsri.sch.id/wa').valid, true);
});

test('signToken & verifyToken preserve tokenVersion (tv) for instant revocation', () => {
  const tokenV3 = signToken({
    id: 'u-test-1',
    username: 'guru_piket',
    name: 'Guru Piket',
    role: 'guru',
    isPiket: true,
    tokenVersion: 3,
  });
  const decoded = verifyToken(tokenV3);
  assert.ok(decoded);
  assert.equal(decoded.tokenVersion, 3);
  assert.equal(decoded.id, 'u-test-1');
});

test('createTokenVersionGuard rejects stale tokenVersion and deactivated accounts immediately after cache invalidation', async () => {
  const dbState = {
    'u-1': { isActive: true, tokenVersion: 1 },
  };
  const guard = createTokenVersionGuard({
    lookupUserState: async (id) => dbState[id] || null,
    ttlMs: 60000,
  });

  const makeMockRes = () => {
    const res = {
      statusCode: 200,
      body: null,
      headers: [],
      append(name, val) {
        this.headers.push([name, val]);
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
    return res;
  };

  // Valid tokenVersion = 1 passes
  let passed = false;
  await guard.middleware(
    { path: '/siswa', headers: {}, authUser: { id: 'u-1', tokenVersion: 1 } },
    makeMockRes(),
    () => {
      passed = true;
    }
  );
  assert.equal(passed, true);

  // Admin increments tokenVersion to 2 and invalidates cache
  dbState['u-1'].tokenVersion = 2;
  guard.invalidateUserSession('u-1');

  let blockedNext = false;
  const resRevoked = makeMockRes();
  await guard.middleware(
    { path: '/siswa', headers: {}, authUser: { id: 'u-1', tokenVersion: 1 } },
    resRevoked,
    () => {
      blockedNext = true;
    }
  );
  assert.equal(blockedNext, false);
  assert.equal(resRevoked.statusCode, 401);
  assert.equal(resRevoked.body?.sessionRevoked, true);

  // Deactivated user with matching tokenVersion = 2 is also blocked
  dbState['u-1'].isActive = false;
  guard.invalidateUserSession('u-1');
  const resDisabled = makeMockRes();
  await guard.middleware(
    { path: '/siswa', headers: {}, authUser: { id: 'u-1', tokenVersion: 2 } },
    resDisabled,
    () => {
      assert.fail('Deactivated account should not pass');
    }
  );
  assert.equal(resDisabled.statusCode, 401);
  assert.match(resDisabled.body?.error || '', /dinonaktifkan/i);
});

test('Zod schemas reject malformed school config, users, payments, and prayer attendance', () => {
  assert.equal(
    schoolConfigSchema.safeParse({
      jamMasuk: '07:00',
      jamPulang: '15:30',
      batasTelatMenit: 15,
      whatsappWebhookUrl: 'http://127.0.0.1/steal',
    }).success,
    false
  );

  assert.equal(
    schoolConfigSchema.safeParse({
      schoolName: 'SMK Muhammadiyah 04 Bangsri',
      jamMasuk: '07:15',
      jamPulang: '15:00',
      batasTelatMenit: 10,
      whatsappEnabled: true,
      whatsappWebhookUrl: 'https://hooks.example.com/wa-notify',
    }).success,
    true
  );

  assert.equal(
    userCreateSchema.safeParse({
      username: 'bad user with spaces',
      password: '123',
      name: 'X',
      role: 'superadmin',
    }).success,
    false
  );

  assert.equal(
    paymentCreateSchema.safeParse({
      studentId: 's001',
      type: 'SPP',
      month: 'Agustus',
      amount: 150000,
      paid: 150000,
      date: '2026-08-05',
    }).success,
    true
  );

  assert.equal(
    prayerAttendanceBatchSchema.safeParse({
      date: '2026-08-05',
      records: [{ studentId: 's001', dzuhur: true, ashar: false }],
    }).success,
    true
  );

  // validateBody middleware returns 400 with clean error string
  const mw = validateBody(paymentCreateSchema);
  let statusCode = 200;
  let payload = null;
  mw(
    { body: { studentId: '', month: '', amount: -10 } },
    {
      status(c) {
        statusCode = c;
        return this;
      },
      json(p) {
        payload = p;
        return this;
      },
    },
    () => assert.fail('Invalid body should not call next()')
  );
  assert.equal(statusCode, 400);
  assert.equal(payload.success, false);
  assert.ok(payload.error.length > 0);
});

test('detectAttendanceAlerts accurately identifies Alpha and Bolos and targets homeroom + parent', () => {
  const studentsById = new Map([
    ['s1', { id: 's1', name: 'Andi Saputra', class: 'XI TKJ 1', phone_parent: '081234567890' }],
    ['s2', { id: 's2', name: 'Budi Santoso', class: 'XI TKJ 1', phone_parent: '081299998888' }],
    ['s3', { id: 's3', name: 'Citra Dewi', class: 'XI TKJ 1', phone_parent: '081277776666' }],
  ]);
  const classesById = new Map([
    ['k1', { id: 'k1', name: 'XI TKJ 1', teacherId: 'g1' }],
  ]);
  const teachersById = new Map([
    ['g1', { id: 'g1', name: 'Pak Ahmad', phone: '081111111111' }],
  ]);
  const users = [
    { id: 'u-guru', role: 'guru', teacherId: 'g1', name: 'Pak Ahmad' },
    { id: 'u-wali-s1', role: 'wali_murid', studentId: 's1', name: 'Ibu Andi' },
  ];

  const alerts = detectAttendanceAlerts({
    savedRecords: [
      { studentId: 's1', kelasId: 'k1', date: '2026-10-12', statusPagi: 'hadir', statusSore: 'alpha' }, // Bolos
      { studentId: 's2', kelasId: 'k1', date: '2026-10-12', statusPagi: 'alpha', statusSore: null }, // Alpha
      { studentId: 's3', kelasId: 'k1', date: '2026-10-12', statusPagi: 'hadir', statusSore: 'hadir' }, // Hadir -> no alert
    ],
    studentsById,
    classesById,
    teachersById,
    users,
    config: {
      schoolName: 'SMK Muhammadiyah 04 Bangsri',
      notifyOnAlpha: true,
      notifyOnBolos: true,
      notifyHomeroom: true,
      notifyParent: true,
    },
  });

  // 2 students * 2 recipients (homeroom + parent) = 4 alerts
  assert.equal(alerts.length, 4);
  const bolosAlerts = alerts.filter(a => a.eventType === 'BOLOS_ALERT');
  const alphaAlerts = alerts.filter(a => a.eventType === 'ALPHA_ALERT');
  assert.equal(bolosAlerts.length, 2);
  assert.equal(alphaAlerts.length, 2);
  assert.equal(bolosAlerts.find(a => a.recipientRole === 'wali_murid')?.recipientUserId, 'u-wali-s1');
  assert.equal(bolosAlerts.find(a => a.recipientRole === 'guru')?.recipientUserId, 'u-guru');
});

test('computePaymentStatus derives lunas, cicilan, and belum accurately', () => {
  assert.equal(computePaymentStatus(150000, 150000), 'lunas');
  assert.equal(computePaymentStatus(150000, 75000), 'cicilan');
  assert.equal(computePaymentStatus(150000, 0), 'belum');
});
