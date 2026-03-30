import { API_URL, fetchWithRetry, getAuthDetails } from './core';
import { createDirectPackage, getDirectPackageByTrackingId } from './directSupabase';
import { tripsAPI } from './trips';

export interface PostedRide {
  id: string;
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
}

export type PackageStatus = 'searching' | 'matched' | 'in_transit' | 'delivered';

export interface PackageRequest {
  id: string;
  trackingId: string;
  handoffCode: string;
  from: string;
  to: string;
  weight: string;
  note: string;
  packageType: 'delivery' | 'return';
  recipientName?: string;
  recipientPhone?: string;
  matchedRideId?: string;
  matchedDriver?: string;
  status: PackageStatus;
  createdAt: string;
  timeline: Array<{ label: string; complete: boolean }>;
}

const RIDES_KEY = 'wasel-connected-rides';
const PACKAGES_KEY = 'wasel-connected-packages';
const PACKAGE_LIMIT = 50;
const RIDE_LIMIT = 50;

function readList<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, list: T[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(list));
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function generateHandoffCode(): string {
  return `HC-${Math.floor(100000 + Math.random() * 900000)}`;
}

function pickDriverName(carModel: string): string {
  if (!carModel.trim()) return 'Wasel Captain';
  return `${carModel.split(' ')[0]} Captain`;
}

function parseWeight(weight: string): number {
  const matches = weight.match(/\d+(?:\.\d+)?/g);
  if (!matches) return 0.5;
  const values = matches.map(Number).filter((value) => Number.isFinite(value));
  if (!values.length) return 0.5;
  return Math.max(...values);
}

function sanitizeWeight(weight: string): string {
  return weight.trim() || '<1 kg';
}

function sanitizePhone(phone?: string): string | undefined {
  const sanitized = (phone ?? '').replace(/[^\d+]/g, '').trim();
  return sanitized || undefined;
}

function sortByCreatedAtDesc<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const left = new Date(a.createdAt).getTime();
    const right = new Date(b.createdAt).getTime();
    return (Number.isFinite(right) ? right : 0) - (Number.isFinite(left) ? left : 0);
  });
}

function normalizeStatus(value: unknown, matchedRideId?: string): PackageStatus {
  const status = String(value ?? '').toLowerCase();
  if (status === 'delivered') return 'delivered';
  if (status === 'in_transit' || status === 'picked_up') return 'in_transit';
  if (status === 'searching' || status === 'pending' || status === 'requested' || status === 'queued') {
    return matchedRideId ? 'matched' : 'searching';
  }
  if (status === 'matched' || status === 'assigned' || status === 'accepted') return 'matched';
  return matchedRideId ? 'matched' : 'searching';
}

function buildTimeline(status: PackageStatus, matchedRideId?: string): Array<{ label: string; complete: boolean }> {
  const matched = Boolean(matchedRideId) || status !== 'searching';
  const inTransit = status === 'in_transit' || status === 'delivered';
  const delivered = status === 'delivered';

  return [
    { label: 'Request received', complete: true },
    { label: matched ? 'Matched to a rider trip' : 'Searching for a rider trip', complete: matched },
    { label: 'Share handoff code', complete: matched },
    { label: 'Rider en route with parcel', complete: inTransit },
    { label: 'Delivered', complete: delivered },
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
  };
}

function normalizeLocalRide(raw: Partial<PostedRide>): PostedRide | null {
  const id = String(raw.id ?? '').trim();
  const from = String(raw.from ?? '').trim();
  const to = String(raw.to ?? '').trim();
  if (!id || !from || !to) return null;

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
    packageCapacity: (raw.packageCapacity === 'large' || raw.packageCapacity === 'small' ? raw.packageCapacity : 'medium'),
    packageNote: String(raw.packageNote ?? ''),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
  };
}

function normalizeServerPackage(raw: Record<string, unknown>, fallback: PackageRequest): PackageRequest {
  const matchedRideId = String(raw.trip_id ?? raw.matchedRideId ?? fallback.matchedRideId ?? '').trim() || undefined;
  const status = normalizeStatus(raw.status, matchedRideId);
  const handoffCode = String(raw.handoff_code ?? raw.handoffCode ?? fallback.handoffCode ?? '').trim().toUpperCase()
    || fallback.handoffCode
    || generateHandoffCode();

  return {
    ...fallback,
    id: String(raw.id ?? fallback.id),
    trackingId: String(raw.tracking_code ?? raw.trackingId ?? fallback.trackingId).trim().toUpperCase(),
    handoffCode,
    from: String(raw.from ?? fallback.from),
    to: String(raw.to ?? fallback.to),
    weight: sanitizeWeight(String(raw.weight ?? fallback.weight)),
    note: String(raw.description ?? raw.note ?? fallback.note),
    packageType: raw.packageType === 'return' ? 'return' : fallback.packageType,
    recipientName: String(raw.recipient_name ?? raw.recipientName ?? fallback.recipientName ?? '').trim() || undefined,
    recipientPhone: sanitizePhone(String(raw.recipient_phone ?? raw.recipientPhone ?? fallback.recipientPhone ?? '')),
    matchedRideId,
    matchedDriver: String(raw.driver_name ?? raw.matchedDriver ?? fallback.matchedDriver ?? '').trim() || fallback.matchedDriver,
    status,
    createdAt: String(raw.created_at ?? fallback.createdAt),
    timeline: buildTimeline(status, matchedRideId),
  };
}

function normalizeLocalPackage(raw: Partial<PackageRequest>): PackageRequest | null {
  const trackingId = String(raw.trackingId ?? '').trim().toUpperCase();
  const from = String(raw.from ?? '').trim();
  const to = String(raw.to ?? '').trim();
  if (!trackingId || !from || !to) return null;

  const matchedRideId = String(raw.matchedRideId ?? '').trim() || undefined;
  const status = normalizeStatus(raw.status, matchedRideId);
  const handoffCode = String(raw.handoffCode ?? '').trim().toUpperCase() || generateHandoffCode();

  return {
    id: String(raw.id ?? makeId('pkg')),
    trackingId,
    handoffCode,
    from,
    to,
    weight: sanitizeWeight(String(raw.weight ?? '<1 kg')),
    note: String(raw.note ?? '').trim(),
    packageType: raw.packageType === 'return' ? 'return' : 'delivery',
    recipientName: String(raw.recipientName ?? '').trim() || undefined,
    recipientPhone: sanitizePhone(String(raw.recipientPhone ?? '')),
    matchedRideId,
    matchedDriver: String(raw.matchedDriver ?? '').trim() || undefined,
    status,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    timeline: Array.isArray(raw.timeline) && raw.timeline.length > 0
      ? raw.timeline.map((step) => ({
          label: String(step.label ?? ''),
          complete: Boolean(step.complete),
        }))
      : buildTimeline(status, matchedRideId),
  };
}

function mergePackages(...lists: PackageRequest[][]): PackageRequest[] {
  const merged = new Map<string, PackageRequest>();

  for (const list of lists) {
    for (const item of list) {
      const normalized = normalizeLocalPackage(item);
      if (!normalized) continue;
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
      if (!normalized) continue;
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

function findBestMatchingRide(rides: PostedRide[], input: { from: string; to: string; weight: string }): PostedRide | undefined {
  const requestedWeight = parseWeight(input.weight);
  const capacityRank = { small: 1, medium: 5, large: 10 };

  return sortByCreatedAtDesc(rides)
    .filter((ride) => ride.acceptsPackages && ride.from === input.from && ride.to === input.to)
    .find((ride) => capacityRank[ride.packageCapacity] >= requestedWeight);
}

export function getConnectedRides(): PostedRide[] {
  const rides = mergeRides(readList<PostedRide>(RIDES_KEY));
  writeList(RIDES_KEY, rides);
  return rides;
}

export async function createConnectedRide(input: Omit<PostedRide, 'id' | 'createdAt'>): Promise<PostedRide> {
  const ride: PostedRide = {
    ...input,
    id: makeId('ride'),
    createdAt: new Date().toISOString(),
  };

  try {
    const server = await tripsAPI.createTrip({
      from: input.from,
      to: input.to,
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
    return created;
  } catch {
    saveRides([ride], getConnectedRides());
    return ride;
  }
}

export function getConnectedPackages(): PackageRequest[] {
  const packages = mergePackages(readList<PackageRequest>(PACKAGES_KEY));
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
  recipientName?: string;
  recipientPhone?: string;
}): Promise<PackageRequest> {
  const from = input.from.trim();
  const to = input.to.trim();

  if (!from || !to) {
    throw new Error('Sender and receiver cities are required.');
  }

  if (from === to) {
    throw new Error('Sender and receiver cities must be different.');
  }

  const rides = getConnectedRides();
  const matchedRide = findBestMatchingRide(rides, { from, to, weight: input.weight });
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
    recipientName: input.recipientName?.trim() || undefined,
    recipientPhone: sanitizePhone(input.recipientPhone),
    matchedRideId: matchedRide?.id,
    matchedDriver: matchedRide ? pickDriverName(matchedRide.carModel) : undefined,
    status,
    createdAt: new Date().toISOString(),
    timeline: buildTimeline(status, matchedRide?.id),
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
        return created;
      }
    } else {
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
      return created;
    }
  } catch {
    // Fall back to local storage below.
  }

  savePackages([pkg], getConnectedPackages());
  return pkg;
}

export async function getPackageByTrackingId(trackingId: string): Promise<PackageRequest | null> {
  const normalizedTrackingId = trackingId.trim().toUpperCase();
  if (!normalizedTrackingId) return null;

  const local = getConnectedPackages().find((item) => item.trackingId === normalizedTrackingId) ?? null;
  if (local) return local;

  try {
    let server: Record<string, unknown> | null = null;

    if (API_URL) {
      const response = await fetchWithRetry(`${API_URL}/packages/track/${encodeURIComponent(normalizedTrackingId)}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) return null;
      server = await response.json();
    } else {
      const direct = await getDirectPackageByTrackingId(normalizedTrackingId);
      if (!direct) return null;
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

    if (!server) return null;

    const fallback: PackageRequest = {
      id: String(server.id ?? makeId('pkg')),
      trackingId: normalizedTrackingId,
      handoffCode: generateHandoffCode(),
      from: String(server.from ?? ''),
      to: String(server.to ?? ''),
      weight: sanitizeWeight(String(server.weight ?? '<1 kg')),
      note: String(server.description ?? ''),
      packageType: 'delivery',
      recipientName: String(server.recipient_name ?? '').trim() || undefined,
      recipientPhone: sanitizePhone(String(server.recipient_phone ?? '')),
      matchedRideId: String(server.trip_id ?? '').trim() || undefined,
      matchedDriver: String(server.driver_name ?? '').trim() || undefined,
      status: normalizeStatus(server.status, String(server.trip_id ?? '').trim() || undefined),
      createdAt: String(server.created_at ?? new Date().toISOString()),
      timeline: buildTimeline(
        normalizeStatus(server.status, String(server.trip_id ?? '').trim() || undefined),
        String(server.trip_id ?? '').trim() || undefined,
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
  const packageEnabledRides = rides.filter((ride) => ride.acceptsPackages).length;

  return {
    ridesPosted: rides.length,
    packagesCreated: packages.length,
    packageEnabledRides,
    matchedPackages: packages.filter((pkg) => !!pkg.matchedRideId).length,
  };
}
