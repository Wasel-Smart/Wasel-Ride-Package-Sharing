import { useSyncExternalStore } from 'react';
import {
  clamp,
  cloneCorridor,
  getPriceDirection,
  roundTo,
  trimHistory,
  type BookingRequest,
  type BookingType,
  type Corridor,
  type CorridorProjection,
  type MobilityEventEnvelope,
  type MobilityInternalSystemSnapshot,
  type MobilityEventPayloadMap,
  type MobilityEventType,
  type MobilitySystemSnapshot,
} from './model';
import { buildMobilityInternalSnapshot, toPublicMobilitySnapshot } from './snapshot';

type EventListener<TType extends MobilityEventType> = (event: MobilityEventEnvelope<TType>) => void;

type SnapshotListener = () => void;

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function createEvent<TType extends MobilityEventType>(
  type: TType,
  payload: MobilityEventPayloadMap[TType],
  producer: string,
  traceId = createId('trace'),
): MobilityEventEnvelope<TType> {
  return {
    id: createId('evt'),
    type,
    occurred_at: nowIso(),
    trace_id: traceId,
    producer,
    payload,
  } as MobilityEventEnvelope<TType>;
}

export class MobilityEventBus {
  private listeners = new Map<MobilityEventType, Set<(event: MobilityEventEnvelope) => void>>();
  private listenersAll = new Set<(event: MobilityEventEnvelope) => void>();
  private history: MobilityEventEnvelope[] = [];

  publish<TType extends MobilityEventType>(event: MobilityEventEnvelope<TType>): void {
    this.history.unshift(event);
    this.history = this.history.slice(0, 60);

    this.listeners.get(event.type)?.forEach(listener => listener(event));
    this.listenersAll.forEach(listener => listener(event));
  }

  emit<TType extends MobilityEventType>(
    type: TType,
    payload: MobilityEventPayloadMap[TType],
    producer: string,
    traceId?: string,
  ): MobilityEventEnvelope<TType> {
    const event = createEvent(type, payload, producer, traceId);
    this.publish(event);
    return event;
  }

  subscribe<TType extends MobilityEventType>(
    type: TType,
    listener: EventListener<TType>,
  ): () => void {
    const group = this.listeners.get(type) ?? new Set<(event: MobilityEventEnvelope) => void>();
    group.add(listener as (event: MobilityEventEnvelope) => void);
    this.listeners.set(type, group);

    return () => {
      group.delete(listener as (event: MobilityEventEnvelope) => void);
    };
  }

  subscribeAll(listener: (event: MobilityEventEnvelope) => void): () => void {
    this.listenersAll.add(listener);
    return () => {
      this.listenersAll.delete(listener);
    };
  }

  getRecentEvents(): MobilityEventEnvelope[] {
    return [...this.history];
  }
}

export class PricingEngine {
  getSeatAvailability(corridor: Corridor): number {
    return corridor.seats_total - corridor.seats_booked;
  }

  getCargoAvailability(corridor: Corridor): number {
    return corridor.cargo_total_kg - corridor.cargo_booked_kg;
  }

  getUtilization(corridor: Corridor): number {
    const denominator = Math.max(corridor.seats_total + corridor.cargo_total_kg, 1);
    return (corridor.seats_booked + corridor.cargo_booked_kg) / denominator;
  }

  getDemandPressure(corridor: Corridor): number {
    const utilization = this.getUtilization(corridor);
    return corridor.demand_index * (1 + utilization);
  }

  getDynamicPrice(basePrice: number, corridor: Corridor): number {
    const utilization = this.getUtilization(corridor);
    const demandPressure = this.getDemandPressure(corridor);
    return basePrice * (1 + demandPressure * utilization);
  }

  project(corridor: Corridor): CorridorProjection {
    const seatsAvailable = this.getSeatAvailability(corridor);
    const cargoAvailable = this.getCargoAvailability(corridor);
    const utilization = this.getUtilization(corridor);
    const demandPressure = this.getDemandPressure(corridor);
    const dynamicSeatPrice = roundTo(this.getDynamicPrice(corridor.base_price_seat, corridor), 2);
    const dynamicCargoPrice = roundTo(this.getDynamicPrice(corridor.base_price_kg, corridor), 2);
    const previousSeatPrice = corridor.price_history.at(-1) ?? null;
    const previousCargoPrice =
      previousSeatPrice === null
        ? null
        : roundTo(
            (previousSeatPrice / Math.max(corridor.base_price_seat, 0.0001)) *
              corridor.base_price_kg,
            2,
          );

    return {
      corridor: cloneCorridor(corridor),
      seats_available: seatsAvailable,
      cargo_available_kg: cargoAvailable,
      utilization,
      demand_pressure: demandPressure,
      dynamic_seat_price: dynamicSeatPrice,
      dynamic_cargo_price: dynamicCargoPrice,
      seat_price_direction: getPriceDirection(dynamicSeatPrice, previousSeatPrice),
      cargo_price_direction: getPriceDirection(dynamicCargoPrice, previousCargoPrice),
    };
  }
}

export class CorridorService {
  private corridors = new Map<string, Corridor>();

  constructor(
    private readonly bus: MobilityEventBus,
    private readonly pricingEngine: PricingEngine,
    seedCorridors: Corridor[],
  ) {
    seedCorridors.forEach(corridor => {
      this.corridors.set(corridor.id, cloneCorridor(corridor));
    });

    this.bus.subscribe('BookingCreated', this.handleBookingCreated);
  }

  private handleBookingCreated = (event: MobilityEventEnvelope<'BookingCreated'>): void => {
    const corridor = this.corridors.get(event.payload.corridor_id);
    if (!corridor) return;

    if (event.payload.type === 'seat') {
      corridor.seats_booked = Math.min(
        corridor.seats_total,
        corridor.seats_booked + event.payload.quantity,
      );
    } else {
      corridor.cargo_booked_kg = Math.min(
        corridor.cargo_total_kg,
        corridor.cargo_booked_kg + event.payload.quantity,
      );
    }

    corridor.updated_at = event.payload.timestamp;

    this.bus.emit(
      'CapacityUpdated',
      {
        corridor_id: corridor.id,
        type: event.payload.type,
        quantity: event.payload.quantity,
        corridor: cloneCorridor(corridor),
        updated_at: corridor.updated_at,
      },
      'CorridorService',
      event.trace_id,
    );
  };

  getAll(): Corridor[] {
    return Array.from(this.corridors.values()).map(cloneCorridor);
  }

  getById(corridorId: string): Corridor | null {
    const corridor = this.corridors.get(corridorId);
    return corridor ? cloneCorridor(corridor) : null;
  }

  applyDemandSignal(
    corridorId: string,
    nextDemandIndex: number,
    signalWeight: number,
    traceId: string,
  ): void {
    const corridor = this.corridors.get(corridorId);
    if (!corridor) return;

    const previousDemandIndex = corridor.demand_index;
    corridor.demand_index = roundTo(nextDemandIndex, 4);
    corridor.demand_history = trimHistory([
      ...corridor.demand_history,
      roundTo(corridor.demand_index, 4),
    ]);
    corridor.updated_at = nowIso();

    this.bus.emit(
      'DemandUpdated',
      {
        corridor_id: corridor.id,
        previous_demand_index: previousDemandIndex,
        demand_index: corridor.demand_index,
        signal_weight: roundTo(signalWeight, 4),
        corridor: cloneCorridor(corridor),
        updated_at: corridor.updated_at,
      },
      'DemandEngine',
      traceId,
    );
  }

  appendPricePoint(corridorId: string, seatPrice: number): Corridor | null {
    const corridor = this.corridors.get(corridorId);
    if (!corridor) return null;

    corridor.price_history = trimHistory([...corridor.price_history, roundTo(seatPrice, 2)]);
    corridor.updated_at = nowIso();

    return cloneCorridor(corridor);
  }

  buildProjections(): CorridorProjection[] {
    return this.getAll()
      .map(corridor => this.pricingEngine.project(corridor))
      .sort((left, right) => right.demand_pressure - left.demand_pressure);
  }
}

export class DemandEngine {
  constructor(
    private readonly bus: MobilityEventBus,
    private readonly corridorService: CorridorService,
    private readonly pricingEngine: PricingEngine,
  ) {
    this.bus.subscribe('CapacityUpdated', this.handleCapacityUpdated);
  }

  private handleCapacityUpdated = (event: MobilityEventEnvelope<'CapacityUpdated'>): void => {
    const corridor = this.corridorService.getById(event.payload.corridor_id);
    if (!corridor) return;

    const capacityBase =
      event.payload.type === 'seat'
        ? Math.max(corridor.seats_total, 1)
        : Math.max(corridor.cargo_total_kg, 1);
    const quantityShare = event.payload.quantity / capacityBase;
    const utilization = this.pricingEngine.getUtilization(corridor);
    const directionalBias = event.payload.type === 'seat' ? 0.05 : 0.03;
    const nextDemandIndex = clamp(
      corridor.demand_index * 0.74 + quantityShare * 0.16 + utilization * 0.1 + directionalBias,
      0.18,
      1.85,
    );

    this.corridorService.applyDemandSignal(
      corridor.id,
      nextDemandIndex,
      quantityShare + utilization,
      event.trace_id,
    );
  };
}

export class PriceCoordinator {
  constructor(
    private readonly bus: MobilityEventBus,
    private readonly corridorService: CorridorService,
    private readonly pricingEngine: PricingEngine,
  ) {
    this.bus.subscribe('DemandUpdated', this.handleDemandUpdated);
  }

  private handleDemandUpdated = (event: MobilityEventEnvelope<'DemandUpdated'>): void => {
    const updatedCorridor = this.corridorService.appendPricePoint(
      event.payload.corridor_id,
      this.pricingEngine.getDynamicPrice(
        event.payload.corridor.base_price_seat,
        event.payload.corridor,
      ),
    );
    if (!updatedCorridor) return;

    const projection = this.pricingEngine.project(updatedCorridor);

    this.bus.emit(
      'PriceRecalculated',
      {
        corridor_id: updatedCorridor.id,
        dynamic_seat_price: projection.dynamic_seat_price,
        dynamic_cargo_price: projection.dynamic_cargo_price,
        utilization: projection.utilization,
        demand_pressure: projection.demand_pressure,
        updated_at: updatedCorridor.updated_at,
      },
      'PricingEngine',
      event.trace_id,
    );

    this.bus.emit(
      'CorridorUpdated',
      {
        corridor_id: updatedCorridor.id,
        projection,
        updated_at: updatedCorridor.updated_at,
      },
      'PricingEngine',
      event.trace_id,
    );
  };
}

export class BookingService {
  constructor(
    private readonly bus: MobilityEventBus,
    private readonly corridorService: CorridorService,
    private readonly pricingEngine: PricingEngine,
  ) {}

  createBooking(request: BookingRequest): string {
    if (request.quantity <= 0) {
      throw new Error('Booking quantity must be greater than zero.');
    }

    const corridor = this.corridorService.getById(request.corridor_id);
    if (!corridor) {
      throw new Error('Corridor not found.');
    }

    const projection = this.pricingEngine.project(corridor);
    const remaining =
      request.type === 'seat' ? projection.seats_available : projection.cargo_available_kg;

    if (request.quantity > remaining) {
      throw new Error(
        request.type === 'seat'
          ? 'Not enough seats remain on this corridor.'
          : 'Not enough cargo capacity remains on this corridor.',
      );
    }

    const bookingId = createId('booking');
    this.bus.emit(
      'BookingCreated',
      {
        booking_id: bookingId,
        corridor_id: request.corridor_id,
        type: request.type,
        quantity: request.quantity,
        timestamp: request.timestamp,
      },
      'BookingService',
    );

    return bookingId;
  }
}

export class RealtimeGateway {
  private listeners = new Set<SnapshotListener>();
  private snapshot: MobilityInternalSystemSnapshot;

  constructor(
    private readonly bus: MobilityEventBus,
    private readonly corridorService: CorridorService,
  ) {
    this.snapshot = this.buildSnapshot();
    this.bus.subscribe('CorridorUpdated', this.handleCorridorUpdated);
  }

  private handleCorridorUpdated = (): void => {
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach(listener => listener());
  };

  private buildSnapshot(): MobilityInternalSystemSnapshot {
    const corridors = this.corridorService.buildProjections();
    return buildMobilityInternalSnapshot({
      corridors,
      recentEvents: this.bus.getRecentEvents(),
      updatedAt: nowIso(),
    });
  }

  connect(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): MobilitySystemSnapshot {
    return toPublicMobilitySnapshot(this.snapshot);
  }

  getInternalSnapshot(): MobilityInternalSystemSnapshot {
    return {
      ...this.snapshot,
      corridors: this.snapshot.corridors.map(projection => ({
        ...projection,
        corridor: cloneCorridor(projection.corridor),
      })),
      metrics: { ...this.snapshot.metrics },
      recent_events: [...this.snapshot.recent_events],
      narrative: {
        platform_statement: this.snapshot.narrative.platform_statement,
        business_model: [...this.snapshot.narrative.business_model],
      },
    };
  }

  refresh(): void {
    this.snapshot = this.buildSnapshot();
  }
}

export interface MobilityOSRuntimeOptions {
  seedCorridors?: Corridor[];
}

export class MobilityOSRuntime {
  readonly bus: MobilityEventBus;
  readonly pricingEngine: PricingEngine;
  readonly corridorService: CorridorService;
  readonly demandEngine: DemandEngine;
  readonly priceCoordinator: PriceCoordinator;
  readonly bookingService: BookingService;
  readonly realtimeGateway: RealtimeGateway;

  private generator: number | null = null;

  constructor(options: MobilityOSRuntimeOptions = {}) {
    this.bus = new MobilityEventBus();
    this.pricingEngine = new PricingEngine();
    this.corridorService = new CorridorService(
      this.bus,
      this.pricingEngine,
      options.seedCorridors ?? buildSeedCorridors(),
    );
    this.demandEngine = new DemandEngine(this.bus, this.corridorService, this.pricingEngine);
    this.priceCoordinator = new PriceCoordinator(
      this.bus,
      this.corridorService,
      this.pricingEngine,
    );
    this.bookingService = new BookingService(this.bus, this.corridorService, this.pricingEngine);
    this.realtimeGateway = new RealtimeGateway(this.bus, this.corridorService);
    this.realtimeGateway.refresh();
  }

  start(): void {
    if (typeof window === 'undefined' || this.generator) return;

    this.generator = window.setInterval(() => {
      const corridors = this.corridorService
        .buildProjections()
        .filter(corridor => corridor.seats_available > 0 || corridor.cargo_available_kg > 0);
      if (corridors.length === 0) return;

      const target = corridors[Math.floor(Math.random() * corridors.length)];
      if (!target) return;
      const cargoFlow = Math.random() > 0.6;
      const type: BookingType = cargoFlow ? 'cargo' : 'seat';
      const quantity =
        type === 'seat'
          ? Math.min(target.seats_available, Math.random() > 0.75 ? 2 : 1)
          : Math.min(target.cargo_available_kg, Math.random() > 0.7 ? 20 : 10);

      if (quantity <= 0) return;

      try {
        this.createBooking({
          corridor_id: target.corridor.id,
          type,
          quantity,
          timestamp: nowIso(),
        });
      } catch {
        // Background generators should never interrupt the UI thread.
      }
    }, 2600);
  }

  stop(): void {
    if (!this.generator) return;
    clearInterval(this.generator);
    this.generator = null;
  }

  createBooking(request: BookingRequest): string {
    const bookingId = this.bookingService.createBooking(request);
    this.realtimeGateway.refresh();
    return bookingId;
  }

  subscribe(listener: SnapshotListener): () => void {
    return this.realtimeGateway.connect(listener);
  }

  getSnapshot(): MobilitySystemSnapshot {
    return this.realtimeGateway.getSnapshot();
  }

  getInternalSnapshot(): MobilityInternalSystemSnapshot {
    return this.realtimeGateway.getInternalSnapshot();
  }
}

export function buildSeedCorridors(): Corridor[] {
  const updatedAt = nowIso();
  return [
    {
      id: 'amman-irbid',
      origin: 'Amman',
      destination: 'Irbid',
      distance_km: 104,
      travel_time_min: 90,
      seats_total: 44,
      seats_booked: 29,
      cargo_total_kg: 160,
      cargo_booked_kg: 104,
      base_price_seat: 4.8,
      base_price_kg: 0.42,
      demand_index: 0.93,
      demand_history: [0.74, 0.82, 0.88, 0.91, 0.93],
      price_history: [5.12, 5.34, 5.62, 5.89, 6.02],
      updated_at: updatedAt,
    },
    {
      id: 'amman-zarqa',
      origin: 'Amman',
      destination: 'Zarqa',
      distance_km: 22,
      travel_time_min: 30,
      seats_total: 58,
      seats_booked: 21,
      cargo_total_kg: 210,
      cargo_booked_kg: 88,
      base_price_seat: 2.4,
      base_price_kg: 0.28,
      demand_index: 0.52,
      demand_history: [0.38, 0.44, 0.47, 0.5, 0.52],
      price_history: [2.52, 2.54, 2.6, 2.62, 2.66],
      updated_at: updatedAt,
    },
    {
      id: 'amman-aqaba',
      origin: 'Amman',
      destination: 'Aqaba',
      distance_km: 330,
      travel_time_min: 240,
      seats_total: 36,
      seats_booked: 28,
      cargo_total_kg: 240,
      cargo_booked_kg: 150,
      base_price_seat: 9.6,
      base_price_kg: 0.68,
      demand_index: 1.08,
      demand_history: [0.86, 0.94, 1.01, 1.04, 1.08],
      price_history: [10.84, 11.18, 11.54, 11.88, 12.12],
      updated_at: updatedAt,
    },
    {
      id: 'amman-karak',
      origin: 'Amman',
      destination: 'Karak',
      distance_km: 140,
      travel_time_min: 120,
      seats_total: 40,
      seats_booked: 17,
      cargo_total_kg: 170,
      cargo_booked_kg: 61,
      base_price_seat: 5.6,
      base_price_kg: 0.5,
      demand_index: 0.57,
      demand_history: [0.41, 0.46, 0.5, 0.54, 0.57],
      price_history: [5.8, 5.96, 6.04, 6.1, 6.14],
      updated_at: updatedAt,
    },
    {
      id: 'irbid-zarqa',
      origin: 'Irbid',
      destination: 'Zarqa',
      distance_km: 79,
      travel_time_min: 67,
      seats_total: 32,
      seats_booked: 12,
      cargo_total_kg: 120,
      cargo_booked_kg: 40,
      base_price_seat: 3.3,
      base_price_kg: 0.31,
      demand_index: 0.48,
      demand_history: [0.29, 0.33, 0.4, 0.44, 0.48],
      price_history: [3.4, 3.46, 3.5, 3.52, 3.58],
      updated_at: updatedAt,
    },
    {
      id: 'madaba-amman',
      origin: 'Madaba',
      destination: 'Amman',
      distance_km: 33,
      travel_time_min: 34,
      seats_total: 28,
      seats_booked: 9,
      cargo_total_kg: 90,
      cargo_booked_kg: 18,
      base_price_seat: 2.1,
      base_price_kg: 0.24,
      demand_index: 0.4,
      demand_history: [0.24, 0.28, 0.31, 0.36, 0.4],
      price_history: [2.18, 2.22, 2.24, 2.28, 2.3],
      updated_at: updatedAt,
    },
  ];
}

export const mobilityOSRuntime = new MobilityOSRuntime();

export function useMobilityOSProjection(): MobilitySystemSnapshot {
  return useSyncExternalStore(
    listener => mobilityOSRuntime.subscribe(listener),
    () => mobilityOSRuntime.getSnapshot(),
    () => mobilityOSRuntime.getSnapshot(),
  );
}
