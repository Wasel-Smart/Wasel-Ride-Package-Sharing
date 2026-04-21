/**
 * Wasel Ride Pricing Edge Function
 * Calculates ride pricing based on distance, time, and demand
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PricingRequest {
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  seats_requested?: number;
  trip_type?: 'wasel' | 'raje3';
}

const BASE_PRICE_JOD = 1.0;
const PRICE_PER_KM = 0.35;
const Raje3_MULTIPLIER = 0.75;

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: PricingRequest = await req.json();
    const {
      pickup_lat,
      pickup_lng,
      dropoff_lat,
      dropoff_lng,
      seats_requested = 1,
      trip_type = 'wasel',
    } = body;

    // Validate coordinates
    if (!pickup_lat || !pickup_lng || !dropoff_lat || !dropoff_lng) {
      return new Response(JSON.stringify({ error: 'Missing coordinates' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate distance
    const distanceKm = calculateDistance(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng);

    // Calculate base price
    let price = BASE_PRICE_JOD + distanceKm * PRICE_PER_KM;

    // Apply trip type multiplier
    if (trip_type === 'raje3') {
      price *= Raje3_MULTIPLIER;
    }

    // Apply seat multiplier
    const totalPrice = price * seats_requested;

    // Get current demand multiplier from KV store
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    let demandMultiplier = 1.0;
    const { data: kvData } = await supabase
      .from('kv_store')
      .select('numeric_value')
      .eq('key', 'demand_multiplier')
      .single();

    if (kvData?.numeric_value) {
      demandMultiplier = kvData.numeric_value;
    }

    const finalPrice = totalPrice * demandMultiplier;

    return new Response(
      JSON.stringify({
        distance_km: Math.round(distanceKm * 100) / 100,
        base_price_jod: Math.round(price * 100) / 100,
        seats_requested,
        trip_type,
        demand_multiplier: demandMultiplier,
        total_price_jod: Math.round(finalPrice * 100) / 100,
        currency: 'JOD',
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
