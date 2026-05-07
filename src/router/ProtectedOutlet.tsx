import { Outlet } from 'react-router';
import { ProtectedPagePreview } from '../components/system/ProtectedPagePreview';
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

  if (loading) {
    return <LoadingState />;
  }

  if (!user) {
    return <ProtectedPagePreview />;
  }

  return <Outlet />;
}
