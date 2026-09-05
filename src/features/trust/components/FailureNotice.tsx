import { C, F, R, TYPE } from '../../../utils/wasel-ds';

export function FailureNotice({ message }: { message: string }) {
  return (
    <div
      role="alert"
      style={{
        borderRadius: R.lg,
        border: `1px solid ${C.error}33`,
        background: C.errorDim,
        padding: '12px 14px',
        color: C.error,
        fontSize: TYPE.size.sm,
        fontFamily: F,
        lineHeight: 1.6,
      }}
    >
      {message}
    </div>
  );
}
