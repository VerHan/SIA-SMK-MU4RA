/* ============================================================
   AttendanceTrendChart — Visualisasi Tren Kehadiran Harian (Recharts)
   Menampilkan pola kehadiran siswa harian (Persentase Kehadiran &
   Komposisi Hadir/Izin/Sakit/Alpha) untuk membantu Admin memantau
   tren kelas maupun seluruh sekolah secara cepat.
   ============================================================ */

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { getAttendance, getSubjectAttendance } from '../../services/api';
import { buildDailyAttendanceTrends, formatMonthLabelID } from '../../utils/attendanceTrends';

const TARGET_PRESENCE_RATE = 85;

const STATUS_META = [
  { key: 'hadir', label: 'Hadir', color: '#10B981' },
  { key: 'izin', label: 'Izin', color: '#3B82F6' },
  { key: 'sakit', label: 'Sakit', color: '#F59E0B' },
  { key: 'alpha', label: 'Alpha', color: '#EF4444' },
];

function TrendTooltip({ active, payload, activeTab, canDrillDown }) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div
      style={{
        background: '#0F172A',
        color: '#F8FAFC',
        borderRadius: '10px',
        padding: '12px 14px',
        boxShadow: '0 12px 28px -6px rgba(15, 23, 42, 0.35)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        minWidth: '200px',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
        {point.fullDate}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          paddingBottom: '8px',
          marginBottom: '8px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
        }}
      >
        <span style={{ fontSize: '12px', color: '#CBD5E1' }}>Tingkat Kehadiran</span>
        <span
          style={{
            fontSize: '15px',
            fontWeight: 800,
            color: point.hadirRate >= TARGET_PRESENCE_RATE ? '#34D399' : point.hadirRate >= 70 ? '#FBBF24' : '#F87171',
          }}
        >
          {point.hadirRate}%
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 14px', fontSize: '12px' }}>
        {STATUS_META.map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#CBD5E1' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: s.color, display: 'inline-block' }} />
              {s.label}
            </span>
            <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{point[s.key]}</span>
          </div>
        ))}
      </div>

      {activeTab === 'piket' && point.bolos > 0 && (
        <div
          style={{
            marginTop: '8px',
            paddingTop: '6px',
            borderTop: '1px solid rgba(148, 163, 184, 0.2)',
            fontSize: '11px',
            color: '#FCA5A5',
            fontWeight: 600,
          }}
        >
          Terdeteksi bolos sore: {point.bolos} siswa
        </div>
      )}

      {canDrillDown && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#94A3B8' }}>
          Klik titik tanggal untuk melihat rincian siswa
        </div>
      )}
    </div>
  );
}

export default function AttendanceTrendChart({
  activeTab = 'piket',
  selectedClass = '',
  selectedSubject = '',
  sesi = 'pagi',
  month = '',
  selectedDate = '',
  tahunAjarId = '',
  preloadedRecords = null,
  onSelectDate,
  onJumpToMonth,
}) {
  const [scope, setScope] = useState('class'); // 'class' | 'all'
  const [chartType, setChartType] = useState('rate'); // 'rate' | 'breakdown'
  const [rangeDays, setRangeDays] = useState('all'); // 'all' | 14 | 7
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [latestAvailableMonth, setLatestAvailableMonth] = useState(null);

  const canReusePreloaded = scope === 'class' && Array.isArray(preloadedRecords);

  useEffect(() => {
    let cancelled = false;

    if (canReusePreloaded) {
      setRecords(preloadedRecords);
      setLoading(false);
      return;
    }

    if (!month) {
      setRecords([]);
      setLoading(false);
      return;
    }

    const classFilter = scope === 'class' ? selectedClass : null;
    if (scope === 'class' && !classFilter) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const yearOpts = tahunAjarId ? { tahunAjarId } : {};
    const fetcher =
      activeTab === 'piket'
        ? getAttendance(classFilter, null, month, yearOpts)
        : getSubjectAttendance(classFilter, null, selectedSubject || null, month, yearOpts);

    fetcher.then(data => {
      if (cancelled) return;
      setRecords(Array.isArray(data) ? data : []);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedClass, selectedSubject, month, tahunAjarId, scope, canReusePreloaded, preloadedRecords]);

  const { series, summary } = useMemo(
    () => buildDailyAttendanceTrends(records, { mode: activeTab, session: sesi, rangeDays }),
    [records, activeTab, sesi, rangeDays]
  );

  // If current month is empty, look up the most recent recorded month so admin can jump directly
  useEffect(() => {
    let cancelled = false;
    if (loading || series.length > 0) {
      setLatestAvailableMonth(null);
      return;
    }

    const classFilter = scope === 'class' ? selectedClass : null;
    const yearOpts = tahunAjarId ? { tahunAjarId } : {};
    const probe =
      activeTab === 'piket'
        ? getAttendance(classFilter, null, null, yearOpts)
        : getSubjectAttendance(classFilter, null, selectedSubject || null, null, yearOpts);

    probe.then(allRows => {
      if (cancelled || !Array.isArray(allRows) || allRows.length === 0) return;
      const dates = allRows
        .map(r => String(r.date || '').split('T')[0])
        .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
        .sort();
      if (dates.length > 0) {
        const latestDate = dates[dates.length - 1];
        const latestMonth = latestDate.substring(0, 7);
        if (latestMonth !== month) {
          setLatestAvailableMonth({ month: latestMonth, date: latestDate });
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loading, series.length, activeTab, selectedClass, selectedSubject, scope, month]);

  const handleChartClick = (state) => {
    const clickedDate = state?.activePayload?.[0]?.payload?.date;
    if (clickedDate && onSelectDate) {
      onSelectDate(clickedDate);
    }
  };

  const segmentedContainerStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    padding: '3px',
    background: '#F1F5F9',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
  };

  const segmentedBtnStyle = (isActive) => ({
    padding: '5px 11px',
    fontSize: '12px',
    fontWeight: isActive ? 600 : 500,
    color: isActive ? '#0F172A' : '#64748B',
    background: isActive ? '#FFFFFF' : 'transparent',
    borderRadius: '6px',
    boxShadow: isActive ? '0 1px 2px rgba(15, 23, 42, 0.08)' : 'none',
    transition: 'all 150ms cubic-bezier(0.16, 1, 0.3, 1)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    cursor: 'pointer',
  });

  const scopeLabel = scope === 'all' ? 'Semua Kelas' : (selectedClass || 'Kelas Terpilih');
  const modeMeta =
    activeTab === 'piket'
      ? `Piket ${sesi === 'sore' ? 'Sore' : 'Pagi'}`
      : (selectedSubject || 'Mata Pelajaran');

  return (
    <section
      aria-label="Visualisasi Tren Kehadiran Harian"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '20px 24px',
        marginBottom: 'var(--space-5)',
      }}
    >
      {/* Header Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--color-text)',
              letterSpacing: '-0.01em',
              marginBottom: '4px',
            }}
          >
            Tren Kehadiran Harian
          </h2>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '6px',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span>{scopeLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{modeMeta}</span>
            <span aria-hidden="true">·</span>
            <span>{formatMonthLabelID(month)}</span>
            {!loading && summary.daysCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>{summary.daysCount} hari tercatat</span>
              </>
            )}
          </div>
        </div>

        {/* Interactive Controls */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={segmentedContainerStyle} role="group" aria-label="Cakupan kelas">
            <button
              type="button"
              style={segmentedBtnStyle(scope === 'class')}
              onClick={() => setScope('class')}
            >
              Kelas Ini
            </button>
            <button
              type="button"
              style={segmentedBtnStyle(scope === 'all')}
              onClick={() => setScope('all')}
            >
              Semua Kelas
            </button>
          </div>

          <div style={segmentedContainerStyle} role="group" aria-label="Tipe grafik">
            <button
              type="button"
              style={segmentedBtnStyle(chartType === 'rate')}
              onClick={() => setChartType('rate')}
            >
              Persentase (%)
            </button>
            <button
              type="button"
              style={segmentedBtnStyle(chartType === 'breakdown')}
              onClick={() => setChartType('breakdown')}
            >
              Komposisi
            </button>
          </div>

          <div style={segmentedContainerStyle} role="group" aria-label="Rentang hari">
            {[
              { value: 'all', label: '1 Bulan' },
              { value: 14, label: '14 Hari' },
              { value: 7, label: '7 Hari' },
            ].map(opt => (
              <button
                key={String(opt.value)}
                type="button"
                style={segmentedBtnStyle(rangeDays === opt.value)}
                onClick={() => setRangeDays(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inline Metric Summary Strip (Hairline-separated, Tabular Numerals, Zero Nested Cards) */}
      {!loading && summary.daysCount > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px',
            padding: '14px 0',
            marginBottom: '16px',
            borderTop: '1px solid var(--color-border-light)',
            borderBottom: '1px solid var(--color-border-light)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>
              Rata-rata Kehadiran
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: summary.avgRate >= TARGET_PRESENCE_RATE ? '#059669' : '#D97706',
                }}
              >
                {summary.avgRate}%
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {summary.totalHadir}/{summary.totalRecords} catatan
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>
              Kehadiran Tertinggi
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)' }}>
                {summary.peakDay?.hadirRate ?? 0}%
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {summary.peakDay?.label || '-'}
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>
              Kehadiran Terendah
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: (summary.lowestDay?.hadirRate ?? 100) < TARGET_PRESENCE_RATE ? '#DC2626' : 'var(--color-text)',
                }}
              >
                {summary.lowestDay?.hadirRate ?? 0}%
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {summary.lowestDay?.label || '-'}
                {summary.belowTargetDays > 0 ? ` · ${summary.belowTargetDays} hari <85%` : ''}
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>
              Total Ketidakhadiran
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '22px', fontWeight: 700, color: summary.totalAlpha > 0 ? '#DC2626' : 'var(--color-text)' }}>
                {summary.totalAlpha} alpha
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {summary.totalSakit}S / {summary.totalIzin}I
                {activeTab === 'piket' && summary.totalBolos > 0 ? ` · ${summary.totalBolos} bolos` : ''}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Chart Area / Loading Skeleton / Empty State */}
      {loading ? (
        <div
          aria-busy="true"
          style={{
            height: '280px',
            borderRadius: '10px',
            background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }}
        />
      ) : series.length === 0 ? (
        <div
          style={{
            height: '220px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '24px',
            borderRadius: '10px',
            background: '#F8FAFC',
            border: '1px dashed var(--color-border)',
          }}
        >
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>
            Belum ada catatan kehadiran pada {formatMonthLabelID(month)}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', maxWidth: '460px', marginBottom: '14px' }}>
            Grafik tren harian akan muncul otomatis setelah guru piket atau guru mata pelajaran menyimpan absensi pada periode ini.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {scope === 'class' && (
              <button
                type="button"
                onClick={() => setScope('all')}
                style={{
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0F172A',
                  background: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Tampilkan Semua Kelas
              </button>
            )}
            {latestAvailableMonth && onJumpToMonth && (
              <button
                type="button"
                onClick={() => onJumpToMonth(latestAvailableMonth.month, latestAvailableMonth.date)}
                style={{
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  background: 'var(--color-primary)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Lihat Periode Terbaru ({formatMonthLabelID(latestAvailableMonth.month)})
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'rate' ? (
                <AreaChart
                  data={series}
                  margin={{ top: 12, right: 16, left: -12, bottom: 4 }}
                  onClick={handleChartClick}
                  style={{ cursor: onSelectDate ? 'pointer' : 'default' }}
                >
                  <defs>
                    <linearGradient id="attendanceRateGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    minTickGap={16}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={false}
                    width={46}
                  />
                  <Tooltip content={<TrendTooltip activeTab={activeTab} canDrillDown={Boolean(onSelectDate)} />} />
                  <ReferenceLine
                    y={TARGET_PRESENCE_RATE}
                    stroke="#94A3B8"
                    strokeDasharray="4 4"
                    label={{
                      value: `Target ${TARGET_PRESENCE_RATE}%`,
                      position: 'insideTopRight',
                      fill: '#64748B',
                      fontSize: 11,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="hadirRate"
                    name="Tingkat Kehadiran"
                    stroke="#059669"
                    strokeWidth={2.5}
                    fill="url(#attendanceRateGradient)"
                    dot={(dotProps) => {
                      const { cx, cy, payload } = dotProps;
                      if (cx == null || cy == null) return null;
                      const isSelected = payload?.date === selectedDate;
                      const isLow = payload?.hadirRate < TARGET_PRESENCE_RATE;
                      return (
                        <circle
                          key={`dot-${payload.date}`}
                          cx={cx}
                          cy={cy}
                          r={isSelected ? 6 : series.length <= 10 ? 4 : 3}
                          fill={isLow ? '#DC2626' : '#059669'}
                          stroke="#FFFFFF"
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{ r: 6, stroke: '#0F172A', strokeWidth: 2, fill: '#10B981' }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              ) : (
                <BarChart
                  data={series}
                  margin={{ top: 12, right: 16, left: -12, bottom: 4 }}
                  onClick={handleChartClick}
                  style={{ cursor: onSelectDate ? 'pointer' : 'default' }}
                  maxBarSize={38}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    minTickGap={16}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={false}
                    width={42}
                  />
                  <Tooltip content={<TrendTooltip activeTab={activeTab} canDrillDown={Boolean(onSelectDate)} />} />
                  <Bar dataKey="hadir" name="Hadir" stackId="status" fill="#10B981" isAnimationActive={false} />
                  <Bar dataKey="izin" name="Izin" stackId="status" fill="#3B82F6" isAnimationActive={false} />
                  <Bar dataKey="sakit" name="Sakit" stackId="status" fill="#F59E0B" isAnimationActive={false} />
                  <Bar dataKey="alpha" name="Alpha" stackId="status" fill="#EF4444" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Clean Unboxed Legend & Drill-down Hint */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              marginTop: '12px',
              paddingTop: '10px',
              borderTop: '1px solid var(--color-border-light)',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              {chartType === 'rate' ? (
                <>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '3px', borderRadius: '2px', background: '#059669', display: 'inline-block' }} />
                    Kehadiran ≥ {TARGET_PRESENCE_RATE}%
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#DC2626', display: 'inline-block' }} />
                    Perlu perhatian (&lt; {TARGET_PRESENCE_RATE}%)
                  </span>
                </>
              ) : (
                STATUS_META.map(s => (
                  <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: s.color, display: 'inline-block' }} />
                    <span>{s.label}</span>
                    <strong style={{ color: 'var(--color-text)' }}>
                      {summary[`total${s.key.charAt(0).toUpperCase() + s.key.slice(1)}`]}
                    </strong>
                  </span>
                ))
              )}
            </div>

            {onSelectDate && (
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Klik tanggal pada grafik untuk membuka rincian harian
              </span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
