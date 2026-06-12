import postgres from 'postgres';
import { fileURLToPath } from 'node:url';
import type { DomainEventEnvelope, DomainEventPayloadMap } from '../../../src/domain/events';
import { eventBroker } from '../../../src/platform/event-broker-redis-production';
import { startRuntimeHealthServer, type RuntimeHealthServer } from '../runtime/http-health';
import { getActiveSpan } from '../shared/opentelemetry';
import { getLogger } from '../shared/structured-logger';
import { SpanStatusCode } from '@opentelemetry/api';

const sql = postgres(process.env.DATABASE_URL || '', {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

const logger = getLogger('ops-analytics');

type RidesCompletedPayload = DomainEventPayloadMap['rides.completed'];
type PaymentsCapturedPayload = DomainEventPayloadMap['payments.captured'];

class AnalyticsEngine {
  async recordRideCompletion(ride: RidesCompletedPayload): Promise<void> {
    const span = getActiveSpan();
    span?.setAttribute('ride.id', ride.rideId);

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

      logger.info({ rideId: ride.rideId }, 'Recorded ride completion');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ error: message, rideId: ride.rideId }, 'Record ride error');
      if (span) {
        span.setStatus({ code: SpanStatusCode.ERROR, message });
        if (error instanceof Error) span.recordException(error);
      }
      throw error;
    }
  }

  async recordPaymentCapture(payment: PaymentsCapturedPayload): Promise<void> {
    const span = getActiveSpan();
    span?.setAttribute('payment.id', payment.paymentId);

    try {
      await sql`
        INSERT INTO financial_metrics (
          metric_type, payment_id, entity_id, amount, recorded_at
        ) VALUES (
          'payment_capture',
          ${payment.paymentId},
          ${payment.rideId ?? payment.packageId ?? payment.paymentId},
          ${payment.capturedAmount},
          ${payment.capturedAt}
        )
      `;

      logger.info({ paymentId: payment.paymentId }, 'Recorded payment capture');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ error: message, paymentId: payment.paymentId }, 'Record payment error');
      throw error;
    }
  }

  async updateCorridorIntelligence(ride: RidesCompletedPayload): Promise<void> {
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

      logger.info({ corridorId, rideId: ride.rideId }, 'Updated corridor intelligence');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ error: message, rideId: ride.rideId }, 'Corridor update error');
      throw error;
    }
  }

  async generateDriverPayout(driverId: string, period: string) {
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

      if (result.length === 0 || (result[0].total_rides as number ?? 0) === 0) {
        return {
          driverId,
          period,
          totalRides: 0,
          totalEarnings: 0,
          platformFee: 0,
          netPayout: 0,
          status: 'pending',
        } as const;
      }

      return {
        driverId,
        period,
        totalRides: Number(result[0].total_rides),
        totalEarnings: Number(result[0].total_earnings),
        platformFee: Number(result[0].platform_fee),
        netPayout: Number(result[0].net_payout),
        status: 'pending',
      } as const;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ error: message, driverId, period }, 'Payout generation error');
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
  private healthServer?: RuntimeHealthServer;
  private ready = false;

  async start(): Promise<void> {
    logger.info('Starting ops-analytics worker...');

    this.healthServer = startRuntimeHealthServer({
      serviceName: 'ops-analytics-worker',
      isReady: () => this.ready,
      isHealthy: () => this.healthCheck(),
    });

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

    this.ready = true;
    logger.info('Ops-analytics worker started');
  }

  async stop(): Promise<void> {
    this.ready = false;
    if (this.unsubscribeRides) {
      await this.unsubscribeRides();
    }
    if (this.unsubscribePayments) {
      await this.unsubscribePayments();
    }
    if (this.healthServer) {
      await this.healthServer.close();
    }
    await sql.end();
    logger.info('Ops-analytics worker stopped');
  }

  private async handleRideCompleted(event: DomainEventEnvelope<'rides.completed'>): Promise<void> {
    const span = getActiveSpan();
    span?.setAttribute('event.id', event.id);

    const ride: RidesCompletedPayload = event.payload;

    try {
      await this.engine.recordRideCompletion(ride);
      await this.engine.updateCorridorIntelligence(ride);

      logger.info({ rideId: ride.rideId }, 'Processed ride');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ error: message, rideId: ride.rideId }, 'Ride processing error');
      throw error;
    }
  }

  private async handlePaymentCaptured(event: DomainEventEnvelope<'payments.captured'>): Promise<void> {
    const span = getActiveSpan();
    span?.setAttribute('event.id', event.id);

    const payment: PaymentsCapturedPayload = event.payload;

    try {
      await this.engine.recordPaymentCapture(payment);

      logger.info({ paymentId: payment.paymentId }, 'Processed payment');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ error: message, paymentId: payment.paymentId }, 'Payment processing error');
      throw error;
    }
  }

  async generateSettlementReport(period: string): Promise<Array<{
    driverId: string;
    period: string;
    totalRides: number;
    totalEarnings: number;
    platformFee: number;
    netPayout: number;
    status: 'pending' | 'processed';
  }>> {
    try {
      const drivers = await sql`
        SELECT DISTINCT driver_id 
        FROM driver_availability 
        WHERE status != 'inactive'
      `;

      const payouts = await Promise.all(
        drivers.map(d => this.engine.generateDriverPayout(d.driver_id as string, period)),
      );

      return payouts.filter(p => p.totalRides > 0);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ error: message }, 'Settlement report error');
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

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const worker = new OpsAnalyticsWorker();

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received');
    await worker.stop();
    await eventBroker.disconnect();
    process.exit(0);
  });

  worker.start().catch(error => {
    logger.error({ error }, 'Fatal error');
    process.exit(1);
  });
}