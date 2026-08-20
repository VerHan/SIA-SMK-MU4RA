/* Reusable Badge/Status Component */

export default function Badge({ children, variant = 'default', size = 'sm', style: customStyle }) {
  const variants = {
    default: { bg: 'var(--color-border-light)', color: 'var(--color-text-secondary)' },
    primary: { bg: 'var(--color-primary-subtle)', color: 'var(--color-primary)' },
    success: { bg: 'var(--color-success-light)', color: '#065F46' },
    warning: { bg: 'var(--color-warning-light)', color: '#92400E' },
    danger: { bg: 'var(--color-danger-light)', color: '#991B1B' },
    info: { bg: 'var(--color-info-light)', color: '#155E75' },
  };

  const sizes = {
    xs: { padding: '0.1rem 0.45rem', fontSize: 'var(--font-size-xs)' },
    sm: { padding: '0.2rem 0.6rem', fontSize: 'var(--font-size-xs)' },
    md: { padding: '0.3rem 0.75rem', fontSize: 'var(--font-size-sm)' },
  };

  const v = variants[variant] || variants.default;
  const s = sizes[size] || sizes.sm;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      fontWeight: 'var(--font-weight-semibold)',
      borderRadius: 'var(--radius-full)',
      background: v.bg,
      color: v.color,
      ...s,
      ...customStyle,
    }}>
      {children}
    </span>
  );
}
