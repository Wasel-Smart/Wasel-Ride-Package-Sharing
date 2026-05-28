import {
  Navigate,
  Outlet,
  useLocation,
} from 'react-router';

import { WaselStateCard } from '../components/system/WaselStateCard';
import { ProtectedPagePreview } from '../components/system/ProtectedPagePreview';
import { useLocalAuth } from '../contexts/LocalAuth';

function LoadingState() {
  return (
    <WaselStateCard
      eyebrow="Loading"
      title="Restoring your session"
      description="Checking your secure Wasel session and restoring account access."
      loading
      minHeight="60vh"
    />
  );
}

export default function ProtectedOutlet() {
  const {
    user,
    loading,
  } = useLocalAuth();

  const location =
    useLocation();

  if (loading) {
    return <LoadingState />;
  }

  if (!user) {
    return (
      <Navigate
        to="/app/auth"
        replace
        state={{
          returnTo:
            location.pathname +
            location.search,
        }}
      />
    );
  }

  return <Outlet />;
}