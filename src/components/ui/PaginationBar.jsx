/* ============================================================
   PaginationBar — Server-Side Pagination Controls
   ============================================================ */

export default function PaginationBar({
  pagination,
  onPageChange,
  onLimitChange,
  limitOptions = [15, 25, 50, 100],
  itemLabel = 'data',
}) {
  if (!pagination) return null;
  const { page = 1, limit = 25, total = 0, totalPages = 1, hasPrev = false, hasNext = false } = pagination;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);

  // Build compact page number window (max 5 visible page buttons)
  const pages = [];
  const half = 2;
  let from = Math.max(1, page - half);
  let to = Math.min(totalPages, from + 4);
  from = Math.max(1, to - 4);
  for (let p = from; p <= to; p++) pages.push(p);

  const btnStyle = (active, disabled) => ({
    minWidth: '34px',
    height: '34px',
    padding: '0 10px',
    borderRadius: 'var(--radius-md)',
    border: active ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
    background: active ? 'var(--color-primary)' : 'var(--color-surface)',
    color: active ? '#FFFFFF' : disabled ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: active ? 700 : 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    transition: 'all var(--transition-fast)',
  });

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 'var(--space-3)',
        padding: '12px 16px',
        borderTop: '1px solid var(--color-border-light)',
        background: 'var(--color-surface)',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-secondary)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <span>
          Menampilkan <strong style={{ color: 'var(--color-text-primary)' }}>{start}–{end}</strong> dari{' '}
          <strong style={{ color: 'var(--color-text-primary)' }}>{total}</strong> {itemLabel}
        </span>

        {onLimitChange && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span>Baris:</span>
            <select
              aria-label="Jumlah baris per halaman"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              style={{
                padding: '4px 8px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-primary)',
              }}
            >
              {limitOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={!hasPrev}
          onClick={() => hasPrev && onPageChange(page - 1)}
          style={btnStyle(false, !hasPrev)}
        >
          ← Sebelumnya
        </button>

        {from > 1 && (
          <>
            <button type="button" onClick={() => onPageChange(1)} style={btnStyle(false, false)}>1</button>
            {from > 2 && <span style={{ padding: '0 4px', color: 'var(--color-text-muted)' }}>…</span>}
          </>
        )}

        {pages.map(p => (
          <button
            key={p}
            type="button"
            onClick={() => p !== page && onPageChange(p)}
            style={btnStyle(p === page, false)}
          >
            {p}
          </button>
        ))}

        {to < totalPages && (
          <>
            {to < totalPages - 1 && <span style={{ padding: '0 4px', color: 'var(--color-text-muted)' }}>…</span>}
            <button type="button" onClick={() => onPageChange(totalPages)} style={btnStyle(false, false)}>
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          disabled={!hasNext}
          onClick={() => hasNext && onPageChange(page + 1)}
          style={btnStyle(false, !hasNext)}
        >
          Berikutnya →
        </button>
      </div>
    </div>
  );
}
