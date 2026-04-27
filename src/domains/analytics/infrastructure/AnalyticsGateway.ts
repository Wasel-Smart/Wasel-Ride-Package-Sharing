import {
  getGrowthDashboard,
  trackGrowthEvent,
  type GrowthDashboard,
} from '@/services/growthEngine';

type TrackGrowthEventInput = Parameters<typeof trackGrowthEvent>[0];

export class AnalyticsGateway {
  getGrowthDashboard(userId?: string): Promise<GrowthDashboard> {
    return getGrowthDashboard(userId);
  }

  trackGrowthEvent(input: TrackGrowthEventInput): Promise<void> {
    return trackGrowthEvent(input);
  }
}
