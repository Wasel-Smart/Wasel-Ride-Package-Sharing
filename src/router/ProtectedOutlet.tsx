import { Outlet, useLocation } from 'react-router';
import { ProtectedPagePreview } from '../components/system/ProtectedPagePreview';
import { useAuth } from '../contexts/AuthContext';
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
        color: 'rgba(196,220,238,0.68)',
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
  const { waselUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingState />;
  }

  if (!waselUser) {
    return <ProtectedPagePreview pathname={location.pathname} />;
  }

  if (requiredPermission && !userHasPermission(waselUser.role, requiredPermission)) {
    return <ProtectedPagePreview pathname={location.pathname} />;
  }

  return <Outlet />;
}
