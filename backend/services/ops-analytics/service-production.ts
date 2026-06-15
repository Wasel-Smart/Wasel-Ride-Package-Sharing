/**
 * Operations Analytics Worker - Production Implementation
 * Event consumption, structured logging, env-driven config, input validation
 */
import postgres from 'postgres';
import { loadConfig } from '../shared/src/config/app.config.js';
import { logger } from '../shared/src/logging/logger.js';
import { ValidationError, DatabaseError } from '../shared/src/errors/app-errors.js';
import type { RideCompletionInput, PaymentCaptureInput, CoordinateInput } from '../shared/src/validation/schemas.js';
import { eventBroker } from '../../../src/platform/event-broker-redis-production.js';
import { startRuntimeHealthServer } from '../runtime/http-health.js';

const config = loadConfig();

class PostgresPool {
  private static instance: ReturnType<typeof postgres> | null = null;

  static get connection() {
    if (!PostgresPool.instance) {
      PostgresPool.instance = postgres(config.database.url, {
        max: config.database.maxConnections,
        idle_timeout: config.database.idleTimeoutSeconds * 1000,
        connect_timeout: config.database.connectionTimeoutSeconds * 1000,
      });
    }
    return PostgresPool.instance;
  }

  static async disconnect() {
    if (PostgresPool.instance) {
      await PostgresPool.instance.end();
      PostgresPool.instance = null;
    }
  }
}

class AnalyticsEngine {
  validateCoordinate(coord: CoordinateInput): void {
    if (!Number.isFinite(coord.lat) || coord.lat < -90 || coord.lat > 90) {
      throw new ValidationError(`Invalid latitude: ${coord.lat}`);
    }
    if (!Number.isFinite(coord.lng) || coord.lng < -180 || coord.lng > 180) {
      throw new ValidationError(`Invalid longitude: ${coord.lng}`);
    }
  }

  async recordRideCompletion(ride: RideCompletionInput) {
    try {
      this.validateCoordinate(ride.origin);
      this.validateCoordinate(ride.destination);
      const sql = PostgresPool.connection;
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
      logger.info({ rideId: ride.rideId }, 'Ride completion recorded');
    } catch (error) {
      logger.error({ err: error, rideId: ride.rideId }, 'Ride completion error');
      throw new DatabaseError('Failed to record ride completion', error instanceof Error ? error : undefined);
    }
  }

  async recordPaymentCapture(payment: PaymentCaptureInput) {
    try {
      const sql = PostgresPool.connection;
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
      logger.info({ paymentId: payment.paymentId }, 'Payment capture recorded');
    } catch (error) {
      logger.error({ err: error, paymentId: payment.paymentId }, 'Payment capture error');
      throw new DatabaseError('Failed to record payment capture', error instanceof Error ? error : undefined);
    }
  }

  async updateCorridorIntelligence(ride: RideCompletionInput) {
    try {
      this.validateCoordinate(ride.origin);
      this.validateCoordinate(ride.destination);
      const corridorId = this.identifyCorridor(ride.origin, ride.destination);
      const sql = PostgresPool.connection;
      await sql`
        INSERT INTO corridor_intelligence (
          corridor_id, origin_lat, origin_lng, dest_lat, dest_lng,
          ride_count, total_revenue, avg_fare, avg_duration, last_updated
        ) VALUES (
          ${corridorId}, ${ride.origin.lat}, ${ride.origin.lng},
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
      logger.info({ corridorId }, 'Corridor intelligence updated');
    } catch (error) {
      logger.error({ err: error, rideId: ride.rideId }, 'Corridor update error');
      throw new DatabaseError('Failed to update corridor intelligence', error instanceof Error ? error : undefined);
    }
  }

  async generateDriverPayout(driverId: string, period: string) {
    try {
      const [startDate, endDate] = this.parsePeriod(period);
      const sql = PostgresPool.connection;
      const result = await sql<{
        total_rides: string;
        total_earnings: string;
        platform_fee: string;
        net_payout: string;
        driver_id: string;
      }>`
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

      if (result.length === 0 || Number(result[0].total_rides) === 0) {
        return { driverId, period, totalRides: 0, totalEarnings: 0, platformFee: 0, netPayout: 0, status: 'pending' };
      }
      return {
        driverId: result[0].driver_id,
        period,
        totalRides: Number(result[0].total_rides),
        totalEarnings: Number(result[0].total_earnings),
        platformFee: Number(result[0].platform_fee),
        netPayout: Number(result[0].net_payout),
        status: 'pending',
      };
    } catch (error) {
      logger.error({ err: error, driverId, period }, 'Payout generation error');
      throw new DatabaseError('Payout generation failed', error instanceof Error ? error : undefined);
    }
  }

  private identifyCorridor(origin: CoordinateInput, destination: CoordinateInput) {
    return `corridor_${Math.floor(origin.lat * 100)}_${Math.floor(origin.lng * 100)}_to_${Math.floor(destination.lat * 100)}_${Math.floor(destination.lng * 100)}`;
  }

  private parsePeriod(period: string) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    if (period.startsWith('week-')) {
      const weekNum = parseInt(period.split('-')[1], 10);
      const startDate = new Date(year, 0, 1 + (weekNum - 1) * 7);
      const endDate = new Date(year, 0, 1 + weekNum * 7);
      return [startDate.toISOString(), endDate.toISOString()];
    }
    if (period.startsWith('month-')) {
      const monthNum = parseInt(period.split('-')[1], 10) - 1;
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
  private readonly engine: AnalyticsEngine;
  private unsubscribeRides: (() => Promise<void>) | null = null;
  private unsubscribePayments: (() => Promise<void>) | null = null;
  private healthServer: { close: () => Promise<void> } | null = null;
  private ready = false;

  async start() {
    logger.info('OpsAnalyticsWorker starting');
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
        consumerName: `ops-worker-${process.env.HOSTNAME ?? 'local'}`,
        blockMs: 10000,
        count: 20,
      },
    );
    this.unsubscribePayments = await eventBroker.subscribe(
      'payments.captured',
      this.handlePaymentCaptured.bind(this),
      {
        groupName: 'ops-analytics-worker',
        consumerName: `ops-worker-${process.env.HOSTNAME ?? 'local'}`,
        blockMs: 10000,
        count: 20,
      },
    );
    this.ready = true;
    logger.info('OpsAnalyticsWorker started');
  }

  async stop() {
    this.ready = false;
    if (this.unsubscribeRides) await this.unsubscribeRides();
    if (this.unsubscribePayments) await this.unsubscribePayments();
    if (this.healthServer) await this.healthServer.close();
    await PostgresPool.disconnect();
    logger.info('OpsAnalyticsWorker stopped');
  }

  async handleRideCompleted(event: { id: string; payload: RideCompletionInput }) {
    logger.info({ eventId: event.id, rideId: event.payload.rideId }, 'Processing ride completion');
    try {
      const ride = event.payload;
      await this.engine.recordRideCompletion(ride);
      await this.engine.updateCorridorIntelligence(ride);
      logger.info({ eventId: event.id, rideId: ride.rideId }, 'Ride processed');
    } catch (error) {
      logger.error({ err: error, eventId: event.id }, 'Ride processing error');
      throw error;
    }
  }

  async handlePaymentCaptured(event: { id: string; payload: PaymentCaptureInput }) {
    logger.info({ eventId: event.id, paymentId: event.payload.paymentId }, 'Processing payment capture');
    try {
      const payment = event.payload;
      await this.engine.recordPaymentCapture(payment);
      logger.info({ eventId: event.id, paymentId: payment.paymentId }, 'Payment processed');
    } catch (error) {
      logger.error({ err: error, eventId: event.id }, 'Payment processing error');
      throw error;
    }
  }

  async generateSettlementReport(period: string) {
    try {
      const sql = PostgresPool.connection;
      const drivers = await sql`
        SELECT DISTINCT driver_id FROM driver_availability WHERE status != 'inactive'
      `;
      const payouts = await Promise.all(
        drivers.map(d => this.engine.generateDriverPayout(d.driver_id, period)),
      );
      return payouts.filter(p => typeof p === 'object' && p !== null && p.totalRides > 0);
    } catch (error) {
      logger.error({ err: error, period }, 'Settlement report error');
      return [];
    }
  }

  async healthCheck() {
    try {
      await PostgresPool.connection.sql<[{ now: string }]>`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

if (process.argv[1].includes('service-production.ts') && process.argv[1].includes('ops-analytics')) {
  const worker = new OpsAnalyticsWorker();
  process.on('SIGTERM', async () => {
    logger.info({ service: 'ops-analytics' }, 'SIGTERM received');
    await worker.stop();
    await eventBroker.disconnect();
    process.exit(0);
  });
  worker.start().catch(error => {
    logger.error({ err: error }, 'Fatal startup error');
    process.exit(1);
  });
}
