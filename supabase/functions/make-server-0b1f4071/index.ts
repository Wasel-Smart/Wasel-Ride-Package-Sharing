import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestContext {
  supabase: ReturnType<typeof createClient>;
  userId: string | null;
  isAuthenticated: boolean;
}

// Initialize Supabase client
function getSupabaseClient(authHeader: string | null) {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    }
  );
}

// Extract user from JWT
async function getRequestContext(req: Request): Promise<RequestContext> {
  const authHeader = req.headers.get('Authorization');
  const supabase = getSupabaseClient(authHeader);
  
  if (!authHeader) {
    return { supabase, userId: null, isAuthenticated: false };
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return { supabase, userId: null, isAuthenticated: false };
    }
    return { supabase, userId: user.id, isAuthenticated: true };
  } catch {
    return { supabase, userId: null, isAuthenticated: false };
  }
}

// Health check endpoint
async function handleHealth(): Promise<Response> {
  return new Response(
    JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'wasel-api',
      version: '1.0.0',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

// Find matching trips for a ride request
async function handleFindTrips(ctx: RequestContext, body: any): Promise<Response> {
  const { originLat, originLng, destLat, destLng, departureDate, seats } = body;

  if (!originLat || !originLng || !destLat || !destLng) {
    return new Response(
      JSON.stringify({ error: 'Missing required location parameters' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  // Simple distance-based matching (can be enhanced with PostGIS)
  const { data: trips, error } = await ctx.supabase
    .from('trips')
    .select('*, driver:profiles!trips_driver_id_fkey(id, full_name, avatar_url, trust_score)')
    .eq('status', 'active')
    .gte('available_seats', seats || 1)
    .gte('departure_time', departureDate || new Date().toISOString());

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }

  // Filter by distance (simple haversine approximation)
  const matchedTrips = trips?.filter(trip => {
    const originDist = calculateDistance(originLat, originLng, trip.origin_lat, trip.origin_lng);
    const destDist = calculateDistance(destLat, destLng, trip.destination_lat, trip.destination_lng);
    return originDist < 10 && destDist < 10; // Within 10km
  }) || [];

  return new Response(
    JSON.stringify({ trips: matchedTrips, count: matchedTrips.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

// Create a ride booking
async function handleCreateRide(ctx: RequestContext, body: any): Promise<Response> {
  if (!ctx.isAuthenticated) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
    );
  }

  const { tripId, pickupAddress, dropoffAddress, pickupLat, pickupLng, dropoffLat, dropoffLng, seatsRequested, totalPrice } = body;

  // Validate trip availability
  const { data: trip, error: tripError } = await ctx.supabase
    .from('trips')
    .select('available_seats, status')
    .eq('id', tripId)
    .single();

  if (tripError || !trip) {
    return new Response(
      JSON.stringify({ error: 'Trip not found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
    );
  }

  if (trip.status !== 'active' || trip.available_seats < seatsRequested) {
    return new Response(
      JSON.stringify({ error: 'Trip not available' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  // Create ride
  const { data: ride, error: rideError } = await ctx.supabase
    .from('rides')
    .insert({
      trip_id: tripId,
      passenger_id: ctx.userId,
      pickup_address: pickupAddress,
      dropoff_address: dropoffAddress,
      pickup_lat: pickupLat,
      pickup_lng: pickupLng,
      dropoff_lat: dropoffLat,
      dropoff_lng: dropoffLng,
      seats_requested: seatsRequested,
      total_price: totalPrice,
      status: 'REQUESTED',
    })
    .select()
    .single();

  if (rideError) {
    return new Response(
      JSON.stringify({ error: rideError.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }

  // Create ride event
  await ctx.supabase.from('ride_events').insert({
    ride_id: ride.id,
    actor_id: ctx.userId,
    event_type: 'RIDE_REQUESTED',
    to_status: 'REQUESTED',
    payload: { trip_id: tripId, seats: seatsRequested },
  });

  // Enqueue matching job
  await ctx.supabase.rpc('enqueue_job', {
    p_type: 'match_ride',
    p_payload: { ride_id: ride.id },
    p_priority: 3,
  });

  return new Response(
    JSON.stringify({ ride, message: 'Ride request created successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
  );
}

// Create a trip offer
async function handleCreateTrip(ctx: RequestContext, body: any): Promise<Response> {
  if (!ctx.isAuthenticated) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
    );
  }

  const { data: trip, error } = await ctx.supabase
    .from('trips')
    .insert({
      driver_id: ctx.userId,
      ...body,
    })
    .select()
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }

  return new Response(
    JSON.stringify({ trip, message: 'Trip created successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
  );
}

// Get user wallet balance
async function handleGetWallet(ctx: RequestContext): Promise<Response> {
  if (!ctx.isAuthenticated) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
    );
  }

  const { data: profile, error: profileError } = await ctx.supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', ctx.userId)
    .single();

  if (profileError) {
    return new Response(
      JSON.stringify({ error: profileError.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }

  const { data: transactions, error: txError } = await ctx.supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (txError) {
    return new Response(
      JSON.stringify({ error: txError.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }

  return new Response(
    JSON.stringify({ balance: profile.wallet_balance, transactions }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

// Send notification
async function handleSendNotification(ctx: RequestContext, body: any): Promise<Response> {
  const { userId, title, message, type, referenceType, referenceId } = body;

  const { error } = await ctx.supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title,
      message,
      type,
      reference_type: referenceType,
      reference_id: referenceId,
    });

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }

  return new Response(
    JSON.stringify({ message: 'Notification sent' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

// Calculate distance using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Main request handler
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const ctx = await getRequestContext(req);

    // Health check
    if (path === '/health' || path.endsWith('/health')) {
      return await handleHealth();
    }

    // Parse request body for POST/PUT/PATCH
    let body = null;
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      try {
        body = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON body' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    // Route handling
    if (path.includes('/trips/search') && req.method === 'POST') {
      return await handleFindTrips(ctx, body);
    }
    
    if (path.includes('/trips') && req.method === 'POST') {
      return await handleCreateTrip(ctx, body);
    }
    
    if (path.includes('/rides') && req.method === 'POST') {
      return await handleCreateRide(ctx, body);
    }
    
    if (path.includes('/wallet') && req.method === 'GET') {
      return await handleGetWallet(ctx);
    }
    
    if (path.includes('/notifications') && req.method === 'POST') {
      return await handleSendNotification(ctx, body);
    }

    // 404 for unknown routes
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
