import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.119.0';

const SUPABASE_URL = Deno.env.get( 'SUPABASE_URL' ) ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get( 'SUPABASE_SERVICE_ROLE_KEY' ) ?? '';
const WORKER_SECRET = Deno.env.get( 'OUTBOX_WORKER_SECRET' ) ?? '';
const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;

type OutboxRow = {
  id: string;
  topic: string;
  payload: Record<string, unknown>;
  producer: string;
  trace_id: string;
  attempts: number;
  created_at: string;
  claim_token: string;
};

// Topic → edge function path for fan-out dispatch.
const TOPIC_FUNCTION_MAP: Record<string, string> = {
  'rides.requested':           'matching-worker',
  'rides.assigned':            'make-server-0b1f4071',
  'rides.completed':           'make-server-0b1f4071',
  'packages.created':          'package-service',
  'packages.location-updated': 'package-service',
  'packages.delivered':        'make-server-0b1f4071',
  'payments.authorized':       'make-server-0b1f4071',
  'payments.captured':         'make-server-0b1f4071',
  'notifications.dispatch':    'make-server-0b1f4071',
};

function getAdminClient () {
  return createClient( SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  } );
}

function constantTimeEqual ( a: string, b: string ): boolean {
  if ( a.length !== b.length ) {return false;}
  let result = 0;
  for ( let i = 0; i < a.length; i++ ) {result |= a.charCodeAt( i ) ^ b.charCodeAt( i );}
  return result === 0;
}

async function dispatchEvent ( event: OutboxRow ): Promise<{ ok: boolean; reason?: string }> {
  const fnName = TOPIC_FUNCTION_MAP[ event.topic ];
  if ( !fnName ) {
    return { ok: true, reason: 'no_worker_registered' };
  }

  const fnUrl = `${ SUPABASE_URL.replace( /\/$/, '' ) }/functions/v1/${ fnName }/events`;

  try {
    const response = await fetch( fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ SUPABASE_SERVICE_ROLE_KEY }`,
        'X-Trace-Id': event.trace_id,
        'X-Outbox-Event-Id': event.id,
      },
      body: JSON.stringify( {
        id: event.id,
        topic: event.topic,
        payload: event.payload,
        traceId: event.trace_id,
        producer: event.producer,
        occurredAt: event.created_at,
        attempts: event.attempts,
      } ),
      signal: AbortSignal.timeout( 15_000 ),
    } );

    if ( !response.ok ) {
      // Keep upstream bodies out of the outbox and logs: they may contain
      // internal implementation details or reflected request data.
      await response.body?.cancel().catch( () => undefined );
      return { ok: false, reason: `http_${ response.status }` };
    }

    return { ok: true };
  } catch ( err ) {
    return { ok: false, reason: err instanceof Error ? err.message : String( err ) };
  }
}

async function drainOutbox (): Promise<{ processed: number; succeeded: number; failed: number; skipped: number }> {
  const admin = getAdminClient();

  // Persisted claims survive the RPC transaction. Expired claims are recovered
  // automatically if an invocation dies before it finishes the batch.
  const { data, error } = await admin.rpc( 'consume_outbox_batch', { p_batch_size: BATCH_SIZE } );

  if ( error ) {throw new Error( `outbox batch claim failed: ${ error.message }` );}

  const rows = ( Array.isArray( data ) ? data : [] ) as OutboxRow[];
  let succeeded = 0;
  let failed = 0;
  const skipped = 0;

  for ( const event of rows ) {
    const result = await dispatchEvent( event );

    if ( result.reason === 'no_worker_registered' ) {
      const { data: failedEvent, error: failError } = await admin
        .from( 'event_outbox' )
        .update( {
          status: 'failed',
          last_error: `no_worker_registered:${ event.topic }`,
          claim_token: null,
          locked_until: null,
        } )
        .eq( 'id', event.id )
        .eq( 'claim_token', event.claim_token )
        .select( 'id' )
        .maybeSingle();
      if ( failError || !failedEvent ) {throw new Error( `outbox unroutable-event update failed for ${ event.id }: ${ failError?.message ?? 'claim lost' }` );}
      console.error( JSON.stringify( {
        message: 'outbox event has no registered worker',
        eventId: event.id,
        topic: event.topic,
        traceId: event.trace_id,
      } ) );
      failed++;
      continue;
    }

    if ( result.ok ) {
      const { data: completed, error: completeError } = await admin
        .from( 'event_outbox' )
        .update( { status: 'processed', processed_at: new Date().toISOString(), claim_token: null, locked_until: null } )
        .eq( 'id', event.id )
        .eq( 'claim_token', event.claim_token )
        .select( 'id' )
        .maybeSingle();
      if ( completeError || !completed ) {throw new Error( `outbox completion failed for ${ event.id }: ${ completeError?.message ?? 'claim lost' }` );}
      succeeded++;
    } else {
      // Delegate backoff scheduling and DLQ transition to the DB function so the
      // logic is consistent regardless of which worker instance handles the row.
      const { error: failError } = await admin.rpc( 'outbox_record_failure', {
        p_id:           event.id,
        p_max_attempts: MAX_ATTEMPTS,
        p_error:        result.reason ?? null,
        p_claim_token:  event.claim_token,
      } );

      if ( failError ) {
        console.error( JSON.stringify( {
          level: 'error',
          service: 'outbox-worker',
          message: 'outbox_record_failure RPC failed',
          eventId: event.id,
          rpcError: failError.message,
        } ) );
        throw new Error( `outbox failure update failed for ${ event.id }: ${ failError.message }` );
      }

      console.error( JSON.stringify( {
        level: 'error',
        service: 'outbox-worker',
        message: 'event dispatch failed',
        eventId: event.id,
        topic: event.topic,
        traceId: event.trace_id,
        attempts: ( event.attempts ?? 0 ) + 1,
        reason: result.reason,
      } ) );

      failed++;
    }
  }

  return { processed: rows.length, succeeded, failed, skipped };
}

Deno.serve( async ( request: Request ) => {
  if ( request.method !== 'POST' ) {
    return new Response( JSON.stringify( { error: 'Method not allowed' } ), { status: 405 } );
  }

  const secret = request.headers.get( 'x-outbox-worker-secret' ) ?? '';

  if ( !WORKER_SECRET ) {
    return new Response( JSON.stringify( { error: 'Worker is not configured' } ), { status: 503 } );
  }

  if ( !constantTimeEqual( secret, WORKER_SECRET ) ) {
    return new Response( JSON.stringify( { error: 'Unauthorized' } ), { status: 401 } );
  }

  if ( !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY ) {
    return new Response( JSON.stringify( { error: 'Supabase not configured' } ), { status: 503 } );
  }

  try {
    const result = await drainOutbox();
    console.info( JSON.stringify( { level: 'info', service: 'outbox-worker', ...result } ) );
    return new Response( JSON.stringify( result ), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    } );
  } catch ( err ) {
    const message = err instanceof Error ? err.message : String( err );
    console.error( JSON.stringify( { level: 'error', service: 'outbox-worker', message } ) );
    return new Response( JSON.stringify( { error: message } ), { status: 500 } );
  }
} );
