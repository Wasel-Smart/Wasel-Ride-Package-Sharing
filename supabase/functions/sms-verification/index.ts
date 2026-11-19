/**
 * Wasel SMS Verification Service
 * Handles phone verification via Twilio
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const TWILIO_SMS_FROM = Deno.env.get('TWILIO_SMS_FROM') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateVerificationCode(): string {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return String(100000 + (random[0] % 900000));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (path.includes('/send-code')) {
      const { phone_number } = await req.json();

      if (!phone_number) {
        return new Response(
          JSON.stringify({ error: 'Phone number required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count: recentSends, error: rateLimitError } = await supabaseAdmin
        .from('phone_verifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('phone_number', phone_number)
        .gte('created_at', windowStart);

      if (rateLimitError) {
        throw new Error('Unable to verify SMS request limits.');
      }
      if ((recentSends ?? 0) >= 3) {
        return new Response(
          JSON.stringify({ error: 'Too many verification messages. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const { error: insertError } = await supabaseAdmin.from('phone_verifications').insert({
        user_id: user.id,
        phone_number,
        code,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
      });

      if (insertError) {
        throw new Error('Unable to create phone verification challenge.');
      }

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
      const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

      const formData = new URLSearchParams();
      formData.append('To', phone_number);
      formData.append('From', TWILIO_SMS_FROM);
      formData.append('Body', `Your Wasel verification code is: ${code}. Valid for 10 minutes.`);

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Twilio error: ${error}`);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Verification code sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (path.includes('/verify-code')) {
      const { phone_number, code } = await req.json();

      if (!phone_number || !code) {
        return new Response(
          JSON.stringify({ error: 'Phone number and code required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: verification, error } = await supabaseAdmin
        .from('phone_verifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('phone_number', phone_number)
        .eq('verified', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !verification) {
        return new Response(
          JSON.stringify({ error: 'Invalid verification code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (new Date(verification.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Verification code expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if ((verification.attempts ?? 0) >= 5) {
        return new Response(
          JSON.stringify({ error: 'Too many incorrect attempts. Request a new code.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (String(verification.code) !== String(code)) {
        await supabaseAdmin
          .from('phone_verifications')
          .update({ attempts: (verification.attempts ?? 0) + 1 })
          .eq('id', verification.id);
        return new Response(
          JSON.stringify({ error: 'Invalid verification code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabaseAdmin
        .from('phone_verifications')
        .update({ verified: true, verified_at: new Date().toISOString() })
        .eq('id', verification.id);

      await supabaseAdmin
        .from('profiles')
        .update({ phone_number, phone_verified: true })
        .eq('id', user.id);

      await supabaseAdmin.from('user_verifications').insert({
        user_id: user.id,
        verification_type: 'phone',
        status: 'verified',
        verified_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Phone verified successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('SMS verification request failed:', error instanceof Error ? error.name : 'UnknownError');
    return new Response(
      JSON.stringify({ error: 'Unable to process verification request. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
