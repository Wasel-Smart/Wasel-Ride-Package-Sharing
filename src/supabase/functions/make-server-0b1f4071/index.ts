import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Wasel Supabase Edge Function entrypoint.
 *
 * This source is intentionally tracked with the frontend so API routes used by
 * `src/services/*` are auditable and versioned. Privileged Supabase service-role
 * work stays inside this server boundary; browser clients only call these routes
 * with a verified Supabase access token.
 */

type SupabaseClientLike = ReturnType<typeof createClient>;
type AuthContext = {
  authUser: { id: string; email?: string | null; phone?: string | null; user_metadata?: Record<string, unknown> | null };
  profile: Record<string, unknown>;
  supabase: SupabaseClientLike;
};

type RouteHandler = (request: Request, params: Record<string, string>) => Promise<Response> | Response;

type Route = {
  method: string;
  pattern: RegExp;
  params?: string[];
  handler: RouteHandler;
};

const allowedOrigins = ['https://wasel-smart.vercel.app'];

function corsHeaders(request: Request) {
  const origin = request.headers.get('origin') ?? '*';
  const allowed = allowedOrigins;
  const matched = allowed.some((candidate) => origin === candidate || origin.endsWith(`.${candidate}`));
  if (origin !== '*' && !matched) {
    return {
      'Access-Control-Allow-Headers': 'authorization, content-type, x-wasel-request-id, x-wasel-signature, idempotency-key',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Origin': allowed[0],
      'Vary': 'Origin',
      'Content-Type': 'application/json',
    };
  }
  return {
    'Access-Control-Allow-Headers': 'authorization, content-type, x-wasel-request-id, x-wasel-signature, idempotency-key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Origin': origin === '*' ? allowed[0] : origin,
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  };
}

const DEFAULT_SETTINGS = {
  display: { currency: 'JOD', direction: 'ltr', language: 'en', theme: 'dark' },
  notifications: { email: true, push: true, sms: false, whatsapp: false, preferredLanguage: 'en' },
  privacy: { dataAnalytics: false, hidePhoto: false, shareLocation: true, showProfile: true },
};

const DEFAULT_SAFETY_SETTINGS = {
  checklist: {},
  cultural: { genderPreference: 'no_preference', prayerStops: true, ramadanMode: false },
  emergencyContacts: [],
};

function json(request: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { headers: corsHeaders(request), status });
}

function readEnvironment() {
  const url = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('WASEL_SUPABASE_URL');
  const serviceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SECRET_KEY') ??
    Deno.env.get('WASEL_SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !serviceKey) {
    throw new Error('Supabase Edge Function environment is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }

  return { serviceKey, url };
}

function serviceClient() {
  const { serviceKey, url } = readEnvironment();
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'X-Wasel-Backend': 'edge-function' } },
  });
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.toLowerCase().startsWith('bearer ')) return null;
  return authorization.slice('bearer '.length).trim() || null;
}

async function requireAuth(request: Request): Promise<AuthContext | Response> {
  const token = bearerToken(request);
  if (!token) return json(request, 401, { error: 'Missing bearer token.' });

  const supabase = serviceClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return json(request, 401, { error: 'Invalid or expired bearer token.' });

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', data.user.id)
    .maybeSingle();

  if (profileError) return json(request, 500, { error: profileError.message });
  if (!profile) return json(request, 404, { error: 'User profile has not been created yet.' });

  return { authUser: data.user, profile, supabase };
}

function isAuthContext(value: AuthContext | Response): value is AuthContext {
  return !(value instanceof Response);
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (request.method === 'GET') return {};
  const text = await request.text();
  if (!text.trim()) return {};
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Request body must be a JSON object.');
  }
  return parsed as Record<string, unknown>;
}

function textValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolValue(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function jsonObject(value: unknown, fallback: Record<string, unknown> = {}): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : fallback;
}

function jsonArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeProvider(value: unknown): string {
  return ['stripe', 'cliq', 'aman', 'wallet'].includes(String(value)) ? String(value) : 'stripe';
}

function normalizeMethodType(value: unknown): string {
  return ['card', 'wallet', 'bank_transfer', 'cliq'].includes(String(value)) ? String(value) : 'card';
}

function normalizePurpose(value: unknown): string {
  return ['deposit', 'ride_payment', 'package_payment', 'subscription', 'withdrawal'].includes(String(value))
    ? String(value)
    : 'deposit';
}

function toProfile(row: Record<string, unknown>, driver?: Record<string, unknown> | null) {
  return {
    id: String(row.id),
    userId: String(row.auth_user_id ?? row.id),
    authUserId: row.auth_user_id ?? null,
    fullName: row.full_name ?? null,
    email: row.email ?? null,
    phoneNumber: row.phone_number ?? null,
    avatarUrl: row.avatar_url ?? null,
    role: row.role ?? 'passenger',
    profileStatus: row.profile_status ?? 'pending',
    verificationLevel: row.verification_level ?? 'level_0',
    sanadStatus: row.sanad_verified_status ?? 'unverified',
    driverStatus: driver?.driver_status ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function mapSettings(row: Record<string, unknown> | null | undefined) {
  return {
    ...DEFAULT_SETTINGS,
    display: { ...DEFAULT_SETTINGS.display, ...jsonObject(row?.display) },
    notifications: { ...DEFAULT_SETTINGS.notifications, ...jsonObject(row?.notifications) },
    privacy: { ...DEFAULT_SETTINGS.privacy, ...jsonObject(row?.privacy) },
  };
}

function mapSafetySettings(row: Record<string, unknown> | null | undefined) {
  return {
    checklist: jsonObject(row?.checklist),
    cultural: {
      genderPreference: row?.gender_preference ?? DEFAULT_SAFETY_SETTINGS.cultural.genderPreference,
      prayerStops: row?.prayer_stops ?? DEFAULT_SAFETY_SETTINGS.cultural.prayerStops,
      ramadanMode: row?.ramadan_mode ?? DEFAULT_SAFETY_SETTINGS.cultural.ramadanMode,
    },
    emergencyContacts: jsonArray(row?.emergency_contacts),
  };
}

function mapIncident(row: Record<string, unknown>) {
  return {
    description: String(row.description ?? ''),
    id: String(row.incident_id),
    status: row.incident_status ?? 'submitted',
    submittedAt: row.submitted_at ?? row.created_at ?? new Date().toISOString(),
    type: String(row.incident_type ?? 'other'),
  };
}

function mapPaymentMethod(row: Record<string, unknown>) {
  return {
    id: String(row.payment_method_id),
    type: row.method_type ?? 'card',
    provider: row.provider_name ?? 'stripe',
    label: row.label ?? row.brand ?? 'Payment method',
    last4: row.last4 ?? null,
    expiryMonth: row.expiry_month ?? null,
    expiryYear: row.expiry_year ?? null,
    isDefault: Boolean(row.is_default),
    status: row.status ?? 'active',
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function mapWalletTransaction(row: Record<string, unknown>) {
  const amount = numberValue(row.amount);
  const type = String(row.transaction_type ?? 'payment');
  const debitTypes = new Set(['withdrawal', 'transfer', 'escrow_hold', 'payment']);
  return {
    id: String(row.transaction_id),
    type,
    description: String(row.description ?? 'Wallet transaction'),
    amount: debitTypes.has(type) ? -Math.abs(amount) : Math.abs(amount),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    status: row.transaction_status ?? 'pending',
    counterpartyUserId: null,
    paymentIntentId: row.payment_intent_id ?? null,
    metadata: row.metadata ?? {},
  };
}

function mapPaymentIntent(row: Record<string, unknown>) {
  return {
    id: String(row.payment_intent_id),
    purpose: row.purpose ?? 'deposit',
    status: row.status ?? 'created',
    amount: numberValue(row.amount),
    currency: row.currency_code ?? 'JOD',
    paymentMethodType: row.payment_method_type ?? 'card',
    provider: row.provider_name ?? 'stripe',
    clientSecret: row.provider_client_secret ?? null,
    redirectUrl: row.redirect_url ?? null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    referenceType: row.reference_type ?? null,
    referenceId: row.reference_id ?? null,
  };
}

async function sha256(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function requireAdmin(context: AuthContext): Promise<Response | null> {
  if (context.profile.role === 'admin') return null;
  return json(request, 403, { error: 'Admin role is required.' });
}

async function ensureWallet(context: AuthContext) {
  const { data: existing, error: selectError } = await context.supabase
    .from('wallets')
    .select('*')
    .eq('user_id', context.profile.id)
    .maybeSingle();
  if (selectError) throw new Error(selectError.message);
  if (existing) return existing as Record<string, unknown>;

  const { data, error } = await context.supabase
    .from('wallets')
    .insert({ user_id: context.profile.id, currency_code: 'JOD', wallet_status: 'active' })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

async function getProfileDriver(context: AuthContext, profileId: string) {
  const { data } = await context.supabase.from('drivers').select('*').eq('user_id', profileId).maybeSingle();
  return data as Record<string, unknown> | null;
}

async function handleCreateProfile(request: Request) {
  const token = bearerToken(request);
  if (!token) return json(request, 401, { error: 'Missing bearer token.' });
  const supabase = serviceClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return json(request, 401, { error: 'Invalid or expired bearer token.' });

  const body = await readJson(request);
  const metadata = userData.user.user_metadata ?? {};
  const email = textValue(body.email, userData.user.email ?? 'unknown@example.invalid').toLowerCase();
  const firstName = textValue(body.firstName, textValue(metadata.first_name));
  const lastName = textValue(body.lastName, textValue(metadata.last_name));
  const fullName = textValue(body.fullName, textValue(body.full_name, `${firstName} ${lastName}`.trim() || email.split('@')[0]));
  const phoneNumber = textValue(body.phoneNumber, userData.user.phone ?? `auth-${userData.user.id.slice(0, 12)}`);

  const { data, error } = await supabase
    .from('users')
    .upsert({
      auth_user_id: userData.user.id,
      email,
      full_name: fullName,
      phone_number: phoneNumber,
      profile_status: 'active',
      role: body.role === 'driver' ? 'driver' : 'passenger',
    }, { onConflict: 'auth_user_id' })
    .select('*')
    .single();

  if (error) return json(request, 400, { error: error.message });
  return json(request, 200, { profile: toProfile(data as Record<string, unknown>) });
}

async function handleGetProfile(request: Request, params: Record<string, string>) {
  const context = await requireAuth(request);
  if (!isAuthContext(context)) return context;
  const target = decodeURIComponent(params.userId ?? '');
  const ownProfile = target === context.authUser.id || target === context.profile.id;
  if (!ownProfile && context.profile.role !== 'admin') return json(request, 403, { error: 'Cannot read another user profile.' });

  const query = context.supabase.from('users').select('*');
  const { data, error } = await (target === context.authUser.id
    ? query.eq('auth_user_id', target).maybeSingle()
    : query.eq('id', target).maybeSingle());
  if (error) return json(request, 500, { error: error.message });
  if (!data) return json(request, 404, { error: 'Profile not found.' });
  const driver = await getProfileDriver(context, String((data as Record<string, unknown>).id));
  return json(request, 200, { profile: toProfile(data as Record<string, unknown>, driver), ...toProfile(data as Record<string, unknown>, driver) });
}

async function handleUpdateProfile(request: Request, params: Record<string, string>) {
  const context = await requireAuth(request);
  if (!isAuthContext(context)) return context;
  const target = decodeURIComponent(params.userId ?? '');
  const ownProfile = target === context.authUser.id || target === context.profile.id;
  if (!ownProfile && context.profile.role !== 'admin') return json(request, 403, { error: 'Cannot update another user profile.' });

  const body = await readJson(request);
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.fullName === 'string' || typeof body.full_name === 'string') updates.full_name = textValue(body.fullName, textValue(body.full_name));
  if (typeof body.phoneNumber === 'string' || typeof body.phone_number === 'string') updates.phone_number = textValue(body.phoneNumber, textValue(body.phone_number));
  if (typeof body.avatarUrl === 'string' || typeof body.avatar_url === 'string') updates.avatar_url = textValue(body.avatarUrl, textValue(body.avatar_url));

  const query = context.supabase.from('users').update(updates).select('*');
  const { data, error } = await (target === context.authUser.id
    ? query.eq('auth_user_id', target).single()
    : query.eq('id', target).single());
  if (error) return json(request, 400, { error: error.message });
  const driver = await getProfileDriver(context, String((data as Record<string, unknown>).id));
  return json(request, 200, { profile: toProfile(data as Record<string, unknown>, driver), ...toProfile(data as Record<string, unknown>, driver) });
}

async function handleWalletSnapshot(request: Request) {
  const context = await requireAuth(request);
  if (!isAuthContext(context)) return context;
  const wallet = await ensureWallet(context);

  const [{ data: methods }, { data: transactions }, { data: pins }] = await Promise.all([
    context.supabase.from('wallet_payment_methods').select('*').eq('user_id', context.profile.id).neq('status', 'disabled').order('created_at', { ascending: false }),
    context.supabase.from('wallet_transactions').select('*').eq('initiated_by_user_id', context.profile.id).order('created_at', { ascending: false }).limit(50),
    context.supabase.schema('private').from('wallet_pin_secrets').select('user_id').eq('user_id', context.profile.id).maybeSingle(),
  ]);

  const txs = (transactions ?? []).map((row: Record<string, unknown>) => mapWalletTransaction(row));
  const balance = numberValue(wallet.balance);
  const response = {
    wallet: {
      id: wallet.wallet_id ?? null,
      userId: wallet.user_id ?? null,
      walletType: 'custodial',
      status: wallet.wallet_status === 'frozen' ? 'limited' : wallet.wallet_status ?? 'active',
      currency: wallet.currency_code ?? 'JOD',
      autoTopUp: boolValue(wallet.auto_top_up_enabled, false),
      autoTopUpAmount: numberValue(wallet.auto_top_up_amount, 20),
      autoTopUpThreshold: numberValue(wallet.auto_top_up_threshold, 5),
      paymentMethods: (methods ?? []).map((row: Record<string, unknown>) => mapPaymentMethod(row)),
      createdAt: wallet.created_at ?? null,
    },
    balance,
    pendingBalance: numberValue(wallet.pending_balance),
    rewardsBalance: 0,
    total_earned: txs.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0),
    total_spent: txs.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
    total_deposited: txs.filter((tx) => tx.type === 'deposit').reduce((sum, tx) => sum + tx.amount, 0),
    currency: wallet.currency_code ?? 'JOD',
    pinSet: Boolean(pins),
    autoTopUp: boolValue(wallet.auto_top_up_enabled, false),
    transactions: txs,
    activeEscrows: [],
    activeRewards: [],
    subscription: null,
  };

  return json(request, 200, response);
}

async function handleCreateIntent(request: Request) {
  const context = await requireAuth(request);
  if (!isAuthContext(context)) return context;
  const body = await readJson(request);
  const idempotencyKey = textValue(body.idempotencyKey, request.headers.get('idempotency-key') ?? '');

  if (idempotencyKey) {
    const { data } = await context.supabase
      .from('wallet_payment_intents')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (data) return json(request, 200, mapPaymentIntent(data as Record<string, unknown>));
  }

  const amount = numberValue(body.amount);
  if (amount <= 0) return json(request, 400, { error: 'Amount must be greater than zero.' });

  const methodType = normalizeMethodType(body.paymentMethodType);
  const provider = methodType === 'wallet' ? 'wallet' : normalizeProvider(body.providerName ?? body.provider);
  const { data, error } = await context.supabase
    .from('wallet_payment_intents')
    .insert({
      amount,
      currency_code: textValue(body.currency, 'JOD'),
      idempotency_key: idempotencyKey || null,
      metadata: jsonObject(body.metadata),
      payment_method_type: methodType,
      provider_client_secret: provider === 'wallet' ? null : crypto.randomUUID(),
      provider_name: provider,
      purpose: normalizePurpose(body.purpose),
      reference_id: body.referenceId ?? null,
      reference_type: body.referenceType ?? null,
      status: methodType === 'wallet' ? 'requires_confirmation' : 'created',
      user_id: context.profile.id,
    })
    .select('*')
    .single();

  if (error) return json(request, 400, { error: error.message });
  return json(request, 200, mapPaymentIntent(data as Record<string, unknown>));
}

async function handleConfirmIntent(request: Request) {
  const context = await requireAuth(request);
  if (!isAuthContext(context)) return context;
  const body = await readJson(request);
  const intentId = textValue(body.paymentIntentId, textValue(body.intentId, textValue(body.id)));
  if (!intentId) return json(request, 400, { error: 'paymentIntentId is required.' });

  const { data, error } = await context.supabase
    .from('wallet_payment_intents')
    .update({ confirmed_at: new Date().toISOString(), status: 'processing', updated_at: new Date().toISOString() })
    .eq('payment_intent_id', intentId)
    .eq('user_id', context.profile.id)
    .select('*')
    .single();

  if (error) return json(request, 400, { error: error.message });
  return json(request, 200, { id: intentId, status: (data as Record<string, unknown>).status ?? 'processing', settled: false, clientSecret: (data as Record<string, unknown>).provider_client_secret ?? null });
}

async function handlePaymentStatus(request: Request) {
  const context = await requireAuth(request);
  if (!isAuthContext(context)) return context;
  const body = await readJson(request);
  const intentId = textValue(body.paymentIntentId, textValue(body.intentId, textValue(body.id)));
  if (!intentId) return json(request, 400, { error: 'paymentIntentId is required.' });
  const { data, error } = await context.supabase
    .from('wallet_payment_intents')
    .select('*')
    .eq('payment_intent_id', intentId)
    .eq('user_id', context.profile.id)
    .single();
  if (error) return json(request, 404, { error: 'Payment intent not found.' });
  return json(request, 200, mapPaymentIntent(data as Record<string, unknown>));
}

async function handlePaymentMethods(request: Request) {
  const context = await requireAuth(request);
  if (!isAuthContext(context)) return context;
  const body = await readJson(request);
  const action = textValue(body.action, 'add');

  if (action === 'remove') {
    const id = textValue(body.paymentMethodId);
    const { error } = await context.supabase.from('wallet_payment_methods').update({ status: 'disabled', updated_at: new Date().toISOString() }).eq('payment_method_id', id).eq('user_id', context.profile.id);
    if (error) return json(request, 400, { error: error.message });
    return json(request, 200, { ok: true });
  }

  if (action === 'default') {
    const id = textValue(body.paymentMethodId);
    await context.supabase.from('wallet_payment_methods').update({ is_default: false }).eq('user_id', context.profile.id);
    const { error } = await context.supabase.from('wallet_payment_methods').update({ is_default: true, updated_at: new Date().toISOString() }).eq('payment_method_id', id).eq('user_id', context.profile.id);
    if (error) return json(request, 400, { error: error.message });
    return json(request, 200, { ok: true });
  }

  const providerReference = textValue(body.providerReference, textValue(body.tokenReference, crypto.randomUUID()));
  const { data, error } = await context.supabase
    .from('wallet_payment_methods')
    .insert({
      brand: body.brand ?? null,
      expiry_month: body.expiryMonth ?? null,
      expiry_year: body.expiryYear ?? null,
      is_default: Boolean(body.isDefault),
      label: textValue(body.label, 'Payment method'),
      last4: body.last4 ?? null,
      method_type: normalizeMethodType(body.type),
      provider_name: normalizeProvider(body.provider),
      provider_reference: providerReference,
      user_id: context.profile.id,
    })
    .select('*')
    .single();
  if (error) return json(request, 400, { error: error.message });
  return json(request, 200, { paymentMethod: mapPaymentMethod(data as Record<string, unknown>) });
}

async function handleSetPin(request: Request) {
  const context = await requireAuth(request);
  if (!isAuthContext(context)) return context;
  const body = await readJson(request);
  const pin = textValue(body.pin);
  if (!/^\d{4,8}$/.test(pin)) return json(request, 400, { error: 'PIN must be 4 to 8 digits.' });
  const pinHash = await sha256(`${context.profile.id}:${pin}`);
  const { error } = await context.supabase
    .schema('private')
    .from('wallet_pin_secrets')
    .upsert({ user_id: context.profile.id, pin_hash: pinHash, failed_attempts: 0, locked_until: null, pin_updated_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) return json(request, 400, { error: error.message });
  return json(request, 200, { ok: true });
}

async function handleVerifyPin(request: Request) {
  const context = await requireAuth(request);
  if (!isAuthContext(context)) return context;
  const body = await readJson(request);
  const pin = textValue(body.pin);
  const purpose = ['transfer', 'withdrawal', 'payment_method', 'deposit', 'subscription'].includes(String(body.purpose)) ? String(body.purpose) : 'transfer';
  const pinHash = await sha256(`${context.profile.id}:${pin}`);
  const { data } = await context.supabase.schema('private').from('wallet_pin_secrets').select('*').eq('user_id', context.profile.id).maybeSingle();
  if (!data || (data as Record<string, unknown>).pin_hash !== pinHash) {
    return json(request, 401, { purpose, verified: false, otpRequired: false });
  }
  const token = crypto.randomUUID();
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  await context.supabase.schema('private').from('wallet_step_up_tokens').insert({ user_id: context.profile.id, purpose, token_hash: tokenHash, expires_at: expiresAt });
  return json(request, 200, { purpose, verified: true, otpRequired: false, verificationToken: token, expiresAt });
}

async function handleWalletSettings(request: Request) {
  const context = await requireAuth(request);
  if (!isAuthContext(context)) return context;
  const body = await readJson(request);
  await ensureWallet(context);
  const { error } = await context.supabase.from('wallets').update({
    auto_top_up_amount: numberValue(body.autoTopUpAmount, 20),
    auto_top_up_enabled: Boolean(body.autoTopUpEnabled),
    auto_top_up_threshold: numberValue(body.autoTopUpThreshold, 5),
    updated_at: new Date().toISOString(),
  }).eq('user_id', context.profile.id);
  if (error) return json(request, 400, { error: error.message });
  return json(request, 200, { ok: true });
}

async function handleWalletMutation(request: Request, type: 'withdrawal' | 'transfer') {
  const context = await requireAuth(request);
  if (!isAuthContext(context)) return context;
  const body = await readJson(request);
  const amount = numberValue(body.amount);
  if (amount <= 0) return json(request, 400, { error: 'Amount must be greater than zero.' });
  const { data, error } = await context.supabase.from('wallet_transactions').insert({
    amount,
    currency_code: 'JOD',
    description: type === 'withdrawal' ? 'Withdrawal request' : 'Wallet transfer request',
    idempotency_key: textValue(body.idempotencyKey, request.headers.get('idempotency-key') ?? crypto.randomUUID()),
    initiated_by_user_id: context.profile.id,
    metadata: jsonObject(body.metadata, { recipientUserId: body.recipientUserId ?? null, note: body.note ?? null }),
    transaction_status: 'pending',
    transaction_type: type,
  }).select('*').single();
  if (error) return json(request, 400, { error: error.message });
  return json(request, 202, { transaction: mapWalletTransaction(data as Record<string, unknown>) });
}

async function handlePendingDrivers(request: Request) {
  const context = await requireAuth(request);
  if (!isAuthContext(context)) return context;
  const adminError = await requireAdmin(context);
  if (adminError) return adminError;
  const { data, error } = await context.supabase
    .from('drivers')
    .select('*, users(*)')
    .eq('driver_status', 'pending_approval')
    .order('updated_at', { ascending: true });
  if (error) return json(request, 500, { error: error.message });

  return json(request, 200, {
    drivers: (data ?? []).map((driver: Record<string, unknown>) => {
      const user = jsonObject(driver.users);
      const ready = Boolean(user.email) && Boolean(user.phone_number) && ['level_2', 'level_3'].includes(String(driver.verification_level ?? user.verification_level));
      return {
        driverId: driver.driver_id,
        userId: driver.user_id,
        fullName: user.full_name ?? 'Driver',
        email: user.email ?? null,
        phoneNumber: user.phone_number ?? null,
        driverStatus: driver.driver_status,
        verificationLevel: driver.verification_level ?? user.verification_level ?? 'level_0',
        sanadStatus: user.sanad_verified_status ?? null,
        readyForApproval: ready,
        createdAt: driver.created_at ?? null,
        updatedAt: driver.updated_at ?? null,
      };
    }),
  });
}

async function handleApproveDriver(request: Request, params: Record<string, string>) {
  const context = await requireAuth(request);
  if (!isAuthContext(context)) return context;
  const adminError = await requireAdmin(context);
  if (adminError) return adminError;
  const driverId = decodeURIComponent(params.driverId ?? '');
  const { data, error } = await context.supabase
    .from('drivers')
    .update({ driver_status: 'approved', updated_at: new Date().toISOString() })
    .eq('driver_id', driverId)
    .select('*, users(*)')
    .single();
  if (error) return json(request, 400, { error: error.message });
  return json(request, 200, { driver: data, ok: true });
}

async function handleSafetyDashboard(request: Request) {
  const context = await requireAuth(request);
  if (!isAuthContext(context)) return context;
  const [{ data: settings }, { data: incidents }] = await Promise.all([
    context.supabase.from('safety_settings').select('*').eq('user_id', context.profile.id).maybeSingle(),
    context.supabase.from('safety_incidents').select('*').eq('user_id', context.profile.id).order('submitted_at', { ascending: false }).limit(20),
  ]);
  return json(request, 200, { dashboard: { settings: mapSafetySettings(settings as Record<string, unknown> | null), incidents: (incidents ?? []).map((row: Record<string, unknown>) => mapIncident(row)) } });
}

async function handleUpdateSafetySettings(request: Request) {
  const context = await requireAuth(request);
  if (!isAuthContext(context)) return context;
  const body = await readJson(request);
  const cultural = jsonObject(body.cultural);
  const payload = {
    checklist: jsonObject(body.checklist),
    emergency_contacts: jsonArray(body.emergencyContacts),
    gender_preference: textValue(cultural.genderPreference, 'no_preference'),
    prayer_stops: cultural.prayerStops ?? true,
    ramadan_mode: cultural.ramadanMode ?? false,
    updated_at: new Date().toISOString(),
    user_id: context.profile.id,
  };
  const { data, error } = await context.supabase.from('safety_settings').upsert(payload, { onConflict: 'user_id' }).select('*').single();
  if (error) return json(request, 400, { error: error.message });
  return json(request, 200, { settings: mapSafetySettings(data as Record<string, unknown>) });
}

async function handleSafetyIncident(request: Request) {
  const context = await requireAuth(request);
  if (!isAuthContext(context)) return context;
  const body = await readJson(request);
  const incidentType = textValue(body.type, 'other');
  const description = textValue(body.description);
  if (!description) return json(request, 400, { error: 'description is required.' });
  const { data, error } = await context.supabase.from('safety_incidents').insert({ user_id: context.profile.id, incident_type: incidentType, description, metadata: jsonObject(body.metadata) }).select('*').single();
  if (error) return json(request, 400, { error: error.message });
  return json(request, 200, { incident: mapIncident(data as Record<string, unknown>) });
}

async function handleSos(request: Request) {
  const context = await requireAuth(request);
  if (!isAuthContext(context)) return context;
  const body = await readJson(request);
  const { data, error } = await context.supabase.from('safety_sos_alerts').insert({
    alert_status: 'notified',
    latitude: body.latitude ?? null,
    location_label: body.locationLabel ?? null,
    longitude: body.longitude ?? null,
    metadata: jsonObject(body.metadata),
    user_context: { activeTripId: body.activeTripId ?? null },
    user_id: context.profile.id,
  }).select('*').single();
  if (error) return json(request, 400, { error: error.message });
  const alert = data as Record<string, unknown>;
  return json(request, 200, { alertId: String(alert.alert_id), createdAt: String(alert.created_at), notified: true, status: alert.alert_status ?? 'notified' });
}

async function handleGetSettings(request: Request) {
  const context = await requireAuth(request);
  if (!isAuthContext(context)) return context;
  const { data } = await context.supabase.from('user_settings').select('*').eq('user_id', context.profile.id).maybeSingle();
  return json(request, 200, { settings: mapSettings(data as Record<string, unknown> | null) });
}

async function handlePutSettings(request: Request) {
  const context = await requireAuth(request);
  if (!isAuthContext(context)) return context;
  const body = await readJson(request);
  const current = await context.supabase.from('user_settings').select('*').eq('user_id', context.profile.id).maybeSingle();
  const merged = mapSettings(current.data as Record<string, unknown> | null);
  const settings = {
    display: { ...merged.display, ...jsonObject(body.display) },
    notifications: { ...merged.notifications, ...jsonObject(body.notifications) },
    privacy: { ...merged.privacy, ...jsonObject(body.privacy) },
  };
  const { data, error } = await context.supabase.from('user_settings').upsert({ ...settings, updated_at: new Date().toISOString(), user_id: context.profile.id }, { onConflict: 'user_id' }).select('*').single();
  if (error) return json(request, 400, { error: error.message });
  return json(request, 200, { settings: mapSettings(data as Record<string, unknown>) });
}

const routes: Route[] = [
  { method: 'GET', pattern: /^\/health$/, handler: () => json(request, 200, { ok: true, service: 'wasel-edge', version: 'tracked-v2' }) },
  { method: 'POST', pattern: /^\/profile$/, handler: handleCreateProfile },
  { method: 'GET', pattern: /^\/profile\/([^/]+)$/, params: ['userId'], handler: handleGetProfile },
  { method: 'PATCH', pattern: /^\/profile\/([^/]+)$/, params: ['userId'], handler: handleUpdateProfile },
  { method: 'GET', pattern: /^\/wallet$/, handler: handleWalletSnapshot },
  { method: 'POST', pattern: /^\/wallet\/withdraw$/, handler: (request) => handleWalletMutation(request, 'withdrawal') },
  { method: 'POST', pattern: /^\/wallet\/transfer$/, handler: (request) => handleWalletMutation(request, 'transfer') },
  { method: 'POST', pattern: /^\/wallet\/payment-methods$/, handler: handlePaymentMethods },
  { method: 'POST', pattern: /^\/wallet\/set-pin$/, handler: handleSetPin },
  { method: 'POST', pattern: /^\/wallet\/verify-pin$/, handler: handleVerifyPin },
  { method: 'POST', pattern: /^\/wallet\/settings$/, handler: handleWalletSettings },
  { method: 'POST', pattern: /^\/payments\/create-intent$/, handler: handleCreateIntent },
  { method: 'POST', pattern: /^\/payments\/confirm$/, handler: handleConfirmIntent },
  { method: 'POST', pattern: /^\/payments\/status$/, handler: handlePaymentStatus },
  { method: 'GET', pattern: /^\/admin\/drivers\/pending$/, handler: handlePendingDrivers },
  { method: 'POST', pattern: /^\/admin\/drivers\/([^/]+)\/approve$/, params: ['driverId'], handler: handleApproveDriver },
  { method: 'GET', pattern: /^\/safety\/settings$/, handler: handleSafetyDashboard },
  { method: 'PUT', pattern: /^\/safety\/settings$/, handler: handleUpdateSafetySettings },
  { method: 'POST', pattern: /^\/safety\/incident$/, handler: handleSafetyIncident },
  { method: 'POST', pattern: /^\/safety\/sos$/, handler: handleSos },
  { method: 'GET', pattern: /^\/user\/settings$/, handler: handleGetSettings },
  { method: 'PUT', pattern: /^\/user\/settings$/, handler: handlePutSettings },
];

function matchRoute(method: string, pathname: string) {
  for (const route of routes) {
    if (route.method !== method) continue;
    const match = pathname.match(route.pattern);
    if (!match) continue;
    const params = Object.fromEntries((route.params ?? []).map((key, index) => [key, match[index + 1] ?? '']));
    return { params, route };
  }
  return null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: jsonHeaders, status: 204 });

  const url = new URL(request.url);
  const matched = matchRoute(request.method, url.pathname);
  if (!matched) return json(request, 404, { error: 'Route not found.', path: url.pathname });

  try {
    return await matched.route.handler(request, matched.params);
  } catch (error) {
    return json(request, 500, { error: error instanceof Error ? error.message : 'Unexpected Edge Function error.' });
  }
});
