/* ============================================================
   academicRolloverUtils.js — Pure Domain Logic for:
   1. Tutup Semester & Kenaikan Kelas Massal (X -> XI -> XII -> Lulus)
   2. Server-Side Pagination & Attendance Aggregation Helpers
   ============================================================ */

const VALID_GRADES = ['XII', 'XI', 'X'];
const NEXT_GRADE_MAP = {
  X: 'XI',
  XI: 'XII',
  XII: 'LULUS',
};

/**
 * Normalize whitespace and case for reliable class suffix matching.
 */
function normalizeToken(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/**
 * Extract grade ('X' | 'XI' | 'XII' | null) and suffix (e.g., 'TKJ 1') from a class name.
 */
export function parseGradeFromClassName(className, explicitGrade = null) {
  const raw = String(className || '').trim().replace(/\s+/g, ' ');
  const upper = raw.toUpperCase();

  for (const g of VALID_GRADES) {
    if (upper === g) {
      return { grade: g, suffix: '' };
    }
    if (upper.startsWith(`${g} `)) {
      return { grade: g, suffix: raw.slice(g.length + 1).trim() };
    }
  }

  const normalizedExplicit = normalizeToken(explicitGrade);
  if (VALID_GRADES.includes(normalizedExplicit)) {
    return { grade: normalizedExplicit, suffix: raw };
  }

  return { grade: null, suffix: raw };
}

/**
 * Suggest target class mappings for bulk academic rollover.
 * @param {Array<{id: string, name: string, grade?: string, major?: string, studentCount?: number}>} sourceClasses
 * @param {Array<{id: string, name: string, grade?: string, major?: string}>} allClasses
 * @param {'promote'|'semester'} mode
 */
export function suggestClassMapping(sourceClasses = [], allClasses = [], mode = 'promote') {
  const cleanMode = mode === 'semester' ? 'semester' : 'promote';

  const parsedAll = allClasses.map(cls => {
    const parsed = parseGradeFromClassName(cls.name, cls.grade);
    return {
      ...cls,
      parsedGrade: parsed.grade,
      parsedSuffix: normalizeToken(parsed.suffix),
      normalizedMajor: normalizeToken(cls.major),
    };
  });

  return sourceClasses.map(src => {
    const parsed = parseGradeFromClassName(src.name, src.grade);
    const srcGrade = parsed.grade;
    const srcSuffix = normalizeToken(parsed.suffix);
    const srcMajor = normalizeToken(src.major);

    if (cleanMode === 'semester') {
      return {
        sourceClassId: src.id,
        sourceClassName: src.name,
        sourceGrade: srcGrade,
        studentCount: Number(src.studentCount) || 0,
        action: 'keep',
        targetClassId: src.id,
        targetClassName: src.name,
        confidence: 'exact',
      };
    }

    if (srcGrade === 'XII') {
      return {
        sourceClassId: src.id,
        sourceClassName: src.name,
        sourceGrade: 'XII',
        studentCount: Number(src.studentCount) || 0,
        action: 'graduate',
        targetClassId: null,
        targetClassName: 'Lulus (Alumni)',
        confidence: 'exact',
      };
    }

    const nextGrade = NEXT_GRADE_MAP[srcGrade];
    if (nextGrade && nextGrade !== 'LULUS') {
      // 1. Exact suffix match (e.g. "X TKJ 1" -> "XI TKJ 1")
      let target = parsedAll.find(
        c => c.parsedGrade === nextGrade && c.parsedSuffix === srcSuffix
      );
      let confidence = 'exact';

      // 2. Fallback: same major + next grade
      if (!target && srcMajor) {
        target = parsedAll.find(
          c => c.parsedGrade === nextGrade && c.normalizedMajor === srcMajor
        );
        confidence = target ? 'major_fallback' : 'missing';
      }

      if (target) {
        return {
          sourceClassId: src.id,
          sourceClassName: src.name,
          sourceGrade: srcGrade,
          studentCount: Number(src.studentCount) || 0,
          action: 'promote',
          targetClassId: target.id,
          targetClassName: target.name,
          confidence,
        };
      }

      return {
        sourceClassId: src.id,
        sourceClassName: src.name,
        sourceGrade: srcGrade,
        studentCount: Number(src.studentCount) || 0,
        action: 'promote',
        targetClassId: null,
        targetClassName: null,
        confidence: 'missing',
      };
    }

    return {
      sourceClassId: src.id,
      sourceClassName: src.name,
      sourceGrade: srcGrade,
      studentCount: Number(src.studentCount) || 0,
      action: 'retain',
      targetClassId: src.id,
      targetClassName: src.name,
      confidence: 'manual',
    };
  });
}

/**
 * Build an explicit, deterministic rollover execution plan per student.
 * Guarantees validation: promoted students must have a valid targetClassId.
 */
export function buildRolloverPlan({
  enrollments = [],
  mappings = [],
  retainStudentIds = [],
  excludedStudentIds = [],
  alreadyEnrolledStudentIds = [],
  validClassIds = null,
}) {
  const mappingBySourceClass = new Map();
  for (const m of mappings) {
    if (!m || !m.sourceClassId) continue;
    mappingBySourceClass.set(m.sourceClassId, m);
  }

  const retainSet = new Set(retainStudentIds);
  const excludeSet = new Set(excludedStudentIds);
  const alreadySet = new Set(alreadyEnrolledStudentIds);
  const validClassSet = validClassIds ? new Set(validClassIds) : null;

  const actions = [];
  const errors = [];
  const summary = {
    totalSource: enrollments.length,
    toPromote: 0,
    toKeep: 0,
    toGraduate: 0,
    toRetain: 0,
    skipped: 0,
    alreadyEnrolled: 0,
  };

  for (const enr of enrollments) {
    const studentId = enr.studentId;
    if (!studentId) continue;

    if (excludeSet.has(studentId)) {
      summary.skipped++;
      actions.push({
        studentId,
        studentName: enr.studentName || '-',
        sourceClassId: enr.classId,
        sourceClassName: enr.className,
        action: 'skip',
        targetClassId: null,
        reason: 'Dikecualikan oleh admin',
      });
      continue;
    }

    if (retainSet.has(studentId)) {
      if (validClassSet && !validClassSet.has(enr.classId)) {
        errors.push(`Kelas asal "${enr.className}" untuk siswa tinggal kelas "${enr.studentName}" tidak valid.`);
        continue;
      }
      if (alreadySet.has(studentId)) summary.alreadyEnrolled++;
      summary.toRetain++;
      actions.push({
        studentId,
        studentName: enr.studentName || '-',
        sourceClassId: enr.classId,
        sourceClassName: enr.className,
        action: 'retain',
        targetClassId: enr.classId,
        targetClassName: enr.className,
        newStatus: 'aktif',
      });
      continue;
    }

    const mapping = mappingBySourceClass.get(enr.classId);
    if (!mapping || mapping.action === 'skip') {
      summary.skipped++;
      actions.push({
        studentId,
        studentName: enr.studentName || '-',
        sourceClassId: enr.classId,
        sourceClassName: enr.className,
        action: 'skip',
        targetClassId: null,
        reason: 'Kelas dilewati pada pemetaan',
      });
      continue;
    }

    if (mapping.action === 'graduate') {
      summary.toGraduate++;
      actions.push({
        studentId,
        studentName: enr.studentName || '-',
        sourceClassId: enr.classId,
        sourceClassName: enr.className,
        action: 'graduate',
        targetClassId: null,
        targetClassName: 'Lulus (Alumni)',
        newStatus: 'lulus',
      });
      continue;
    }

    const targetClassId = mapping.action === 'retain' ? enr.classId : mapping.targetClassId;
    if (!targetClassId || (validClassSet && !validClassSet.has(targetClassId))) {
      errors.push(`Kelas tujuan untuk "${enr.className}" belum dipilih atau tidak valid.`);
      continue;
    }

    if (alreadySet.has(studentId)) summary.alreadyEnrolled++;

    if (mapping.action === 'keep') {
      summary.toKeep++;
      actions.push({
        studentId,
        studentName: enr.studentName || '-',
        sourceClassId: enr.classId,
        sourceClassName: enr.className,
        action: 'keep',
        targetClassId,
        targetClassName: mapping.targetClassName || enr.className,
        newStatus: 'aktif',
      });
    } else if (mapping.action === 'retain') {
      summary.toRetain++;
      actions.push({
        studentId,
        studentName: enr.studentName || '-',
        sourceClassId: enr.classId,
        sourceClassName: enr.className,
        action: 'retain',
        targetClassId,
        targetClassName: enr.className,
        newStatus: 'aktif',
      });
    } else {
      summary.toPromote++;
      actions.push({
        studentId,
        studentName: enr.studentName || '-',
        sourceClassId: enr.classId,
        sourceClassName: enr.className,
        action: 'promote',
        targetClassId,
        targetClassName: mapping.targetClassName || '-',
        newStatus: 'aktif',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
    actions,
    summary,
  };
}

/**
 * Parse and bound pagination parameters from Express req.query.
 * Preserves backward compatibility: isPaginated is true only when `page` or `paginated=true` is explicitly requested.
 */
export function parsePaginationParams(query = {}, { defaultLimit = 25, maxLimit = 100 } = {}) {
  const hasPage = query.page !== undefined && query.page !== '';
  const hasPaginatedFlag = String(query.paginated || '').toLowerCase() === 'true';
  const isPaginated = hasPage || hasPaginatedFlag;

  const rawPage = Number.parseInt(String(query.page ?? '1'), 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  const rawLimit = Number.parseInt(String(query.limit ?? defaultLimit), 10);
  const limit = Number.isFinite(rawLimit) && rawLimit >= 1
    ? Math.min(rawLimit, maxLimit)
    : defaultLimit;

  return {
    isPaginated,
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

/**
 * Standard pagination envelope metadata.
 */
export function buildPaginationMeta(total, page, limit) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeLimit = Math.max(1, Number(limit) || 25);
  const totalPages = Math.max(1, Math.ceil(safeTotal / safeLimit));
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  return {
    page: safePage,
    limit: safeLimit,
    total: safeTotal,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };
}

/**
 * Validate YYYY-MM string and return UTC Date bounds [start, end).
 */
export function buildMonthDateBounds(monthStr) {
  if (!monthStr || !/^\d{4}-(0[1-9]|1[0-2])$/.test(String(monthStr).trim())) {
    return null;
  }
  const [y, m] = String(monthStr).trim().split('-');
  const start = new Date(`${y}-${m}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}

/**
 * Compute inclusive date range strings ('YYYY-MM-DD') for an academic year.
 */
export function getAcademicYearDateRange(tahunAjar) {
  if (!tahunAjar || !tahunAjar.startDate || !tahunAjar.endDate) return null;
  const startStr = typeof tahunAjar.startDate === 'string'
    ? tahunAjar.startDate.split('T')[0]
    : tahunAjar.startDate.toISOString().split('T')[0];
  const endStr = typeof tahunAjar.endDate === 'string'
    ? tahunAjar.endDate.split('T')[0]
    : tahunAjar.endDate.toISOString().split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startStr) || !/^\d{4}-\d{2}-\d{2}$/.test(endStr)) {
    return null;
  }
  return {
    startStr,
    endStr,
    startDate: new Date(`${startStr}T00:00:00.000Z`),
    endDate: new Date(`${endStr}T23:59:59.999Z`),
  };
}

/**
 * Pure attendance aggregation helper (used by in-memory store & unit tests to match SQL groupBy contract).
 */
export function aggregatePiketSummary({
  records = [],
  students = [],
  sesi = 'pagi',
  search = '',
  page = 1,
  limit = 25,
}) {
  const statusField = sesi === 'sore' ? 'statusSore' : 'statusPagi';
  const cleanSearch = String(search || '').trim().toLowerCase();

  const perStudent = new Map();
  for (const st of students) {
    perStudent.set(st.id, {
      studentId: st.id,
      studentName: st.name || '-',
      nis: st.nis || st.nomor || '-',
      class: st.class || '-',
      hadir: 0,
      izin: 0,
      sakit: 0,
      alpha: 0,
      bolos: 0,
      totalRecords: 0,
      attendanceRate: 0,
    });
  }

  const monthlyMap = new Map();
  const totals = {
    hadir: 0,
    izin: 0,
    sakit: 0,
    alpha: 0,
    bolos: 0,
    totalRecords: 0,
    attendanceRate: 0,
  };

  for (const rec of records) {
    const status = rec[statusField];
    const isBolos = rec.statusPagi === 'hadir' && rec.statusSore === 'alpha';
    const monthKey = String(rec.date || '').slice(0, 7);

    if (monthKey && /^\d{4}-\d{2}$/.test(monthKey)) {
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { month: monthKey, hadir: 0, izin: 0, sakit: 0, alpha: 0, bolos: 0, total: 0 });
      }
      const m = monthlyMap.get(monthKey);
      if (status === 'hadir') { m.hadir++; m.total++; }
      else if (status === 'izin') { m.izin++; m.total++; }
      else if (status === 'sakit') { m.sakit++; m.total++; }
      else if (status === 'alpha') { m.alpha++; m.total++; }
      if (isBolos) m.bolos++;
    }

    if (status === 'hadir') { totals.hadir++; totals.totalRecords++; }
    else if (status === 'izin') { totals.izin++; totals.totalRecords++; }
    else if (status === 'sakit') { totals.sakit++; totals.totalRecords++; }
    else if (status === 'alpha') { totals.alpha++; totals.totalRecords++; }
    if (isBolos) totals.bolos++;

    if (!perStudent.has(rec.studentId)) {
      perStudent.set(rec.studentId, {
        studentId: rec.studentId,
        studentName: rec.studentName || '-',
        nis: '-',
        class: rec.class || '-',
        hadir: 0,
        izin: 0,
        sakit: 0,
        alpha: 0,
        bolos: 0,
        totalRecords: 0,
        attendanceRate: 0,
      });
    }
    const st = perStudent.get(rec.studentId);
    if (status === 'hadir') { st.hadir++; st.totalRecords++; }
    else if (status === 'izin') { st.izin++; st.totalRecords++; }
    else if (status === 'sakit') { st.sakit++; st.totalRecords++; }
    else if (status === 'alpha') { st.alpha++; st.totalRecords++; }
    if (isBolos) st.bolos++;
  }

  totals.attendanceRate = totals.totalRecords > 0
    ? Math.round((totals.hadir / totals.totalRecords) * 100)
    : 0;

  let allRows = Array.from(perStudent.values()).map(item => ({
    ...item,
    attendanceRate: item.totalRecords > 0 ? Math.round((item.hadir / item.totalRecords) * 100) : 0,
  }));

  if (cleanSearch) {
    allRows = allRows.filter(
      r =>
        r.studentName.toLowerCase().includes(cleanSearch) ||
        String(r.nis || '').toLowerCase().includes(cleanSearch) ||
        String(r.class || '').toLowerCase().includes(cleanSearch)
    );
  }

  allRows.sort((a, b) => a.studentName.localeCompare(b.studentName));

  const pagination = buildPaginationMeta(allRows.length, page, limit);
  const startIdx = (pagination.page - 1) * pagination.limit;
  const items = allRows.slice(startIdx, startIdx + pagination.limit);

  const monthlyTrend = Array.from(monthlyMap.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(m => ({
      ...m,
      attendanceRate: m.total > 0 ? Math.round((m.hadir / m.total) * 100) : 0,
    }));

  return {
    totals,
    monthlyTrend,
    items,
    pagination,
  };
}
