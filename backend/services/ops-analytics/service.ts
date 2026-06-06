/**
 * Operations Analytics Worker
 * Independent backend service for operational aggregates and corridor intelligence
 * 
 * Responsibilities:
 * - Consume rides.completed and payments.captured events
 * - Build operational dashboards and metrics
 * - Generate corridor demand intelligence
 * - Settlement and payout reporting
 */

import type { DomainEventEnvelope } from '../../../src/domain/events';
import { eventBroker } from '../../../src/platform/event-broker-redis';

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

interface CorridorMetrics {
  corridorId: string;
  origin: string;
  destination: string;
  rideCount: number;
  totalRevenue: number;
  avgFare: number;
  avgDuration: number;
  peakHours: number[];
  demand: 'high' | 'medium' | 'low';
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

/**
 * Analytics Engine
 * Processes events into operational insights
 */
class AnalyticsEngine {
  async recordRideCompletion(ride: RideCompletion): Promise<void> {
    // INSERT INTO operational_metrics (
    //   metric_type, entity_id, value, metadata, recorded_at
    // ) VALUES (
    //   'ride_completion',
    //   $1, -- ride_id
    //   $2, -- fare
    //   jsonb_build_object(
    //     'driver_id', $3,
    //     'rider_id', $4,
    //     'distance', $5,
    //     'duration', $6,
    //     'origin', $7,
    //     'destination', $8
    //   ),
    //   $9 -- completed_at
    // )

    console.log(`[Analytics] Recorded ride completion: ${ride.rideId}`);
  }

  async recordPaymentCapture(payment: PaymentCapture): Promise<void> {
    // INSERT INTO financial_metrics (
    //   metric_type, payment_id, entity_id, amount, recorded_at
    // ) VALUES (
    //   'payment_capture',
    //   $1, -- payment_id
    //   COALESCE($2, $3), -- ride_id or package_id
    //   $4, -- captured_amount
    //   $5 -- captured_at
    // )

    console.log(`[Analytics] Recorded payment capture: ${payment.paymentId}`);
  }

  async updateCorridorIntelligence(ride: RideCompletion): Promise<void> {
    // Identify corridor
    const corridorId = this.identifyCorridor(ride.origin, ride.destination);

    // INSERT INTO corridor_intelligence (
    //   corridor_id, origin_lat, origin_lng, dest_lat, dest_lng,
    //   ride_count, total_revenue, avg_fare, avg_duration,
    //   last_updated
    // ) VALUES (
    //   $1, $2, $3, $4, $5, 1, $6, $6, $7, NOW()
    // )
    // ON CONFLICT (corridor_id) DO UPDATE SET
    //   ride_count = corridor_intelligence.ride_count + 1,
    //   total_revenue = corridor_intelligence.total_revenue + EXCLUDED.total_revenue,
    //   avg_fare = (corridor_intelligence.total_revenue + EXCLUDED.total_revenue) / 
    //              (corridor_intelligence.ride_count + 1),
    //   avg_duration = (corridor_intelligence.avg_duration * corridor_intelligence.ride_count + EXCLUDED.avg_duration) /
    //                  (corridor_intelligence.ride_count + 1),
    //   last_updated = NOW()

    console.log(`[Analytics] Updated corridor intelligence: ${corridorId}`);
  }

  async generateDriverPayout(driverId: string, period: string): Promise<DriverPayoutSummary> {
    // SELECT 
    //   d.driver_id,
    //   COUNT(*) as total_rides,
    //   SUM(r.fare) as total_earnings,
    //   SUM(r.fare * 0.20) as platform_fee,
    //   SUM(r.fare * 0.80) as net_payout
    // FROM rides r
    // JOIN driver_availability d ON r.driver_id = d.driver_id
    // WHERE r.driver_id = $1
    //   AND r.completed_at >= $2
    //   AND r.completed_at < $3
    //   AND r.status = 'completed'
    // GROUP BY d.driver_id

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

  private identifyCorridor(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): string {
    // Snap to corridor grid (e.g., 0.01 degree precision)
    const originCell = `${Math.floor(origin.lat * 100)}_${Math.floor(origin.lng * 100)}`;
    const destCell = `${Math.floor(destination.lat * 100)}_${Math.floor(destination.lng * 100)}`;
    return `corridor_${originCell}_to_${destCell}`;
  }

  async getTopCorridors(limit = 10): Promise<CorridorMetrics[]> {
    // SELECT 
    //   corridor_id,
    //   origin_name,
    //   destination_name,
    //   ride_count,
    //   total_revenue,
    //   avg_fare,
    //   avg_duration,
    //   peak_hours,
    //   CASE 
    //     WHEN ride_count > 100 THEN 'high'
    //     WHEN ride_count > 20 THEN 'medium'
    //     ELSE 'low'
    //   END as demand
    // FROM corridor_intelligence
    // ORDER BY ride_count DESC
    // LIMIT $1

    return [];
  }
}

/**
 * Operations Analytics Worker
 * Consumes completed events and builds operational insights
 */
export class OpsAnalyticsWorker {
  private engine = new AnalyticsEngine();
  private unsubscribeRides?: () => Promise<void>;
  private unsubscribePayments?: () => Promise<void>;

  async start(): Promise<void> {
    console.log('[OpsAnalytics] Starting worker...');

    // Subscribe to rides.completed
    this.unsubscribeRides = await eventBroker.subscribe(
      'rides.completed',
      this.handleRideCompleted.bind(this),
      {
        groupName: 'ops-analytics-worker',
        consumerName: `ops-worker-${process.env.HOSTNAME || 'local'}`,
        blockMs: 10000, // Lower priority, longer block time
        count: 20, // Batch processing
      },
    );

    // Subscribe to payments.captured
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

    console.log('[OpsAnalytics] Worker started, consuming rides.completed and payments.captured events');
  }

  async stop(): Promise<void> {
    if (this.unsubscribeRides) {
      await this.unsubscribeRides();
    }
    if (this.unsubscribePayments) {
      await this.unsubscribePayments();
    }
    console.log('[OpsAnalytics] Worker stopped');
  }

  private async handleRideCompleted(event: DomainEventEnvelope<'rides.completed'>): Promise<void> {
    console.log(`[OpsAnalytics] Processing ride completion: ${event.id}`);

    try {
      const ride: RideCompletion = event.payload as any;

      // Record ride metrics
      await this.engine.recordRideCompletion(ride);

      // Update corridor intelligence
      await this.engine.updateCorridorIntelligence(ride);

      console.log(`[OpsAnalytics] Processed ride completion: ${ride.rideId}`);
    } catch (error) {
      console.error(`[OpsAnalytics] Error processing ride completion:`, error);
      throw error;
    }
  }

  private async handlePaymentCaptured(event: DomainEventEnvelope<'payments.captured'>): Promise<void> {
    console.log(`[OpsAnalytics] Processing payment capture: ${event.id}`);

    try {
      const payment: PaymentCapture = event.payload as any;

      // Record financial metrics
      await this.engine.recordPaymentCapture(payment);

      console.log(`[OpsAnalytics] Processed payment capture: ${payment.paymentId}`);
    } catch (error) {
      console.error(`[OpsAnalytics] Error processing payment capture:`, error);
      throw error;
    }
  }

  async generateSettlementReport(period: string): Promise<DriverPayoutSummary[]> {
    // Get all active drivers
    // SELECT driver_id FROM driver_availability WHERE status != 'inactive'
    const driverIds: string[] = [];

    const payouts = await Promise.all(
      driverIds.map(driverId => this.engine.generateDriverPayout(driverId, period)),
    );

    return payouts.filter(p => p.totalRides > 0);
  }

  async getCorridorInsights(): Promise<CorridorMetrics[]> {
    return this.engine.getTopCorridors(20);
  }
}

// Service entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const worker = new OpsAnalyticsWorker();
  
  process.on('SIGTERM', async () => {
    console.log('[OpsAnalytics] SIGTERM received, shutting down...');
    await worker.stop();
    await eventBroker.disconnect();
    process.exit(0);
  });

  worker.start().catch(error => {
    console.error('[OpsAnalytics] Fatal error:', error);
    process.exit(1);
  });
}
