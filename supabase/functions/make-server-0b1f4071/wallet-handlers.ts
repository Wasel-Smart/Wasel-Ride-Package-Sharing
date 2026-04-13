import type { SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  ESCROW_STATUSES,
  isPaymentIntentPurpose,
  isStepUpPurpose,
  isWalletPaymentMethodType,
  isWalletProviderName,
  PAYMENT_INTENT_STATUSES,
  STEP_UP_PURPOSES,
  WALLET_PAYMENT_METHOD_TYPES,
  WALLET_PROVIDER_NAMES,
  WALLET_TRANSACTION_TYPES,
  type PaymentIntentPurpose,
  type StepUpPurpose,
  type WalletProviderName,
} from '../../../shared/wallet-contracts.ts';
import {
  getClientIp,
  sanitizeEdgeErrorMessage,
  takeRateLimitToken,
  timingSafeEqual,
} from './_shared/security-runtime.ts';

interface CanonicalUser {
  id: string;
  email?: string | null;
  phone_number?: string | null;
}

type AuthenticatedRequest = {
  admin: SupabaseClient;
  authUser: User;
  canonicalUser: CanonicalUser;
};

type AuthenticationResult = AuthenticatedRequest | { error: Response };

interface WalletRuntime {
  authenticateRequest: (request: Request) => Promise<AuthenticationResult>;
  getAdminClient: () => SupabaseClient;
  json: (data: unknown, status?: number) => Response;
}

type WalletRouteContext = AuthenticatedRequest & {
  request: Request;
};

const OTP_TTL_MS = 10 * 60_000;
const STEP_UP_TOKEN_TTL_MS = 10 * 60_000;
const PIN_LOCK_WINDOW_MS = 10 * 60_000;
const MAX_PIN_FAILURES = 5;
const WALLET_VERIFY_RATE_LIMIT = { maxRequests: 12, windowMs: 10 * 60_000 };
const WALLET_TRANSFER_RATE_LIMIT = { maxRequests: 12, windowMs: 10 * 60_000 };
const WALLET_MUTATION_RATE_LIMIT = { maxRequests: 20, windowMs: 10 * 60_000 };

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const LOCAL_GATEWAY_WEBHOOK_SECRET = Deno.env.get('LOCAL_GATEWAY_WEBHOOK_SECRET') ?? '';
const WALLET_STEP_UP_SECRET = Deno.env.get('WALLET_STEP_UP_SECRET')
  ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  ?? 'wallet-step-up-development-secret';

function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  return request.json()
    .then((body) => (body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}))
    .catch(() => ({}));
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCurrency(value: unknown): string {
  const resolved = String(value ?? 'JOD').trim().toUpperCase();
  return resolved || 'JOD';
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toIsoDate(value: unknown): string | null {
  const raw = normalizeString(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function encodeText(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encodeText(value));
  return toHex(new Uint8Array(digest));
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encodeText(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encodeText(payload));
  return toHex(new Uint8Array(signature));
}

function minorUnitMultiplier(currency: string): number {
  const upper = normalizeCurrency(currency);
  if (upper === 'JOD' || upper === 'BHD' || upper === 'KWD') {
    return 1000;
  }
  return 100;
}

function toMinorUnits(amount: number, currency: string): number {
  return Math.round(amount * minorUnitMultiplier(currency));
}

function maskDestination(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.includes('@')) {
    const [local, domain] = value.split('@');
    if (!local || !domain) return null;
    return `${local.slice(0, 2)}***@${domain}`;
  }
  return `${value.slice(0, Math.min(4, value.length))}***`;
}

function buildRateLimitKey(request: Request, userId: string, action: string): string {
  return ['wallet', action, userId, getClientIp(request)].join(':');
}

async function requireAllowedRate(
  runtime: WalletRuntime,
  request: Request,
  userId: string,
  action: string,
  limits: { maxRequests: number; windowMs: number },
) {
  if (!takeRateLimitToken({ key: buildRateLimitKey(request, userId, action), ...limits })) {
    throw runtime.json({ error: 'Too many wallet requests. Please wait and try again.' }, 429);
  }
}

async function ensureWalletProfile(admin: SupabaseClient, userId: string) {
  const { data: profile, error: profileError } = await admin
    .from('wallet_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile) {
    const now = new Date().toISOString();
    const { data: created, error: createError } = await admin
      .from('wallet_profiles')
      .insert({
        user_id: userId,
        wallet_status: 'active',
        currency_code: 'JOD',
        auto_top_up_enabled: false,
        auto_top_up_amount: 20,
        auto_top_up_threshold: 5,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single();

    if (createError) {
      throw new Error(createError.message);
    }

    return created;
  }

  return profile;
}

async function ensureWalletAccount(
  admin: SupabaseClient,
  args: {
    ownerUserId: string | null;
    scope: string;
    currencyCode?: string;
    normalBalance: 'debit' | 'credit';
    accountName: string;
    metadata?: Record<string, unknown>;
  },
) {
  let query = admin
    .from('wallet_accounts')
    .select('*')
    .eq('account_scope', args.scope)
    .eq('currency_code', normalizeCurrency(args.currencyCode));

  query = args.ownerUserId
    ? query.eq('owner_user_id', args.ownerUserId)
    : query.is('owner_user_id', null);

  const { data: existing, error: existingError } = await query.maybeSingle();
  if (existingError) {
    throw new Error(existingError.message);
  }
  if (existing) return existing;

  const now = new Date().toISOString();
  const { data: inserted, error: insertError } = await admin
    .from('wallet_accounts')
    .insert({
      owner_user_id: args.ownerUserId,
      account_scope: args.scope,
      account_name: args.accountName,
      currency_code: normalizeCurrency(args.currencyCode),
      normal_balance: args.normalBalance,
      metadata: args.metadata ?? {},
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return inserted;
}

async function ensureWalletInfrastructure(admin: SupabaseClient, userId: string) {
  const profile = await ensureWalletProfile(admin, userId);
  const availableAccount = await ensureWalletAccount(admin, {
    ownerUserId: userId,
    scope: 'user_available',
    currencyCode: profile.currency_code,
    normalBalance: 'credit',
    accountName: 'User Available Wallet',
  });
  const escrowAccount = await ensureWalletAccount(admin, {
    ownerUserId: userId,
    scope: 'user_escrow',
    currencyCode: profile.currency_code,
    normalBalance: 'credit',
    accountName: 'User Escrow Wallet',
  });

  return { profile, availableAccount, escrowAccount };
}

async function getSystemAccount(admin: SupabaseClient, scope: string, currency = 'JOD') {
  return ensureWalletAccount(admin, {
    ownerUserId: null,
    scope,
    currencyCode: currency,
    normalBalance: scope === 'revenue' ? 'credit' : 'debit',
    accountName: scope.replace(/_/g, ' '),
  });
}

async function createEscrowLedgerAccount(
  admin: SupabaseClient,
  args: {
    currencyCode: string;
    accountName: string;
    metadata: Record<string, unknown>;
  },
) {
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('wallet_accounts')
    .insert({
      owner_user_id: null,
      account_scope: 'platform_escrow',
      account_name: args.accountName,
      currency_code: normalizeCurrency(args.currencyCode),
      normal_balance: 'credit',
      metadata: args.metadata,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function postLedgerTransaction(
  admin: SupabaseClient,
  args: {
    transactionType: string;
    transactionStatus: string;
    initiatedByUserId: string | null;
    amount: number;
    currencyCode: string;
    description: string;
    referenceType?: string | null;
    referenceId?: string | null;
    metadata?: Record<string, unknown>;
    entries: Array<{ account_id: string; entry_side: 'debit' | 'credit'; amount: number; memo?: string }>;
    participants?: string[];
    paymentIntentId?: string | null;
    idempotencyKey?: string | null;
  },
) {
  const { data, error } = await admin.rpc('wallet_post_ledger_transaction', {
    p_transaction_type: args.transactionType,
    p_transaction_status: args.transactionStatus,
    p_initiated_by_user_id: args.initiatedByUserId,
    p_amount: args.amount,
    p_currency_code: normalizeCurrency(args.currencyCode),
    p_description: args.description,
    p_reference_type: args.referenceType ?? null,
    p_reference_id: args.referenceId ?? null,
    p_metadata: args.metadata ?? {},
    p_entries: args.entries,
    p_participants: args.participants ?? null,
    p_payment_intent_id: args.paymentIntentId ?? null,
    p_idempotency_key: args.idempotencyKey ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return String(data);
}

async function getOwnedAccountIds(admin: SupabaseClient, userId: string): Promise<string[]> {
  const { data, error } = await admin
    .from('wallet_accounts')
    .select('account_id')
    .eq('owner_user_id', userId);

  if (error) {
    throw new Error(error.message);
  }

  return Array.isArray(data) ? data.map((row) => String(row.account_id)) : [];
}

async function resolveRecipientUser(admin: SupabaseClient, recipient: string) {
  const trimmed = recipient.trim();
  const selectors = [
    admin.from('users').select('id, email, phone_number').eq('id', trimmed).maybeSingle(),
    admin.from('users').select('id, email, phone_number').eq('email', trimmed).maybeSingle(),
    admin.from('users').select('id, email, phone_number').eq('phone_number', trimmed).maybeSingle(),
  ];

  for (const attempt of selectors) {
    const { data, error } = await attempt;
    if (error) {
      throw new Error(error.message);
    }
    if (data) return data;
  }

  return null;
}

async function setWalletPin(admin: SupabaseClient, userId: string, pin: string) {
  const now = new Date().toISOString();
  const pinHash = await sha256Hex(`${WALLET_STEP_UP_SECRET}:${pin}`);
  const { error } = await admin
    .schema('private')
    .from('wallet_pin_secrets')
    .upsert({
      user_id: userId,
      pin_hash: pinHash,
      failed_attempts: 0,
      locked_until: null,
      created_at: now,
      updated_at: now,
      pin_updated_at: now,
    }, { onConflict: 'user_id' });

  if (error) {
    throw new Error(error.message);
  }
}

async function getWalletPinSecret(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin
    .schema('private')
    .from('wallet_pin_secrets')
    .select('pin_hash, failed_attempts, locked_until')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function recordPinFailure(
  admin: SupabaseClient,
  userId: string,
  currentFailures: number,
) {
  const nextFailures = currentFailures + 1;
  const now = new Date().toISOString();
  const lockedUntil = nextFailures >= MAX_PIN_FAILURES
    ? new Date(Date.now() + PIN_LOCK_WINDOW_MS).toISOString()
    : null;

  const { error } = await admin
    .schema('private')
    .from('wallet_pin_secrets')
    .update({
      failed_attempts: nextFailures,
      locked_until: lockedUntil,
      updated_at: now,
    })
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
}

async function clearPinFailures(admin: SupabaseClient, userId: string) {
  const { error } = await admin
    .schema('private')
    .from('wallet_pin_secrets')
    .update({
      failed_attempts: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
}

async function enqueueOtpDelivery(
  admin: SupabaseClient,
  args: {
    userId: string;
    destination: string;
    channel: 'email' | 'sms';
    otpCode: string;
    purpose: StepUpPurpose;
  },
) {
  const payload = {
    purpose: args.purpose,
    otpCode: args.otpCode,
    copy: `Your Wasel wallet verification code is ${args.otpCode}. It expires in 10 minutes.`,
  };

  const { error } = await admin
    .from('communication_deliveries')
    .insert({
      user_id: args.userId,
      channel: args.channel,
      delivery_status: 'queued',
      destination: args.destination,
      subject: 'Wallet verification code',
      payload,
      provider_name: 'wallet_step_up',
      queued_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.warn('[wallet-step-up] communication queue insert failed', error.message);
  }
}

async function createStepUpChallenge(
  admin: SupabaseClient,
  auth: AuthenticatedRequest,
  purpose: StepUpPurpose,
) {
  const destination = normalizeString(auth.canonicalUser.email) ?? normalizeString(auth.canonicalUser.phone_number);
  const channel = normalizeString(auth.canonicalUser.email) ? 'email' : 'sms';
  if (!destination) {
    throw new Error('A verified email or phone number is required for wallet verification.');
  }

  const otpCode = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = await sha256Hex(`${WALLET_STEP_UP_SECRET}:${auth.canonicalUser.id}:${purpose}:${otpCode}`);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  const { data, error } = await admin
    .schema('private')
    .from('wallet_step_up_challenges')
    .insert({
      user_id: auth.canonicalUser.id,
      purpose,
      delivery_channel: channel,
      destination,
      otp_hash: otpHash,
      attempts_count: 0,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('challenge_id, expires_at, delivery_channel, destination')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await enqueueOtpDelivery(admin, {
    userId: auth.canonicalUser.id,
    destination,
    channel,
    otpCode,
    purpose,
  });

  return {
    challengeId: String(data.challenge_id),
    expiresAt: String(data.expires_at),
    deliveryChannel: channel,
    maskedDestination: maskDestination(destination),
  };
}

async function issueStepUpToken(admin: SupabaseClient, userId: string, purpose: StepUpPurpose) {
  const rawToken = `${crypto.randomUUID()}.${crypto.randomUUID()}`;
  const tokenHash = await sha256Hex(`${WALLET_STEP_UP_SECRET}:${rawToken}`);
  const expiresAt = new Date(Date.now() + STEP_UP_TOKEN_TTL_MS).toISOString();

  const { error } = await admin
    .schema('private')
    .from('wallet_step_up_tokens')
    .insert({
      user_id: userId,
      purpose,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(error.message);
  }

  return { verificationToken: rawToken, expiresAt };
}

async function consumeStepUpToken(
  admin: SupabaseClient,
  userId: string,
  purpose: StepUpPurpose,
  verificationToken: string,
) {
  const tokenHash = await sha256Hex(`${WALLET_STEP_UP_SECRET}:${verificationToken}`);
  const now = new Date().toISOString();
  const { data, error } = await admin
    .schema('private')
    .from('wallet_step_up_tokens')
    .select('token_id, expires_at, consumed_at')
    .eq('user_id', userId)
    .eq('purpose', purpose)
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.consumed_at || new Date(String(data.expires_at)).getTime() <= Date.now()) {
    throw new Error('A fresh verification token is required for this wallet action.');
  }

  const { error: updateError } = await admin
    .schema('private')
    .from('wallet_step_up_tokens')
    .update({ consumed_at: now })
    .eq('token_id', data.token_id);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

async function createStripePaymentIntent(args: {
  amount: number;
  currency: string;
  description: string;
  metadata: Record<string, string>;
  idempotencyKey: string;
  customerEmail?: string | null;
}) {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured for this environment.');
  }

  const body = new URLSearchParams();
  body.set('amount', String(toMinorUnits(args.amount, args.currency)));
  body.set('currency', normalizeCurrency(args.currency).toLowerCase());
  body.set('description', args.description);
  body.set('automatic_payment_methods[enabled]', 'true');
  if (args.customerEmail) {
    body.set('receipt_email', args.customerEmail);
  }
  Object.entries(args.metadata).forEach(([key, value]) => {
    body.set(`metadata[${key}]`, value);
  });

  const response = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': args.idempotencyKey,
    },
    body,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String((payload as { error?: { message?: string } }).error?.message ?? 'Stripe payment intent creation failed.'));
  }

  return payload as Record<string, unknown>;
}

async function confirmStripePaymentIntent(providerPaymentId: string, paymentMethodReference?: string | null) {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured for this environment.');
  }

  const body = new URLSearchParams();
  if (paymentMethodReference) {
    body.set('payment_method', paymentMethodReference);
  }

  const response = await fetch(`https://api.stripe.com/v1/payment_intents/${providerPaymentId}/confirm`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String((payload as { error?: { message?: string } }).error?.message ?? 'Stripe confirmation failed.'));
  }

  return payload as Record<string, unknown>;
}

async function createLocalGatewayIntent(args: {
  provider: Extract<WalletProviderName, 'cliq' | 'aman'>;
  amount: number;
  currency: string;
  metadata: Record<string, string>;
}) {
  const providerPaymentId = `${args.provider}_${crypto.randomUUID()}`;
  return {
    id: providerPaymentId,
    status: 'requires_action',
    next_action: {
      type: args.provider === 'cliq' ? 'display_qr_code' : 'await_bank_transfer',
      display_qr_code: {
        image_url_png: `https://payments.wasel.local/${providerPaymentId}/qr`,
      },
    },
    amount: toMinorUnits(args.amount, args.currency),
    currency: normalizeCurrency(args.currency).toLowerCase(),
    metadata: args.metadata,
  };
}

async function verifyStripeWebhookSignature(payload: string, signatureHeader: string | null) {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhook secret is not configured.');
  }
  if (!signatureHeader) {
    throw new Error('Missing Stripe signature header.');
  }

  const elements = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const [key, value] = part.split('=');
      return [key, value];
    }),
  );

  const timestamp = elements.t;
  const signed = elements.v1;
  if (!timestamp || !signed) {
    throw new Error('Invalid Stripe signature header.');
  }

  const expected = await hmacSha256Hex(STRIPE_WEBHOOK_SECRET, `${timestamp}.${payload}`);
  if (!timingSafeEqual(expected, signed)) {
    throw new Error('Stripe webhook signature verification failed.');
  }
}

async function verifyLocalGatewaySignature(payload: string, signatureHeader: string | null) {
  if (!LOCAL_GATEWAY_WEBHOOK_SECRET) {
    throw new Error('Local gateway webhook secret is not configured.');
  }
  if (!signatureHeader) {
    throw new Error('Missing local gateway signature header.');
  }
  const expected = await hmacSha256Hex(LOCAL_GATEWAY_WEBHOOK_SECRET, payload);
  if (!timingSafeEqual(expected, signatureHeader)) {
    throw new Error('Local gateway webhook signature verification failed.');
  }
}

async function createPaymentIntentRecord(
  admin: SupabaseClient,
  args: {
    userId: string;
    purpose: PaymentIntentPurpose;
    amount: number;
    currency: string;
    paymentMethodType: string;
    providerName: WalletProviderName;
    idempotencyKey: string;
    referenceType?: string | null;
    referenceId?: string | null;
    metadata?: Record<string, unknown>;
    providerPaymentId?: string | null;
    providerClientSecret?: string | null;
    redirectUrl?: string | null;
    status: string;
  },
) {
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('wallet_payment_intents')
    .insert({
      user_id: args.userId,
      purpose: args.purpose,
      status: args.status,
      payment_method_type: args.paymentMethodType,
      provider_name: args.providerName,
      amount: args.amount,
      currency_code: normalizeCurrency(args.currency),
      provider_payment_id: args.providerPaymentId ?? null,
      provider_client_secret: args.providerClientSecret ?? null,
      idempotency_key: args.idempotencyKey,
      reference_type: args.referenceType ?? null,
      reference_id: args.referenceId ?? null,
      redirect_url: args.redirectUrl ?? null,
      metadata: args.metadata ?? {},
      created_at: now,
      updated_at: now,
      expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function updatePaymentIntentRecord(
  admin: SupabaseClient,
  paymentIntentId: string,
  patch: Record<string, unknown>,
) {
  const { data, error } = await admin
    .from('wallet_payment_intents')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('payment_intent_id', paymentIntentId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function findPaymentIntentByProviderPaymentId(admin: SupabaseClient, providerPaymentId: string) {
  const { data, error } = await admin
    .from('wallet_payment_intents')
    .select('*')
    .eq('provider_payment_id', providerPaymentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function getDefaultPaymentMethod(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin
    .from('wallet_payment_methods')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('is_default', true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function findDriverUserIdForTrip(admin: SupabaseClient, tripId: string) {
  const { data, error } = await admin
    .from('trips')
    .select('driver_id')
    .eq('trip_id', tripId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data?.driver_id) return null;

  const { data: driver, error: driverError } = await admin
    .from('drivers')
    .select('user_id')
    .eq('driver_id', data.driver_id)
    .maybeSingle();

  if (driverError) {
    throw new Error(driverError.message);
  }

  return normalizeString(driver?.user_id) ?? null;
}

async function findBeneficiaryUserId(
  admin: SupabaseClient,
  intent: Record<string, unknown>,
): Promise<string | null> {
  const metadata = (intent.metadata && typeof intent.metadata === 'object' && !Array.isArray(intent.metadata))
    ? intent.metadata as Record<string, unknown>
    : {};
  const explicitBeneficiary = normalizeString(metadata.beneficiaryUserId);
  if (explicitBeneficiary) return explicitBeneficiary;

  const referenceType = normalizeString(intent.reference_type);
  const referenceId = normalizeString(intent.reference_id);
  if (!referenceType || !referenceId) return null;

  if (referenceType === 'trip') {
    return findDriverUserIdForTrip(admin, referenceId);
  }

  if (referenceType === 'booking') {
    const { data, error } = await admin
      .from('bookings')
      .select('trip_id')
      .eq('booking_id', referenceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data?.trip_id) return null;
    return findDriverUserIdForTrip(admin, String(data.trip_id));
  }

  return null;
}

async function createEscrowForIntent(
  admin: SupabaseClient,
  intent: Record<string, unknown>,
) {
  const payerUserId = String(intent.user_id);
  const beneficiaryUserId = await findBeneficiaryUserId(admin, intent);
  if (!beneficiaryUserId) {
    throw new Error('Could not resolve the escrow beneficiary for this payment.');
  }

  const payerInfra = await ensureWalletInfrastructure(admin, payerUserId);
  const beneficiaryInfra = await ensureWalletInfrastructure(admin, beneficiaryUserId);
  const escrowLedgerAccount = await createEscrowLedgerAccount(admin, {
    currencyCode: String(intent.currency_code ?? 'JOD'),
    accountName: `Escrow ${String(intent.purpose)} ${String(intent.reference_id ?? intent.payment_intent_id)}`,
    metadata: {
      paymentIntentId: intent.payment_intent_id,
      referenceType: intent.reference_type,
      referenceId: intent.reference_id,
      payerUserId,
      beneficiaryUserId,
    },
  });

  const escrowType = String(intent.purpose) === 'package_payment' ? 'package' : 'ride';
  const amount = toNumber(intent.amount);
  const description = escrowType === 'package'
    ? 'Package payment held in escrow'
    : 'Ride payment held in escrow';

  const systemFundingAccount = String(intent.payment_method_type) === 'wallet'
    ? payerInfra.availableAccount
    : await getSystemAccount(admin, 'provider_clearing', String(intent.currency_code ?? 'JOD'));

  const transactionId = await postLedgerTransaction(admin, {
    transactionType: 'escrow_hold',
    transactionStatus: 'completed',
    initiatedByUserId: payerUserId,
    amount,
    currencyCode: String(intent.currency_code ?? 'JOD'),
    description,
    referenceType: normalizeString(intent.reference_type),
    referenceId: normalizeString(intent.reference_id),
    metadata: {
      paymentIntentId: intent.payment_intent_id,
      escrowType,
      beneficiaryUserId,
    },
    entries: [
      {
        account_id: String(systemFundingAccount.account_id),
        entry_side: String(intent.payment_method_type) === 'wallet' ? 'debit' : 'debit',
        amount,
        memo: description,
      },
      {
        account_id: String(escrowLedgerAccount.account_id),
        entry_side: 'credit',
        amount,
        memo: description,
      },
    ],
    participants: [payerUserId, beneficiaryUserId],
    paymentIntentId: String(intent.payment_intent_id),
    idempotencyKey: `escrow-hold:${String(intent.payment_intent_id)}`,
  });

  const now = new Date().toISOString();
  const { data: escrow, error } = await admin
    .from('escrow_accounts')
    .insert({
      payer_user_id: payerUserId,
      beneficiary_user_id: beneficiaryUserId,
      payer_account_id: payerInfra.availableAccount.account_id,
      beneficiary_account_id: beneficiaryInfra.availableAccount.account_id,
      ledger_account_id: escrowLedgerAccount.account_id,
      payment_intent_id: intent.payment_intent_id,
      hold_transaction_id: transactionId,
      escrow_type: escrowType,
      reference_id: intent.reference_id,
      amount,
      currency_code: intent.currency_code,
      escrow_state: 'held',
      held_at: now,
      created_at: now,
      updated_at: now,
      metadata: {
        paymentMethodType: intent.payment_method_type,
        providerName: intent.provider_name,
      },
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { escrow, transactionId };
}

async function activateSubscriptionForIntent(
  admin: SupabaseClient,
  intent: Record<string, unknown>,
) {
  const userId = String(intent.user_id);
  const metadata = (intent.metadata && typeof intent.metadata === 'object' && !Array.isArray(intent.metadata))
    ? intent.metadata as Record<string, unknown>
    : {};
  const planName = normalizeString(metadata.planName) ?? 'Wasel Plus';
  const planCode = normalizeString(metadata.planCode) ?? 'wasel-plus';
  const corridorId = normalizeString(metadata.corridorId);
  const amount = toNumber(intent.amount);
  const currencyCode = String(intent.currency_code ?? 'JOD');
  const providerName = String(intent.provider_name);

  if (String(intent.payment_method_type) === 'wallet') {
    const infra = await ensureWalletInfrastructure(admin, userId);
    const revenueAccount = await getSystemAccount(admin, 'revenue', currencyCode);
    await postLedgerTransaction(admin, {
      transactionType: 'payment',
      transactionStatus: 'completed',
      initiatedByUserId: userId,
      amount,
      currencyCode,
      description: `${planName} subscription payment`,
      referenceType: 'subscription',
      referenceId: String(intent.payment_intent_id),
      metadata: { planCode, planName, corridorId },
      entries: [
        { account_id: String(infra.availableAccount.account_id), entry_side: 'debit', amount },
        { account_id: String(revenueAccount.account_id), entry_side: 'credit', amount },
      ],
      participants: [userId],
      paymentIntentId: String(intent.payment_intent_id),
      idempotencyKey: `subscription:${String(intent.payment_intent_id)}`,
    });
  } else {
    const providerClearing = await getSystemAccount(admin, 'provider_clearing', currencyCode);
    const revenueAccount = await getSystemAccount(admin, 'revenue', currencyCode);
    await postLedgerTransaction(admin, {
      transactionType: 'payment',
      transactionStatus: 'completed',
      initiatedByUserId: userId,
      amount,
      currencyCode,
      description: `${planName} subscription payment`,
      referenceType: 'subscription',
      referenceId: String(intent.payment_intent_id),
      metadata: { planCode, planName, corridorId },
      entries: [
        { account_id: String(providerClearing.account_id), entry_side: 'debit', amount },
        { account_id: String(revenueAccount.account_id), entry_side: 'credit', amount },
      ],
      participants: [userId],
      paymentIntentId: String(intent.payment_intent_id),
      idempotencyKey: `subscription:${String(intent.payment_intent_id)}`,
    });
  }

  const renewalAt = new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('wallet_subscriptions')
    .upsert({
      user_id: userId,
      provider_name: providerName,
      provider_subscription_id: normalizeString(metadata.providerSubscriptionId),
      plan_code: planCode,
      plan_name: planName,
      amount,
      currency_code: currencyCode,
      subscription_status: 'active',
      corridor_id: corridorId,
      renewal_at: renewalAt,
      metadata,
      created_at: now,
      updated_at: now,
    }, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function settlePaymentIntent(
  admin: SupabaseClient,
  intent: Record<string, unknown>,
) {
  const purpose = String(intent.purpose);
  if (!isPaymentIntentPurpose(purpose)) {
    throw new Error('Unsupported payment intent purpose.');
  }

  if (purpose === 'deposit') {
    const infra = await ensureWalletInfrastructure(admin, String(intent.user_id));
    const providerClearing = await getSystemAccount(admin, 'provider_clearing', String(intent.currency_code ?? 'JOD'));
    await postLedgerTransaction(admin, {
      transactionType: 'deposit',
      transactionStatus: 'completed',
      initiatedByUserId: String(intent.user_id),
      amount: toNumber(intent.amount),
      currencyCode: String(intent.currency_code ?? 'JOD'),
      description: 'Wallet deposit settled',
      referenceType: normalizeString(intent.reference_type),
      referenceId: normalizeString(intent.reference_id),
      metadata: { paymentIntentId: intent.payment_intent_id, providerName: intent.provider_name },
      entries: [
        { account_id: String(providerClearing.account_id), entry_side: 'debit', amount: toNumber(intent.amount) },
        { account_id: String(infra.availableAccount.account_id), entry_side: 'credit', amount: toNumber(intent.amount) },
      ],
      participants: [String(intent.user_id)],
      paymentIntentId: String(intent.payment_intent_id),
      idempotencyKey: `deposit:${String(intent.payment_intent_id)}`,
    });
    return;
  }

  if (purpose === 'ride_payment' || purpose === 'package_payment') {
    await createEscrowForIntent(admin, intent);
    return;
  }

  if (purpose === 'subscription') {
    await activateSubscriptionForIntent(admin, intent);
    return;
  }

  throw new Error('Withdrawal payment intents are not supported for wallet settlement.');
}

async function releaseEscrow(
  admin: SupabaseClient,
  escrowId: string,
  actorUserId: string,
) {
  const { data: escrow, error } = await admin
    .from('escrow_accounts')
    .select('*')
    .eq('escrow_account_id', escrowId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!escrow) throw new Error('Escrow account was not found.');
  if (String(escrow.beneficiary_user_id) !== actorUserId) {
    throw new Error('Only the escrow beneficiary can release these funds.');
  }
  if (String(escrow.escrow_state) !== 'held') {
    throw new Error('Only held escrow balances can be released.');
  }

  const releaseTransactionId = await postLedgerTransaction(admin, {
    transactionType: 'escrow_release',
    transactionStatus: 'completed',
    initiatedByUserId: actorUserId,
    amount: toNumber(escrow.amount),
    currencyCode: String(escrow.currency_code),
    description: 'Escrow released to beneficiary',
    referenceType: String(escrow.escrow_type),
    referenceId: String(escrow.reference_id),
    metadata: { escrowAccountId: escrowId },
    entries: [
      { account_id: String(escrow.ledger_account_id), entry_side: 'debit', amount: toNumber(escrow.amount) },
      { account_id: String(escrow.beneficiary_account_id), entry_side: 'credit', amount: toNumber(escrow.amount) },
    ],
    participants: [String(escrow.payer_user_id), String(escrow.beneficiary_user_id)],
    paymentIntentId: normalizeString(escrow.payment_intent_id),
    idempotencyKey: `escrow-release:${escrowId}`,
  });

  await admin
    .from('escrow_accounts')
    .update({
      escrow_state: 'released',
      released_at: new Date().toISOString(),
      release_transaction_id: releaseTransactionId,
      updated_at: new Date().toISOString(),
    })
    .eq('escrow_account_id', escrowId);

  return releaseTransactionId;
}

async function refundEscrow(
  admin: SupabaseClient,
  escrowId: string,
  actorUserId: string,
) {
  const { data: escrow, error } = await admin
    .from('escrow_accounts')
    .select('*')
    .eq('escrow_account_id', escrowId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!escrow) throw new Error('Escrow account was not found.');
  if (String(escrow.payer_user_id) !== actorUserId) {
    throw new Error('Only the original payer can refund this escrow.');
  }
  if (String(escrow.escrow_state) !== 'held') {
    throw new Error('Only held escrow balances can be refunded.');
  }

  const destinationAccountId = String(escrow.payer_account_id);
  const refundTransactionId = await postLedgerTransaction(admin, {
    transactionType: 'refund',
    transactionStatus: 'completed',
    initiatedByUserId: actorUserId,
    amount: toNumber(escrow.amount),
    currencyCode: String(escrow.currency_code),
    description: 'Escrow refunded to payer',
    referenceType: String(escrow.escrow_type),
    referenceId: String(escrow.reference_id),
    metadata: { escrowAccountId: escrowId },
    entries: [
      { account_id: String(escrow.ledger_account_id), entry_side: 'debit', amount: toNumber(escrow.amount) },
      { account_id: destinationAccountId, entry_side: 'credit', amount: toNumber(escrow.amount) },
    ],
    participants: [String(escrow.payer_user_id), String(escrow.beneficiary_user_id)],
    paymentIntentId: normalizeString(escrow.payment_intent_id),
    idempotencyKey: `escrow-refund:${escrowId}`,
  });

  await admin
    .from('escrow_accounts')
    .update({
      escrow_state: 'refunded',
      refunded_at: new Date().toISOString(),
      refund_transaction_id: refundTransactionId,
      updated_at: new Date().toISOString(),
    })
    .eq('escrow_account_id', escrowId);

  return refundTransactionId;
}

function inferSubscriptionType(planCode: string): 'plus' | 'commuter-pass' {
  return planCode.includes('corridor') || planCode.includes('commuter') ? 'commuter-pass' : 'plus';
}

async function buildWalletSnapshot(admin: SupabaseClient, userId: string) {
  const { profile } = await ensureWalletInfrastructure(admin, userId);
  const [balancesResult, paymentMethodsResult, subscriptionsResult, escrowsResult, pinSecret, accountIds] = await Promise.all([
    admin
      .from('wallet_user_balances')
      .select('available_balance, pending_balance, currency_code')
      .eq('user_id', userId)
      .maybeSingle(),
    admin
      .from('wallet_payment_methods')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false }),
    admin
      .from('wallet_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('subscription_status', ['trialing', 'active', 'past_due', 'paused'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('escrow_accounts')
      .select('*')
      .or(`payer_user_id.eq.${userId},beneficiary_user_id.eq.${userId}`)
      .in('escrow_state', [...ESCROW_STATUSES.filter((state) => state === 'pending' || state === 'held')]),
    admin
      .schema('private')
      .from('wallet_pin_secrets')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle(),
    getOwnedAccountIds(admin, userId),
  ]);

  if (balancesResult.error) throw new Error(balancesResult.error.message);
  if (paymentMethodsResult.error) throw new Error(paymentMethodsResult.error.message);
  if (subscriptionsResult.error) throw new Error(subscriptionsResult.error.message);
  if (escrowsResult.error) throw new Error(escrowsResult.error.message);
  if (pinSecret.error) throw new Error(pinSecret.error.message);

  const participantRows = await admin
    .from('wallet_transaction_participants')
    .select('transaction_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (participantRows.error) throw new Error(participantRows.error.message);

  const transactionIds = Array.isArray(participantRows.data)
    ? participantRows.data.map((row) => String(row.transaction_id))
    : [];
  const transactionsResult = transactionIds.length > 0
    ? await admin
      .from('wallet_transactions')
      .select('*')
      .in('transaction_id', transactionIds)
      .order('created_at', { ascending: false })
    : { data: [], error: null };

  if (transactionsResult.error) throw new Error(transactionsResult.error.message);

  const ledgerEntriesResult = transactionIds.length > 0 && accountIds.length > 0
    ? await admin
      .from('ledger_entries')
      .select('transaction_id, account_id, entry_side, amount')
      .in('transaction_id', transactionIds)
      .in('account_id', accountIds)
    : { data: [], error: null };

  if (ledgerEntriesResult.error) throw new Error(ledgerEntriesResult.error.message);

  const pendingIntentResult = await admin
    .from('wallet_payment_intents')
    .select('*')
    .eq('user_id', userId)
    .in('status', PAYMENT_INTENT_STATUSES.filter((status) =>
      status === 'created'
      || status === 'requires_confirmation'
      || status === 'requires_action'
      || status === 'processing'
      || status === 'webhook_received'))
    .order('created_at', { ascending: false })
    .limit(10);

  if (pendingIntentResult.error) throw new Error(pendingIntentResult.error.message);

  const ownedEntryMap = new Map<string, number>();
  for (const entry of Array.isArray(ledgerEntriesResult.data) ? ledgerEntriesResult.data : []) {
    const signedAmount = String(entry.entry_side) === 'credit'
      ? toNumber(entry.amount)
      : -toNumber(entry.amount);
    ownedEntryMap.set(
      String(entry.transaction_id),
      toNumber(ownedEntryMap.get(String(entry.transaction_id))) + signedAmount,
    );
  }

  const settledTransactions = (Array.isArray(transactionsResult.data) ? transactionsResult.data : [])
    .map((row) => {
      const signedAmount = ownedEntryMap.get(String(row.transaction_id));
      const fallbackAmount = ['payment', 'withdrawal', 'escrow_hold'].includes(String(row.transaction_type))
        ? -Math.abs(toNumber(row.amount))
        : Math.abs(toNumber(row.amount));
      return {
        id: String(row.transaction_id),
        type: String(row.transaction_type),
        description: String(row.description),
        amount: signedAmount ?? fallbackAmount,
        createdAt: String(row.created_at),
        status: String(row.transaction_status),
        paymentIntentId: normalizeString(row.payment_intent_id),
        metadata: row.metadata ?? {},
      };
    });

  const pendingTransactions = (Array.isArray(pendingIntentResult.data) ? pendingIntentResult.data : [])
    .map((intent) => ({
      id: String(intent.payment_intent_id),
      type: String(intent.purpose) === 'deposit' ? 'deposit' : String(intent.purpose) === 'subscription' ? 'payment' : 'escrow_hold',
      description: String(intent.purpose) === 'deposit'
        ? 'Wallet deposit pending provider confirmation'
        : String(intent.purpose) === 'subscription'
          ? 'Subscription payment pending provider confirmation'
          : 'Escrow payment pending provider confirmation',
      amount: String(intent.purpose) === 'deposit'
        ? Math.abs(toNumber(intent.amount))
        : -Math.abs(toNumber(intent.amount)),
      createdAt: String(intent.created_at),
      status: String(intent.status),
      paymentIntentId: String(intent.payment_intent_id),
      metadata: intent.metadata ?? {},
    }));

  const transactions = [...settledTransactions, ...pendingTransactions]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 50);

  const totalDeposited = settledTransactions
    .filter((tx) => tx.type === 'deposit' && tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalSpent = [...settledTransactions, ...pendingTransactions]
    .filter((tx) => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const totalEarned = settledTransactions
    .filter((tx) => tx.amount > 0 && tx.type !== 'deposit')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const activeSubscription = subscriptionsResult.data
    ? {
        id: String(subscriptionsResult.data.subscription_id),
        planName: String(subscriptionsResult.data.plan_name),
        price: toNumber(subscriptionsResult.data.amount),
        status: String(subscriptionsResult.data.subscription_status),
        renewalDate: toIsoDate(subscriptionsResult.data.renewal_at),
        type: inferSubscriptionType(String(subscriptionsResult.data.plan_code)),
        corridorId: normalizeString(subscriptionsResult.data.corridor_id),
        corridorLabel: normalizeString((subscriptionsResult.data.metadata as Record<string, unknown> | undefined)?.corridorLabel),
        benefits: Array.isArray((subscriptionsResult.data.metadata as Record<string, unknown> | undefined)?.benefits)
          ? (subscriptionsResult.data.metadata as Record<string, unknown>).benefits as string[]
          : undefined,
      }
    : null;

  return {
    wallet: {
      id: String(profile.wallet_profile_id),
      userId,
      walletType: 'custodial',
      status: String(profile.wallet_status),
      currency: normalizeCurrency(balancesResult.data?.currency_code ?? profile.currency_code),
      autoTopUp: Boolean(profile.auto_top_up_enabled),
      autoTopUpAmount: toNumber(profile.auto_top_up_amount, 20),
      autoTopUpThreshold: toNumber(profile.auto_top_up_threshold, 5),
      paymentMethods: (Array.isArray(paymentMethodsResult.data) ? paymentMethodsResult.data : []).map((method) => ({
        id: String(method.payment_method_id),
        type: String(method.method_type),
        provider: String(method.provider_name),
        label: normalizeString(method.label) ?? `${String(method.provider_name)} ${normalizeString(method.last4) ? `•••• ${String(method.last4)}` : ''}`.trim(),
        last4: normalizeString(method.last4),
        expiryMonth: method.expiry_month ? Number(method.expiry_month) : null,
        expiryYear: method.expiry_year ? Number(method.expiry_year) : null,
        isDefault: Boolean(method.is_default),
        status: String(method.status),
        createdAt: toIsoDate(method.created_at),
        updatedAt: toIsoDate(method.updated_at),
      })),
      createdAt: toIsoDate(profile.created_at),
    },
    balance: toNumber(balancesResult.data?.available_balance),
    pendingBalance: toNumber(balancesResult.data?.pending_balance),
    rewardsBalance: 0,
    total_earned: totalEarned,
    total_spent: totalSpent,
    total_deposited: totalDeposited,
    currency: normalizeCurrency(balancesResult.data?.currency_code ?? profile.currency_code),
    pinSet: Boolean(pinSecret.data?.user_id),
    autoTopUp: Boolean(profile.auto_top_up_enabled),
    transactions,
    activeEscrows: (Array.isArray(escrowsResult.data) ? escrowsResult.data : []).map((escrow) => ({
      id: String(escrow.escrow_account_id),
      type: String(escrow.escrow_type),
      amount: toNumber(escrow.amount),
      tripId: normalizeString(escrow.reference_id),
      status: String(escrow.escrow_state),
      createdAt: toIsoDate(escrow.created_at),
    })),
    activeRewards: [],
    subscription: activeSubscription,
  };
}

function asResponse(error: unknown): Response | null {
  return error instanceof Response ? error : null;
}

function requireVerificationToken(body: Record<string, unknown>): string {
  const token = normalizeString(body.verificationToken);
  if (!token) {
    throw new Error('A fresh verification token is required for this action.');
  }
  return token;
}

export function createWalletHandlers(runtime: WalletRuntime) {
  async function handleGetWallet(request: Request) {
    const auth = await runtime.authenticateRequest(request);
    if ('error' in auth) return auth.error;

    try {
      const snapshot = await buildWalletSnapshot(auth.admin, auth.canonicalUser.id);
      return runtime.json(snapshot);
    } catch (error) {
      return runtime.json({ error: sanitizeEdgeErrorMessage(error) }, 500);
    }
  }

  async function handleSetPin(request: Request) {
    const auth = await runtime.authenticateRequest(request);
    if ('error' in auth) return auth.error;

    try {
      await requireAllowedRate(runtime, request, auth.canonicalUser.id, 'set-pin', WALLET_VERIFY_RATE_LIMIT);
      const body = await readJsonBody(request);
      const pin = normalizeString(body.pin);
      if (!pin || !/^\d{4}$/.test(pin)) {
        return runtime.json({ error: 'Wallet PIN must be exactly 4 digits.' }, 400);
      }

      await setWalletPin(auth.admin, auth.canonicalUser.id, pin);
      return runtime.json({ ok: true });
    } catch (error) {
      return asResponse(error) ?? runtime.json({ error: sanitizeEdgeErrorMessage(error) }, 400);
    }
  }

  async function handleVerifyPin(request: Request) {
    const auth = await runtime.authenticateRequest(request);
    if ('error' in auth) return auth.error;

    try {
      await requireAllowedRate(runtime, request, auth.canonicalUser.id, 'verify-pin', WALLET_VERIFY_RATE_LIMIT);
      const body = await readJsonBody(request);
      const pin = normalizeString(body.pin);
      const purpose = normalizeString(body.purpose);
      const otpCode = normalizeString(body.otpCode);
      const challengeId = normalizeString(body.challengeId);

      if (!pin || !/^\d{4}$/.test(pin)) {
        return runtime.json({ error: 'Wallet PIN must be exactly 4 digits.' }, 400);
      }
      if (!purpose || !isStepUpPurpose(purpose)) {
        return runtime.json({ error: `Purpose must be one of: ${STEP_UP_PURPOSES.join(', ')}` }, 400);
      }

      const pinSecret = await getWalletPinSecret(auth.admin, auth.canonicalUser.id);
      if (!pinSecret?.pin_hash) {
        return runtime.json({ error: 'Set your wallet PIN before requesting wallet verification.' }, 400);
      }
      if (pinSecret.locked_until && new Date(String(pinSecret.locked_until)).getTime() > Date.now()) {
        return runtime.json({ error: 'Wallet PIN is temporarily locked. Please wait and try again.' }, 429);
      }

      const expectedHash = await sha256Hex(`${WALLET_STEP_UP_SECRET}:${pin}`);
      if (!timingSafeEqual(String(pinSecret.pin_hash), expectedHash)) {
        await recordPinFailure(auth.admin, auth.canonicalUser.id, toNumber(pinSecret.failed_attempts));
        return runtime.json({ error: 'Wallet PIN verification failed.' }, 401);
      }

      await clearPinFailures(auth.admin, auth.canonicalUser.id);

      if (!otpCode) {
        const challenge = await createStepUpChallenge(auth.admin, auth, purpose);
        return runtime.json({
          purpose,
          verified: false,
          otpRequired: true,
          ...challenge,
        });
      }

      let challengeQuery = auth.admin
        .schema('private')
        .from('wallet_step_up_challenges')
        .select('challenge_id, otp_hash, expires_at, attempts_count, verified_at, delivery_channel, destination')
        .eq('user_id', auth.canonicalUser.id)
        .eq('purpose', purpose)
        .order('created_at', { ascending: false })
        .limit(1);

      if (challengeId) {
        challengeQuery = auth.admin
          .schema('private')
          .from('wallet_step_up_challenges')
          .select('challenge_id, otp_hash, expires_at, attempts_count, verified_at, delivery_channel, destination')
          .eq('challenge_id', challengeId)
          .eq('user_id', auth.canonicalUser.id)
          .eq('purpose', purpose);
      }

      const { data: challenge, error: challengeError } = await challengeQuery.maybeSingle();
      if (challengeError) throw new Error(challengeError.message);
      if (!challenge) {
        return runtime.json({ error: 'A valid step-up challenge was not found.' }, 400);
      }
      if (challenge.verified_at || new Date(String(challenge.expires_at)).getTime() <= Date.now()) {
        return runtime.json({ error: 'This verification challenge has expired.' }, 400);
      }

      const otpHash = await sha256Hex(`${WALLET_STEP_UP_SECRET}:${auth.canonicalUser.id}:${purpose}:${otpCode}`);
      if (!timingSafeEqual(String(challenge.otp_hash), otpHash)) {
        await auth.admin
          .schema('private')
          .from('wallet_step_up_challenges')
          .update({
            attempts_count: toNumber(challenge.attempts_count) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('challenge_id', challenge.challenge_id);
        return runtime.json({ error: 'OTP verification failed.' }, 401);
      }

      await auth.admin
        .schema('private')
        .from('wallet_step_up_challenges')
        .update({
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('challenge_id', challenge.challenge_id);

      const token = await issueStepUpToken(auth.admin, auth.canonicalUser.id, purpose);
      return runtime.json({
        purpose,
        verified: true,
        otpRequired: true,
        challengeId: String(challenge.challenge_id),
        deliveryChannel: String(challenge.delivery_channel),
        maskedDestination: maskDestination(normalizeString(challenge.destination)),
        ...token,
      });
    } catch (error) {
      return asResponse(error) ?? runtime.json({ error: sanitizeEdgeErrorMessage(error) }, 400);
    }
  }

  async function handleCreatePaymentIntent(request: Request) {
    const auth = await runtime.authenticateRequest(request);
    if ('error' in auth) return auth.error;

    try {
      await requireAllowedRate(runtime, request, auth.canonicalUser.id, 'payment-intent', WALLET_MUTATION_RATE_LIMIT);
      const body = await readJsonBody(request);
      const purpose = normalizeString(body.purpose);
      const paymentMethodType = normalizeString(body.paymentMethodType);
      const amount = toNumber(body.amount);
      const currency = normalizeCurrency(body.currency);
      const referenceType = normalizeString(body.referenceType);
      const referenceId = normalizeString(body.referenceId);
      const idempotencyKey = normalizeString(body.idempotencyKey) ?? `wallet-intent:${auth.canonicalUser.id}:${crypto.randomUUID()}`;
      const metadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
        ? body.metadata as Record<string, unknown>
        : {};

      if (!purpose || !isPaymentIntentPurpose(purpose)) {
        return runtime.json({ error: 'Unsupported payment intent purpose.' }, 400);
      }
      if (!paymentMethodType || !isWalletPaymentMethodType(paymentMethodType)) {
        return runtime.json({ error: `Payment method must be one of: ${WALLET_PAYMENT_METHOD_TYPES.join(', ')}` }, 400);
      }
      if (amount <= 0) {
        return runtime.json({ error: 'Amount must be greater than zero.' }, 400);
      }

      let providerName: WalletProviderName;
      if (paymentMethodType === 'card') providerName = 'stripe';
      else if (paymentMethodType === 'cliq') providerName = 'cliq';
      else if (paymentMethodType === 'bank_transfer') providerName = 'aman';
      else providerName = 'wallet';

      let providerPayload: Record<string, unknown>;
      let status = 'requires_confirmation';
      if (providerName === 'stripe') {
        providerPayload = await createStripePaymentIntent({
          amount,
          currency,
          description: `${purpose} via Wasel wallet`,
          metadata: {
            internal_user_id: auth.canonicalUser.id,
            purpose,
            reference_type: referenceType ?? '',
            reference_id: referenceId ?? '',
          },
          idempotencyKey,
          customerEmail: auth.canonicalUser.email,
        });
        status = String(providerPayload.status ?? 'requires_confirmation');
      } else if (providerName === 'wallet') {
        providerPayload = {
          id: `wallet_${crypto.randomUUID()}`,
          status: 'requires_confirmation',
        };
        status = 'requires_confirmation';
      } else {
        providerPayload = await createLocalGatewayIntent({
          provider: providerName,
          amount,
          currency,
          metadata: {
            internal_user_id: auth.canonicalUser.id,
            purpose,
          },
        });
        status = String(providerPayload.status ?? 'requires_action');
      }

      const intent = await createPaymentIntentRecord(auth.admin, {
        userId: auth.canonicalUser.id,
        purpose,
        amount,
        currency,
        paymentMethodType,
        providerName,
        idempotencyKey,
        referenceType,
        referenceId,
        metadata,
        providerPaymentId: normalizeString(providerPayload.id),
        providerClientSecret: normalizeString(providerPayload.client_secret),
        redirectUrl: normalizeString(((providerPayload.next_action as Record<string, unknown> | undefined)?.display_qr_code as Record<string, unknown> | undefined)?.image_url_png),
        status,
      });

      return runtime.json({
        id: String(intent.payment_intent_id),
        purpose: String(intent.purpose),
        status: String(intent.status),
        amount: toNumber(intent.amount),
        currency: normalizeCurrency(intent.currency_code),
        paymentMethodType: String(intent.payment_method_type),
        provider: String(intent.provider_name),
        clientSecret: normalizeString(intent.provider_client_secret),
        redirectUrl: normalizeString(intent.redirect_url),
        createdAt: String(intent.created_at),
        referenceType: normalizeString(intent.reference_type),
        referenceId: normalizeString(intent.reference_id),
      });
    } catch (error) {
      return asResponse(error) ?? runtime.json({ error: sanitizeEdgeErrorMessage(error) }, 400);
    }
  }

  async function handleConfirmPayment(request: Request) {
    const auth = await runtime.authenticateRequest(request);
    if ('error' in auth) return auth.error;

    try {
      await requireAllowedRate(runtime, request, auth.canonicalUser.id, 'confirm-payment', WALLET_MUTATION_RATE_LIMIT);
      const body = await readJsonBody(request);
      const paymentIntentId = normalizeString(body.paymentIntentId);
      const paymentMethodId = normalizeString(body.paymentMethodId);
      if (!paymentIntentId) {
        return runtime.json({ error: 'paymentIntentId is required.' }, 400);
      }

      const { data: intent, error } = await auth.admin
        .from('wallet_payment_intents')
        .select('*')
        .eq('payment_intent_id', paymentIntentId)
        .eq('user_id', auth.canonicalUser.id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!intent) return runtime.json({ error: 'Payment intent was not found.' }, 404);

      if (String(intent.provider_name) === 'wallet') {
        await settlePaymentIntent(auth.admin, intent as Record<string, unknown>);
        const updated = await updatePaymentIntentRecord(auth.admin, String(intent.payment_intent_id), {
          status: 'succeeded',
          confirmed_at: new Date().toISOString(),
        });
        return runtime.json({
          id: String(updated.payment_intent_id),
          status: String(updated.status),
          settled: true,
        });
      }

      if (String(intent.provider_name) === 'stripe') {
        const resolvedMethod = paymentMethodId
          ? await auth.admin
            .from('wallet_payment_methods')
            .select('provider_reference')
            .eq('payment_method_id', paymentMethodId)
            .eq('user_id', auth.canonicalUser.id)
            .maybeSingle()
          : { data: await getDefaultPaymentMethod(auth.admin, auth.canonicalUser.id), error: null };

        if (resolvedMethod.error) throw new Error(resolvedMethod.error.message);

        const stripePayload = await confirmStripePaymentIntent(
          String(intent.provider_payment_id),
          normalizeString((resolvedMethod.data as Record<string, unknown> | null)?.provider_reference),
        );

        const updated = await updatePaymentIntentRecord(auth.admin, String(intent.payment_intent_id), {
          status: String(stripePayload.status ?? 'processing'),
          confirmed_at: new Date().toISOString(),
        });

        return runtime.json({
          id: String(updated.payment_intent_id),
          status: String(updated.status),
          settled: false,
          clientSecret: normalizeString(stripePayload.client_secret),
        });
      }

      const updated = await updatePaymentIntentRecord(auth.admin, String(intent.payment_intent_id), {
        status: 'processing',
        confirmed_at: new Date().toISOString(),
      });
      return runtime.json({
        id: String(updated.payment_intent_id),
        status: String(updated.status),
        settled: false,
      });
    } catch (error) {
      return asResponse(error) ?? runtime.json({ error: sanitizeEdgeErrorMessage(error) }, 400);
    }
  }

  async function handlePaymentWebhook(request: Request) {
    try {
      const provider = normalizeString(request.headers.get('x-wallet-provider')) ?? 'stripe';
      const rawPayload = await request.text();
      let eventBody: Record<string, unknown>;

      if (provider === 'stripe') {
        await verifyStripeWebhookSignature(rawPayload, request.headers.get('stripe-signature'));
        eventBody = JSON.parse(rawPayload) as Record<string, unknown>;
      } else {
        await verifyLocalGatewaySignature(rawPayload, request.headers.get('x-wallet-signature'));
        eventBody = JSON.parse(rawPayload) as Record<string, unknown>;
      }

      const providerEventId = normalizeString(eventBody.id)
        ?? normalizeString(eventBody.providerEventId)
        ?? crypto.randomUUID();

      const admin = runtime.getAdminClient();
      const { error: eventInsertError } = await admin
        .from('payment_webhook_events')
        .upsert({
          provider_name: provider,
          provider_event_id: providerEventId,
          signature: request.headers.get('stripe-signature') ?? request.headers.get('x-wallet-signature'),
          payload: eventBody,
          created_at: new Date().toISOString(),
        }, { onConflict: 'provider_name,provider_event_id' });

      if (eventInsertError) {
        throw new Error(eventInsertError.message);
      }

      let intent: Record<string, unknown> | null = null;
      if (provider === 'stripe') {
        const eventType = normalizeString(eventBody.type);
        const object = ((eventBody.data as Record<string, unknown> | undefined)?.object as Record<string, unknown> | undefined) ?? {};
        const providerPaymentId = normalizeString(object.id);
        if (!providerPaymentId) {
          return runtime.json({ ok: true });
        }
        intent = await findPaymentIntentByProviderPaymentId(admin, providerPaymentId) as Record<string, unknown> | null;
        if (!intent) {
          return runtime.json({ ok: true });
        }

        if (eventType === 'payment_intent.succeeded') {
          await settlePaymentIntent(admin, intent);
          await updatePaymentIntentRecord(admin, String(intent.payment_intent_id), {
            status: 'succeeded',
            updated_at: new Date().toISOString(),
          });
        } else if (eventType === 'payment_intent.payment_failed') {
          await updatePaymentIntentRecord(admin, String(intent.payment_intent_id), {
            status: 'failed',
            last_error: normalizeString(((object.last_payment_error as Record<string, unknown> | undefined)?.message)),
          });
        }
      } else {
        const providerPaymentId = normalizeString(eventBody.providerPaymentId) ?? normalizeString(eventBody.paymentIntentId);
        if (!providerPaymentId) {
          return runtime.json({ ok: true });
        }
        intent = await findPaymentIntentByProviderPaymentId(admin, providerPaymentId) as Record<string, unknown> | null;
        if (!intent) {
          return runtime.json({ ok: true });
        }
        const status = normalizeString(eventBody.status);
        if (status === 'succeeded') {
          await settlePaymentIntent(admin, intent);
          await updatePaymentIntentRecord(admin, String(intent.payment_intent_id), { status: 'succeeded' });
        } else if (status === 'failed') {
          await updatePaymentIntentRecord(admin, String(intent.payment_intent_id), {
            status: 'failed',
            last_error: normalizeString(eventBody.error),
          });
        }
      }

      await admin
        .from('payment_webhook_events')
        .update({ processed_at: new Date().toISOString(), processing_error: null })
        .eq('provider_name', provider)
        .eq('provider_event_id', providerEventId);

      return runtime.json({ ok: true });
    } catch (error) {
      return runtime.json({ error: sanitizeEdgeErrorMessage(error) }, 400);
    }
  }

  async function handleWalletDeposit(request: Request) {
    return handleCreatePaymentIntent(new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify({
        ...(await readJsonBody(request)),
        purpose: 'deposit',
      }),
    }));
  }

  async function handleWalletTransfer(request: Request) {
    const auth = await runtime.authenticateRequest(request);
    if ('error' in auth) return auth.error;

    try {
      await requireAllowedRate(runtime, request, auth.canonicalUser.id, 'transfer', WALLET_TRANSFER_RATE_LIMIT);
      const body = await readJsonBody(request);
      const recipient = normalizeString(body.recipientUserId ?? body.recipient ?? body.recipientPhone);
      const amount = toNumber(body.amount);
      const note = normalizeString(body.note);
      const verificationToken = requireVerificationToken(body);
      if (!recipient) return runtime.json({ error: 'recipientUserId is required.' }, 400);
      if (amount <= 0) return runtime.json({ error: 'Amount must be greater than zero.' }, 400);

      await consumeStepUpToken(auth.admin, auth.canonicalUser.id, 'transfer', verificationToken);
      const recipientUser = await resolveRecipientUser(auth.admin, recipient);
      if (!recipientUser || String(recipientUser.id) === auth.canonicalUser.id) {
        return runtime.json({ error: 'Recipient account was not found.' }, 404);
      }

      const senderInfra = await ensureWalletInfrastructure(auth.admin, auth.canonicalUser.id);
      const recipientInfra = await ensureWalletInfrastructure(auth.admin, String(recipientUser.id));
      const wallet = await buildWalletSnapshot(auth.admin, auth.canonicalUser.id);
      if (wallet.balance < amount) {
        return runtime.json({ error: 'Insufficient available wallet balance.' }, 400);
      }

      const transactionId = await postLedgerTransaction(auth.admin, {
        transactionType: 'transfer',
        transactionStatus: 'completed',
        initiatedByUserId: auth.canonicalUser.id,
        amount,
        currencyCode: wallet.currency,
        description: note ?? 'Wallet transfer',
        referenceType: 'wallet_transfer',
        referenceId: String(recipientUser.id),
        metadata: { note, recipientUserId: recipientUser.id },
        entries: [
          { account_id: String(senderInfra.availableAccount.account_id), entry_side: 'debit', amount },
          { account_id: String(recipientInfra.availableAccount.account_id), entry_side: 'credit', amount },
        ],
        participants: [auth.canonicalUser.id, String(recipientUser.id)],
        idempotencyKey: normalizeString(body.idempotencyKey) ?? `wallet-transfer:${auth.canonicalUser.id}:${crypto.randomUUID()}`,
      });

      return runtime.json({ ok: true, transactionId });
    } catch (error) {
      return asResponse(error) ?? runtime.json({ error: sanitizeEdgeErrorMessage(error) }, 400);
    }
  }

  async function handleWalletWithdraw(request: Request) {
    const auth = await runtime.authenticateRequest(request);
    if ('error' in auth) return auth.error;

    try {
      await requireAllowedRate(runtime, request, auth.canonicalUser.id, 'withdraw', WALLET_TRANSFER_RATE_LIMIT);
      const body = await readJsonBody(request);
      const amount = toNumber(body.amount);
      const verificationToken = requireVerificationToken(body);
      const providerName = normalizeString(body.providerName) ?? 'aman';
      const bankAccount = normalizeString(body.bankAccount ?? body.destination);
      const paymentMethodId = normalizeString(body.paymentMethodId);
      if (amount <= 0) {
        return runtime.json({ error: 'Amount must be greater than zero.' }, 400);
      }
      if (!isWalletProviderName(providerName)) {
        return runtime.json({ error: `providerName must be one of: ${WALLET_PROVIDER_NAMES.join(', ')}` }, 400);
      }

      await consumeStepUpToken(auth.admin, auth.canonicalUser.id, 'withdrawal', verificationToken);
      const snapshot = await buildWalletSnapshot(auth.admin, auth.canonicalUser.id);
      if (snapshot.balance < amount) {
        return runtime.json({ error: 'Insufficient available wallet balance.' }, 400);
      }

      const infra = await ensureWalletInfrastructure(auth.admin, auth.canonicalUser.id);
      const payoutClearing = await getSystemAccount(auth.admin, 'payout_clearing', snapshot.currency);
      const transactionId = await postLedgerTransaction(auth.admin, {
        transactionType: 'withdrawal',
        transactionStatus: 'processing',
        initiatedByUserId: auth.canonicalUser.id,
        amount,
        currencyCode: snapshot.currency,
        description: 'Withdrawal queued for payout processing',
        referenceType: 'payout_request',
        referenceId: crypto.randomUUID(),
        metadata: {
          providerName,
          destination: bankAccount,
          paymentMethodId,
        },
        entries: [
          { account_id: String(infra.availableAccount.account_id), entry_side: 'debit', amount },
          { account_id: String(payoutClearing.account_id), entry_side: 'credit', amount },
        ],
        participants: [auth.canonicalUser.id],
        idempotencyKey: normalizeString(body.idempotencyKey) ?? `wallet-withdraw:${auth.canonicalUser.id}:${crypto.randomUUID()}`,
      });

      const { data: payoutRequest, error } = await auth.admin
        .from('wallet_payout_requests')
        .insert({
          user_id: auth.canonicalUser.id,
          source_account_id: infra.availableAccount.account_id,
          payment_method_id: paymentMethodId,
          amount,
          currency_code: snapshot.currency,
          provider_name: providerName,
          payout_status: 'pending',
          metadata: { destination: bankAccount, transactionId },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) throw new Error(error.message);

      return runtime.json({
        ok: true,
        payoutRequestId: String(payoutRequest.payout_request_id),
        transactionId,
      });
    } catch (error) {
      return asResponse(error) ?? runtime.json({ error: sanitizeEdgeErrorMessage(error) }, 400);
    }
  }

  async function handleWalletPaymentMethods(request: Request) {
    const auth = await runtime.authenticateRequest(request);
    if ('error' in auth) return auth.error;

    try {
      await requireAllowedRate(runtime, request, auth.canonicalUser.id, 'payment-methods', WALLET_MUTATION_RATE_LIMIT);
      const body = await readJsonBody(request);
      const action = normalizeString(body.action) ?? 'add';
      const verificationToken = requireVerificationToken(body);
      await consumeStepUpToken(auth.admin, auth.canonicalUser.id, 'payment_method', verificationToken);

      if (action === 'remove') {
        const paymentMethodId = normalizeString(body.paymentMethodId);
        if (!paymentMethodId) {
          return runtime.json({ error: 'paymentMethodId is required.' }, 400);
        }
        const { error } = await auth.admin
          .from('wallet_payment_methods')
          .update({ status: 'disabled', is_default: false, updated_at: new Date().toISOString() })
          .eq('payment_method_id', paymentMethodId)
          .eq('user_id', auth.canonicalUser.id);
        if (error) throw new Error(error.message);
        return runtime.json({ ok: true });
      }

      if (action === 'default') {
        const paymentMethodId = normalizeString(body.paymentMethodId);
        if (!paymentMethodId) {
          return runtime.json({ error: 'paymentMethodId is required.' }, 400);
        }
        await auth.admin
          .from('wallet_payment_methods')
          .update({ is_default: false, updated_at: new Date().toISOString() })
          .eq('user_id', auth.canonicalUser.id);
        const { error } = await auth.admin
          .from('wallet_payment_methods')
          .update({ is_default: true, updated_at: new Date().toISOString() })
          .eq('payment_method_id', paymentMethodId)
          .eq('user_id', auth.canonicalUser.id);
        if (error) throw new Error(error.message);
        return runtime.json({ ok: true });
      }

      const methodType = normalizeString(body.type);
      const provider = normalizeString(body.provider);
      const providerReference = normalizeString(body.providerReference ?? body.tokenReference);
      if (!methodType || !isWalletPaymentMethodType(methodType)) {
        return runtime.json({ error: `type must be one of: ${WALLET_PAYMENT_METHOD_TYPES.join(', ')}` }, 400);
      }
      if (!provider || !isWalletProviderName(provider)) {
        return runtime.json({ error: `provider must be one of: ${WALLET_PROVIDER_NAMES.join(', ')}` }, 400);
      }
      if (!providerReference) {
        return runtime.json({ error: 'providerReference is required.' }, 400);
      }

      const now = new Date().toISOString();
      const { data, error } = await auth.admin
        .from('wallet_payment_methods')
        .insert({
          user_id: auth.canonicalUser.id,
          method_type: methodType,
          provider_name: provider,
          provider_reference: providerReference,
          label: normalizeString(body.label),
          brand: normalizeString(body.brand),
          last4: normalizeString(body.last4),
          expiry_month: body.expiryMonth ? Number(body.expiryMonth) : null,
          expiry_year: body.expiryYear ? Number(body.expiryYear) : null,
          is_default: Boolean(body.isDefault),
          status: 'active',
          metadata: body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {},
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      if (Boolean(body.isDefault)) {
        await auth.admin
          .from('wallet_payment_methods')
          .update({ is_default: false, updated_at: now })
          .eq('user_id', auth.canonicalUser.id)
          .neq('payment_method_id', data.payment_method_id);
      }

      return runtime.json({ ok: true, paymentMethodId: String(data.payment_method_id) });
    } catch (error) {
      return asResponse(error) ?? runtime.json({ error: sanitizeEdgeErrorMessage(error) }, 400);
    }
  }

  async function handleWalletSettings(request: Request) {
    const auth = await runtime.authenticateRequest(request);
    if ('error' in auth) return auth.error;

    try {
      const body = await readJsonBody(request);
      const { profile } = await ensureWalletInfrastructure(auth.admin, auth.canonicalUser.id);
      const { data, error } = await auth.admin
        .from('wallet_profiles')
        .update({
          auto_top_up_enabled: Boolean(body.autoTopUpEnabled),
          auto_top_up_amount: Math.max(0, toNumber(body.autoTopUpAmount, toNumber(profile.auto_top_up_amount, 20))),
          auto_top_up_threshold: Math.max(0, toNumber(body.autoTopUpThreshold, toNumber(profile.auto_top_up_threshold, 5))),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', auth.canonicalUser.id)
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      return runtime.json({ ok: true, settings: data });
    } catch (error) {
      return asResponse(error) ?? runtime.json({ error: sanitizeEdgeErrorMessage(error) }, 400);
    }
  }

  async function handleReleaseEscrow(request: Request) {
    const auth = await runtime.authenticateRequest(request);
    if ('error' in auth) return auth.error;
    try {
      const body = await readJsonBody(request);
      const escrowId = normalizeString(body.escrowId);
      if (!escrowId) return runtime.json({ error: 'escrowId is required.' }, 400);
      const transactionId = await releaseEscrow(auth.admin, escrowId, auth.canonicalUser.id);
      return runtime.json({ ok: true, transactionId });
    } catch (error) {
      return asResponse(error) ?? runtime.json({ error: sanitizeEdgeErrorMessage(error) }, 400);
    }
  }

  async function handleRefundEscrow(request: Request) {
    const auth = await runtime.authenticateRequest(request);
    if ('error' in auth) return auth.error;
    try {
      const body = await readJsonBody(request);
      const escrowId = normalizeString(body.escrowId);
      if (!escrowId) return runtime.json({ error: 'escrowId is required.' }, 400);
      const transactionId = await refundEscrow(auth.admin, escrowId, auth.canonicalUser.id);
      return runtime.json({ ok: true, transactionId });
    } catch (error) {
      return asResponse(error) ?? runtime.json({ error: sanitizeEdgeErrorMessage(error) }, 400);
    }
  }

  return {
    handleGetWallet,
    handleSetPin,
    handleVerifyPin,
    handleCreatePaymentIntent,
    handleConfirmPayment,
    handlePaymentWebhook,
    handleWalletDeposit,
    handleWalletTransfer,
    handleWalletWithdraw,
    handleWalletPaymentMethods,
    handleWalletSettings,
    handleReleaseEscrow,
    handleRefundEscrow,
  };
}
