import { Outlet, useLocation } from 'react-router';
import { ProtectedPagePreview } from '../components/system/ProtectedPagePreview';
import { useLocalAuth } from '../contexts/LocalAuth';
import { tx } from '../locales/tx';
import { type AccessPermission, userHasPermission } from '../platform/rbac';

function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={tx('protectedOutlet.restoring_your_wasel_session')}
      style={{
        display: 'flex',
        minHeight: '60vh',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#CBD5E1',
        fontFamily: "-apple-system,'Inter',sans-serif",
      }}
    >
      {tx('protectedOutlet.restoring_your_wasel_session')}
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
    return <ProtectedPagePreview pathname={location.pathname} />;
  }

  if (requiredPermission && !userHasPermission(user.role, requiredPermission)) {
    return <ProtectedPagePreview pathname={location.pathname} />;
  }

  return <Outlet />;
}
