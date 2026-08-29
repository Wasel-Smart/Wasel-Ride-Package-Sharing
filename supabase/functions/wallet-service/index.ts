import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const APP_BASE_URL = (Deno.env.get('APP_BASE_URL') ?? 'https://wasel14.online').replace(/\/$/, '');
const ADDITIONAL_ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS') ?? '';
const ALLOW_LOCAL_ORIGINS = Deno.env.get('ALLOW_LOCAL_ORIGINS') === 'true';

const responseBaseHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function resolveAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    if (url.origin === new URL(APP_BASE_URL).origin) return url.origin;
    if (ALLOW_LOCAL_ORIGINS && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) return url.origin;
    const extra = ADDITIONAL_ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
    if (extra.includes(url.origin)) return url.origin;
  } catch { /* ignore */ }
  return null;
}

function buildResponseHeaders(request: Request): Headers {
  const headers = new Headers();
  const allowedOrigin = resolveAllowedOrigin(request.headers.get('origin'));
  Object.entries(responseBaseHeaders).forEach(([k, v]) => headers.set(k, v));
  headers.set('Vary', 'Origin');
  if (allowedOrigin) headers.set('Access-Control-Allow-Origin', allowedOrigin);
  return headers;
}

function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase not configured');
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function authenticateRequest(request: Request) {
  const authorization = request.headers.get('Authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return { error: json({ error: 'Missing bearer token' }, 401) };
  const admin = getAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return { error: json({ error: 'Invalid auth token' }, 401) };
  const { data: byAuthUser, error: byAuthError } = await admin.from('users').select('*').eq('auth_user_id', authData.user.id).maybeSingle();
  if (byAuthError) return { error: json({ error: byAuthError.message }, 500) };
  let canonicalUser = byAuthUser;
  if (!canonicalUser) {
    const fallback = await admin.from('users').select('*').eq('id', authData.user.id).maybeSingle();
    canonicalUser = fallback.data;
    if (fallback.error || !canonicalUser) return { error: json({ error: 'User not found' }, 404) };
  }
  return { admin, authUser: authData.user, canonicalUser };
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toMoneyNumber(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Number(amount.toFixed(3)) : 0;
}

type WalletRow = {
  wallet_id?: string; user_id?: string; balance?: number | string | null;
  pending_balance?: number | string | null; wallet_status?: string | null;
  currency_code?: string | null; auto_top_up_enabled?: boolean | null;
  auto_top_up_amount?: number | string | null; auto_top_up_threshold?: number | string | null;
  pin_hash?: string | null; created_at?: string | null;
};

async function ensureWalletForUser(admin: ReturnType<typeof getAdminClient>, userId: string): Promise<WalletRow> {
  const { data: existing, error: existingError } = await admin.from('wallets').select('*').eq('user_id', userId).maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing?.wallet_id) return existing as WalletRow;
  const { data: created, error: createError } = await admin.from('wallets').insert({ user_id: userId }).select('*').single();
  if (createError) throw new Error(createError.message);
  return created as WalletRow;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function fromHex(value: string): Uint8Array {
  const normalized = value.trim();
  if (!/^[0-9a-f]+$/i.test(normalized) || normalized.length % 2 !== 0) return new Uint8Array();
  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
  }
  return bytes;
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index];
  return diff === 0;
}

async function hashWalletPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 210_000;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(`wasel-wallet-pin:${pin}`), 'PBKDF2', false, ['deriveBits']);
  const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return `pbkdf2_sha256$${iterations}$${toHex(salt)}$${toHex(new Uint8Array(derivedBits))}`;
}

async function verifyWalletPinHash(pin: string, storedHash?: string | null): Promise<boolean> {
  if (!storedHash) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') return false;
  const iterations = Number.parseInt(parts[1] ?? '', 10);
  const salt = fromHex(parts[2] ?? '');
  const expected = fromHex(parts[3] ?? '');
  if (!Number.isFinite(iterations) || iterations < 100_000 || salt.length < 16 || expected.length !== 32) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(`wasel-wallet-pin:${pin}`), 'PBKDF2', false, ['deriveBits']);
  const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt.buffer as ArrayBuffer, iterations }, key, expected.length * 8);
  return timingSafeEqual(new Uint8Array(derivedBits), expected);
}

function parseWalletRoute(path: string) {
  const match = /^\/wallet\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?$/.exec(path);
  if (!match) return null;
  return { userId: decodeURIComponent(match[1]), action: match[2] ? decodeURIComponent(match[2]) : '', resourceId: match[3] ? decodeURIComponent(match[3]) : null };
}

async function handleWalletRequest(request: Request, path: string) {
  const walletRoute = parseWalletRoute(path);
  if (!walletRoute) return json({ error: 'Invalid wallet route' }, 400);
  const { userId, action } = walletRoute;

  const auth = await authenticateRequest(request);
  if ('error' in auth) return auth.error;
  if (userId !== auth.canonicalUser.id && userId !== auth.authUser.id) {
    return json({ error: 'Wallet route is not authorized for this user.' }, 403);
  }

  const admin = auth.admin;

  if (request.method === 'GET' && !action) {
    try {
      const wallet = await ensureWalletForUser(admin, auth.canonicalUser.id);
      const { data: transactions } = await admin.from('transactions').select('*').eq('wallet_id', wallet.wallet_id).order('created_at', { ascending: false }).limit(50);
      const { data: paymentMethods } = await admin.from('payment_methods').select('*').eq('user_id', auth.canonicalUser.id).order('is_default', { ascending: false }).order('created_at', { ascending: false });
      return json({
        wallet: { id: wallet.wallet_id, userId: wallet.user_id, status: wallet.wallet_status ?? 'active', currency: String(wallet.currency_code ?? 'JOD').toUpperCase(), autoTopUp: Boolean(wallet.auto_top_up_enabled), autoTopUpAmount: toNumber(wallet.auto_top_up_amount, 20), autoTopUpThreshold: toNumber(wallet.auto_top_up_threshold, 5), paymentMethods, createdAt: wallet.created_at },
        balance: toNumber(wallet.balance, 0), pendingBalance: toNumber(wallet.pending_balance, 0),
        transactions: (Array.isArray(transactions) ? transactions : []).map((t: Record<string, unknown>) => ({ id: String(t.transaction_id ?? ''), type: String(t.transaction_type ?? 'wallet'), amount: toNumber(t.amount, 0), createdAt: String(t.created_at ?? new Date().toISOString()) })),
      });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, 500);
    }
  }

  if (action === 'transactions' && request.method === 'GET') {
    try {
      const wallet = await ensureWalletForUser(admin, auth.canonicalUser.id);
      const { data: transactions } = await admin.from('transactions').select('*').eq('wallet_id', wallet.wallet_id).order('created_at', { ascending: false }).limit(50);
      return json({ transactions: (Array.isArray(transactions) ? transactions : []).map((t: Record<string, unknown>) => ({ id: String(t.transaction_id ?? ''), type: String(t.transaction_type ?? 'wallet'), amount: toNumber(t.amount, 0), createdAt: String(t.created_at ?? new Date().toISOString()) })) });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, 500);
    }
  }

  if (action === 'set-pin' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const pin = String(body.pin ?? '').trim();
    if (!/^\d{4}$/.test(pin)) return json({ error: 'Wallet PIN must be four digits.' }, 400);
    try {
      const pinHash = await hashWalletPin(pin);
      const { error } = await admin.from('wallets').update({ pin_hash: pinHash, updated_at: new Date().toISOString() }).eq('user_id', auth.canonicalUser.id);
      if (error) throw new Error(error.message);
      return json({ success: true });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, 500);
    }
  }

  if (action === 'verify-pin' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const pin = String(body.pin ?? '').trim();
    try {
      const wallet = await ensureWalletForUser(admin, auth.canonicalUser.id);
      const verified = await verifyWalletPinHash(pin, wallet.pin_hash);
      return json({ verified });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, 500);
    }
  }

  if (action === 'auto-top-up' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const amount = toMoneyNumber(body.amount);
    const threshold = toMoneyNumber(body.threshold);
    try {
      const { error } = await admin.from('wallets').update({
        auto_top_up_enabled: Boolean(body.enabled), auto_top_up_amount: amount > 0 ? amount : 20,
        auto_top_up_threshold: threshold >= 0 ? threshold : 5, updated_at: new Date().toISOString(),
      }).eq('user_id', auth.canonicalUser.id);
      if (error) throw new Error(error.message);
      return json({ success: true });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, 500);
    }
  }

  if (action === 'withdraw' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const amountJod = toMoneyNumber(body.amount);
    const bankAccount = String(body.bankAccount ?? '').trim();
    if (amountJod <= 0) return json({ error: 'Amount must be greater than zero.' }, 400);
    if (!bankAccount) return json({ error: 'Bank account is required.' }, 400);
    try {
      const wallet = await ensureWalletForUser(admin, auth.canonicalUser.id);
      if (toNumber(wallet.balance, 0) < amountJod) return json({ error: 'Insufficient wallet balance.' }, 400);
      const { error } = await admin.rpc('wallet_post_transaction', {
        p_wallet_id: wallet.wallet_id, p_amount: amountJod, p_transaction_type: 'withdraw_funds',
        p_payment_method: 'local_gateway', p_direction: 'debit', p_reference_type: 'bank_account',
        p_reference_id: null, p_metadata: { bank_account: bankAccount, description: 'Wallet withdrawal' },
      });
      if (error) throw new Error(error.message);
      return json({ success: true });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, 500);
    }
  }

  if (action === 'send' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const amountJod = toMoneyNumber(body.amount);
    const recipientId = String(body.recipientId ?? '').trim();
    const note = String(body.note ?? '').trim();
    if (amountJod <= 0) return json({ error: 'Amount must be greater than zero.' }, 400);
    try {
      const recipient = recipientId.trim();
      const { data: recipientUser } = await admin.from('users').select('id').or(`id.eq.${recipient},auth_user_id.eq.${recipient},email.eq.${recipient},phone_number.eq.${recipient}`).maybeSingle();
      if (!recipientUser?.id) return json({ error: 'Recipient wallet was not found.' }, 404);
      if (recipientUser.id === auth.canonicalUser.id) return json({ error: 'Cannot send wallet funds to the same account.' }, 400);
      const { error } = await admin.rpc('app_transfer_wallet_funds', { p_from_user_id: auth.canonicalUser.id, p_to_user_id: String(recipientUser.id), p_amount: amountJod, p_payment_method: 'wallet_balance' });
      if (error) throw new Error(error.message);
      return json({ success: true, note });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, 500);
    }
  }

  return json({ error: 'Not found' }, 404);
}

Deno.serve(async (request: Request) => {
  const headers = buildResponseHeaders(request);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^.*wallet-service/, '') || '/';
    let response: Response;

    if (path.startsWith('/wallet')) {
      response = await handleWalletRequest(request, path);
    } else if (path === '/health') {
      response = json({ status: 'ok', service: 'wallet-service', timestamp: new Date().toISOString() });
    } else {
      response = json({ error: 'Not found', service: 'wallet-service' }, 404);
    }

    const finalHeaders = new Headers(response.headers);
    headers.forEach((value, key) => finalHeaders.set(key, value));
    return new Response(response.body, { status: response.status, headers: finalHeaders });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500);
  }
});
