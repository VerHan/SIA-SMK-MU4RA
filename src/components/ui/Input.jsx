/* Reusable Form Input Component */

import { useState } from 'react';

export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  icon,
  style: customStyle,
  ...props
}) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? 'var(--color-danger)'
    : focused
      ? 'var(--color-primary)'
      : 'var(--color-border)';

  return (
    <div style={{ marginBottom: 'var(--space-4)', ...customStyle }}>
      {/* Label */}
      {label && (
        <label style={{
          display: 'block',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'var(--color-text)',
          marginBottom: 'var(--space-1)',
        }}>
          {label}
          {required && <span style={{ color: 'var(--color-danger)', marginLeft: '2px' }}>*</span>}
        </label>
      )}

      {/* Input wrapper */}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{
            position: 'absolute',
            left: 'var(--space-3)',
            top: '50%',
            transform: 'translateY(-50%)',
            color: focused ? 'var(--color-primary)' : 'var(--color-text-muted)',
            display: 'flex',
            transition: 'color var(--transition-fast)',
          }}>
            {icon}
          </span>
        )}

        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            padding: icon ? '0.65rem 0.875rem 0.65rem 2.5rem' : '0.65rem 0.875rem',
            fontSize: 'var(--font-size-base)',
            color: 'var(--color-text)',
            background: disabled ? 'var(--color-border-light)' : 'var(--color-surface)',
            border: `1.5px solid ${borderColor}`,
            borderRadius: 'var(--radius-lg)',
            outline: 'none',
            transition: 'all var(--transition-fast)',
            boxShadow: focused ? 'var(--shadow-glow)' : 'none',
            opacity: disabled ? 0.6 : 1,
          }}
          {...props}
        />
      </div>

      {/* Error message */}
      {error && (
        <p style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-danger)',
          marginTop: 'var(--space-1)',
        }}>
          {error}
        </p>
      )}
    </div>
  );
}
