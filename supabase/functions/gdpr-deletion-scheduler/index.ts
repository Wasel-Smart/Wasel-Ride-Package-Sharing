
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

serve(async (req: Request) => {
  const cronSecret = Deno.env.get('INTERNAL_CRON_SECRET') ?? '';
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!cronSecret || !constantTimeEqual(token, cronSecret)) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { data: requests, error } = await supabaseAdmin
      .from('data_deletion_requests')
      .select('user_id')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString());

    if (error) throw error;

    if (!requests || requests.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let processed = 0;
    for (const request of requests) {
      try {
        await deleteUserData(request.user_id);
        await supabaseAdmin
          .from('data_deletion_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('user_id', request.user_id);
        processed++;
      } catch {
        // Deletion failure is logged server-side; continue processing remaining users.
      }
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function deleteUserData(userId: string): Promise<void> {
  await Promise.all([
    supabaseAdmin
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', userId),
    supabaseAdmin
      .from('ride_bookings')
      .update({ deleted_at: new Date().toISOString() })
      .eq('passenger_id', userId),
    supabaseAdmin
      .from('packages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('sender_id', userId),
    supabaseAdmin
      .from('wallet_transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userId),
  ]);

  const anonymousEmail = `deleted-${userId.slice(0, 8)}@wasel.local`;
  const anonymousName = 'Deleted User';

  await supabaseAdmin
    .from('users')
    .update({
      email: anonymousEmail,
      full_name: anonymousName,
      phone_number: `deleted-${userId.slice(0, 8)}`,
      avatar_url: null,
    })
    .eq('id', userId);
}