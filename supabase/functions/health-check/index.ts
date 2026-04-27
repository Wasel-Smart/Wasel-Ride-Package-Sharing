/**
 * Wasel Health Check Edge Function
 * Returns system health status for monitoring
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const health: {
      status: string;
      timestamp: string;
      version: string;
      latency_ms: number;
      checks: Record<string, string>;
    } = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      latency_ms: 0,
      checks: {},
    };

    // Check database connectivity
    const dbStart = Date.now();
    const { error: dbError } = await supabase.from('profiles').select('id').limit(1);
    health.checks.database = dbError ? 'error' : 'ok';
    const dbLatency = Date.now() - dbStart;

    // Check wallet table
    const { error: walletError } = await supabase.from('wallet_transactions').select('id').limit(1);
    health.checks.wallet = walletError ? 'error' : 'ok';

    // Check notifications table
    const { error: notifError } = await supabase.from('notifications').select('id').limit(1);
    health.checks.notifications = notifError ? 'error' : 'ok';

    // Overall status
    const allOk = Object.values(health.checks).every(v => v === 'ok');
    health.status = allOk ? 'healthy' : 'degraded';
    health.latency_ms = Date.now() - startTime + dbLatency;

    return new Response(JSON.stringify(health), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: allOk ? 200 : 503,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 503,
      },
    );
  }
});
