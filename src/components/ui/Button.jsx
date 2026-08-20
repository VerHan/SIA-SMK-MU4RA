/* Reusable Button Component */

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  icon,
  onClick,
  type = 'button',
  style: customStyle,
  ...props
}) {
  /* Variant styles */
  const variants = {
    primary: {
      background: 'var(--color-primary)',
      color: 'var(--color-white)',
      border: 'none',
      hoverBg: 'var(--color-primary-light)',
    },
    secondary: {
      background: 'var(--color-primary-subtle)',
      color: 'var(--color-primary)',
      border: 'none',
      hoverBg: 'var(--color-primary-surface)',
    },
    outline: {
      background: 'transparent',
      color: 'var(--color-primary)',
      border: '1.5px solid var(--color-primary)',
      hoverBg: 'var(--color-primary-surface)',
    },
    danger: {
      background: 'var(--color-danger)',
      color: 'var(--color-white)',
      border: 'none',
      hoverBg: '#DC2626',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--color-text-secondary)',
      border: 'none',
      hoverBg: 'var(--color-border-light)',
    },
  };

  /* Size styles */
  const sizes = {
    sm: { padding: '0.4rem 0.85rem', fontSize: 'var(--font-size-sm)' },
    md: { padding: '0.6rem 1.25rem', fontSize: 'var(--font-size-base)' },
    lg: { padding: '0.75rem 1.75rem', fontSize: 'var(--font-size-lg)' },
  };

  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    fontWeight: 'var(--font-weight-semibold)',
    borderRadius: 'var(--radius-lg)',
    transition: 'all var(--transition-fast)',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    width: fullWidth ? '100%' : 'auto',
    background: v.background,
    color: v.color,
    border: v.border,
    ...s,
    ...customStyle,
  };

  return (
    <button
      type={type}
      style={baseStyle}
      disabled={disabled || loading}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.background = v.hoverBg;
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = v.background;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      {...props}
    >
      {loading && (
        <span style={{
          width: '16px',
          height: '16px',
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite',
          flexShrink: 0,
        }} />
      )}
      {icon && !loading && <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>}
      {children}
    </button>
  );
}
