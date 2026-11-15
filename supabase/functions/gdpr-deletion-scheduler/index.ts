
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {return false;}
  let result = 0;
  for (let i = 0; i < a.length; i++) {result |= a.charCodeAt(i) ^ b.charCodeAt(i);}
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
    const staleClaimBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { error: staleClaimError } = await supabaseAdmin
      .from('data_deletion_requests')
      .update({ status: 'pending', processing_started_at: null })
      .eq('status', 'processing')
      .lte('processing_started_at', staleClaimBefore);
    if (staleClaimError) {throw staleClaimError;}

    const { data: requests, error } = await supabaseAdmin
      .from('data_deletion_requests')
      .select('user_id')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString());

    if (error) {throw error;}

    if (!requests || requests.length === 0) {
      return new Response(JSON.stringify({ processed: 0, failed: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let processed = 0;
    let failed = 0;
    for (const request of requests) {
      const { data: claimed, error: claimError } = await supabaseAdmin
        .from('data_deletion_requests')
        .update({ status: 'processing', processing_started_at: new Date().toISOString() })
        .eq('user_id', request.user_id)
        .eq('status', 'pending')
        .select('user_id')
        .maybeSingle();

      if (claimError) {
        console.error('[gdpr-scheduler] claim failed', { code: claimError.code ?? 'unknown' });
        continue;
      }
      if (!claimed) {continue;}

      try {
        await deleteUserData(request.user_id);
        const { error: completionError } = await supabaseAdmin
          .from('data_deletion_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            processing_started_at: null,
          })
          .eq('user_id', request.user_id)
          .eq('status', 'processing');
        if (completionError) {throw completionError;}
        processed++;
      } catch (deletionError) {
        failed++;
        console.error('[gdpr-scheduler] deletion failed', {
          userId: request.user_id,
          message: deletionError instanceof Error ? deletionError.message : 'unknown error',
        });
        const { error: retryError } = await supabaseAdmin
          .from('data_deletion_requests')
          .update({ status: 'pending', processing_started_at: null })
          .eq('user_id', request.user_id)
          .eq('status', 'processing');
        if (retryError) {
          console.error('[gdpr-scheduler] retry reset failed', { code: retryError.code ?? 'unknown' });
        }
      }
    }

    return new Response(JSON.stringify({ processed, failed }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[gdpr-scheduler] run failed', {
      name: error instanceof Error ? error.name : 'unknown',
    });
    return new Response(
      JSON.stringify({ error: 'Scheduled deletion processing failed.' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function deleteUserData(userId: string): Promise<void> {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('auth_user_id')
    .eq('id', userId)
    .maybeSingle();
  if (profileError || !profile) {
    throw profileError ?? new Error('User profile is unavailable.');
  }

  const softDeleteResults = await Promise.all([
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
  const softDeleteError = softDeleteResults.find(result => result.error)?.error;
  if (softDeleteError) {throw softDeleteError;}

  const anonymousEmail = `deleted-${userId.slice(0, 8)}@wasel.local`;
  const anonymousName = 'Deleted User';

  const { error: anonymizeError } = await supabaseAdmin
    .from('users')
    .update({
      email: anonymousEmail,
      full_name: anonymousName,
      phone_number: `deleted-${userId.slice(0, 8)}`,
      avatar_url: null,
    })
    .eq('id', userId);
  if (anonymizeError) {throw anonymizeError;}

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(profile.auth_user_id ?? userId);
  if (authDeleteError && authDeleteError.status !== 404) {throw authDeleteError;}
}
