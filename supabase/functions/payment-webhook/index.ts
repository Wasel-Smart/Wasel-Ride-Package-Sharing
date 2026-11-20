/**
 * Deprecated payment webhook.
 *
 * Wasel now processes provider events through the signed wallet webhook route
 * in make-server-0b1f4071. This legacy endpoint used the retired schema and
 * must never write payment state directly to packages or wallet tables.
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

serve((_request) => new Response(
  JSON.stringify({
    error: 'This webhook endpoint is deprecated.',
    message: 'Use the signed wallet webhook endpoint configured for make-server-0b1f4071.',
  }),
  {
    status: 410,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  },
));
