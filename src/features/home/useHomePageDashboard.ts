import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyReferralCode,
  getGrowthDashboard,
  getReferralSnapshot,
  type GrowthDashboard,
  type ReferralSnapshot,
} from '../../services/growthEngine';
import { omitUndefined } from '../../utils/object';

interface HomeUserShape {
  id?: string;
  email?: string;
  user_metadata?: {
    name?: string;
  };
}

export function useHomePageDashboard(user: HomeUserShape | null | undefined) {
  const starsRef = useRef<{ x: number; y: number; opacity: number; size: number }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tripMode, setTripMode] = useState<'one-way' | 'round'>('one-way');
  const [referral, setReferral] = useState<ReferralSnapshot | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [referralMessage, setReferralMessage] = useState<string | null>(null);
  const [growthDashboard, setGrowthDashboard] = useState<GrowthDashboard | null>(null);

  if (starsRef.current.length === 0) {
    starsRef.current = Array.from({ length: 60 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      opacity: Math.random() * 0.5 + 0.1,
      size: Math.random() < 0.15 ? 2 : 1,
    }));
  }

  const loadGrowthContext = useCallback(async () => {
    if (!user?.id) {
      setReferral(null);
      setGrowthDashboard(null);
      return;
    }

    const resolvedName = user.user_metadata?.name || user.email?.split('@')[0];

    await Promise.all([
      getReferralSnapshot(
        omitUndefined({
          id: user.id,
          name: resolvedName,
        }),
      ).then(setReferral).catch(() => setReferral(null)),
      getGrowthDashboard(user.id).then(setGrowthDashboard).catch(() => setGrowthDashboard(null)),
    ]);
  }, [user?.email, user?.id, user?.user_metadata?.name]);

  useEffect(() => {
    void loadGrowthContext();
  }, [loadGrowthContext]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
    void loadGrowthContext();
  }, [loadGrowthContext]);

  const redeemReferral = useCallback(
    async (ar: boolean) => {
      try {
        const snapshot = await applyReferralCode(
          user?.id
            ? omitUndefined({
                id: user.id,
                name: user.user_metadata?.name || user.email?.split('@')[0],
              })
            : null,
          referralCode,
        );
        setReferral(snapshot);
        setReferralMessage(
          ar
            ? 'تم ربط الرمز. سيصل رصيد الإحالة عند اكتمال أول رحلة.'
            : 'Referral linked. Credit will be issued when the first trip completes.',
        );
        setReferralCode('');
        if (user?.id) {
          void getGrowthDashboard(user.id).then(setGrowthDashboard).catch(() => undefined);
        }
      } catch (error) {
        setReferralMessage(
          error instanceof Error ? error.message : 'Referral could not be redeemed.',
        );
      }
    },
    [referralCode, user?.email, user?.id, user?.user_metadata?.name],
  );

  return {
    stars: starsRef.current,
    refreshing,
    handleRefresh,
    tripMode,
    setTripMode,
    referral,
    referralCode,
    setReferralCode,
    referralMessage,
    growthDashboard,
    redeemReferral,
  };
}
