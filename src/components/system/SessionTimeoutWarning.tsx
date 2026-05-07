/**
 * Session Timeout Warning Component
 * Warns users before their session expires
 */

import { useEffect, useState } from 'react';
import { sessionManager } from '@/utils/sessionManager';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const WARNING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export function SessionTimeoutWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    const checkInterval = setInterval(() => {
      const stats = sessionManager.getSessionStats();
      
      if (!stats.isActive) {
        setShowWarning(false);
        return;
      }

      setTimeRemaining(stats.timeRemaining);

      // Show warning if less than threshold remaining
      if (stats.timeRemaining > 0 && stats.timeRemaining <= WARNING_THRESHOLD_MS) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(checkInterval);
  }, []);

  const handleExtendSession = () => {
    sessionManager.extendSession();
    setShowWarning(false);
  };

  const handleLogout = () => {
    sessionManager.endSession();
    window.location.href = '/auth';
  };

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in {formatTime(timeRemaining)}. Would you like to extend your session?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleLogout}>
            Logout
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleExtendSession}>
            Extend Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
