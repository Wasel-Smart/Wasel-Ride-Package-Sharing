import { F, R, TYPE  } from '../../../utils/wasel-ds';

export function FailureNotice({ message }: { message: string }) {
  return (
    <div
      role="alert"
      style={{
        borderRadius: R.lg,
        border: `1px solid ${'var(--destructive)'}33`,
        background: 'color-mix(in srgb, var(--destructive) 14%, transparent)',
        padding: '12px 14px',
        color: 'var(--destructive)',
        fontSize: TYPE.size.sm,
        fontFamily: F,
        lineHeight: 1.6,
      }}
    >
      {message}
    </div>
  );
}

