/**
 * Wasel Notification Trigger Edge Function
 * Sends push notifications to users via the notification queue
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  user_id: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown>;
}

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: NotificationRequest = await req.json();
    const { user_id, title, body: messageBody, type, data } = body;

    if (!user_id || !title || !messageBody) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Create notification record
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id,
        type,
        title,
        body: messageBody,
        data: data ?? {},
        delivery_status: 'pending',
      })
      .select()
      .single();

    if (notifError) {
      return new Response(JSON.stringify({ error: notifError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Queue for delivery
    const { error: queueError } = await supabase.from('communication_deliveries').insert({
      user_id,
      notification_id: notification.id,
      channel: 'in_app',
      delivery_status: 'queued',
    });

    if (queueError) {
      console.error('Queue error:', queueError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: notification.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Invalid request',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
