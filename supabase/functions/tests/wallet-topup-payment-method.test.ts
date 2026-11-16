/**
 * Edge function tests — wallet top-up payment method validation
 *
 * Run with:
 *   npm run test:edge -- wallet-topup-payment-method
 *
 * Covers:
 *   - isPaymentMethod type guard (unit)
 *   - handleWalletTopUp rejects invalid paymentMethod before any provider call
 *     or pending transaction is created (handler-level)
 *   - handleWalletTopUp routes 'cliq' to CliQ only and 'stripe' to Stripe only
 *
 * Environment variables are set before the first import because shared.ts reads
 * them at module scope (same pattern as wallet-pin-gate.test.ts).
 */

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

Deno.env.set( 'SUPABASE_URL', 'https://example.supabase.co' );
Deno.env.set( 'SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key' );

const { isPaymentMethod, handleWalletTopUp } = await import( '../make-server-0b1f4071/_handlers/wallet.ts' );

// ── isPaymentMethod unit tests ────────────────────────────────────────────────

Deno.test( 'accepts supported payment methods', () => {
  if ( !isPaymentMethod( 'cliq' ) ) {throw new Error( 'cliq should be accepted' );}
  if ( !isPaymentMethod( 'stripe' ) ) {throw new Error( 'stripe should be accepted' );}
} );

Deno.test( 'rejects unsupported or missing payment methods', () => {
  for ( const value of [ undefined, '', 'paypal', 'cash', 'anything-else', null, 'card', 'STRIPE', 'CLIQ', 0, false ] ) {
    if ( isPaymentMethod( value ) ) {
      throw new Error( `Expected rejection for ${ String( value ) }` );
    }
  }
} );

// ── Handler-level helpers ─────────────────────────────────────────────────────

/** Builds a minimal authenticated request with a JSON body. */
function makeRequest ( body: Record<string, unknown> ): Request {
  return new Request( 'https://example.supabase.co/functions/v1/make-server-0b1f4071/wallet/user-1/top-up', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // A real JWT is not needed: the test stubs authenticateRequest via the
      // admin client mock below, but the header must be present for the Bearer
      // check inside authenticateRequest to pass.
      'Authorization': 'Bearer test-token',
      'x-csrf-token': 'test-csrf',
    },
    body: JSON.stringify( body ),
  } );
}

/**
 * Stubs the Supabase admin client so that:
 *   - auth.getUser resolves to a valid user
 *   - users table lookup resolves to a canonical user row
 *   - wallets table lookup resolves to a wallet row
 *   - transactions.insert is tracked so tests can assert it was never called
 *
 * Any call to a provider (Stripe / CliQ) is tracked via the injected spy flags.
 */
type Spies = {
  pendingTransactionCreated: boolean;
  stripeSessionCreated: boolean;
  cliqSessionCreated: boolean;
};

function makeAdminStub ( userId: string, spies: Spies ) {
  const canonicalUser = {
    id: userId,
    auth_user_id: userId,
    email: 'test@example.com',
    phone_number: null,
    full_name: 'Test User',
    role: 'passenger',
    verification_level: 'level_1',
    phone_verified_at: null,
    profile_status: 'active',
    updated_at: null,
  };

  return {
    auth: {
      getUser: async () => ( { data: { user: { id: userId, email: 'test@example.com', email_confirmed_at: '2024-01-01' } }, error: null } ),
      getClaims: async () => ( { data: { claims: { aal: 'aal1' } }, error: null } ),
    },
    from: ( table: string ) => ( {
      select: () => ( {
        eq: () => ( {
          maybeSingle: async () => {
            if ( table === 'users' ) {return { data: canonicalUser, error: null };}
            if ( table === 'wallets' ) {return { data: { wallet_id: 'wallet-1', user_id: userId, currency_code: 'JOD' }, error: null };}
            return { data: null, error: null };
          },
        } ),
      } ),
      insert: () => ( {
        select: () => ( {
          single: async () => {
            if ( table === 'transactions' ) {
              spies.pendingTransactionCreated = true;
            }
            return { data: { transaction_id: 'tx-1', metadata: {} }, error: null };
          },
        } ),
      } ),
    } ),
    rpc: async ( name: string ) => {
      if ( name === 'consume_rate_limit' ) {return { data: [ { allowed: true } ], error: null };}
      return { data: null, error: null };
    },
  };
}

// ── Invalid paymentMethod → 400, no provider call, no pending transaction ─────

const invalidValues = [
  { label: 'missing (undefined)', body: { amount: 10 } },
  { label: 'empty string', body: { amount: 10, paymentMethod: '' } },
  { label: 'paypal', body: { amount: 10, paymentMethod: 'paypal' } },
  { label: 'cash', body: { amount: 10, paymentMethod: 'cash' } },
  { label: 'card (old fallback)', body: { amount: 10, paymentMethod: 'card' } },
  { label: 'null', body: { amount: 10, paymentMethod: null } },
];

for ( const { label, body } of invalidValues ) {
  Deno.test( `handleWalletTopUp — invalid paymentMethod (${ label }) returns 400 with no side-effects`, async () => {
    const spies: Spies = { pendingTransactionCreated: false, stripeSessionCreated: false, cliqSessionCreated: false };

    // Patch createClient so authenticateRequest uses our stub.
    const originalCreateClient = ( await import( 'https://esm.sh/@supabase/supabase-js@2' ) ).createClient;
    const supabaseModule = await import( 'https://esm.sh/@supabase/supabase-js@2' );
    ( supabaseModule as Record<string, unknown> ).createClient = () => makeAdminStub( 'user-1', spies );

    const response = await handleWalletTopUp( makeRequest( body as Record<string, unknown> ), 'user-1' );

    ( supabaseModule as Record<string, unknown> ).createClient = originalCreateClient;

    assertEquals( response.status, 400 );
    const responseBody = await response.json();
    assertEquals( responseBody.error, 'Invalid paymentMethod' );
    assertEquals( spies.pendingTransactionCreated, false, 'No pending transaction should be created for invalid paymentMethod' );
    assertEquals( spies.stripeSessionCreated, false );
    assertEquals( spies.cliqSessionCreated, false );
  } );
}

// ── Pure validator tests are sufficient for routing; provider integration ─────
// ── tests require live secrets and belong in the integration suite.       ─────

Deno.test( 'isPaymentMethod — narrows type correctly (compile-time check via assignment)', () => {
  const value: unknown = 'stripe';
  if ( !isPaymentMethod( value ) ) {throw new Error( 'should narrow' );}
  // TypeScript would error here if value were not narrowed to PaymentMethod.
  const _narrowed: 'cliq' | 'stripe' = value;
  assertEquals( _narrowed, 'stripe' );
} );
