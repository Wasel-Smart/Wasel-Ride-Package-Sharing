/**
 * Wasel Edge Function - Unified API Router
 *
 * This entrypoint exposes the backend surface the web app already targets:
 * auth-backed profile/settings flows, wallet + communications modules,
 * trips/bookings/packages, notifications, active-trip state, and reviews.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCommunicationHandlers } from './communications-handlers.ts';
import { createWalletHandlers } from './wallet-handlers.ts';
import { getClientIp } from './_shared/security-runtime.ts';

const FUNCTION_NAME = 'make-server-0b1f4071';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SupabaseClientInstance = ReturnType<typeof createClient>;

type AuthUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type CanonicalUser = {
  id: string;
  auth_user_id?: string | null;
  email?: string | null;
  full_name?: string | null;
  phone_number?: string | null;
};

type DriverRecord = {
  driver_id: string;
  user_id: string;
  driver_status?: string | null;
  verification_level?: string | null;
  sanad_identity_linked?: boolean | null;
};

type AuthenticatedRequest = {
  admin: SupabaseClientInstance;
  authUser: AuthUser;
  canonicalUser: CanonicalUser;
};

type AuthenticationResult = AuthenticatedRequest | { error: Response };

type DriverSummary = {
  id: string;
  name: string;
  rating: number;
  verified: boolean;
};

type DriverApprovalRow = {
  driverId: string;
  userId: string;
  authUserId: string | null;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  driverStatus: string;
  verificationLevel: string;
  sanadStatus: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  readyForApproval: boolean;
};

type TripRow = {
  trip_id?: string;
  driver_id?: string;
  origin_city?: string | null;
  destination_city?: string | null;
  departure_time?: string | null;
  available_seats?: number | string | null;
  price_per_seat?: number | string | null;
  trip_status?: string | null;
  allow_packages?: boolean | null;
  package_capacity?: number | string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type BookingRow = {
  booking_id?: string;
  trip_id?: string;
  passenger_id?: string;
  seats_requested?: number | string | null;
  seat_number?: number | string | null;
  pickup_location?: string | null;
  dropoff_location?: string | null;
  price_per_seat?: number | string | null;
  total_price?: number | string | null;
  amount?: number | string | null;
  status?: string | null;
  booking_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type NotificationRow = {
  id?: string;
  user_id?: string;
  type?: string;
  title?: string;
  message?: string;
  read?: boolean | null;
  is_read?: boolean | null;
  created_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

type PackageRow = {
  package_id?: string;
  id?: string;
  tracking_number?: string | null;
  package_code?: string | null;
  sender_id?: string | null;
  receiver_name?: string | null;
  receiver_phone?: string | null;
  origin_name?: string | null;
  origin_location?: string | null;
  destination_name?: string | null;
  destination_location?: string | null;
  weight_kg?: number | string | null;
  description?: string | null;
  trip_id?: string | null;
  status?: string | null;
  package_status?: string | null;
  created_at?: string | null;
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeRoutePath(input: string): string {
  const marker = `/${FUNCTION_NAME}`;
  const markerIndex = input.indexOf(marker);
  const stripped = markerIndex >= 0
    ? input.slice(markerIndex + marker.length) || '/'
    : input;
  const normalized = stripped.startsWith('/') ? stripped : `/${stripped}`;
  return normalized.replace(/\/+$/, '') || '/';
}

function getFunctionBaseUrl(request: Request): string {
  const url = new URL(request.url);
  const marker = `/${FUNCTION_NAME}`;
  const markerIndex = url.pathname.indexOf(marker);
  const basePath = markerIndex >= 0
    ? url.pathname.slice(0, markerIndex + marker.length)
    : `/${FUNCTION_NAME}`;
  return `${url.origin}${basePath}`;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isUuid(value: string | null): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function formatDate(value: unknown, fallback = new Date().toISOString().slice(0, 10)): string {
  const text = String(value ?? '').trim();
  if (!text) {
    return fallback;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return text.slice(0, 10) || fallback;
  }

  return parsed.toISOString().slice(0, 10);
}

function formatTime(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text) {
    return '';
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    const match = text.match(/^\d{2}:\d{2}/);
    return match ? match[0] : text;
  }

  return parsed.toISOString().slice(11, 16);
}

function normalizeTripStatus(value: unknown): string {
  switch (String(value ?? '').trim().toLowerCase()) {
    case 'active':
    case 'published':
      return 'open';
    case 'cancelled':
      return 'cancelled';
    case 'completed':
      return 'completed';
    default:
      return String(value ?? 'draft').trim() || 'draft';
  }
}

function normalizeBookingStatus(value: unknown): string {
  switch (String(value ?? '').trim().toLowerCase()) {
    case 'accepted':
      return 'confirmed';
    case 'rejected':
      return 'cancelled';
    case 'pending_payment':
      return 'pending';
    default:
      return String(value ?? 'pending').trim() || 'pending';
  }
}

function normalizeTrackingNumber(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');
}

function normalizePackageStatus(value: unknown): string {
  const status = String(value ?? '').trim().toLowerCase();
  if (status === 'matched' || status === 'in_transit' || status === 'delivered') {
    return status;
  }
  if (status === 'assigned' || status === 'accepted') {
    return 'matched';
  }
  return status || 'requested';
}

function parseQueryNumber(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function routeMatches(value: string, expected: string): boolean {
  return value === expected;
}

function routeStartsWith(value: string, expectedPrefix: string): boolean {
  return value === expectedPrefix || value.startsWith(`${expectedPrefix}/`);
}

function createUserScopedClient(request: Request) {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: request.headers.get('Authorization') ?? '' },
      },
    },
  );
}

function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
  return req.json()
    .then((value) => (isRecord(value) ? value : {}))
    .catch(() => ({}));
}

async function ensureCanonicalUser(
  supabaseClient: SupabaseClientInstance,
  user: AuthUser,
): Promise<CanonicalUser> {
  const { data: existingByAuth, error: existingByAuthError } = await supabaseClient
    .from('users')
    .select('id, auth_user_id, email, full_name, phone_number')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (existingByAuthError) {
    throw new Error(existingByAuthError.message);
  }

  if (existingByAuth) {
    return existingByAuth as CanonicalUser;
  }

  const { data: existingById, error: existingByIdError } = await supabaseClient
    .from('users')
    .select('id, auth_user_id, email, full_name, phone_number')
    .eq('id', user.id)
    .maybeSingle();

  if (existingByIdError) {
    throw new Error(existingByIdError.message);
  }

  if (existingById) {
    return existingById as CanonicalUser;
  }

  const fullName =
    normalizeString(user.user_metadata?.full_name) ||
    normalizeString(user.user_metadata?.name) ||
    normalizeString(user.email)?.split('@')[0] ||
    'Wasel User';

  const { data: inserted, error: insertError } = await supabaseClient
    .from('users')
    .insert({
      auth_user_id: user.id,
      email: normalizeString(user.email),
      full_name: fullName,
      phone_number: normalizeString(user.user_metadata?.phone_number) || normalizeString(user.phone),
      role: normalizeString(user.user_metadata?.role) || 'passenger',
    })
    .select('id, auth_user_id, email, full_name, phone_number')
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return inserted as CanonicalUser;
}

async function authenticateRequest(request: Request): Promise<AuthenticationResult> {
  try {
    const userScopedClient = createUserScopedClient(request);
    const admin = createAdminClient();
    const {
      data: { user },
      error: authError,
    } = await userScopedClient.auth.getUser();

    if (authError || !user) {
      return { error: jsonResponse({ error: 'Unauthorized' }, 401) };
    }

    const canonicalUser = await ensureCanonicalUser(admin, user as AuthUser);
    return { admin, authUser: user as AuthUser, canonicalUser };
  } catch (error) {
    return {
      error: jsonResponse(
        { error: error instanceof Error ? error.message : 'Unexpected authentication error' },
        500,
      ),
    };
  }
}

async function requireAdminAccess(auth: AuthenticatedRequest) {
  const { data, error } = await auth.admin
    .from('users')
    .select('id, role')
    .eq('id', auth.canonicalUser.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || String((data as Record<string, unknown>).role ?? '') !== 'admin') {
    return jsonResponse({ error: 'Admin access is required.' }, 403);
  }

  return null;
}

function verificationRank(level: unknown): number {
  switch (String(level ?? '').trim()) {
    case 'level_3':
      return 3;
    case 'level_2':
      return 2;
    case 'level_1':
      return 1;
    default:
      return 0;
  }
}

function buildDriverApprovalRow(
  driver: Record<string, unknown>,
  user: Record<string, unknown> | undefined,
  verification: Record<string, unknown> | undefined,
): DriverApprovalRow {
  const effectiveVerificationLevel =
    String(
      verification?.verification_level ??
      driver.verification_level ??
      'level_0',
    ).trim() || 'level_0';
  const hasEmail = Boolean(normalizeString(user?.email));
  const hasPhone = Boolean(normalizeString(user?.phone_number));

  return {
    driverId: String(driver.driver_id ?? ''),
    userId: String(driver.user_id ?? ''),
    authUserId: normalizeString(user?.auth_user_id),
    fullName:
      normalizeString(user?.full_name) ||
      normalizeString(user?.email)?.split('@')[0] ||
      'Wasel Driver',
    email: normalizeString(user?.email),
    phoneNumber: normalizeString(user?.phone_number),
    driverStatus: String(driver.driver_status ?? 'pending_approval'),
    verificationLevel: effectiveVerificationLevel,
    sanadStatus: normalizeString(verification?.sanad_status),
    createdAt: normalizeString(driver.created_at),
    updatedAt: normalizeString(driver.updated_at),
    readyForApproval:
      verificationRank(effectiveVerificationLevel) >= 2 &&
      hasEmail &&
      hasPhone,
  };
}

async function getDriverApprovalRows(
  admin: SupabaseClientInstance,
  statuses: string[],
): Promise<DriverApprovalRow[]> {
  const { data: driverRows, error: driverError } = await admin
    .from('drivers')
    .select('driver_id, user_id, driver_status, verification_level, sanad_identity_linked, created_at, updated_at')
    .in('driver_status', statuses)
    .order('updated_at', { ascending: true });

  if (driverError) {
    throw new Error(driverError.message);
  }

  const drivers = Array.isArray(driverRows) ? driverRows as Record<string, unknown>[] : [];
  const userIds = Array.from(new Set(drivers.map((driver) => String(driver.user_id ?? '')).filter(Boolean)));

  const [{ data: userRows, error: userError }, { data: verificationRows, error: verificationError }] = await Promise.all([
    userIds.length > 0
      ? admin
        .from('users')
        .select('id, auth_user_id, email, full_name, phone_number')
        .in('id', userIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length > 0
      ? admin
        .from('verification_records')
        .select('user_id, sanad_status, verification_level, verification_timestamp')
        .in('user_id', userIds)
        .order('verification_timestamp', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (userError) {
    throw new Error(userError.message);
  }
  if (verificationError) {
    throw new Error(verificationError.message);
  }

  const userMap = new Map<string, Record<string, unknown>>(
    (Array.isArray(userRows) ? userRows : []).map((row) => [String((row as Record<string, unknown>).id ?? ''), row as Record<string, unknown>]),
  );
  const verificationMap = new Map<string, Record<string, unknown>>();

  for (const row of Array.isArray(verificationRows) ? verificationRows : []) {
    const record = row as Record<string, unknown>;
    const userId = String(record.user_id ?? '');
    if (userId && !verificationMap.has(userId)) {
      verificationMap.set(userId, record);
    }
  }

  return drivers.map((driver) =>
    buildDriverApprovalRow(
      driver,
      userMap.get(String(driver.user_id ?? '')),
      verificationMap.get(String(driver.user_id ?? '')),
    ),
  );
}

const deliveryEnv = {
  resendApiKey: Deno.env.get('RESEND_API_KEY') ?? undefined,
  resendFromEmail: Deno.env.get('RESEND_FROM_EMAIL') ?? undefined,
  resendReplyToEmail: Deno.env.get('RESEND_REPLY_TO_EMAIL') ?? undefined,
  sendgridApiKey: Deno.env.get('SENDGRID_API_KEY') ?? undefined,
  sendgridFromEmail: Deno.env.get('SENDGRID_FROM_EMAIL') ?? undefined,
  twilioAccountSid: Deno.env.get('TWILIO_ACCOUNT_SID') ?? undefined,
  twilioAuthToken: Deno.env.get('TWILIO_AUTH_TOKEN') ?? undefined,
  twilioMessagingServiceSid: Deno.env.get('TWILIO_MESSAGING_SERVICE_SID') ?? undefined,
  twilioSmsFrom: Deno.env.get('TWILIO_SMS_FROM') ?? undefined,
  twilioWhatsappFrom: Deno.env.get('TWILIO_WHATSAPP_FROM') ?? undefined,
  communicationWebhookToken: Deno.env.get('COMMUNICATION_WEBHOOK_TOKEN') ?? undefined,
  maxDeliveryAttempts: Math.max(1, toNumber(Deno.env.get('COMMUNICATION_MAX_DELIVERY_ATTEMPTS'), 5)),
};

function createModuleRuntime(request: Request) {
  return {
    authenticateRequest: () => authenticateRequest(request),
    executeSqlStatements: async (_sql: string) => {
      return;
    },
    getAdminClient: () => createAdminClient(),
    getFunctionBaseUrl: () => getFunctionBaseUrl(request),
    hasCommunicationWorkerAccess: (candidateRequest: Request) => {
      const expected = Deno.env.get('COMMUNICATION_WORKER_SECRET') ?? '';
      if (!expected) {
        return false;
      }
      const provided = candidateRequest.headers.get('x-communication-worker-secret') ?? '';
      return provided === expected;
    },
    json: (data: unknown, status = 200) => jsonResponse(data, status),
  };
}

async function fetchDriverSummaries(
  admin: SupabaseClientInstance,
  driverIds: string[],
): Promise<Map<string, DriverSummary>> {
  const uniqueDriverIds = Array.from(new Set(driverIds.filter(Boolean)));
  const result = new Map<string, DriverSummary>();

  if (uniqueDriverIds.length === 0) {
    return result;
  }

  const { data: driverRows, error: driverError } = await admin
    .from('drivers')
    .select('driver_id, user_id, driver_status, verification_level, sanad_identity_linked')
    .in('driver_id', uniqueDriverIds);

  if (driverError) {
    throw new Error(driverError.message);
  }

  const drivers = Array.isArray(driverRows) ? (driverRows as DriverRecord[]) : [];
  const userIds = Array.from(new Set(drivers.map((driver) => driver.user_id).filter(Boolean)));

  const [{ data: userRows, error: userError }, { data: verificationRows, error: verificationError }] = await Promise.all([
    userIds.length > 0
      ? admin.from('users').select('id, auth_user_id, email, full_name').in('id', userIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length > 0
      ? admin
        .from('verification_records')
        .select('user_id, sanad_status, verification_level, verification_timestamp')
        .in('user_id', userIds)
        .order('verification_timestamp', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (userError) {
    throw new Error(userError.message);
  }
  if (verificationError) {
    throw new Error(verificationError.message);
  }

  const userMap = new Map<string, Record<string, unknown>>(
    (Array.isArray(userRows) ? userRows : []).map((row) => [String((row as Record<string, unknown>).id), row as Record<string, unknown>]),
  );
  const verificationMap = new Map<string, Record<string, unknown>>();

  for (const row of Array.isArray(verificationRows) ? verificationRows : []) {
    const record = row as Record<string, unknown>;
    const userId = String(record.user_id ?? '');
    if (userId && !verificationMap.has(userId)) {
      verificationMap.set(userId, record);
    }
  }

  for (const driver of drivers) {
    const user = userMap.get(driver.user_id);
    const verification = verificationMap.get(driver.user_id);
    const driverId = String(driver.driver_id);

    result.set(driverId, {
      id: String(user?.auth_user_id ?? user?.id ?? driver.user_id),
      name:
        String(user?.full_name ?? '').trim() ||
        String(user?.email ?? '').split('@')[0] ||
        'Wasel Driver',
      rating: 5,
      verified:
        driver.sanad_identity_linked === true ||
        verification?.sanad_status === 'verified' ||
        driver.verification_level === 'level_3' ||
        verification?.verification_level === 'level_3',
    });
  }

  return result;
}

function mapTripRow(
  row: TripRow,
  driverSummary?: DriverSummary | null,
) {
  const createdAt = String(row.created_at ?? new Date().toISOString());

  return {
    id: String(row.trip_id ?? ''),
    from: String(row.origin_city ?? ''),
    to: String(row.destination_city ?? ''),
    date: formatDate(row.departure_time, createdAt.slice(0, 10)),
    time: formatTime(row.departure_time),
    seats: toNumber(row.available_seats, 0),
    price: toNumber(row.price_per_seat, 0),
    driver: driverSummary ?? {
      id: 'driver',
      name: 'Wasel Driver',
      rating: 5,
      verified: false,
    },
  };
}

function mapBookingRow(row: BookingRow) {
  const amount = toNumber(row.amount ?? row.total_price, 0);
  return {
    ...row,
    id: String(row.booking_id ?? ''),
    booking_id: String(row.booking_id ?? ''),
    trip_id: String(row.trip_id ?? ''),
    user_id: String(row.passenger_id ?? ''),
    tripId: String(row.trip_id ?? ''),
    userId: String(row.passenger_id ?? ''),
    seats_requested: toNumber(row.seats_requested, 1),
    seatsRequested: toNumber(row.seats_requested, 1),
    amount,
    total_price: amount,
    status:
      typeof row.status === 'string' && row.status.trim().length > 0
        ? row.status
        : normalizeBookingStatus(row.booking_status),
    booking_status: normalizeBookingStatus(row.booking_status ?? row.status),
    createdAt: String(row.created_at ?? ''),
  };
}

function mapNotificationRow(row: NotificationRow) {
  const metadata = isRecord(row.metadata) ? row.metadata : {};
  const isRead = row.is_read === true || row.read === true;

  return {
    id: String(row.id ?? ''),
    user_id: String(row.user_id ?? ''),
    type: String(row.type ?? 'system'),
    title: String(row.title ?? ''),
    message: String(row.message ?? ''),
    priority: String(metadata.priority ?? 'medium'),
    action_url: normalizeString(metadata.action_url),
    read: isRead,
    is_read: isRead,
    created_at: String(row.created_at ?? new Date().toISOString()),
    source: 'server',
  };
}

function mapPackageRow(row: PackageRow) {
  return {
    id: String(row.package_id ?? row.id ?? ''),
    package_id: String(row.package_id ?? row.id ?? ''),
    tracking_code: String(row.tracking_number ?? row.package_code ?? ''),
    tracking_number: String(row.tracking_number ?? row.package_code ?? ''),
    package_code: String(row.package_code ?? row.tracking_number ?? ''),
    from: String(row.origin_name ?? row.origin_location ?? ''),
    to: String(row.destination_name ?? row.destination_location ?? ''),
    weight: String(row.weight_kg ?? ''),
    description: String(row.description ?? ''),
    recipient_name: row.receiver_name ?? null,
    recipient_phone: row.receiver_phone ?? null,
    trip_id: row.trip_id ?? null,
    status: normalizePackageStatus(row.status ?? row.package_status),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

function buildTripNotes(body: Record<string, unknown>): string | null {
  const notes: string[] = [];
  const note = normalizeString(body.note);
  const packageNote = normalizeString(body.packageNote);
  const gender = normalizeString(body.gender);

  if (note) {
    notes.push(note);
  }

  if (body.acceptsPackages === true) {
    const capacity = normalizeString(body.packageCapacity) || 'medium';
    notes.push(packageNote ? `Packages enabled (${capacity}): ${packageNote}` : `Packages enabled (${capacity})`);
  }

  if (gender && gender !== 'mixed') {
    notes.push(`Preference: ${gender}`);
  }

  if (body.prayer === true) {
    notes.push('Prayer stop requested');
  }

  return notes.length > 0 ? notes.join('\n') : null;
}

function calculatePrice(body: Record<string, unknown>) {
  const type = body.type === 'package' ? 'package' : 'passenger';
  const distanceKm = Math.max(1, toNumber(body.distance_km, 8));
  const basePrice = Math.max(1, toNumber(body.base_price, type === 'package' ? 3.5 : 2.5));
  const weight = Math.max(0, toNumber(body.weight, 0.5));
  const packageSurcharge = type === 'package' ? Math.max(0, weight - 1) * 0.35 : 0;
  const distanceCharge = distanceKm * (type === 'package' ? 0.22 : 0.18);
  const price = Number((basePrice + distanceCharge + packageSurcharge).toFixed(3));

  return {
    price,
    currency: 'JOD',
    breakdown: {
      base: basePrice,
      distance: Number(distanceCharge.toFixed(3)),
      package: Number(packageSurcharge.toFixed(3)),
    },
  };
}

async function ensureApprovedDriver(
  admin: SupabaseClientInstance,
  canonicalUserId: string,
) {
  const { data, error } = await admin
    .from('drivers')
    .select('driver_id, user_id, driver_status, verification_level, sanad_identity_linked')
    .eq('user_id', canonicalUserId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Driver profile is not provisioned. Complete driver onboarding before offering rides.');
  }

  const driver = data as DriverRecord;
  const status = String(driver.driver_status ?? '').trim().toLowerCase();
  if (!['approved', 'online', 'offline', 'busy'].includes(status)) {
    throw new Error('Driver profile is pending approval. You can offer rides after verification is approved.');
  }

  return driver;
}

async function handleGetPendingDriverApprovals(auth: AuthenticatedRequest) {
  const adminError = await requireAdminAccess(auth);
  if (adminError) {
    return adminError;
  }

  const approvals = await getDriverApprovalRows(auth.admin, ['pending_approval', 'draft']);
  return jsonResponse({ pendingDrivers: approvals });
}

async function handleApproveDriver(auth: AuthenticatedRequest, driverId: string) {
  const adminError = await requireAdminAccess(auth);
  if (adminError) {
    return adminError;
  }

  const approvalRows = await getDriverApprovalRows(auth.admin, ['pending_approval', 'draft', 'rejected', 'suspended', 'approved', 'offline', 'online', 'busy']);
  const candidate = approvalRows.find((row) => row.driverId === driverId);

  if (!candidate) {
    return jsonResponse({ error: 'Driver application not found.' }, 404);
  }

  if (['approved', 'offline', 'online', 'busy'].includes(candidate.driverStatus)) {
    return jsonResponse({ error: 'Driver is already approved.' }, 409);
  }

  if (!candidate.readyForApproval) {
    return jsonResponse({
      error: 'Driver is not ready for approval yet. Require contact details and at least Level 2 verification first.',
    }, 400);
  }

  const { error } = await auth.admin.rpc('app_approve_driver', {
    p_driver_id: driverId,
    p_admin_id: auth.canonicalUser.id,
  });

  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }

  const [approvedDriver] = await getDriverApprovalRows(auth.admin, ['approved', 'offline', 'online', 'busy']);
  const updated = approvedDriver?.driverId === driverId
    ? approvedDriver
    : (await getDriverApprovalRows(auth.admin, ['approved', 'offline', 'online', 'busy']))
      .find((row) => row.driverId === driverId);

  return jsonResponse({
    success: true,
    driver: updated ?? {
      ...candidate,
      driverStatus: 'approved',
      verificationLevel: 'level_3',
      readyForApproval: true,
    },
  });
}

async function getUserSettings(
  supabaseClient: SupabaseClientInstance,
  canonicalUser: CanonicalUser,
) {
  const [settingsResult, communicationsResult] = await Promise.all([
    supabaseClient
      .from('user_settings')
      .select('privacy, display')
      .eq('user_id', canonicalUser.id)
      .maybeSingle(),
    supabaseClient
      .from('communication_preferences')
      .select('*')
      .eq('user_id', canonicalUser.id)
      .maybeSingle(),
  ]);

  if (settingsResult.error) {
    throw new Error(settingsResult.error.message);
  }
  if (communicationsResult.error) {
    throw new Error(communicationsResult.error.message);
  }

  const displaySource = isRecord(settingsResult.data?.display) ? settingsResult.data?.display : {};
  const privacySource = isRecord(settingsResult.data?.privacy) ? settingsResult.data?.privacy : {};
  const communications = communicationsResult.data as Record<string, unknown> | null;
  const language = displaySource.language === 'ar' || communications?.preferred_language === 'ar' ? 'ar' : 'en';

  return {
    display: {
      ...displaySource,
      currency: typeof displaySource.currency === 'string' && displaySource.currency.trim()
        ? displaySource.currency
        : 'JOD',
      direction:
        displaySource.direction === 'rtl' || (displaySource.direction !== 'ltr' && language === 'ar')
          ? 'rtl'
          : 'ltr',
      language,
      theme:
        displaySource.theme === 'light' || displaySource.theme === 'system'
          ? displaySource.theme
          : 'dark',
    },
    notifications: {
      inApp: communications?.in_app_enabled !== false,
      push: communications?.push_enabled !== false,
      email: communications?.email_enabled !== false,
      sms: communications?.sms_enabled !== false,
      whatsapp: communications?.whatsapp_enabled === true,
      tripUpdates: communications?.trip_updates_enabled !== false,
      bookingRequests: communications?.booking_requests_enabled !== false,
      messages: communications?.messages_enabled !== false,
      promotions: communications?.promotions_enabled === true,
      prayerReminders: communications?.prayer_reminders_enabled !== false,
      criticalAlerts: communications?.critical_alerts_enabled !== false,
      preferredLanguage: language,
    },
    privacy: {
      dataAnalytics: normalizeBoolean(privacySource.dataAnalytics, false),
      hidePhoto: normalizeBoolean(privacySource.hidePhoto, false),
      shareLocation: normalizeBoolean(privacySource.shareLocation, true),
      showProfile: normalizeBoolean(privacySource.showProfile, true),
    },
  };
}

async function upsertUserSettings(
  supabaseClient: SupabaseClientInstance,
  canonicalUser: CanonicalUser,
  patch: Record<string, unknown>,
) {
  const current = await getUserSettings(supabaseClient, canonicalUser);
  const nextDisplaySource = isRecord(patch.display) ? patch.display : {};
  const nextPrivacySource = isRecord(patch.privacy) ? patch.privacy : {};
  const nextNotificationsSource = isRecord(patch.notifications) ? patch.notifications : {};
  const nextLanguage =
    nextDisplaySource.language === 'ar' || nextNotificationsSource.preferredLanguage === 'ar'
      ? 'ar'
      : current.display.language;

  const nextDisplay = {
    ...current.display,
    ...nextDisplaySource,
    direction:
      nextDisplaySource.direction === 'rtl' || (nextDisplaySource.direction !== 'ltr' && nextLanguage === 'ar')
        ? 'rtl'
        : nextDisplaySource.direction === 'ltr'
          ? 'ltr'
          : current.display.direction,
    language: nextLanguage,
    theme:
      nextDisplaySource.theme === 'light' || nextDisplaySource.theme === 'system'
        ? nextDisplaySource.theme
        : nextDisplaySource.theme === 'dark'
          ? 'dark'
          : current.display.theme,
  };

  const nextPrivacy = {
    ...current.privacy,
    ...nextPrivacySource,
  };

  const nextNotifications = {
    ...current.notifications,
    ...nextNotificationsSource,
    preferredLanguage: nextLanguage,
  };

  const updatedAt = new Date().toISOString();
  const { error: userSettingsError } = await supabaseClient
    .from('user_settings')
    .upsert({
      user_id: canonicalUser.id,
      display: nextDisplay,
      privacy: nextPrivacy,
      updated_at: updatedAt,
    }, { onConflict: 'user_id' });

  if (userSettingsError) {
    throw new Error(userSettingsError.message);
  }

  const { error: communicationsError } = await supabaseClient
    .from('communication_preferences')
    .upsert({
      user_id: canonicalUser.id,
      in_app_enabled: nextNotifications.inApp,
      push_enabled: nextNotifications.push,
      email_enabled: nextNotifications.email,
      sms_enabled: nextNotifications.sms,
      whatsapp_enabled: nextNotifications.whatsapp,
      trip_updates_enabled: nextNotifications.tripUpdates,
      booking_requests_enabled: nextNotifications.bookingRequests,
      messages_enabled: nextNotifications.messages,
      promotions_enabled: nextNotifications.promotions,
      prayer_reminders_enabled: nextNotifications.prayerReminders,
      critical_alerts_enabled: nextNotifications.criticalAlerts,
      preferred_language: nextLanguage,
      updated_at: updatedAt,
    }, { onConflict: 'user_id' });

  if (communicationsError) {
    throw new Error(communicationsError.message);
  }

  return getUserSettings(supabaseClient, canonicalUser);
}

async function getSafetyDashboard(
  supabaseClient: SupabaseClientInstance,
  canonicalUser: CanonicalUser,
) {
  const [settingsResult, incidentsResult] = await Promise.all([
    supabaseClient
      .from('safety_settings')
      .select('*')
      .eq('user_id', canonicalUser.id)
      .maybeSingle(),
    supabaseClient
      .from('safety_incidents')
      .select('incident_id, incident_type, description, incident_status, submitted_at')
      .eq('user_id', canonicalUser.id)
      .order('submitted_at', { ascending: false })
      .limit(8),
  ]);

  if (settingsResult.error) {
    throw new Error(settingsResult.error.message);
  }
  if (incidentsResult.error) {
    throw new Error(incidentsResult.error.message);
  }

  const settings = settingsResult.data as Record<string, unknown> | null;
  const emergencyContacts = Array.isArray(settings?.emergency_contacts)
    ? settings?.emergency_contacts
    : [];
  const checklist = isRecord(settings?.checklist) ? settings.checklist : {};

  return {
    incidents: Array.isArray(incidentsResult.data)
      ? incidentsResult.data.map((incident) => ({
        description: String(incident.description ?? ''),
        id: String(incident.incident_id),
        status:
          incident.incident_status === 'under_review' || incident.incident_status === 'resolved'
            ? incident.incident_status
            : 'submitted',
        submittedAt: String(incident.submitted_at ?? new Date().toISOString()),
        type: String(incident.incident_type ?? 'incident'),
      }))
      : [],
    settings: {
      checklist,
      cultural: {
        genderPreference:
          settings?.gender_preference === 'same_gender_only' ||
          settings?.gender_preference === 'male_drivers_only' ||
          settings?.gender_preference === 'female_drivers_only'
            ? settings.gender_preference
            : 'no_preference',
        prayerStops: settings?.prayer_stops !== false,
        ramadanMode: settings?.ramadan_mode === true,
      },
      emergencyContacts,
    },
  };
}

async function upsertSafetySettings(
  supabaseClient: SupabaseClientInstance,
  canonicalUser: CanonicalUser,
  patch: Record<string, unknown>,
) {
  const current = await getSafetyDashboard(supabaseClient, canonicalUser);
  const checklist = isRecord(patch.checklist) ? patch.checklist : current.settings.checklist;
  const culturalPatch = isRecord(patch.cultural) ? patch.cultural : {};
  const emergencyContacts = Array.isArray(patch.emergencyContacts)
    ? patch.emergencyContacts
    : current.settings.emergencyContacts;

  const nextSettings = {
    checklist,
    cultural: {
      genderPreference:
        culturalPatch.genderPreference === 'same_gender_only' ||
        culturalPatch.genderPreference === 'male_drivers_only' ||
        culturalPatch.genderPreference === 'female_drivers_only'
          ? culturalPatch.genderPreference
          : current.settings.cultural.genderPreference,
      prayerStops: normalizeBoolean(culturalPatch.prayerStops, current.settings.cultural.prayerStops),
      ramadanMode: normalizeBoolean(culturalPatch.ramadanMode, current.settings.cultural.ramadanMode),
    },
    emergencyContacts,
  };

  const { error } = await supabaseClient
    .from('safety_settings')
    .upsert({
      user_id: canonicalUser.id,
      checklist: nextSettings.checklist,
      emergency_contacts: nextSettings.emergencyContacts,
      prayer_stops: nextSettings.cultural.prayerStops,
      ramadan_mode: nextSettings.cultural.ramadanMode,
      gender_preference: nextSettings.cultural.genderPreference,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    throw new Error(error.message);
  }

  return nextSettings;
}

async function handleSearchTrips(admin: SupabaseClientInstance, searchParams: URLSearchParams) {
  const from = normalizeString(searchParams.get('from'));
  const to = normalizeString(searchParams.get('to'));
  const date = normalizeString(searchParams.get('date'));
  const seats = parseQueryNumber(searchParams.get('seats'));

  let query = admin
    .from('trips')
    .select('trip_id, driver_id, origin_city, destination_city, departure_time, available_seats, price_per_seat, trip_status, allow_packages, package_capacity, vehicle_make, vehicle_model, notes, created_at')
    .is('deleted_at', null)
    .in('trip_status', ['open', 'booked', 'in_progress'])
    .order('departure_time', { ascending: true })
    .limit(200);

  if (date) {
    query = query
      .gte('departure_time', `${date}T00:00:00`)
      .lt('departure_time', `${date}T23:59:59.999`);
  }

  if (typeof seats === 'number') {
    query = query.gte('available_seats', seats);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const rows = (Array.isArray(data) ? data : []) as TripRow[];
  const filteredRows = rows.filter((row) => {
    const origin = String(row.origin_city ?? '').trim().toLowerCase();
    const destination = String(row.destination_city ?? '').trim().toLowerCase();
    if (from && !origin.includes(from.toLowerCase())) {
      return false;
    }
    if (to && !destination.includes(to.toLowerCase())) {
      return false;
    }
    return true;
  });

  const driverSummaries = await fetchDriverSummaries(
    admin,
    filteredRows.map((row) => String(row.driver_id ?? '')),
  );

  return filteredRows.map((row) => mapTripRow(row, driverSummaries.get(String(row.driver_id ?? '')) ?? null));
}

async function handleGetTripById(admin: SupabaseClientInstance, tripId: string) {
  const { data, error } = await admin
    .from('trips')
    .select('trip_id, driver_id, origin_city, destination_city, departure_time, available_seats, price_per_seat, trip_status, allow_packages, package_capacity, vehicle_make, vehicle_model, notes, created_at')
    .eq('trip_id', tripId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  const driverSummaries = await fetchDriverSummaries(admin, [String((data as TripRow).driver_id ?? '')]);
  return mapTripRow(data as TripRow, driverSummaries.get(String((data as TripRow).driver_id ?? '')) ?? null);
}

async function handleCreateTrip(auth: AuthenticatedRequest, body: Record<string, unknown>) {
  const driver = await ensureApprovedDriver(auth.admin, auth.canonicalUser.id);
  const from = normalizeString(body.from);
  const to = normalizeString(body.to);
  const date = normalizeString(body.date);
  const time = normalizeString(body.time);
  const seats = Math.max(1, toNumber(body.seats, 1));
  const price = Math.max(0, toNumber(body.price, 0));

  if (!from || !to || !date || !time) {
    return jsonResponse({ error: 'from, to, date, and time are required.' }, 400);
  }

  const vehicleParts = String(body.carModel ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const [vehicleMake = null, ...vehicleRest] = vehicleParts;
  const departureTime = new Date(`${date}T${time}:00`).toISOString();

  const { data, error } = await auth.admin
    .from('trips')
    .insert({
      trip_id: crypto.randomUUID(),
      driver_id: driver.driver_id,
      origin_city: from,
      destination_city: to,
      departure_time: departureTime,
      available_seats: seats,
      price_per_seat: price,
      trip_status: 'open',
      allow_packages: body.acceptsPackages === true,
      package_capacity:
        body.packageCapacity === 'large'
          ? 3
          : body.packageCapacity === 'medium'
            ? 2
            : body.packageCapacity === 'small'
              ? 1
              : 0,
      package_slots_remaining:
        body.packageCapacity === 'large'
          ? 3
          : body.packageCapacity === 'medium'
            ? 2
            : body.packageCapacity === 'small'
              ? 1
              : 0,
      vehicle_make: vehicleMake,
      vehicle_model: vehicleRest.length > 0 ? vehicleRest.join(' ') : normalizeString(body.carModel),
      notes: buildTripNotes(body),
      created_at: new Date().toISOString(),
    })
    .select('trip_id, driver_id, origin_city, destination_city, departure_time, available_seats, price_per_seat, trip_status, allow_packages, package_capacity, vehicle_make, vehicle_model, notes, created_at')
    .single();

  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }

  const driverSummaries = await fetchDriverSummaries(auth.admin, [driver.driver_id]);
  return jsonResponse(
    mapTripRow(data as TripRow, driverSummaries.get(driver.driver_id) ?? null),
    201,
  );
}

async function handleGetDriverTrips(auth: AuthenticatedRequest) {
  const driver = await ensureApprovedDriver(auth.admin, auth.canonicalUser.id);
  const { data, error } = await auth.admin
    .from('trips')
    .select('trip_id, driver_id, origin_city, destination_city, departure_time, available_seats, price_per_seat, trip_status, allow_packages, package_capacity, vehicle_make, vehicle_model, notes, created_at')
    .eq('driver_id', driver.driver_id)
    .order('departure_time', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const driverSummaries = await fetchDriverSummaries(auth.admin, [driver.driver_id]);
  return (Array.isArray(data) ? data : []).map((row) =>
    mapTripRow(row as TripRow, driverSummaries.get(driver.driver_id) ?? null)
  );
}

async function handleUpdateTrip(auth: AuthenticatedRequest, tripId: string, body: Record<string, unknown>) {
  const driver = await ensureApprovedDriver(auth.admin, auth.canonicalUser.id);
  const patch: Record<string, unknown> = {};

  if (typeof body.from === 'string') {
    patch.origin_city = body.from.trim();
  }
  if (typeof body.to === 'string') {
    patch.destination_city = body.to.trim();
  }
  if (typeof body.seats === 'number') {
    patch.available_seats = Math.max(0, body.seats);
  }
  if (typeof body.price === 'number') {
    patch.price_per_seat = Math.max(0, body.price);
  }
  if (typeof body.note === 'string') {
    patch.notes = body.note.trim() || null;
  }
  if (typeof body.status === 'string') {
    patch.trip_status = normalizeTripStatus(body.status);
  }
  if (body.date || body.time) {
    const { data: currentTrip, error: currentTripError } = await auth.admin
      .from('trips')
      .select('departure_time')
      .eq('trip_id', tripId)
      .eq('driver_id', driver.driver_id)
      .maybeSingle();

    if (currentTripError) {
      return jsonResponse({ error: currentTripError.message }, 400);
    }
    if (!currentTrip) {
      return jsonResponse({ error: 'Trip not found.' }, 404);
    }

    const date = typeof body.date === 'string'
      ? body.date
      : formatDate(currentTrip.departure_time);
    const time = typeof body.time === 'string'
      ? body.time
      : formatTime(currentTrip.departure_time);
    patch.departure_time = new Date(`${date}T${time}:00`).toISOString();
  }

  const { data, error } = await auth.admin
    .from('trips')
    .update(patch)
    .eq('trip_id', tripId)
    .eq('driver_id', driver.driver_id)
    .select('trip_id, driver_id, origin_city, destination_city, departure_time, available_seats, price_per_seat, trip_status, allow_packages, package_capacity, vehicle_make, vehicle_model, notes, created_at')
    .maybeSingle();

  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }
  if (!data) {
    return jsonResponse({ error: 'Trip not found.' }, 404);
  }

  const driverSummaries = await fetchDriverSummaries(auth.admin, [driver.driver_id]);
  return jsonResponse(mapTripRow(data as TripRow, driverSummaries.get(driver.driver_id) ?? null));
}

async function handleDeleteTrip(auth: AuthenticatedRequest, tripId: string) {
  const driver = await ensureApprovedDriver(auth.admin, auth.canonicalUser.id);
  const { error } = await auth.admin
    .from('trips')
    .update({ trip_status: 'cancelled', deleted_at: new Date().toISOString() })
    .eq('trip_id', tripId)
    .eq('driver_id', driver.driver_id);

  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }

  return jsonResponse({ success: true });
}

async function handlePublishTrip(auth: AuthenticatedRequest, tripId: string) {
  const driver = await ensureApprovedDriver(auth.admin, auth.canonicalUser.id);
  const { error } = await auth.admin
    .from('trips')
    .update({ trip_status: 'open' })
    .eq('trip_id', tripId)
    .eq('driver_id', driver.driver_id);

  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }

  return jsonResponse({ success: true });
}

async function handleCreateBooking(auth: AuthenticatedRequest, body: Record<string, unknown>) {
  const tripId = normalizeString(body.trip_id ?? body.tripId);
  const seatsRequested = Math.max(1, toNumber(body.seats_requested ?? body.seatsRequested, 1));
  const pickup = normalizeString(body.pickup_stop ?? body.pickup);
  const dropoff = normalizeString(body.dropoff_stop ?? body.dropoff);

  if (!tripId) {
    return jsonResponse({ error: 'trip_id is required.' }, 400);
  }

  const { data: trip, error: tripError } = await auth.admin
    .from('trips')
    .select('trip_id, available_seats, price_per_seat')
    .eq('trip_id', tripId)
    .maybeSingle();

  if (tripError) {
    return jsonResponse({ error: tripError.message }, 400);
  }
  if (!trip) {
    return jsonResponse({ error: 'Trip not found.' }, 404);
  }

  const availableSeats = toNumber(trip.available_seats, 0);
  if (availableSeats < seatsRequested) {
    return jsonResponse({ error: 'Not enough seats available.' }, 400);
  }

  const pricePerSeat = toNumber(trip.price_per_seat, 0);
  const totalPrice = Number((pricePerSeat * seatsRequested).toFixed(3));
  const bookingId = crypto.randomUUID();

  const { data: booking, error: bookingError } = await auth.admin
    .from('bookings')
    .insert({
      booking_id: bookingId,
      trip_id: tripId,
      passenger_id: auth.canonicalUser.id,
      seat_number: 1,
      booking_status: 'confirmed',
      amount: totalPrice,
      status: 'confirmed',
      confirmed_by_driver: true,
      seats_requested: seatsRequested,
      pickup_location: pickup,
      pickup_name: pickup,
      dropoff_location: dropoff,
      dropoff_name: dropoff,
      price_per_seat: pricePerSeat,
      total_price: totalPrice,
      seats_booked: seatsRequested,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('booking_id, trip_id, passenger_id, seats_requested, seat_number, pickup_location, dropoff_location, price_per_seat, total_price, amount, status, booking_status, created_at, updated_at')
    .single();

  if (bookingError) {
    return jsonResponse({ error: bookingError.message }, 400);
  }

  const { error: tripUpdateError } = await auth.admin
    .from('trips')
    .update({ available_seats: Math.max(0, availableSeats - seatsRequested) })
    .eq('trip_id', tripId);

  if (tripUpdateError) {
    return jsonResponse({ error: tripUpdateError.message }, 400);
  }

  return jsonResponse({ booking: mapBookingRow(booking as BookingRow) }, 201);
}

async function handleGetUserBookings(auth: AuthenticatedRequest) {
  const { data, error } = await auth.admin
    .from('bookings')
    .select('booking_id, trip_id, passenger_id, seats_requested, seat_number, pickup_location, dropoff_location, price_per_seat, total_price, amount, status, booking_status, created_at, updated_at')
    .eq('passenger_id', auth.canonicalUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (Array.isArray(data) ? data : []).map((row) => mapBookingRow(row as BookingRow));
}

async function handleGetTripBookings(auth: AuthenticatedRequest, tripId: string) {
  const driver = await ensureApprovedDriver(auth.admin, auth.canonicalUser.id);
  const { data: trip, error: tripError } = await auth.admin
    .from('trips')
    .select('trip_id')
    .eq('trip_id', tripId)
    .eq('driver_id', driver.driver_id)
    .maybeSingle();

  if (tripError) {
    throw new Error(tripError.message);
  }
  if (!trip) {
    return null;
  }

  const { data, error } = await auth.admin
    .from('bookings')
    .select('booking_id, trip_id, passenger_id, seats_requested, seat_number, pickup_location, dropoff_location, price_per_seat, total_price, amount, status, booking_status, created_at, updated_at')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (Array.isArray(data) ? data : []).map((row) => mapBookingRow(row as BookingRow));
}

async function handleUpdateBookingStatus(
  auth: AuthenticatedRequest,
  bookingId: string,
  body: Record<string, unknown>,
) {
  const nextStatusInput = normalizeString(body.status);
  if (!nextStatusInput) {
    return jsonResponse({ error: 'status is required.' }, 400);
  }

  const nextStatus = normalizeBookingStatus(nextStatusInput);
  const { data: existing, error: existingError } = await auth.admin
    .from('bookings')
    .select('booking_id, trip_id, passenger_id, seats_requested, seat_number, pickup_location, dropoff_location, price_per_seat, total_price, amount, status, booking_status, created_at, updated_at')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (existingError) {
    return jsonResponse({ error: existingError.message }, 400);
  }
  if (!existing) {
    return jsonResponse({ error: 'Booking not found.' }, 404);
  }

  const existingRow = existing as BookingRow;
  const actorOwnsBooking = String(existingRow.passenger_id ?? '') === auth.canonicalUser.id;

  if (!actorOwnsBooking) {
    const driver = await ensureApprovedDriver(auth.admin, auth.canonicalUser.id);
    const { data: trip, error: tripError } = await auth.admin
      .from('trips')
      .select('trip_id')
      .eq('trip_id', existingRow.trip_id)
      .eq('driver_id', driver.driver_id)
      .maybeSingle();

    if (tripError) {
      return jsonResponse({ error: tripError.message }, 400);
    }
    if (!trip) {
      return jsonResponse({ error: 'You do not have permission to update this booking.' }, 403);
    }
  }

  const { data: updated, error: updateError } = await auth.admin
    .from('bookings')
    .update({
      status: nextStatus,
      booking_status: nextStatus,
      confirmed_by_driver: nextStatus === 'confirmed',
      updated_at: new Date().toISOString(),
    })
    .eq('booking_id', bookingId)
    .select('booking_id, trip_id, passenger_id, seats_requested, seat_number, pickup_location, dropoff_location, price_per_seat, total_price, amount, status, booking_status, created_at, updated_at')
    .single();

  if (updateError) {
    return jsonResponse({ error: updateError.message }, 400);
  }

  if (['cancelled', 'rejected'].includes(nextStatus)) {
    const { data: trip } = await auth.admin
      .from('trips')
      .select('available_seats')
      .eq('trip_id', existingRow.trip_id)
      .maybeSingle();

    if (trip) {
      await auth.admin
        .from('trips')
        .update({
          available_seats:
            toNumber(trip.available_seats, 0) + toNumber(existingRow.seats_requested, 1),
        })
        .eq('trip_id', existingRow.trip_id);
    }
  }

  return jsonResponse({ booking: mapBookingRow(updated as BookingRow) });
}

async function handleGetNotifications(auth: AuthenticatedRequest) {
  const { data, error } = await auth.admin
    .from('notifications')
    .select('id, user_id, type, title, message, read, is_read, created_at, metadata')
    .eq('user_id', auth.canonicalUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (Array.isArray(data) ? data : []).map((row) => mapNotificationRow(row as NotificationRow));
}

async function handleCreateNotification(auth: AuthenticatedRequest, body: Record<string, unknown>) {
  const title = normalizeString(body.title);
  const message = normalizeString(body.body ?? body.message);
  const type = normalizeString(body.type) || 'system';

  if (!title || !message) {
    return jsonResponse({ error: 'title and message are required.' }, 400);
  }

  const { data, error } = await auth.admin
    .from('notifications')
    .insert({
      id: crypto.randomUUID(),
      user_id: auth.canonicalUser.id,
      title,
      message,
      type,
      read: false,
      is_read: false,
      metadata: {
        priority: normalizeString(body.priority) || 'medium',
        action_url: normalizeString(body.action_url),
      },
      created_at: new Date().toISOString(),
    })
    .select('id, user_id, type, title, message, read, is_read, created_at, metadata')
    .single();

  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }

  return jsonResponse({
    success: true,
    source: 'server',
    notification: mapNotificationRow(data as NotificationRow),
  }, 201);
}

async function handleMarkNotificationAsRead(auth: AuthenticatedRequest, notificationId: string) {
  const { data, error } = await auth.admin
    .from('notifications')
    .update({
      read: true,
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .eq('user_id', auth.canonicalUser.id)
    .select('id, user_id, type, title, message, read, is_read, created_at, metadata')
    .maybeSingle();

  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }
  if (!data) {
    return jsonResponse({ success: false, source: 'server' }, 404);
  }

  return jsonResponse({ success: true, source: 'server', notification: mapNotificationRow(data as NotificationRow) });
}

async function handlePushPreference(auth: AuthenticatedRequest, body: Record<string, unknown>) {
  const enabled = body.enabled === true;
  const { error } = await auth.admin
    .from('communication_preferences')
    .upsert({
      user_id: auth.canonicalUser.id,
      push_enabled: enabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }

  return jsonResponse({ success: true, enabled });
}

async function getActiveTripState(auth: AuthenticatedRequest) {
  const { data, error } = await auth.admin
    .from('user_settings')
    .select('display')
    .eq('user_id', auth.canonicalUser.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const display = isRecord(data?.display) ? data.display : {};
  return {
    display,
    activeTrip: isRecord(display.__activeTrip) ? display.__activeTrip : null,
  };
}

async function persistActiveTripState(
  auth: AuthenticatedRequest,
  display: Record<string, unknown>,
) {
  const { error } = await auth.admin
    .from('user_settings')
    .upsert({
      user_id: auth.canonicalUser.id,
      display,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    throw new Error(error.message);
  }
}

async function handleGetActiveTrip(auth: AuthenticatedRequest) {
  const state = await getActiveTripState(auth);
  return state.activeTrip;
}

async function handleSetActiveTrip(auth: AuthenticatedRequest, body: Record<string, unknown>) {
  const state = await getActiveTripState(auth);
  const now = new Date().toISOString();
  const activeTrip = {
    ...body,
    userId: auth.authUser.id,
    startedAt: typeof body.startedAt === 'string' ? body.startedAt : now,
    updatedAt: now,
  };

  await persistActiveTripState(auth, {
    ...state.display,
    __activeTrip: activeTrip,
  });

  return activeTrip;
}

async function handlePatchActiveTrip(auth: AuthenticatedRequest, body: Record<string, unknown>) {
  const state = await getActiveTripState(auth);
  const existing = isRecord(state.activeTrip) ? state.activeTrip : null;
  if (!existing) {
    return null;
  }

  const nextActiveTrip = {
    ...existing,
    ...body,
    updatedAt: new Date().toISOString(),
  };

  await persistActiveTripState(auth, {
    ...state.display,
    __activeTrip: nextActiveTrip,
  });

  return nextActiveTrip;
}

async function handleClearActiveTrip(auth: AuthenticatedRequest) {
  const state = await getActiveTripState(auth);
  await persistActiveTripState(auth, {
    ...state.display,
    __activeTrip: null,
  });
}

async function handleCreatePackage(auth: AuthenticatedRequest, body: Record<string, unknown>) {
  const from = normalizeString(body.from);
  const to = normalizeString(body.to);
  const description = normalizeString(body.description) || '';
  const tracking = normalizeTrackingNumber(body.trackingNumber ?? body.tracking_code) || `PKG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  if (!from || !to) {
    return jsonResponse({ error: 'from and to are required.' }, 400);
  }

  const { data, error } = await auth.admin
    .from('packages')
    .insert({
      package_id: crypto.randomUUID(),
      tracking_number: tracking,
      package_code: tracking,
      qr_code: tracking,
      sender_id: auth.canonicalUser.id,
      receiver_name: normalizeString(body.recipientName) || 'Recipient',
      receiver_phone: normalizeString(body.recipientPhone) || '',
      origin_name: from,
      origin_location: from,
      destination_name: to,
      destination_location: to,
      size: 'medium',
      weight_kg: Math.max(0.1, toNumber(body.weight, 0.5)),
      description,
      fee_amount: 5,
      delivery_fee: 5,
      package_status: 'created',
      status: 'requested',
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }

  return jsonResponse({ package: mapPackageRow(data as PackageRow) }, 201);
}

async function handleTrackPackage(admin: SupabaseClientInstance, trackingId: string) {
  const tracking = normalizeTrackingNumber(trackingId);
  if (!tracking) {
    return null;
  }

  const { data, error } = await admin
    .from('packages')
    .select('*')
    .or(`tracking_number.eq.${tracking},package_code.eq.${tracking}`)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  return mapPackageRow(data as PackageRow);
}

async function handleCreateReview(
  request: Request,
  auth: AuthenticatedRequest,
  body: Record<string, unknown>,
) {
  const reviewPayload = {
    reviewee_id: normalizeString(body.reviewee_id),
    role: normalizeString(body.role),
    overall_rating: Math.max(1, Math.min(5, toNumber(body.overall_rating, 5))),
    comment: normalizeString(body.comment),
    trip_id: normalizeString(body.trip_id),
  };

  let trustUserId: string | null = reviewPayload.reviewee_id;

  if (isUuid(reviewPayload.reviewee_id)) {
    const { data: reviewedUser, error: reviewedUserError } = await auth.admin
      .from('users')
      .select('id')
      .or(`auth_user_id.eq.${reviewPayload.reviewee_id},id.eq.${reviewPayload.reviewee_id}`)
      .maybeSingle();

    if (reviewedUserError) {
      throw new Error(reviewedUserError.message);
    }

    trustUserId = String(reviewedUser?.id ?? reviewPayload.reviewee_id);
  }

  if (isUuid(trustUserId)) {
    const { data: existingTrust } = await auth.admin
      .from('trust_scores')
      .select('user_id, total_ratings, average_rating, positive_reviews, negative_reviews')
      .eq('user_id', trustUserId)
      .maybeSingle();

    const totalRatings = toNumber(existingTrust?.total_ratings, 0) + 1;
    const currentAverage = toNumber(existingTrust?.average_rating, 0);
    const nextAverage = Number((((currentAverage * toNumber(existingTrust?.total_ratings, 0)) + reviewPayload.overall_rating) / totalRatings).toFixed(2));

    await auth.admin
      .from('trust_scores')
      .upsert({
        user_id: trustUserId,
        total_ratings: totalRatings,
        average_rating: nextAverage,
        score: nextAverage,
        positive_reviews: toNumber(existingTrust?.positive_reviews, 0) + (reviewPayload.overall_rating >= 4 ? 1 : 0),
        negative_reviews: toNumber(existingTrust?.negative_reviews, 0) + (reviewPayload.overall_rating <= 2 ? 1 : 0),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  }

  await auth.admin
    .from('audit_logs')
    .insert({
      actor_id: auth.authUser.id,
      actor_role: 'authenticated_user',
      action: 'review.submitted',
      table_name: 'reviews',
      record_id: reviewPayload.trip_id ?? crypto.randomUUID(),
      new_values: reviewPayload,
      ip_address: getClientIp(request),
      user_agent: request.headers.get('user-agent'),
      created_at: new Date().toISOString(),
    })
    .catch(() => undefined);

  return jsonResponse({ success: true });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = normalizeRoutePath(url.pathname);
    const runtime = createModuleRuntime(req);
    const walletHandlers = createWalletHandlers(runtime);
    const communicationHandlers = createCommunicationHandlers(runtime, {
      deliveryEnv: {
        ...deliveryEnv,
        functionBaseUrl: getFunctionBaseUrl(req),
      },
      communicationsRuntimeSql: '',
      communicationsOperationsSql: '',
    });

    if (routeMatches(path, '/health')) {
      return jsonResponse({ status: 'healthy', timestamp: new Date().toISOString() });
    }

    if (routeMatches(path, '/payments/webhook') && req.method === 'POST') {
      return walletHandlers.handlePaymentWebhook(req);
    }

    if (routeMatches(path, '/communications/webhooks/resend') && req.method === 'POST') {
      return communicationHandlers.handleResendWebhook(req);
    }

    if (routeMatches(path, '/communications/webhooks/twilio') && req.method === 'POST') {
      return communicationHandlers.handleTwilioWebhook(req);
    }

    if (routeMatches(path, '/communications/process') && req.method === 'POST') {
      return communicationHandlers.handleProcessCommunicationQueue(req);
    }

    if (routeMatches(path, '/communications/providers/diagnostics') && req.method === 'GET') {
      return communicationHandlers.handleProviderDiagnostics(req);
    }

    if (routeMatches(path, '/communications/test-send') && req.method === 'POST') {
      return communicationHandlers.handleSendTestCommunication(req);
    }

    if (routeMatches(path, '/communications/apply-migrations') && req.method === 'POST') {
      return communicationHandlers.handleApplyCommunicationMigrations(req);
    }

    if (routeMatches(path, '/trips/search') && req.method === 'GET') {
      const admin = createAdminClient();
      return jsonResponse(await handleSearchTrips(admin, url.searchParams));
    }

    if (routeMatches(path, '/trips/calculate-price') && req.method === 'POST') {
      return jsonResponse(calculatePrice(await readJsonBody(req)));
    }

    if (routeStartsWith(path, '/trips/') && !routeStartsWith(path, '/trips/user/') && !path.endsWith('/publish') && !path.endsWith('/bookings') && req.method === 'GET') {
      const admin = createAdminClient();
      const trip = await handleGetTripById(admin, path.slice('/trips/'.length));
      return trip
        ? jsonResponse(trip)
        : jsonResponse({ error: 'Trip not found.' }, 404);
    }

    if (routeStartsWith(path, '/packages/track/') && req.method === 'GET') {
      const admin = createAdminClient();
      const trackedPackage = await handleTrackPackage(admin, decodeURIComponent(path.slice('/packages/track/'.length)));
      return trackedPackage
        ? jsonResponse(trackedPackage)
        : jsonResponse({ error: 'Package not found.' }, 404);
    }

    if (routeMatches(path, '/wallet') && req.method === 'GET') {
      return walletHandlers.handleGetWallet(req);
    }
    if (routeMatches(path, '/wallet/set-pin') && req.method === 'POST') {
      return walletHandlers.handleSetPin(req);
    }
    if (routeMatches(path, '/wallet/verify-pin') && req.method === 'POST') {
      return walletHandlers.handleVerifyPin(req);
    }
    if (routeMatches(path, '/wallet/payment-methods') && req.method === 'POST') {
      return walletHandlers.handleWalletPaymentMethods(req);
    }
    if (routeMatches(path, '/wallet/transfer') && req.method === 'POST') {
      return walletHandlers.handleWalletTransfer(req);
    }
    if (routeMatches(path, '/wallet/withdraw') && req.method === 'POST') {
      return walletHandlers.handleWalletWithdraw(req);
    }
    if (routeMatches(path, '/wallet/settings') && (req.method === 'POST' || req.method === 'PUT')) {
      return walletHandlers.handleWalletSettings(req);
    }
    if (routeMatches(path, '/wallet/deposit') && req.method === 'POST') {
      return walletHandlers.handleWalletDeposit(req);
    }
    if (routeMatches(path, '/payments/create-intent') && req.method === 'POST') {
      return walletHandlers.handleCreatePaymentIntent(req);
    }
    if (routeMatches(path, '/payments/confirm') && req.method === 'POST') {
      return walletHandlers.handleConfirmPayment(req);
    }
    if (routeMatches(path, '/payments/status') && req.method === 'POST') {
      return walletHandlers.handleGetPaymentStatus(req);
    }

    if (routeMatches(path, '/communications/preferences') && req.method === 'GET') {
      return communicationHandlers.handleGetCommunicationPreferences(req);
    }
    if (routeMatches(path, '/communications/preferences') && req.method === 'PATCH') {
      return communicationHandlers.handlePatchCommunicationPreferences(req);
    }
    if (routeMatches(path, '/communications/deliver') && req.method === 'POST') {
      return communicationHandlers.handleQueueCommunicationDeliveries(req);
    }

    const auth = await authenticateRequest(req);
    if ('error' in auth) {
      return auth.error;
    }

    if (routeMatches(path, '/user/settings')) {
      if (req.method === 'GET') {
        return jsonResponse({ settings: await getUserSettings(auth.admin, auth.canonicalUser) });
      }

      if (req.method === 'PUT') {
        return jsonResponse({
          settings: await upsertUserSettings(auth.admin, auth.canonicalUser, await readJsonBody(req)),
        });
      }
    }

    if (routeMatches(path, '/safety/settings')) {
      if (req.method === 'GET') {
        return jsonResponse({ dashboard: await getSafetyDashboard(auth.admin, auth.canonicalUser) });
      }

      if (req.method === 'PUT') {
        return jsonResponse({
          settings: await upsertSafetySettings(auth.admin, auth.canonicalUser, await readJsonBody(req)),
        });
      }
    }

    if (routeMatches(path, '/safety/incident') && req.method === 'POST') {
      const body = await readJsonBody(req);
      const description = normalizeString(body.description);
      const type = normalizeString(body.type);

      if (!description || !type) {
        return jsonResponse({ error: 'Incident type and description are required.' }, 400);
      }

      const { data, error } = await auth.admin
        .from('safety_incidents')
        .insert({
          user_id: auth.canonicalUser.id,
          incident_type: type,
          description,
          incident_status: 'submitted',
          metadata: isRecord(body.metadata) ? body.metadata : {},
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('incident_id, incident_type, description, incident_status, submitted_at')
        .single();

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({
        incident: {
          description: String(data.description ?? ''),
          id: String(data.incident_id),
          status: String(data.incident_status ?? 'submitted'),
          submittedAt: String(data.submitted_at ?? new Date().toISOString()),
          type: String(data.incident_type ?? type),
        },
      }, 201);
    }

    if (routeMatches(path, '/safety/sos') && req.method === 'POST') {
      const body = await readJsonBody(req);
      const latitude = typeof body.latitude === 'number' ? body.latitude : null;
      const longitude = typeof body.longitude === 'number' ? body.longitude : null;

      const { data, error } = await auth.admin
        .from('safety_sos_alerts')
        .insert({
          user_id: auth.canonicalUser.id,
          latitude,
          longitude,
          location_label: normalizeString(body.locationLabel),
          alert_status: 'notified',
          metadata: isRecord(body.metadata) ? body.metadata : {},
          user_context: {
            authUserId: auth.authUser.id,
            email: auth.authUser.email ?? null,
            fullName:
              normalizeString(auth.authUser.user_metadata?.full_name) ||
              normalizeString(auth.authUser.user_metadata?.name) ||
              auth.canonicalUser.full_name ||
              null,
            phoneNumber:
              normalizeString(auth.authUser.user_metadata?.phone_number) ||
              normalizeString(auth.authUser.phone) ||
              auth.canonicalUser.phone_number ||
              null,
            activeTripId: normalizeString(body.activeTripId),
          },
          updated_at: new Date().toISOString(),
        })
        .select('alert_id, alert_status, created_at')
        .single();

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({
        alertId: String(data.alert_id),
        createdAt: String(data.created_at ?? new Date().toISOString()),
        notified: data.alert_status === 'notified',
        status: String(data.alert_status ?? 'created'),
      }, 201);
    }

    if (routeMatches(path, '/profile') && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { data, error } = await auth.admin
        .from('profiles')
        .upsert({
          id: auth.authUser.id,
          full_name:
            normalizeString(body.fullName) ||
            [normalizeString(body.firstName), normalizeString(body.lastName)].filter(Boolean).join(' ') ||
            auth.canonicalUser.full_name ||
            'Wasel User',
          email: normalizeString(body.email) ?? auth.authUser.email ?? auth.canonicalUser.email ?? null,
        }, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        return jsonResponse({ error: error.message }, 400);
      }

      return jsonResponse(data);
    }

    if (routeStartsWith(path, '/profile/') && req.method === 'GET') {
      const requestedId = path.slice('/profile/'.length);
      if (requestedId !== auth.authUser.id && requestedId !== auth.canonicalUser.id) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }

      const { data, error } = await auth.admin
        .from('profiles')
        .select('*')
        .eq('id', auth.authUser.id)
        .maybeSingle();

      if (error) {
        return jsonResponse({ error: error.message }, 404);
      }

      return jsonResponse(data ?? null);
    }

    if (routeStartsWith(path, '/profile/') && req.method === 'PATCH') {
      const updates = await readJsonBody(req);
      if ('wallet_balance' in updates) {
        delete updates.wallet_balance;
      }

      const { data, error } = await auth.admin
        .from('profiles')
        .update(updates)
        .eq('id', auth.authUser.id)
        .select()
        .single();

      if (error) {
        return jsonResponse({ error: error.message }, 400);
      }

      return jsonResponse(data);
    }

    if (routeMatches(path, '/admin/drivers/pending') && req.method === 'GET') {
      return handleGetPendingDriverApprovals(auth);
    }

    if (routeStartsWith(path, '/admin/drivers/') && path.endsWith('/approve') && req.method === 'POST') {
      const driverId = path.slice('/admin/drivers/'.length, -'/approve'.length).replace(/\/$/, '');
      return handleApproveDriver(auth, driverId);
    }

    if (routeMatches(path, '/rides')) {
      if (req.method === 'POST') {
        const body = await readJsonBody(req);
        const { data, error } = await auth.admin
          .from('rides')
          .insert({ ...body, passenger_id: auth.canonicalUser.id })
          .select()
          .single();

        if (error) {
          return jsonResponse({ error: error.message }, 400);
        }

        return jsonResponse(data);
      }

      if (req.method === 'GET') {
        const { data, error } = await auth.admin
          .from('rides')
          .select('*, trips(*), profiles(*)')
          .eq('passenger_id', auth.canonicalUser.id)
          .order('created_at', { ascending: false });

        if (error) {
          return jsonResponse({ error: error.message }, 400);
        }

        return jsonResponse(data ?? []);
      }
    }

    if (routeMatches(path, '/trips') && req.method === 'POST') {
      return handleCreateTrip(auth, await readJsonBody(req));
    }

    if (routeStartsWith(path, '/trips/user/') && req.method === 'GET') {
      const requestedUserId = path.slice('/trips/user/'.length).replace(/\/$/, '');
      if (requestedUserId !== auth.authUser.id && requestedUserId !== auth.canonicalUser.id) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }
      return jsonResponse(await handleGetDriverTrips(auth));
    }

    if (routeStartsWith(path, '/trips/') && path.endsWith('/publish') && req.method === 'POST') {
      const tripId = path.slice('/trips/'.length, -'/publish'.length);
      return handlePublishTrip(auth, tripId.replace(/\/$/, ''));
    }

    if (routeStartsWith(path, '/trips/') && path.endsWith('/bookings') && req.method === 'GET') {
      const tripId = path.slice('/trips/'.length, -'/bookings'.length).replace(/\/$/, '');
      const bookings = await handleGetTripBookings(auth, tripId);
      return bookings
        ? jsonResponse(bookings)
        : jsonResponse({ error: 'Trip not found.' }, 404);
    }

    if (routeStartsWith(path, '/trips/') && req.method === 'PUT') {
      const tripId = path.slice('/trips/'.length);
      return handleUpdateTrip(auth, tripId, await readJsonBody(req));
    }

    if (routeStartsWith(path, '/trips/') && req.method === 'DELETE') {
      const tripId = path.slice('/trips/'.length);
      return handleDeleteTrip(auth, tripId);
    }

    if (routeMatches(path, '/bookings') && req.method === 'POST') {
      return handleCreateBooking(auth, await readJsonBody(req));
    }

    if (routeStartsWith(path, '/bookings/user/') && req.method === 'GET') {
      const requestedUserId = path.slice('/bookings/user/'.length).replace(/\/$/, '');
      if (requestedUserId !== auth.authUser.id && requestedUserId !== auth.canonicalUser.id) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }
      return jsonResponse(await handleGetUserBookings(auth));
    }

    if (routeStartsWith(path, '/bookings/') && req.method === 'PUT') {
      const bookingId = path.slice('/bookings/'.length);
      return handleUpdateBookingStatus(auth, bookingId, await readJsonBody(req));
    }

    if (routeMatches(path, '/notifications') && req.method === 'GET') {
      return jsonResponse({ notifications: await handleGetNotifications(auth) });
    }

    if (routeStartsWith(path, '/notifications/') && path.endsWith('/read') && req.method === 'PATCH') {
      const notificationId = path.slice('/notifications/'.length, -'/read'.length).replace(/\/$/, '');
      return handleMarkNotificationAsRead(auth, notificationId);
    }

    if (routeMatches(path, '/notifications/send-push') && req.method === 'POST') {
      return handleCreateNotification(auth, await readJsonBody(req));
    }

    if (routeMatches(path, '/notifications/push-pref') && req.method === 'POST') {
      return handlePushPreference(auth, await readJsonBody(req));
    }

    if (routeMatches(path, '/active-trip')) {
      if (req.method === 'GET') {
        return jsonResponse({ activeTrip: await handleGetActiveTrip(auth) });
      }

      if (req.method === 'POST') {
        return jsonResponse({ activeTrip: await handleSetActiveTrip(auth, await readJsonBody(req)) }, 201);
      }

      if (req.method === 'PATCH') {
        return jsonResponse({ activeTrip: await handlePatchActiveTrip(auth, await readJsonBody(req)) });
      }

      if (req.method === 'DELETE') {
        await handleClearActiveTrip(auth);
        return jsonResponse({ success: true });
      }
    }

    if (routeMatches(path, '/packages') && req.method === 'POST') {
      return handleCreatePackage(auth, await readJsonBody(req));
    }

    if (routeMatches(path, '/reviews') && req.method === 'POST') {
      return handleCreateReview(req, auth, await readJsonBody(req));
    }

    return jsonResponse({ error: 'Not found' }, 404);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unexpected server error' },
      500,
    );
  }
});
