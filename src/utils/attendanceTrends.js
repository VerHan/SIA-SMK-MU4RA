/* ============================================================
   attendanceTrends.js — Daily Attendance Aggregation Helpers
   Mengelompokkan data absensi (Piket Pagi/Sore maupun Mapel)
   menjadi deret harian terurut untuk visualisasi tren Recharts.
   ============================================================ */

const SHORT_DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const SHORT_MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const LONG_MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function formatShortDateID(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || '-';
  const [, m, d] = dateStr.split('-').map(Number);
  return `${d} ${SHORT_MONTHS_ID[m - 1] || ''}`.trim();
}

export function formatFullDateID(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || '-';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayName = SHORT_DAYS_ID[dt.getUTCDay()] || '';
  return `${dayName}, ${d} ${SHORT_MONTHS_ID[m - 1] || ''} ${y}`;
}

export function formatMonthLabelID(monthStr) {
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) return monthStr || '-';
  const [y, m] = monthStr.split('-').map(Number);
  return `${LONG_MONTHS_ID[m - 1] || m} ${y}`;
}

/**
 * Mengelompokkan array record absensi menjadi ringkasan harian untuk grafik tren.
 * @param {Array} records - Record dari /api/absensi atau /api/absensi-mapel
 * @param {Object} options
 * @param {'piket'|'mapel'} options.mode
 * @param {'pagi'|'sore'} options.session - Berlaku pada mode 'piket'
 * @param {'all'|7|14} options.rangeDays - Batasi N hari tercatat terakhir
 */
export function buildDailyAttendanceTrends(records = [], { mode = 'piket', session = 'pagi', rangeDays = 'all' } = {}) {
  const byDate = new Map();

  for (const rec of records) {
    const rawDate = rec?.date || rec?.tanggal;
    if (!rawDate) continue;
    const dateKey = String(rawDate).split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;

    const status =
      mode === 'piket'
        ? (session === 'sore' ? rec.statusSore : rec.statusPagi)
        : rec.status;

    const isValidStatus = status === 'hadir' || status === 'izin' || status === 'sakit' || status === 'alpha';
    const isBolos = mode === 'piket' && rec.statusPagi === 'hadir' && rec.statusSore === 'alpha';

    if (!isValidStatus && !isBolos) continue;

    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, {
        date: dateKey,
        label: formatShortDateID(dateKey),
        fullDate: formatFullDateID(dateKey),
        hadir: 0,
        izin: 0,
        sakit: 0,
        alpha: 0,
        bolos: 0,
        total: 0,
        hadirRate: 0,
        absentCount: 0,
      });
    }

    const bucket = byDate.get(dateKey);
    if (status === 'hadir') bucket.hadir += 1;
    else if (status === 'izin') bucket.izin += 1;
    else if (status === 'sakit') bucket.sakit += 1;
    else if (status === 'alpha') bucket.alpha += 1;

    if (isValidStatus) bucket.total += 1;
    if (isBolos) bucket.bolos += 1;
  }

  let series = Array.from(byDate.values())
    .filter(item => item.total > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(item => {
      const absentCount = item.izin + item.sakit + item.alpha;
      const hadirRate = item.total > 0 ? Math.round((item.hadir / item.total) * 1000) / 10 : 0;
      return {
        ...item,
        absentCount,
        hadirRate,
      };
    });

  if (typeof rangeDays === 'number' && rangeDays > 0 && series.length > rangeDays) {
    series = series.slice(-rangeDays);
  }

  if (series.length === 0) {
    return {
      series: [],
      summary: {
        daysCount: 0,
        totalRecords: 0,
        totalHadir: 0,
        totalIzin: 0,
        totalSakit: 0,
        totalAlpha: 0,
        totalBolos: 0,
        avgRate: 0,
        peakDay: null,
        lowestDay: null,
        belowTargetDays: 0,
      },
    };
  }

  let totalRecords = 0;
  let totalHadir = 0;
  let totalIzin = 0;
  let totalSakit = 0;
  let totalAlpha = 0;
  let totalBolos = 0;
  let peakDay = series[0];
  let lowestDay = series[0];
  let belowTargetDays = 0;

  for (const day of series) {
    totalRecords += day.total;
    totalHadir += day.hadir;
    totalIzin += day.izin;
    totalSakit += day.sakit;
    totalAlpha += day.alpha;
    totalBolos += day.bolos;
    if (day.hadirRate > peakDay.hadirRate) peakDay = day;
    if (day.hadirRate < lowestDay.hadirRate) lowestDay = day;
    if (day.hadirRate < 85) belowTargetDays += 1;
  }

  const avgRate = totalRecords > 0 ? Math.round((totalHadir / totalRecords) * 1000) / 10 : 0;

  return {
    series,
    summary: {
      daysCount: series.length,
      totalRecords,
      totalHadir,
      totalIzin,
      totalSakit,
      totalAlpha,
      totalBolos,
      avgRate,
      peakDay,
      lowestDay,
      belowTargetDays,
    },
  };
}
