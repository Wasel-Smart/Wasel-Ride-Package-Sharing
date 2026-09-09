/**
 * Redis GEO Adapter
 *
 * Wraps the Redis GEO commands used by the matching-worker and package-worker.
 * Falls back gracefully to a no-op when Redis is not configured so the app
 * continues to work with PostGIS-only queries in development.
 *
 * Environment variables:
 *   REDIS_URL  — redis[s]://[:password@]host[:port][/db]
 */

export interface GeoMember {
  id: string;
  lat: number;
  lng: number;
}

export interface GeoNearbyResult {
  id: string;
  distanceMeters: number;
}

export interface GeoAdapter {
  upsert(key: string, member: GeoMember): Promise<void>;
  remove(key: string, memberId: string): Promise<void>;
  nearby(key: string, lat: number, lng: number, radiusMeters: number): Promise<GeoNearbyResult[]>;
}

// ─── No-op fallback ───────────────────────────────────────────────────────────

class NoOpGeoAdapter implements GeoAdapter {
  async upsert(_key: string, _member: GeoMember): Promise<void> {}
  async remove(_key: string, _memberId: string): Promise<void> {}
  async nearby(_key: string, _lat: number, _lng: number, _radiusMeters: number): Promise<GeoNearbyResult[]> {
    return [];
  }
}

// ─── Redis-backed adapter ─────────────────────────────────────────────────────

class RedisGeoAdapter implements GeoAdapter {
  private client: {
    geoadd(key: string, lng: number, lat: number, member: string): Promise<unknown>;
    zrem(key: string, member: string): Promise<unknown>;
    georadius(
      key: string, lng: number, lat: number, radius: number, unit: string,
      ...args: string[]
    ): Promise<Array<[string, string]>>;
  };

  constructor(client: RedisGeoAdapter['client']) {
    this.client = client;
  }

  async upsert(key: string, member: GeoMember): Promise<void> {
    await this.client.geoadd(key, member.lng, member.lat, member.id);
  }

  async remove(key: string, memberId: string): Promise<void> {
    await this.client.zrem(key, memberId);
  }

  async nearby(key: string, lat: number, lng: number, radiusMeters: number): Promise<GeoNearbyResult[]> {
    const rows = await this.client.georadius(
      key, lng, lat, radiusMeters, 'm',
      'WITHCOORD', 'WITHDIST', 'ASC', 'COUNT', '50',
    );
    return rows.map(([id, distStr]) => ({
      id,
      distanceMeters: parseFloat(distStr),
    }));
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

async function createGeoAdapter(): Promise<GeoAdapter> {
  const redisUrl =
    (typeof process !== 'undefined' && process.env.REDIS_URL) || '';

  if (!redisUrl) {
    return new NoOpGeoAdapter();
  }

  try {
    // Dynamic import keeps ioredis out of the browser bundle entirely.
    const { default: Redis } = await import('ioredis');
    const client = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 2 });
    await client.connect();
    return new RedisGeoAdapter(client as unknown as RedisGeoAdapter['client']);
  } catch {
    console.warn('[geo-adapter] Redis unavailable, falling back to no-op');
    return new NoOpGeoAdapter();
  }
}

let _adapter: GeoAdapter | null = null;

export async function getGeoAdapter(): Promise<GeoAdapter> {
  if (!_adapter) {
    _adapter = await createGeoAdapter();
  }
  return _adapter;
}

/** GEO key namespaces used by workers */
export const GEO_KEYS = {
  DRIVERS: 'geo:drivers:available',
  PACKAGES: 'geo:packages:in_transit',
} as const;
