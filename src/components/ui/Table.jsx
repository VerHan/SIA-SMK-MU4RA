/* Reusable Data Table Component
   Supports two column formats:
   - Legacy: { header, accessor, render(row, index), cellStyle }
   - New:    { key, label, width, render(value, row, index) }
*/

export default function Table({ columns, data, emptyMessage = 'Tidak ada data.' }) {
  const tableStyle = {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    fontSize: 'var(--font-size-sm)',
  };

  const thStyle = {
    textAlign: 'left',
    padding: '0.75rem 1rem',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text-secondary)',
    fontSize: 'var(--font-size-xs)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '2px solid var(--color-border)',
    background: 'var(--color-primary-surface)',
    whiteSpace: 'nowrap',
  };

  const tdStyle = {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--color-border-light)',
    color: 'var(--color-text)',
    verticalAlign: 'middle',
  };

  if (!data || data.length === 0) {
    return (
      <div style={{
        padding: 'var(--space-12) var(--space-4)',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
        fontSize: 'var(--font-size-sm)',
      }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-lg)' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} style={{
                ...thStyle,
                ...(col.headerStyle || {}),
                ...(col.width ? { width: col.width } : {}),
              }}>
                {col.header || col.label || ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={row.id || rowIndex}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-primary-surface)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              style={{ transition: 'background var(--transition-fast)' }}
            >
              {columns.map((col, colIndex) => {
                /* Determine cell value */
                const cellKey = col.key || col.accessor;
                const cellValue = cellKey ? row[cellKey] : undefined;

                /* Determine rendered content */
                let content;
                if (col.render) {
                  /* New format: render(value, row, index) — or legacy: render(row, index) */
                  if (col.key) {
                    content = col.render(cellValue, row, rowIndex);
                  } else {
                    content = col.render(row, rowIndex);
                  }
                } else {
                  content = cellValue ?? '';
                }

                return (
                  <td key={colIndex} style={{
                    ...tdStyle,
                    ...(col.cellStyle || {}),
                    ...(col.width ? { width: col.width } : {}),
                  }}>
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
