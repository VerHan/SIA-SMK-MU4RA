import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseGradeFromClassName,
  suggestClassMapping,
  buildRolloverPlan,
  parsePaginationParams,
  buildPaginationMeta,
  buildMonthDateBounds,
  aggregatePiketSummary,
} from './academicRolloverUtils.js';

const SAMPLE_CLASSES = [
  { id: 'k-x-tkj1', name: 'X TKJ 1', grade: 'X', major: 'TKJ', studentCount: 30 },
  { id: 'k-xi-tkj1', name: 'XI TKJ 1', grade: 'XI', major: 'TKJ', studentCount: 28 },
  { id: 'k-xii-tkj1', name: 'XII TKJ 1', grade: 'XII', major: 'TKJ', studentCount: 25 },
  { id: 'k-x-rpl1', name: 'X RPL 1', grade: 'X', major: 'RPL', studentCount: 32 },
  { id: 'k-xi-rpl1', name: 'XI RPL 1', grade: 'XI', major: 'RPL', studentCount: 30 },
];

test('parseGradeFromClassName extracts XII, XI, X in correct prefix order', () => {
  assert.deepEqual(parseGradeFromClassName('XII TKJ 1'), { grade: 'XII', suffix: 'TKJ 1' });
  assert.deepEqual(parseGradeFromClassName('XI RPL 2'), { grade: 'XI', suffix: 'RPL 2' });
  assert.deepEqual(parseGradeFromClassName('X TKR 1'), { grade: 'X', suffix: 'TKR 1' });
  assert.deepEqual(parseGradeFromClassName('Custom Class', 'XI'), { grade: 'XI', suffix: 'Custom Class' });
});

test('suggestClassMapping maps X -> XI -> XII -> Lulus in promote mode', () => {
  const mappings = suggestClassMapping(SAMPLE_CLASSES, SAMPLE_CLASSES, 'promote');
  const byId = Object.fromEntries(mappings.map(m => [m.sourceClassId, m]));

  assert.equal(byId['k-x-tkj1'].action, 'promote');
  assert.equal(byId['k-x-tkj1'].targetClassId, 'k-xi-tkj1');

  assert.equal(byId['k-xi-tkj1'].action, 'promote');
  assert.equal(byId['k-xi-tkj1'].targetClassId, 'k-xii-tkj1');

  assert.equal(byId['k-xii-tkj1'].action, 'graduate');
  assert.equal(byId['k-xii-tkj1'].targetClassId, null);

  assert.equal(byId['k-x-rpl1'].action, 'promote');
  assert.equal(byId['k-x-rpl1'].targetClassId, 'k-xi-rpl1');

  // XI RPL 1 has no XII RPL 1 yet -> missing target flagged
  assert.equal(byId['k-xi-rpl1'].action, 'promote');
  assert.equal(byId['k-xi-rpl1'].targetClassId, null);
  assert.equal(byId['k-xi-rpl1'].confidence, 'missing');
});

test('suggestClassMapping keeps same classes in semester mode (Semester 1 -> 2)', () => {
  const mappings = suggestClassMapping(SAMPLE_CLASSES, SAMPLE_CLASSES, 'semester');
  for (const m of mappings) {
    assert.equal(m.action, 'keep');
    assert.equal(m.targetClassId, m.sourceClassId);
  }
});

test('buildRolloverPlan handles promote, graduate, retain (tinggal kelas), and exclude accurately', () => {
  const mappings = [
    { sourceClassId: 'k-x-tkj1', action: 'promote', targetClassId: 'k-xi-tkj1', targetClassName: 'XI TKJ 1' },
    { sourceClassId: 'k-xii-tkj1', action: 'graduate', targetClassId: null, targetClassName: 'Lulus (Alumni)' },
  ];
  const enrollments = [
    { studentId: 's1', studentName: 'Ahmad', classId: 'k-x-tkj1', className: 'X TKJ 1' },
    { studentId: 's2', studentName: 'Budi', classId: 'k-x-tkj1', className: 'X TKJ 1' },
    { studentId: 's3', studentName: 'Citra', classId: 'k-x-tkj1', className: 'X TKJ 1' },
    { studentId: 's4', studentName: 'Dewi', classId: 'k-xii-tkj1', className: 'XII TKJ 1' },
  ];

  const plan = buildRolloverPlan({
    enrollments,
    mappings,
    retainStudentIds: ['s2'],
    excludedStudentIds: ['s3'],
    validClassIds: SAMPLE_CLASSES.map(c => c.id),
  });

  assert.equal(plan.valid, true);
  assert.equal(plan.summary.toPromote, 1);
  assert.equal(plan.summary.toRetain, 1);
  assert.equal(plan.summary.skipped, 1);
  assert.equal(plan.summary.toGraduate, 1);

  const actionByStudent = Object.fromEntries(plan.actions.map(a => [a.studentId, a]));
  assert.equal(actionByStudent.s1.targetClassId, 'k-xi-tkj1');
  assert.equal(actionByStudent.s2.action, 'retain');
  assert.equal(actionByStudent.s2.targetClassId, 'k-x-tkj1');
  assert.equal(actionByStudent.s3.action, 'skip');
  assert.equal(actionByStudent.s4.action, 'graduate');
  assert.equal(actionByStudent.s4.newStatus, 'lulus');
});

test('buildRolloverPlan rejects missing target class on promote action', () => {
  const plan = buildRolloverPlan({
    enrollments: [{ studentId: 's1', studentName: 'Raka', classId: 'k-xi-rpl1', className: 'XI RPL 1' }],
    mappings: [{ sourceClassId: 'k-xi-rpl1', action: 'promote', targetClassId: null }],
    validClassIds: SAMPLE_CLASSES.map(c => c.id),
  });

  assert.equal(plan.valid, false);
  assert.equal(plan.errors.length, 1);
});

test('parsePaginationParams & buildPaginationMeta enforce bounds and preserve backward compatibility', () => {
  assert.equal(parsePaginationParams({}).isPaginated, false);
  assert.equal(parsePaginationParams({ paginated: 'true' }).isPaginated, true);

  const p = parsePaginationParams({ page: '3', limit: '250' }, { defaultLimit: 25, maxLimit: 100 });
  assert.equal(p.isPaginated, true);
  assert.equal(p.page, 3);
  assert.equal(p.limit, 100);
  assert.equal(p.skip, 200);

  const meta = buildPaginationMeta(312, 2, 25);
  assert.equal(meta.totalPages, 13);
  assert.equal(meta.hasNext, true);
  assert.equal(meta.hasPrev, true);

  const bounds = buildMonthDateBounds('2026-04');
  assert.equal(bounds.start.toISOString(), '2026-04-01T00:00:00.000Z');
  assert.equal(bounds.end.toISOString(), '2026-05-01T00:00:00.000Z');
  assert.equal(buildMonthDateBounds('invalid'), null);
});

test('aggregatePiketSummary computes totals, bolos, monthly trend, search, and pagination', () => {
  const students = [
    { id: 's1', name: 'Aulia', nis: '1001', class: 'X TKJ 1' },
    { id: 's2', name: 'Bima', nis: '1002', class: 'X TKJ 1' },
    { id: 's3', name: 'Candra', nis: '1003', class: 'X TKJ 1' },
  ];
  const records = [
    { studentId: 's1', studentName: 'Aulia', class: 'X TKJ 1', date: '2026-01-10', statusPagi: 'hadir', statusSore: 'hadir' },
    { studentId: 's1', studentName: 'Aulia', class: 'X TKJ 1', date: '2026-02-10', statusPagi: 'hadir', statusSore: 'alpha' }, // bolos
    { studentId: 's2', studentName: 'Bima', class: 'X TKJ 1', date: '2026-01-10', statusPagi: 'sakit', statusSore: 'sakit' },
    { studentId: 's3', studentName: 'Candra', class: 'X TKJ 1', date: '2026-02-10', statusPagi: 'alpha', statusSore: 'alpha' },
  ];

  const res = aggregatePiketSummary({ records, students, sesi: 'pagi', page: 1, limit: 2 });
  assert.equal(res.totals.hadir, 2);
  assert.equal(res.totals.sakit, 1);
  assert.equal(res.totals.alpha, 1);
  assert.equal(res.totals.bolos, 1);
  assert.equal(res.totals.attendanceRate, 50);
  assert.equal(res.monthlyTrend.length, 2);
  assert.equal(res.items.length, 2);
  assert.equal(res.pagination.total, 3);
  assert.equal(res.pagination.totalPages, 2);
  assert.equal(res.pagination.hasNext, true);

  const searchRes = aggregatePiketSummary({ records, students, sesi: 'pagi', search: 'bima', page: 1, limit: 10 });
  assert.equal(searchRes.items.length, 1);
  assert.equal(searchRes.items[0].studentName, 'Bima');
  assert.equal(searchRes.items[0].sakit, 1);
});
