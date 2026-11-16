/**
 * Edge function tests — wallet top-up payment method validation
 *
 * Run with:
 *   npm run test:edge -- wallet-topup-payment-method
 *
 * Covers:
 *   1. isPaymentMethod type guard — pure unit, no I/O
 *   2. handleWalletTopUp returns 400 for every invalid paymentMethod before
 *      any provider call or pending transaction is created
 *   3. handleWalletTopUp routes 'cliq' to CliQ only and 'stripe' to Stripe only
 *      (verified via injected provider spies — no live secrets needed)
 *
 * Provider calls are injected via TopUpProviderDeps so tests never touch the
 * Stripe or CliQ APIs. The Supabase client is stubbed by overriding the
 * SUPABASE_SERVICE_ROLE_KEY to a sentinel value and providing a fake auth
 * response via the stub admin client passed through the same injection point.
 *
 * Environment variables must be set before the first import because shared.ts
 * reads them at module scope.
 */

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

Deno.env.set( 'SUPABASE_URL', 'https://example.supabase.co' );
Deno.env.set( 'SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key' );

const { isPaymentMethod, handleWalletTopUp } = await import( '../make-server-0b1f4071/_handlers/wallet.ts' );
import type { TopUpProviderDeps } from '../make-server-0b1f4071/_handlers/wallet.ts';
import type { AuthResult } from '../make-server-0b1f4071/_handlers/shared.ts';

// ── 1. isPaymentMethod — pure unit tests ─────────────────────────────────────

Deno.test( 'isPaymentMethod: accepts "cliq"', () => {
  if ( !isPaymentMethod( 'cliq' ) ) {throw new Error( 'cliq should be accepted' );}
} );

Deno.test( 'isPaymentMethod: accepts "stripe"', () => {
  if ( !isPaymentMethod( 'stripe' ) ) {throw new Error( 'stripe should be accepted' );}
} );

Deno.test( 'isPaymentMethod: rejects every non-allowlisted value', () => {
  const rejected = [
    undefined, null, '', 'card', 'paypal', 'cash', 'anything-else',
    'STRIPE', 'CLIQ', 'Stripe', 'Cliq', 0, false, true, {}, [],
  ];
  for ( const value of rejected ) {
    if ( isPaymentMethod( value ) ) {
      throw new Error( `Expected rejection for: ${ JSON.stringify( value ) }` );
    }
  }
} );

Deno.test( 'isPaymentMethod: narrows type to PaymentMethod union', () => {
  const value: unknown = 'stripe';
  if ( !isPaymentMethod( value ) ) {throw new Error( 'should narrow' );}
  const _narrowed: 'cliq' | 'stripe' = value;
  assertEquals( _narrowed, 'stripe' );
} );

// ── Shared test infrastructure ────────────────────────────────────────────────

type CheckoutSession = { id: string; url: string | null; sessionId: string; checkoutUrl: string };

type Spies = {
  pendingTxCreated: boolean;
  stripeCallCount: number;
  cliqCallCount: number;
};

/** Builds a chainable Supabase query stub that resolves correctly per table. */
function makeQueryChain ( table: string, spies: Spies, userId: string ) {
  const canonicalUser = {
    id: userId, auth_user_id: userId, email: 'u@example.com',
    phone_number: null, full_name: 'Test', role: 'passenger',
    verification_level: 'level_1', phone_verified_at: null,
    profile_status: 'active', updated_at: null,
  };

  const terminal: Record<string, unknown> = {
    maybeSingle: async () => {
      if ( table === 'users' ) {return { data: canonicalUser, error: null };}
      if ( table === 'wallets' ) {return { data: { wallet_id: 'w-1', user_id: userId, currency_code: 'JOD' }, error: null };}
      return { data: null, error: null };
    },
    single: async () => {
      if ( table === 'transactions' ) {spies.pendingTxCreated = true;}
      return { data: { transaction_id: 'tx-1', metadata: {} }, error: null };
    },
  };

  return new Proxy( terminal, {
    get ( target, prop ) {
      if ( prop in target ) {return target[ prop as string ];}
      // Every unknown method (eq, select, insert, update, neq, …) returns the same proxy.
      return () => new Proxy( terminal, this );
    },
  } );
}

/** Builds a fake Supabase admin client. */
function makeAdminStub ( userId: string, spies: Spies ) {
  return {
    auth: {
      getUser: async () => ( {
        data: { user: { id: userId, email: 'u@example.com', email_confirmed_at: '2024-01-01' } },
        error: null,
      } ),
      getClaims: async () => ( { data: { claims: { aal: 'aal1' } }, error: null } ),
    },
    from: ( table: string ) => makeQueryChain( table, spies, userId ),
    rpc: async ( name: string ) => {
      if ( name === 'consume_rate_limit' ) {return { data: [ { allowed: true } ], error: null };}
      return { data: null, error: null };
    },
  };
}

function makeAuthSuccess ( admin: ReturnType<typeof makeAdminStub>, userId: string ): AuthResult {
  return {
    admin: admin as never,
    authUser: { id: userId, email: 'u@example.com', email_confirmed_at: '2024-01-01' } as never,
    canonicalUser: {
      id: userId, auth_user_id: userId, email: 'u@example.com',
      phone_number: null, full_name: 'Test', role: 'passenger',
      verification_level: 'level_1', phone_verified_at: null,
      profile_status: 'active', updated_at: null,
    } as never,
  };
}

function makeProviderDeps ( spies: Spies, admin: ReturnType<typeof makeAdminStub>, userId: string ): TopUpProviderDeps {
  return {
    authenticate: async () => makeAuthSuccess( admin, userId ),
    createStripe: async () => {
      spies.stripeCallCount += 1;
      return { id: 'cs_test', url: 'https://checkout.stripe.com/test', sessionId: 'cs_test', checkoutUrl: 'https://checkout.stripe.com/test' } satisfies CheckoutSession;
    },
    createCliq: async () => {
      spies.cliqCallCount += 1;
      return { id: 'cliq-tx-1', url: 'https://cliq.example.com/pay', sessionId: 'cliq-tx-1', checkoutUrl: 'https://cliq.example.com/pay', providerReference: 'cliq-tx-1' };
    },
  };
}

function makeRequest ( body: Record<string, unknown> ): Request {
  return new Request(
    'https://example.supabase.co/functions/v1/make-server-0b1f4071/wallet/user-1/top-up',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
        'x-csrf-token': 'test-csrf',
      },
      body: JSON.stringify( body ),
    },
  );
}

// ── 2. Invalid paymentMethod → 400, no provider call, no pending transaction ──

Deno.test( 'handleWalletTopUp: invalid paymentMethod returns 400, no provider called, no pending tx', async () => {
  const USER_ID = 'user-1';
  const spies: Spies = { pendingTxCreated: false, stripeCallCount: 0, cliqCallCount: 0 };
  const admin = makeAdminStub( USER_ID, spies );
  const deps = makeProviderDeps( spies, admin, USER_ID );

  const res = await handleWalletTopUp( makeRequest( { paymentMethod: 'card', amount: 10 } ), USER_ID, deps );

  assertEquals( res.status, 400 );
  assertEquals( spies.stripeCallCount, 0 );
  assertEquals( spies.cliqCallCount, 0 );
  assertEquals( spies.pendingTxCreated, false );
} );

// ── 3. Routing: 'stripe' → Stripe only, 'cliq' → CliQ only ──────────────────

Deno.test( 'handleWalletTopUp: "stripe" routes to Stripe only, pending tx created', async () => {
  const USER_ID = 'user-1';
  const spies: Spies = { pendingTxCreated: false, stripeCallCount: 0, cliqCallCount: 0 };
  const admin = makeAdminStub( USER_ID, spies );
  const deps = makeProviderDeps( spies, admin, USER_ID );

  const res = await handleWalletTopUp( makeRequest( { paymentMethod: 'stripe', amount: 10 } ), USER_ID, deps );

  assertEquals( res.status, 202 );
  assertEquals( spies.stripeCallCount, 1 );
  assertEquals( spies.cliqCallCount, 0 );
  assertEquals( spies.pendingTxCreated, true );
} );

Deno.test( 'handleWalletTopUp: "cliq" routes to CliQ only, pending tx created', async () => {
  Deno.env.set( 'CLIQ_CHECKOUT_URL_TEMPLATE', 'https://cliq.test/pay?tx={transactionId}&amount={amount}' );
  const USER_ID = 'user-1';
  const spies: Spies = { pendingTxCreated: false, stripeCallCount: 0, cliqCallCount: 0 };
  const admin = makeAdminStub( USER_ID, spies );
  const deps = makeProviderDeps( spies, admin, USER_ID );

  const res = await handleWalletTopUp( makeRequest( { paymentMethod: 'cliq', amount: 10 } ), USER_ID, deps );

  assertEquals( res.status, 202 );
  assertEquals( spies.cliqCallCount, 1 );
  assertEquals( spies.stripeCallCount, 0 );
  assertEquals( spies.pendingTxCreated, true );
} );

// ── 4. Auth failure: 401, no provider called, no pending tx ──────────────────

Deno.test( 'handleWalletTopUp: auth failure returns 401, no provider called, no pending tx', async () => {
  const USER_ID = 'user-1';
  const spies: Spies = { pendingTxCreated: false, stripeCallCount: 0, cliqCallCount: 0 };
  const admin = makeAdminStub( USER_ID, spies );
  const deps: TopUpProviderDeps = {
    ...makeProviderDeps( spies, admin, USER_ID ),
    authenticate: async () => ( { error: new Response( JSON.stringify( { error: 'Unauthorized' } ), { status: 401 } ) } ),
  };

  const res = await handleWalletTopUp( makeRequest( { paymentMethod: 'stripe', amount: 10 } ), USER_ID, deps );

  assertEquals( res.status, 401 );
  assertEquals( spies.stripeCallCount, 0 );
  assertEquals( spies.cliqCallCount, 0 );
  assertEquals( spies.pendingTxCreated, false );
} );
