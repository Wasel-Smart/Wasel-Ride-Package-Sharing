import { C, F } from '../../../utils/wasel-ds';

interface ValidationFeedbackProps {
  error?: string;
  success?: string;
  warning?: string;
  ar?: boolean;
}

export function ValidationFeedback({ error, success, warning, ar }: ValidationFeedbackProps) {
  if (!error && !success && !warning) return null;

  const type = error ? 'error' : success ? 'success' : 'warning';
  const message = error || success || warning;

  const styles = {
    error: {
      color: C.error,
      icon: '✕',
    },
    success: {
      color: C.green,
      icon: '✓',
    },
    warning: {
      color: C.gold,
      icon: '⚠',
    },
  };

  const style = styles[type];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        fontSize: '0.8rem',
        color: style.color,
        fontFamily: F,
        animation: 'fadeIn 0.2s ease-out',
      }}
      role="alert"
      aria-live="polite"
      dir={ar ? 'rtl' : 'ltr'}
    >
      <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>{style.icon}</span>
      <span>{message}</span>
    </div>
  );
}

interface InputWithValidationProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  success?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  type?: string;
  ar?: boolean;
  style?: React.CSSProperties;
}

export function InputWithValidation({
  value,
  onChange,
  onBlur,
  onFocus,
  onKeyDown,
  placeholder,
  error,
  success,
  disabled,
  autoFocus,
  maxLength,
  type = 'text',
  ar,
  style: customStyle,
}: InputWithValidationProps) {
  const hasError = Boolean(error);
  const hasSuccess = Boolean(success);

  const borderColor = hasError
    ? C.error
    : hasSuccess
      ? C.green
      : C.cyan;

  return (
    <div style={{ display: 'grid', gap: '4px', flex: 1 }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        maxLength={maxLength}
        type={type}
        dir={ar ? 'rtl' : 'ltr'}
        style={{
          flex: '1 1 240px',
          minWidth: 0,
          padding: '10px 12px',
          borderRadius: 10,
          border: `1.5px solid ${borderColor}`,
          background: hasError ? C.errorDim : hasSuccess ? C.green + '0A' : C.cyanDim,
          color: C.text,
          fontSize: '0.9rem',
          fontFamily: F,
          outline: 'none',
          transition: 'all 0.2s ease',
          ...customStyle,
        }}
        aria-invalid={hasError}
        aria-describedby={hasError ? 'validation-error' : undefined}
      />
      {(error || success) && (
        <ValidationFeedback error={error} success={success} ar={ar} />
      )}
    </div>
  );
}

export function SaveButton({
  onClick,
  disabled,
  loading,
  ar,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  ar?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        padding: '10px 16px',
        borderRadius: 10,
        background: disabled || loading ? C.borderHov : C.cyan,
        border: 'none',
        color: C.bgDeep,
        fontWeight: 700,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        fontSize: '0.85rem',
        fontFamily: F,
        opacity: disabled || loading ? 0.6 : 1,
        transition: 'all 0.2s ease',
        minWidth: '100px',
      }}
      aria-busy={loading}
    >
      {loading ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              border: `2px solid ${C.bgDeep}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }}
          />
          {ar ? 'جاري الحفظ...' : 'Saving...'}
        </span>
      ) : (
        ar ? 'حفظ' : 'Save'
      )}
    </button>
  );
}

// Add CSS animations
if (typeof document !== 'undefined' && !document.getElementById('validation-animations')) {
  const style = document.createElement('style');
  style.id = 'validation-animations';
  style.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;
  document.head.appendChild(style);
}
