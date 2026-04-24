import { API_URL, fetchWithRetry, getAuthDetails } from './core';
import {
  createDirectPackage,
  getDirectPackageByTrackingId,
  updateDirectPackageStatus,
} from './directSupabase';
import { trackGrowthEvent } from './growthEngine';
import { triggerPackageConfirmationEmail } from './transactionalEmailTriggers';
import { tripsAPI } from './trips';
import {
  normalizeJordanLocation,
  routeEndpointsAreDistinct,
  routeMatchesLocationPair,
} from '../utils/jordanLocations';
import { allowLocalPersistenceFallback, requireDirectSupabaseFallback } from './runtimePolicy';

export type RecordSyncState = 'local-only' | 'syncing' | 'synced' | 'sync-error';

export interface PostedRide {
  id: string;
  ownerId?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  from: string;
  to: string;
  date: string;
  time: string;
  seats: number;
  price: number;
  gender: string;
  prayer: boolean;
  carModel: string;
  note: string;
  acceptsPackages: boolean;
  packageCapacity: 'small' | 'medium' | 'large';
  packageNote: string;
  createdAt: string;
  status?: 'active' | 'cancelled' | 'completed';
  syncState?: RecordSyncState;
  syncedAt?: string;
}

export type PackageStatus = 'searching' | 'matched' | 'in_transit' | 'delivered';

export interface PackageVerification {
  senderCodeSharedAt?: string;
  riderPickupConfirmedAt?: string;
  receiverDeliveryConfirmedAt?: string;
}

export interface PackageRequest {
  id: string;
  trackingId: string;
  handoffCode: string;
  from: string;
  to: string;
  weight: string;
  note: string;
  packageType: 'delivery' | 'return';
  senderName?: string;
  senderPhone?: string;
  senderEmail?: string;
  recipientName?: string;
  recipientPhone?: string;
  matchedRideId?: string;
  matchedDriver?: string;
  matchedDriverPhone?: string;
  status: PackageStatus;
  createdAt: string;
  verification: PackageVerification;
  timeline: Array<{ label: string; complete: boolean }>;
  syncState?: RecordSyncState;
  syncedAt?: string;
}

const RIDES_KEY = 'wasel-connected-rides';
const PACKAGES_KEY = 'wasel-connected-packages';
const PACKAGE_LIMIT = 50;
const RIDE_LIMIT = 50;

function readList<T>(key: string): T[] {
  if (typeof window === 'undefined') {return [];}
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, list: T[]): void {
  if (typeof window === 'undefined') {return;}
  window.localStorage.setItem(key, JSON.stringify(list));
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function generateHandoffCode(): string {
  return `HC-${Math.floor(100000 + Math.random() * 900000)}`;
}

function pickDriverName(carModel: string): string {
  if (!carModel.trim()) {return 'Wasel Captain';}
  return `${carModel.split(' ')[0]} Captain`;
}

function parseWeight(weight: string): number {
  const matches = weight.match(/\d+(?:\.\d+)?/g);
  if (!matches) {return 0.5;}
  const values = matches.map(Number).filter(value => Number.isFinite(value));
  if (!values.length) {return 0.5;}
  return Math.max(...values);
}

function sanitizeWeight(weight: string): string {
  return weight.trim() || '<1 kg';
}

function sanitizePhone(phone?: string): string | undefined {
  const sanitized = (phone ?? '').replace(/[^\d+]/g, '').trim();
  return sanitized || undefined;
}

function sanitizeEmail(email?: string): string | undefined {
  const sanitized = String(email ?? '')
    .trim()
    .toLowerCase();
  return sanitized || undefined;
}

function sortByCreatedAtDesc<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const left = new Date(a.createdAt).getTime();
    const right = new Date(b.createdAt).getTime();
    return (Number.isFinite(right) ? right : 0) - (Number.isFinite(left) ? left : 0);
  });
}

function isPersistedRideVisible(ride: PostedRide): boolean {
  if (allowLocalPersistenceFallback()) {
    return true;
  }

  return ride.syncState === 'synced' || ride.syncState === 'syncing';
}

function isPersistedPackageVisible(pkg: PackageRequest): boolean {
  if (allowLocalPersistenceFallback()) {
    return true;
  }

  return pkg.syncState === 'synced' || pkg.syncState === 'syncing';
}

function normalizeStatus(value: unknown, matchedRideId?: string): PackageStatus {
  const status = String(value ?? '').toLowerCase();
  if (status === 'delivered') {return 'delivered';}
  if (status === 'in_transit' || status === 'picked_up') {return 'in_transit';}
  if (
    status === 'searching' ||
    status === 'pending' ||
    status === 'requested' ||
    status === 'queued'
  ) {
    return matchedRideId ? 'matched' : 'searching';
  }
  if (status === 'matched' || status === 'assigned' || status === 'accepted') {return 'matched';}
  return matchedRideId ? 'matched' : 'searching';
}

function buildTimeline(
  status: PackageStatus,
  matchedRideId?: string,
  verification: PackageVerification = {},
): Array<{ label: string; complete: boolean }> {
  const matched = Boolean(matchedRideId) || status !== 'searching';
  const senderShared = Boolean(verification.senderCodeSharedAt);
  const inTransit =
    Boolean(verification.riderPickupConfirmedAt) ||
    status === 'in_transit' ||
    status === 'delivered';
  const delivered = Boolean(verification.receiverDeliveryConfirmedAt) || status === 'delivered';

  return [
    { label: 'Request received', complete: true },
    {
      label: matched ? 'Matched to a rider trip' : 'Searching for a rider trip',
      complete: matched,
    },
    { label: 'Sender shared OTP handoff code', complete: senderShared },
    { label: 'Rider pickup confirmed', complete: inTransit },
    { label: 'Receiver delivery confirmed', complete: delivered },
  ];
}

function normalizeServerRide(raw: Record<string, unknown>, fallback: PostedRide): PostedRide {
  return {
    ...fallback,
    id: String(raw.id ?? fallback.id),
    from: String(raw.from_location ?? raw.from ?? fallback.from),
    to: String(raw.to_location ?? raw.to ?? fallback.to),
    date: String(raw.departure_date ?? raw.date ?? fallback.date),
    time: String(raw.departure_time ?? raw.time ?? fallback.time),
    seats: Number(raw.available_seats ?? raw.total_seats ?? raw.seats ?? fallback.seats),
    price: Number(raw.price_per_seat ?? raw.price ?? fallback.price),
    carModel: String(raw.vehicle_model ?? raw.carModel ?? fallback.carModel),
    note: String(raw.notes ?? raw.note ?? fallback.note),
    createdAt: String(raw.created_at ?? fallback.createdAt),
    ownerId:
      String(raw.owner_id ?? raw.ownerId ?? fallback.ownerId ?? '').trim() || fallback.ownerId,
    ownerPhone: sanitizePhone(
      String(
        raw.owner_phone ??
          raw.ownerPhone ??
          raw.phone_number ??
          raw.driver_phone ??
          fallback.ownerPhone ??
          '',
      ),
    ),
    ownerEmail: sanitizeEmail(
      String(raw.owner_email ?? raw.ownerEmail ?? raw.email ?? fallback.ownerEmail ?? ''),
    ),
    status:
      raw.status === 'cancelled' || raw.status === 'completed'
        ? raw.status
        : (fallback.status ?? 'active'),
    syncState: 'synced',
    syncedAt: new Date().toISOString(),
  };
}

function normalizeLocalRide(raw: Partial<PostedRide>): PostedRide | null {
  const id = String(raw.id ?? '').trim();
  const from = String(raw.from ?? '').trim();
  const to = String(raw.to ?? '').trim();
  if (!id || !from || !to) {return null;}

  return {
    id,
    from,
    to,
    date: String(raw.date ?? ''),
    time: String(raw.time ?? ''),
    seats: Number(raw.seats ?? 1) || 1,
    price: Number(raw.price ?? 0) || 0,
    gender: String(raw.gender ?? 'any'),
    prayer: Boolean(raw.prayer),
    carModel: String(raw.carModel ?? ''),
    note: String(raw.note ?? ''),
    acceptsPackages: Boolean(raw.acceptsPackages),
    packageCapacity:
      raw.packageCapacity === 'large' || raw.packageCapacity === 'small'
        ? raw.packageCapacity
        : 'medium',
    packageNote: String(raw.packageNote ?? ''),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    ownerId: String(raw.ownerId ?? '').trim() || undefined,
    ownerPhone: sanitizePhone(String(raw.ownerPhone ?? '')),
    ownerEmail: sanitizeEmail(String(raw.ownerEmail ?? '')),
    status: raw.status === 'cancelled' || raw.status === 'completed' ? raw.status : 'active',
    syncState:
      raw.syncState === 'synced' || raw.syncState === 'syncing' || raw.syncState === 'sync-error'
        ? raw.syncState
        : 'local-only',
    syncedAt: typeof raw.syncedAt === 'string' ? raw.syncedAt : undefined,
  };
}

function normalizeServerPackage(
  raw: Record<string, unknown>,
  fallback: PackageRequest,
): PackageRequest {
  const matchedRideId =
    String(raw.trip_id ?? raw.matchedRideId ?? fallback.matchedRideId ?? '').trim() || undefined;
  const status = normalizeStatus(raw.status, matchedRideId);
  const handoffCode =
    String(raw.handoff_code ?? raw.handoffCode ?? fallback.handoffCode ?? '')
      .trim()
      .toUpperCase() ||
    fallback.handoffCode ||
    generateHandoffCode();

  return {
    ...fallback,
    id: String(raw.id ?? fallback.id),
    trackingId: String(raw.tracking_code ?? raw.trackingId ?? fallback.trackingId)
      .trim()
      .toUpperCase(),
    handoffCode,
    from: String(raw.from ?? fallback.from),
    to: String(raw.to ?? fallback.to),
    weight: sanitizeWeight(String(raw.weight ?? fallback.weight)),
    note: String(raw.description ?? raw.note ?? fallback.note),
    packageType: raw.packageType === 'return' ? 'return' : fallback.packageType,
    senderName:
      String(raw.sender_name ?? raw.senderName ?? fallback.senderName ?? '').trim() || undefined,
    senderPhone: sanitizePhone(
      String(raw.sender_phone ?? raw.senderPhone ?? fallback.senderPhone ?? ''),
    ),
    senderEmail: sanitizeEmail(
      String(raw.sender_email ?? raw.senderEmail ?? fallback.senderEmail ?? ''),
    ),
    recipientName:
      String(raw.recipient_name ?? raw.recipientName ?? fallback.recipientName ?? '').trim() ||
      undefined,
    recipientPhone: sanitizePhone(
      String(raw.recipient_phone ?? raw.recipientPhone ?? fallback.recipientPhone ?? ''),
    ),
    matchedRideId,
    matchedDriver:
      String(raw.driver_name ?? raw.matchedDriver ?? fallback.matchedDriver ?? '').trim() ||
      fallback.matchedDriver,
    matchedDriverPhone: sanitizePhone(
      String(raw.driver_phone ?? raw.matchedDriverPhone ?? fallback.matchedDriverPhone ?? ''),
    ),
    status,
    createdAt: String(raw.created_at ?? fallback.createdAt),
    verification: {
      senderCodeSharedAt:
        String(
          raw.sender_code_shared_at ??
            raw.senderCodeSharedAt ??
            fallback.verification?.senderCodeSharedAt ??
            '',
        ).trim() || undefined,
      riderPickupConfirmedAt:
        String(
          raw.rider_pickup_confirmed_at ??
            raw.riderPickupConfirmedAt ??
            fallback.verification?.riderPickupConfirmedAt ??
            '',
        ).trim() || undefined,
      receiverDeliveryConfirmedAt:
        String(
          raw.receiver_delivery_confirmed_at ??
            raw.receiverDeliveryConfirmedAt ??
            fallback.verification?.receiverDeliveryConfirmedAt ??
            '',
        ).trim() || undefined,
    },
    timeline: buildTimeline(status, matchedRideId, {
      senderCodeSharedAt:
        String(
          raw.sender_code_shared_at ??
            raw.senderCodeSharedAt ??
            fallback.verification?.senderCodeSharedAt ??
            '',
        ).trim() || undefined,
      riderPickupConfirmedAt:
        String(
          raw.rider_pickup_confirmed_at ??
            raw.riderPickupConfirmedAt ??
            fallback.verification?.riderPickupConfirmedAt ??
            '',
        ).trim() || undefined,
      receiverDeliveryConfirmedAt:
        String(
          raw.receiver_delivery_confirmed_at ??
            raw.receiverDeliveryConfirmedAt ??
            fallback.verification?.receiverDeliveryConfirmedAt ??
            '',
        ).trim() || undefined,
    }),
    syncState: 'synced',
    syncedAt: new Date().toISOString(),
  };
}

function normalizeLocalPackage(raw: Partial<PackageRequest>): PackageRequest | null {
  const trackingId = String(raw.trackingId ?? '')
    .trim()
    .toUpperCase();
  const from = String(raw.from ?? '').trim();
  const to = String(raw.to ?? '').trim();
  if (!trackingId || !from || !to) {return null;}

  const matchedRideId = String(raw.matchedRideId ?? '').trim() || undefined;
  const status = normalizeStatus(raw.status, matchedRideId);
  const handoffCode =
    String(raw.handoffCode ?? '')
      .trim()
      .toUpperCase() || generateHandoffCode();

  return {
    id: String(raw.id ?? makeId('pkg')),
    trackingId,
    handoffCode,
    from,
    to,
    weight: sanitizeWeight(String(raw.weight ?? '<1 kg')),
    note: String(raw.note ?? '').trim(),
    packageType: raw.packageType === 'return' ? 'return' : 'delivery',
    senderName: String(raw.senderName ?? '').trim() || undefined,
    senderPhone: sanitizePhone(String(raw.senderPhone ?? '')),
    senderEmail: sanitizeEmail(String(raw.senderEmail ?? '')),
    recipientName: String(raw.recipientName ?? '').trim() || undefined,
    recipientPhone: sanitizePhone(String(raw.recipientPhone ?? '')),
    matchedRideId,
    matchedDriver: String(raw.matchedDriver ?? '').trim() || undefined,
    matchedDriverPhone: sanitizePhone(String(raw.matchedDriverPhone ?? '')),
    status,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    verification: {
      senderCodeSharedAt: String(raw.verification?.senderCodeSharedAt ?? '').trim() || undefined,
      riderPickupConfirmedAt:
        String(raw.verification?.riderPickupConfirmedAt ?? '').trim() || undefined,
      receiverDeliveryConfirmedAt:
        String(raw.verification?.receiverDeliveryConfirmedAt ?? '').trim() || undefined,
    },
    timeline:
      Array.isArray(raw.timeline) && raw.timeline.length > 0
        ? raw.timeline.map(step => ({
            label: String(step.label ?? ''),
            complete: Boolean(step.complete),
          }))
        : buildTimeline(status, matchedRideId, {
            senderCodeSharedAt:
              String(raw.verification?.senderCodeSharedAt ?? '').trim() || undefined,
            riderPickupConfirmedAt:
              String(raw.verification?.riderPickupConfirmedAt ?? '').trim() || undefined,
            receiverDeliveryConfirmedAt:
              String(raw.verification?.receiverDeliveryConfirmedAt ?? '').trim() || undefined,
          }),
    syncState:
      raw.syncState === 'synced' || raw.syncState === 'syncing' || raw.syncState === 'sync-error'
        ? raw.syncState
        : 'local-only',
    syncedAt: typeof raw.syncedAt === 'string' ? raw.syncedAt : undefined,
  };
}

function mergePackages(...lists: PackageRequest[][]): PackageRequest[] {
  const merged = new Map<string, PackageRequest>();

  for (const list of lists) {
    for (const item of list) {
      const normalized = normalizeLocalPackage(item);
      if (!normalized) {continue;}
      merged.set(normalized.trackingId, normalized);
    }
  }

  return sortByCreatedAtDesc(Array.from(merged.values())).slice(0, PACKAGE_LIMIT);
}

function mergeRides(...lists: PostedRide[][]): PostedRide[] {
  const merged = new Map<string, PostedRide>();

  for (const list of lists) {
    for (const item of list) {
      const normalized = normalizeLocalRide(item);
      if (!normalized) {continue;}
      merged.set(normalized.id, normalized);
    }
  }

  return sortByCreatedAtDesc(Array.from(merged.values())).slice(0, RIDE_LIMIT);
}

function savePackages(...lists: PackageRequest[][]): PackageRequest[] {
  const packages = mergePackages(...lists);
  writeList(PACKAGES_KEY, packages);
  return packages;
}

function saveRides(...lists: PostedRide[][]): PostedRide[] {
  const rides = mergeRides(...lists);
  writeList(RIDES_KEY, rides);
  return rides;
}

function findBestMatchingRide(
  rides: PostedRide[],
  input: { from: string; to: string; weight: string; preferredRideId?: string },
): PostedRide | undefined {
  const requestedWeight = parseWeight(input.weight);
  const capacityRank = { small: 1, medium: 5, large: 10 };
  const preferredRide = input.preferredRideId
    ? rides.find(
        ride =>
          ride.id === input.preferredRideId &&
          ride.acceptsPackages &&
          routeMatchesLocationPair(ride.from, ride.to, input.from, input.to, {
            allowReverse: false,
          }) &&
          capacityRank[ride.packageCapacity] >= requestedWeight,
      )
    : undefined;

  if (preferredRide) {
    return preferredRide;
  }

  return sortByCreatedAtDesc(rides)
    .filter(
      ride =>
        ride.acceptsPackages &&
        routeMatchesLocationPair(ride.from, ride.to, input.from, input.to, { allowReverse: false }),
    )
    .find(ride => capacityRank[ride.packageCapacity] >= requestedWeight);
}

export function getConnectedRides(): PostedRide[] {
  const rides = mergeRides(readList<PostedRide>(RIDES_KEY)).filter(isPersistedRideVisible);
  writeList(RIDES_KEY, rides);
  return rides;
}

export async function createConnectedRide(
  input: Omit<PostedRide, 'id' | 'createdAt'>,
): Promise<PostedRide> {
  const ride: PostedRide = {
    ...input,
    from: normalizeJordanLocation(input.from, input.from || 'Amman'),
    to: normalizeJordanLocation(input.to, input.to || 'Aqaba'),
    id: makeId('ride'),
    createdAt: new Date().toISOString(),
    status: input.status ?? 'active',
    syncState: 'local-only',
  };

  try {
    const server = await tripsAPI.createTrip({
      from: ride.from,
      to: ride.to,
      date: input.date,
      time: input.time,
      seats: input.seats,
      price: input.price,
      gender: input.gender,
      prayer: input.prayer,
      carModel: input.carModel,
      note: input.note,
      acceptsPackages: input.acceptsPackages,
      packageCapacity: input.packageCapacity,
      packageNote: input.packageNote,
    });

    const created = normalizeServerRide(server as unknown as Record<string, unknown>, ride);
    saveRides([created], getConnectedRides());
    void trackGrowthEvent({
      userId: input.ownerId,
      eventName: 'ride_offer_created',
      funnelStage: 'selected',
      serviceType: 'ride',
      from: created.from,
      to: created.to,
      valueJod: created.price,
      metadata: { seats: created.seats, acceptsPackages: created.acceptsPackages },
    });
    return created;
  } catch (error) {
    if (!allowLocalPersistenceFallback()) {
      console.warn('[journeyLogistics] trip creation unavailable, preserving route locally', error);
    }
    saveRides([ride], getConnectedRides());
    void trackGrowthEvent({
      userId: input.ownerId,
      eventName: 'ride_offer_created',
      funnelStage: 'selected',
      serviceType: 'ride',
      from: ride.from,
      to: ride.to,
      valueJod: ride.price,
      metadata: { seats: ride.seats, acceptsPackages: ride.acceptsPackages, source: 'local' },
    });
    return ride;
  }
}

export function updateConnectedRide(
  rideId: string,
  updates: Partial<Pick<PostedRide, 'seats' | 'status' | 'note' | 'date' | 'time'>>,
): PostedRide | null {
  const rides = getConnectedRides();
  const target = rides.find(ride => ride.id === rideId);
  if (!target) {return null;}

  const updated: PostedRide = {
    ...target,
    ...updates,
    seats: typeof updates.seats === 'number' ? Math.max(0, updates.seats) : target.seats,
  };

  saveRides(rides.map(ride => (ride.id === rideId ? updated : ride)));
  return updated;
}

export function getConnectedPackages(): PackageRequest[] {
  const packages = mergePackages(readList<PackageRequest>(PACKAGES_KEY)).filter(
    isPersistedPackageVisible,
  );
  writeList(PACKAGES_KEY, packages);
  return packages;
}

function buildServerPackagePayload(pkg: PackageRequest) {
  return {
    from: pkg.from,
    to: pkg.to,
    weight: parseWeight(pkg.weight),
    description: pkg.note,
    price: 5,
    handoffCode: pkg.handoffCode,
    ...(pkg.recipientName ? { recipientName: pkg.recipientName } : {}),
    ...(pkg.recipientPhone ? { recipientPhone: pkg.recipientPhone } : {}),
    ...(pkg.packageType === 'return' ? { packageType: pkg.packageType } : {}),
  };
}

export async function createConnectedPackage(input: {
  from: string;
  to: string;
  weight: string;
  note: string;
  packageType?: 'delivery' | 'return';
  senderName?: string;
  senderPhone?: string;
  senderEmail?: string;
  recipientName?: string;
  recipientPhone?: string;
  preferredRideId?: string;
}): Promise<PackageRequest> {
  const from = normalizeJordanLocation(input.from, input.from.trim() || 'Amman');
  const to = normalizeJordanLocation(input.to, input.to.trim() || 'Aqaba');

  if (!from || !to) {
    throw new Error('Sender and receiver locations are required.');
  }

  if (!routeEndpointsAreDistinct(from, to)) {
    throw new Error('Sender and receiver locations must be different.');
  }

  const rides = getConnectedRides();
  const matchedRide = findBestMatchingRide(rides, {
    from,
    to,
    weight: input.weight,
    preferredRideId: input.preferredRideId,
  });
  const trackingId = `PKG-${Math.floor(10000 + Math.random() * 90000)}`;
  const status: PackageStatus = matchedRide ? 'matched' : 'searching';

  const pkg: PackageRequest = {
    id: makeId('pkg'),
    trackingId,
    handoffCode: generateHandoffCode(),
    from,
    to,
    weight: sanitizeWeight(input.weight),
    note: input.note.trim(),
    packageType: input.packageType ?? 'delivery',
    senderName: input.senderName?.trim() || undefined,
    senderPhone: sanitizePhone(input.senderPhone),
    senderEmail: sanitizeEmail(input.senderEmail),
    recipientName: input.recipientName?.trim() || undefined,
    recipientPhone: sanitizePhone(input.recipientPhone),
    matchedRideId: matchedRide?.id,
    matchedDriver: matchedRide ? pickDriverName(matchedRide.carModel) : undefined,
    matchedDriverPhone: matchedRide?.ownerPhone,
    status,
    createdAt: new Date().toISOString(),
    verification: {},
    timeline: buildTimeline(status, matchedRide?.id, {}),
    syncState: 'local-only',
  };

  try {
    const { token, userId } = await getAuthDetails();

    if (API_URL) {
      const response = await fetchWithRetry(`${API_URL}/packages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildServerPackagePayload(pkg)),
      });

      if (response.ok) {
        const server = await response.json();
        const created = normalizeServerPackage(server.package as Record<string, unknown>, pkg);
        savePackages([created], getConnectedPackages());
        void trackGrowthEvent({
          userId,
          eventName: 'package_request_created',
          funnelStage: created.matchedRideId ? 'selected' : 'searched',
          serviceType: 'package',
          from: created.from,
          to: created.to,
          valueJod: 5,
          metadata: {
            trackingId: created.trackingId,
            packageType: created.packageType,
          },
        });
        if (input.senderEmail) {
          triggerPackageConfirmationEmail({
            senderEmail: input.senderEmail,
            senderName: input.senderName ?? 'Wasel sender',
            trackingId: created.trackingId,
            handoffCode: created.handoffCode,
            from: created.from,
            to_city: created.to,
            weight: created.weight,
            recipientName: created.recipientName,
            matchedDriver: created.matchedDriver,
            status: created.status === 'matched' ? 'matched' : 'searching',
          });
        }
        return created;
      }
    } else {
      requireDirectSupabaseFallback('Package creation');
      const createdDirect = await createDirectPackage({
        userId,
        trackingNumber: pkg.trackingId,
        from: pkg.from,
        to: pkg.to,
        weightKg: parseWeight(pkg.weight),
        description: pkg.note,
        recipientName: pkg.recipientName,
        recipientPhone: pkg.recipientPhone,
      });

      const created = normalizeServerPackage(createdDirect as Record<string, unknown>, {
        ...pkg,
        from: String(createdDirect.origin_name ?? pkg.from),
        to: String(createdDirect.destination_name ?? pkg.to),
        weight: sanitizeWeight(String(createdDirect.weight_kg ?? pkg.weight)),
      });
      savePackages([created], getConnectedPackages());
      void trackGrowthEvent({
        userId,
        eventName: 'package_request_created',
        funnelStage: created.matchedRideId ? 'selected' : 'searched',
        serviceType: 'package',
        from: created.from,
        to: created.to,
        valueJod: 5,
        metadata: {
          trackingId: created.trackingId,
          packageType: created.packageType,
        },
      });
      if (input.senderEmail) {
        triggerPackageConfirmationEmail({
          senderEmail: input.senderEmail,
          senderName: input.senderName ?? 'Wasel sender',
          trackingId: created.trackingId,
          handoffCode: created.handoffCode,
          from: created.from,
          to_city: created.to,
          weight: created.weight,
          recipientName: created.recipientName,
          matchedDriver: created.matchedDriver,
          status: created.status === 'matched' ? 'matched' : 'searching',
        });
      }
      return created;
    }
  } catch (error) {
    if (!allowLocalPersistenceFallback()) {
      console.warn('[journeyLogistics] package creation unavailable, preserving request locally', error);
    }
  }

  savePackages([pkg], getConnectedPackages());
  void trackGrowthEvent({
    eventName: 'package_request_created',
    funnelStage: pkg.matchedRideId ? 'selected' : 'searched',
    serviceType: 'package',
    from: pkg.from,
    to: pkg.to,
    valueJod: 5,
    metadata: {
      trackingId: pkg.trackingId,
      packageType: pkg.packageType,
      source: 'local',
    },
  });
  if (input.senderEmail) {
        triggerPackageConfirmationEmail({
          senderEmail: input.senderEmail,
          senderName: input.senderName ?? 'Wasel sender',
      trackingId: pkg.trackingId,
      handoffCode: pkg.handoffCode,
      from: pkg.from,
      to_city: pkg.to,
      weight: pkg.weight,
      recipientName: pkg.recipientName,
      matchedDriver: pkg.matchedDriver,
      status: pkg.status === 'matched' ? 'matched' : 'searching',
    });
  }
  return pkg;
}

export async function getPackageByTrackingId(trackingId: string): Promise<PackageRequest | null> {
  const normalizedTrackingId = trackingId.trim().toUpperCase();
  if (!normalizedTrackingId) {return null;}

  const local =
    getConnectedPackages().find(item => item.trackingId === normalizedTrackingId) ?? null;
  if (local) {return local;}

  try {
    let server: Record<string, unknown> | null = null;

    if (API_URL) {
      const response = await fetchWithRetry(
        `${API_URL}/packages/track/${encodeURIComponent(normalizedTrackingId)}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      if (!response.ok) {return null;}
      server = await response.json();
    } else {
      requireDirectSupabaseFallback('Package tracking lookup');
      const direct = await getDirectPackageByTrackingId(normalizedTrackingId);
      if (!direct) {return null;}
      server = {
        ...direct,
        id: direct.id,
        tracking_code: direct.tracking_number,
        from: direct.origin_name ?? direct.origin_location,
        to: direct.destination_name ?? direct.destination_location,
        weight: direct.weight_kg,
        description: direct.description,
        recipient_name: direct.receiver_name,
        recipient_phone: direct.receiver_phone,
      };
    }

    if (!server) {return null;}

    const fallback: PackageRequest = {
      id: String(server.id ?? makeId('pkg')),
    trackingId: normalizedTrackingId,
    handoffCode: generateHandoffCode(),
    from: String(server.from ?? ''),
    to: String(server.to ?? ''),
    weight: sanitizeWeight(String(server.weight ?? '<1 kg')),
    note: String(server.description ?? ''),
    packageType: 'delivery',
    senderName: String(server.sender_name ?? '').trim() || undefined,
    senderPhone: sanitizePhone(String(server.sender_phone ?? '')),
    senderEmail: sanitizeEmail(String(server.sender_email ?? '')),
    recipientName: String(server.recipient_name ?? '').trim() || undefined,
    recipientPhone: sanitizePhone(String(server.recipient_phone ?? '')),
    matchedRideId: String(server.trip_id ?? '').trim() || undefined,
    matchedDriver: String(server.driver_name ?? '').trim() || undefined,
    matchedDriverPhone: sanitizePhone(String(server.driver_phone ?? '')),
    status: normalizeStatus(server.status, String(server.trip_id ?? '').trim() || undefined),
      createdAt: String(server.created_at ?? new Date().toISOString()),
      verification: {},
      timeline: buildTimeline(
        normalizeStatus(server.status, String(server.trip_id ?? '').trim() || undefined),
        String(server.trip_id ?? '').trim() || undefined,
        {},
      ),
    };
    const normalizedPkg = normalizeServerPackage(server as Record<string, unknown>, fallback);
    savePackages([normalizedPkg], getConnectedPackages());
    return normalizedPkg;
  } catch {
    return null;
  }
}

export function getConnectedStats() {
  const rides = getConnectedRides();
  const packages = getConnectedPackages();
  const packageEnabledRides = rides.filter(ride => ride.acceptsPackages).length;

  return {
    ridesPosted: rides.length,
    packagesCreated: packages.length,
    packageEnabledRides,
    matchedPackages: packages.filter(pkg => !!pkg.matchedRideId).length,
  };
}

export type PackageVerificationAction = 'share_code' | 'confirm_pickup' | 'confirm_delivery';

export function updatePackageVerification(
  trackingId: string,
  action: PackageVerificationAction,
): PackageRequest | null {
  const normalizedTrackingId = trackingId.trim().toUpperCase();
  if (!normalizedTrackingId) {return null;}

  const packages = getConnectedPackages();
  const target = packages.find(item => item.trackingId === normalizedTrackingId);
  if (!target) {return null;}

  const now = new Date().toISOString();
  const verification: PackageVerification = { ...target.verification };
  let status = target.status;

  if (action === 'share_code') {
    verification.senderCodeSharedAt = verification.senderCodeSharedAt ?? now;
    if (status === 'searching' && target.matchedRideId) {status = 'matched';}
  }

  if (action === 'confirm_pickup') {
    verification.senderCodeSharedAt = verification.senderCodeSharedAt ?? now;
    verification.riderPickupConfirmedAt = verification.riderPickupConfirmedAt ?? now;
    status = 'in_transit';
  }

  if (action === 'confirm_delivery') {
    verification.senderCodeSharedAt = verification.senderCodeSharedAt ?? now;
    verification.riderPickupConfirmedAt = verification.riderPickupConfirmedAt ?? now;
    verification.receiverDeliveryConfirmedAt = verification.receiverDeliveryConfirmedAt ?? now;
    status = 'delivered';
  }

  const updated: PackageRequest = {
    ...target,
    status,
    verification,
    timeline: buildTimeline(status, target.matchedRideId, verification),
    syncState: target.syncState === 'local-only' ? 'local-only' : 'syncing',
  };

  savePackages(packages.map(item => (item.trackingId === normalizedTrackingId ? updated : item)));

  void updateDirectPackageStatus(normalizedTrackingId, status === 'searching' ? 'matched' : status)
    .then(() => {
      savePackages(
        getConnectedPackages().map(item =>
          item.trackingId === normalizedTrackingId
            ? {
                ...item,
                syncState: 'synced' as const,
                syncedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
    })
    .catch(() => {
      savePackages(
        getConnectedPackages().map(item =>
          item.trackingId === normalizedTrackingId
            ? {
                ...item,
                syncState:
                  item.syncState === 'local-only'
                    ? ('local-only' as const)
                    : ('sync-error' as const),
              }
            : item,
        ),
      );
    });

  void trackGrowthEvent({
    eventName: 'package_verification_updated',
    funnelStage:
      status === 'delivered' ? 'completed' : status === 'in_transit' ? 'booked' : 'selected',
    serviceType: 'package',
    from: updated.from,
    to: updated.to,
    metadata: {
      trackingId: updated.trackingId,
      action,
      status,
    },
  });

  return updated;
}
