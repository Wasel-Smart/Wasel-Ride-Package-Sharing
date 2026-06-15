import { Navigate, Outlet, useLocation } from 'react-router';
import { useLocalAuth } from '../contexts/LocalAuth';

function LoadingState() {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '60vh',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#CBD5E1',
        fontFamily: "-apple-system,'Inter',sans-serif",
      }}
    >
      Restoring your Wasel session...
    </div>
  );
}

export default function ProtectedOutlet() {
  const { user, loading } = useLocalAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingState />;
  }

  if (!user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/app/auth?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  return <Outlet />;
}
