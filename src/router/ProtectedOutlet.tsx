import { lazy, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useLocalAuth } from '../contexts/LocalAuth';
import { tx } from '../locales/tx';
import { type AccessPermission, userHasPermission } from '../platform/rbac';

const ProtectedPagePreview = lazy(() =>
  import('../components/system/ProtectedPagePreview').then(module => ({
    default: module.ProtectedPagePreview,
  })),
);

function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={tx('protectedOutlet.restoring_your_wasel_session')}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '60vh',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '3px solid rgba(0,229,255,0.18)',
          borderTopColor: '#00E5FF',
          animation: 'wasel-spin 0.8s linear infinite',
        }}
      />
      <span style={{ color: 'rgba(196,220,238,0.68)', fontSize: '0.875rem', fontFamily: "-apple-system,'Inter',sans-serif" }}>
        {tx('protectedOutlet.restoring_your_wasel_session')}
      </span>
    </div>
  );
}

interface ProtectedOutletProps {
  /** When set, the user must also hold this permission or they see the preview. */
  require?: AccessPermission;
}

export default function ProtectedOutlet({ require: requiredPermission }: ProtectedOutletProps = {}) {
  const { user, loading } = useLocalAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingState />;
  }

  if (!user) {
    return (
      <Suspense fallback={<LoadingState />}>
        <ProtectedPagePreview pathname={location.pathname} />
      </Suspense>
    );
  }

  if (requiredPermission && !userHasPermission(user.role, requiredPermission)) {
    return (
      <Suspense fallback={<LoadingState />}>
        <ProtectedPagePreview pathname={location.pathname} />
      </Suspense>
    );
  }

  return <Outlet />;
}
