/* Loading Spinner Component */

export default function LoadingSpinner({ size = 40, color = 'var(--color-primary)', message }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-8)',
      gap: 'var(--space-4)',
    }}>
      <div style={{
        width: `${size}px`,
        height: `${size}px`,
        border: `3px solid var(--color-border)`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      {message && (
        <p style={{
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-sm)',
        }}>
          {message}
        </p>
      )}
    </div>
  );
}
