import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useLocalAuth } from '../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';

function buildReturnTo(location: ReturnType<typeof useLocation>) {
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  return returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/app/find-ride';
}

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
  const nav = useIframeSafeNavigate();
  const location = useLocation();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!loading && !user && mountedRef.current) {
      nav(`/app/auth?returnTo=${encodeURIComponent(buildReturnTo(location))}`);
    }
  }, [loading, location, nav, user]);

  if (loading || !user) {
    return <LoadingState />;
  }

  return <Outlet />;
}
