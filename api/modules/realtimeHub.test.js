import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldDeliverEvent,
  sanitizeEventForSubscriber,
  formatSseFrame,
  createRealtimeHub,
} from './realtimeHub.js';
import { parseSseBuffer } from '../../src/utils/sseParser.js';

test('shouldDeliverEvent strictly isolates wali_murid to their linked student only', () => {
  const parentSub = {
    userId: 'u_wali1',
    role: 'wali_murid',
    studentId: 's001',
    homeroomClassNames: new Set(),
  };

  assert.equal(
    shouldDeliverEvent(parentSub, {
      type: 'attendance:updated',
      classNames: ['X TKJ 1'],
      studentIds: ['s001', 's002'],
    }),
    true
  );

  assert.equal(
    shouldDeliverEvent(parentSub, {
      type: 'attendance:updated',
      classNames: ['X TKJ 1'],
      studentIds: ['s002', 's003'],
    }),
    false
  );
});

test('shouldDeliverEvent routes attendance updates to matching Wali Kelas and Admin', () => {
  const waliKelas = {
    userId: 'u_guru2',
    role: 'guru',
    isPiket: false,
    homeroomClassNames: new Set(['X RPL 1']),
  };
  const admin = { userId: 'u_admin', role: 'admin', isPiket: false, homeroomClassNames: new Set() };

  assert.equal(
    shouldDeliverEvent(waliKelas, {
      type: 'attendance:updated',
      classNames: ['X RPL 1'],
      studentIds: ['s005'],
    }),
    true
  );

  assert.equal(
    shouldDeliverEvent(waliKelas, {
      type: 'attendance:updated',
      classNames: ['XI TKJ 1'],
      studentIds: ['s009'],
    }),
    false
  );

  assert.equal(
    shouldDeliverEvent(admin, {
      type: 'attendance:updated',
      classNames: ['XI TKJ 1'],
      studentIds: ['s009'],
    }),
    true
  );
});

test('sanitizeEventForSubscriber strips studentIds and classNames from wali_murid payloads', () => {
  const parentSub = { userId: 'u_wali1', role: 'wali_murid', studentId: 's001' };
  const payload = sanitizeEventForSubscriber(parentSub, {
    type: 'attendance:updated',
    classNames: ['X TKJ 1'],
    studentIds: ['s001', 's002'],
    date: '2026-11-26',
    session: 'pagi',
    updatedBy: 'Guru Piket',
    timestamp: '2026-11-26T01:00:00.000Z',
  });

  assert.deepEqual(payload, {
    type: 'attendance:updated',
    date: '2026-11-26',
    session: 'pagi',
    timestamp: '2026-11-26T01:00:00.000Z',
  });
  assert.equal('studentIds' in payload, false);
  assert.equal('classNames' in payload, false);
});

test('createRealtimeHub delivers scoped SSE frames and disconnects revoked users immediately', () => {
  const hub = createRealtimeHub({ heartbeatMs: 60000 });
  const chunksA = [];
  const chunksB = [];
  let closedA = false;
  let closedB = false;

  const makeMockRes = (chunks, onEnd) => ({
    writableEnded: false,
    destroyed: false,
    status() { return this; },
    setHeader() {},
    flushHeaders() {},
    write(c) { chunks.push(c); },
    end() { this.writableEnded = true; onEnd(); },
  });

  const makeMockReq = (authUser) => {
    const handlers = {};
    return {
      authUser,
      on(ev, fn) { handlers[ev] = fn; },
      emitClose() { handlers.close?.(); },
    };
  };

  const reqA = makeMockReq({
    id: 'u_guru1',
    role: 'guru',
    isPiket: false,
    homeroomClasses: [{ id: 'k1', name: 'XI TKJ 1' }],
  });
  const reqB = makeMockReq({
    id: 'u_wali1',
    role: 'wali_murid',
    studentId: 's001',
    homeroomClasses: [],
  });

  hub.subscribe(reqA, makeMockRes(chunksA, () => { closedA = true; }));
  hub.subscribe(reqB, makeMockRes(chunksB, () => { closedB = true; }));

  assert.equal(hub.getStats().activeConnections, 2);

  const count = hub.publish({
    type: 'attendance:updated',
    classNames: ['XI TKJ 1'],
    studentIds: ['s999'],
    date: '2026-11-26',
    session: 'pagi',
    updatedBy: 'Admin',
  });
  assert.equal(count, 1);
  assert.ok(chunksA.some((c) => c.includes('event: attendance:updated')));
  assert.equal(chunksB.some((c) => c.includes('event: attendance:updated')), false);

  // Revoke guru1 session
  const disconnected = hub.disconnectUser('u_guru1');
  assert.equal(disconnected, 1);
  assert.equal(closedA, true);
  assert.equal(closedB, false);
  assert.ok(chunksA.some((c) => c.includes('event: session:revoked')));

  reqB.emitClose();
  assert.equal(hub.getStats().activeConnections, 0);
});

test('parseSseBuffer handles partial chunks, ping comments, and multiple frames cleanly', () => {
  const frame1 = formatSseFrame('connected', { ok: true });
  const frame2 = formatSseFrame('attendance:updated', { classNames: ['XI TKJ 1'], date: '2026-11-26' });
  const combined = `: ping\n\n${frame1}${frame2}event: partial\ndata: {"cut":`;

  const { events, remainder } = parseSseBuffer(combined);
  assert.equal(events.length, 2);
  assert.equal(events[0].event, 'connected');
  assert.deepEqual(events[0].data, { ok: true });
  assert.equal(events[1].event, 'attendance:updated');
  assert.deepEqual(events[1].data, { classNames: ['XI TKJ 1'], date: '2026-11-26' });
  assert.equal(remainder, 'event: partial\ndata: {"cut":');
});
