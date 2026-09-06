import { C, F, SPACE, TYPE } from '../../../utils/wasel-ds';

export function FieldError({ message }: { message: string | null }) {
  if (!message) {return null;}
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: SPACE[2],
        color: C.error,
        fontSize: TYPE.size.xs,
        fontFamily: F,
        lineHeight: 1.5,
        marginTop: SPACE[1],
      }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: `${C.error}22`,
          border: `1px solid ${C.error}44`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: TYPE.weight.bold,
          flexShrink: 0,
        }}
      >
        !
      </span>
      {message}
    </div>
  );
}

export function FieldSuccess({ message }: { message?: string }) {
  if (!message) {return null;}
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: SPACE[2],
        color: C.green,
        fontSize: TYPE.size.xs,
        fontFamily: F,
        lineHeight: 1.5,
        marginTop: SPACE[1],
      }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: `${C.green}22`,
          border: `1px solid ${C.green}44`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: TYPE.weight.bold,
          flexShrink: 0,
        }}
      >
        ✓
      </span>
      {message}
    </div>
  );
}

export function ValidationRules({
  rules,
}: {
  rules: Array<{ passed: boolean; label: string }>;
}) {
  return (
    <div style={{ display: 'grid', gap: 4, marginTop: SPACE[2] }}>
      {rules.map((rule, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: SPACE[2],
            fontSize: TYPE.size.xs,
            fontFamily: F,
            color: rule.passed ? C.green : C.textDim,
            transition: 'color 200ms',
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              border: `1px solid ${rule.passed ? C.green : C.border}`,
              background: rule.passed ? `${C.green}22` : 'transparent',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              fontWeight: TYPE.weight.bold,
              flexShrink: 0,
            }}
          >
            {rule.passed ? '✓' : '○'}
          </span>
          {rule.label}
        </div>
      ))}
    </div>
  );
}
