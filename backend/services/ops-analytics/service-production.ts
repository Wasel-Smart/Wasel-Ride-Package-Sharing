/**
 * Operations Analytics Worker - PRODUCTION IMPLEMENTATION
 * Real event consumption and metrics aggregation
 */

import postgres from 'postgres';
import type { DomainEventEnvelope } from '../../../src/domain/events';
import { eventBroker } from '../../../src/platform/event-broker-redis-production';

const sql = postgres(process.env.DATABASE_URL || '', {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

interface RideCompletion {
  rideId: string;
  riderId: string;
  driverId: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  distance: number;
  duration: number;
  fare: number;
  completedAt: string;
}

interface PaymentCapture {
  paymentId: string;
  rideId?: string;
  packageId?: string;
  capturedAmount: number;
  capturedAt: string;
}

interface DriverPayoutSummary {
  driverId: string;
  period: string;
  totalRides: number;
  totalEarnings: number;
  platformFee: number;
  netPayout: number;
  status: 'pending' | 'processed';
}

class AnalyticsEngine {
  async recordRideCompletion(ride: RideCompletion): Promise<void> {
    try {
      await sql`
        INSERT INTO operational_metrics (
          metric_type, entity_id, value, metadata, recorded_at
        ) VALUES (
          'ride_completion',
          ${ride.rideId},
          ${ride.fare},
          ${sql.json({
            driver_id: ride.driverId,
            rider_id: ride.riderId,
            distance: ride.distance,
            duration: ride.duration,
            origin: ride.origin,
            destination: ride.destination,
          })},
          ${ride.completedAt}
        )
      `;

      console.log(`[Analytics] Recorded ride completion: ${ride.rideId}`);
    } catch (error) {
      console.error('[Analytics] Record ride error:', error);
      throw error;
    }
  }

  async recordPaymentCapture(payment: PaymentCapture): Promise<void> {
    try {
      await sql`
        INSERT INTO financial_metrics (
          metric_type, payment_id, entity_id, amount, recorded_at
        ) VALUES (
          'payment_capture',
          ${payment.paymentId},
          ${payment.rideId || payment.packageId},
          ${payment.capturedAmount},
          ${payment.capturedAt}
        )
      `;

      console.log(`[Analytics] Recorded payment capture: ${payment.paymentId}`);
    } catch (error) {
      console.error('[Analytics] Record payment error:', error);
      throw error;
    }
  }

  async updateCorridorIntelligence(ride: RideCompletion): Promise<void> {
    try {
      const corridorId = this.identifyCorridor(ride.origin, ride.destination);

      await sql`
        INSERT INTO corridor_intelligence (
          corridor_id, origin_lat, origin_lng, dest_lat, dest_lng,
          ride_count, total_revenue, avg_fare, avg_duration, last_updated
        ) VALUES (
          ${corridorId}, 
          ${ride.origin.lat}, ${ride.origin.lng}, 
          ${ride.destination.lat}, ${ride.destination.lng},
          1, ${ride.fare}, ${ride.fare}, ${ride.duration}, NOW()
        )
        ON CONFLICT (corridor_id) DO UPDATE SET
          ride_count = corridor_intelligence.ride_count + 1,
          total_revenue = corridor_intelligence.total_revenue + EXCLUDED.total_revenue,
          avg_fare = (corridor_intelligence.total_revenue + EXCLUDED.total_revenue) / 
                     (corridor_intelligence.ride_count + 1),
          avg_duration = (corridor_intelligence.avg_duration * corridor_intelligence.ride_count + EXCLUDED.avg_duration) /
                         (corridor_intelligence.ride_count + 1),
          last_updated = NOW()
      `;

      console.log(`[Analytics] Updated corridor intelligence: ${corridorId}`);
    } catch (error) {
      console.error('[Analytics] Corridor update error:', error);
      throw error;
    }
  }

  async generateDriverPayout(driverId: string, period: string): Promise<DriverPayoutSummary> {
    try {
      const [startDate, endDate] = this.parsePeriod(period);

      const result = await sql`
        SELECT 
          ${driverId} as driver_id,
          COUNT(*) as total_rides,
          SUM(r.fare) as total_earnings,
          SUM(r.fare * 0.20) as platform_fee,
          SUM(r.fare * 0.80) as net_payout
        FROM rides r
        WHERE r.driver_id = ${driverId}
          AND r.completed_at >= ${startDate}
          AND r.completed_at < ${endDate}
          AND r.status = 'completed'
      `;

      if (result.length === 0 || result[0].total_rides === 0) {
        return {
          driverId,
          period,
          totalRides: 0,
          totalEarnings: 0,
          platformFee: 0,
          netPayout: 0,
          status: 'pending',
        };
      }

      return {
        driverId,
        period,
        totalRides: Number(result[0].total_rides),
        totalEarnings: Number(result[0].total_earnings),
        platformFee: Number(result[0].platform_fee),
        netPayout: Number(result[0].net_payout),
        status: 'pending',
      };
    } catch (error) {
      console.error('[Analytics] Payout generation error:', error);
      throw error;
    }
  }

  private identifyCorridor(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): string {
    const originCell = `${Math.floor(origin.lat * 100)}_${Math.floor(origin.lng * 100)}`;
    const destCell = `${Math.floor(destination.lat * 100)}_${Math.floor(destination.lng * 100)}`;
    return `corridor_${originCell}_to_${destCell}`;
  }

  private parsePeriod(period: string): [string, string] {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (period.startsWith('week-')) {
      const weekNum = parseInt(period.split('-')[1]);
      const startDate = new Date(year, 0, 1 + (weekNum - 1) * 7);
      const endDate = new Date(year, 0, 1 + weekNum * 7);
      return [startDate.toISOString(), endDate.toISOString()];
    }

    if (period.startsWith('month-')) {
      const monthNum = parseInt(period.split('-')[1]) - 1;
      const startDate = new Date(year, monthNum, 1);
      const endDate = new Date(year, monthNum + 1, 1);
      return [startDate.toISOString(), endDate.toISOString()];
    }

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);
    return [startDate.toISOString(), endDate.toISOString()];
  }
}

export class OpsAnalyticsWorker {
  private engine = new AnalyticsEngine();
  private unsubscribeRides?: () => Promise<void>;
  private unsubscribePayments?: () => Promise<void>;

  async start(): Promise<void> {
    console.log('[OpsAnalytics] Starting worker...');

    this.unsubscribeRides = await eventBroker.subscribe(
      'rides.completed',
      this.handleRideCompleted.bind(this),
      {
        groupName: 'ops-analytics-worker',
        consumerName: `ops-worker-${process.env.HOSTNAME || 'local'}`,
        blockMs: 10000,
        count: 20,
      },
    );

    this.unsubscribePayments = await eventBroker.subscribe(
      'payments.captured',
      this.handlePaymentCaptured.bind(this),
      {
        groupName: 'ops-analytics-worker',
        consumerName: `ops-worker-${process.env.HOSTNAME || 'local'}`,
        blockMs: 10000,
        count: 20,
      },
    );

    console.log('[OpsAnalytics] Worker started');
  }

  async stop(): Promise<void> {
    if (this.unsubscribeRides) {
      await this.unsubscribeRides();
    }
    if (this.unsubscribePayments) {
      await this.unsubscribePayments();
    }
    await sql.end();
    console.log('[OpsAnalytics] Worker stopped');
  }

  private async handleRideCompleted(event: DomainEventEnvelope<'rides.completed'>): Promise<void> {
    console.log(`[OpsAnalytics] Processing ride completion: ${event.id}`);

    try {
      const ride: RideCompletion = event.payload as any;

      await this.engine.recordRideCompletion(ride);
      await this.engine.updateCorridorIntelligence(ride);

      console.log(`[OpsAnalytics] Processed ride: ${ride.rideId}`);
    } catch (error) {
      console.error(`[OpsAnalytics] Ride processing error:`, error);
      throw error;
    }
  }

  private async handlePaymentCaptured(event: DomainEventEnvelope<'payments.captured'>): Promise<void> {
    console.log(`[OpsAnalytics] Processing payment capture: ${event.id}`);

    try {
      const payment: PaymentCapture = event.payload as any;

      await this.engine.recordPaymentCapture(payment);

      console.log(`[OpsAnalytics] Processed payment: ${payment.paymentId}`);
    } catch (error) {
      console.error(`[OpsAnalytics] Payment processing error:`, error);
      throw error;
    }
  }

  async generateSettlementReport(period: string): Promise<DriverPayoutSummary[]> {
    try {
      const drivers = await sql`
        SELECT DISTINCT driver_id 
        FROM driver_availability 
        WHERE status != 'inactive'
      `;

      const payouts = await Promise.all(
        drivers.map(d => this.engine.generateDriverPayout(d.driver_id, period)),
      );

      return payouts.filter(p => p.totalRides > 0);
    } catch (error) {
      console.error('[OpsAnalytics] Settlement report error:', error);
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await sql`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

if (require.main === module) {
  const worker = new OpsAnalyticsWorker();
  
  process.on('SIGTERM', async () => {
    console.log('[OpsAnalytics] SIGTERM received');
    await worker.stop();
    await eventBroker.disconnect();
    process.exit(0);
  });

  worker.start().catch(error => {
    console.error('[OpsAnalytics] Fatal error:', error);
    process.exit(1);
  });
}
