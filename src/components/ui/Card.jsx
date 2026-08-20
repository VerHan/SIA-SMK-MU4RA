/* Reusable Card Component */

export default function Card({
  children,
  padding = 'var(--space-6)',
  hover = false,
  glass = false,
  onClick,
  style: customStyle,
  className = '',
}) {
  const baseStyle = {
    background: glass ? 'rgba(255, 255, 255, 0.8)' : 'var(--color-surface)',
    backdropFilter: glass ? 'blur(12px)' : 'none',
    borderRadius: 'var(--radius-xl)',
    padding: padding,
    border: glass ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid var(--color-border-light)',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all var(--transition-normal)',
    cursor: onClick ? 'pointer' : 'default',
    ...customStyle,
  };

  return (
    <div
      className={className}
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (hover || onClick) {
          e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (hover || onClick) {
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {children}
    </div>
  );
}
