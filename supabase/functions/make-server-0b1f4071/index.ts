/**
 * Wasel Edge Function - Main API Server
 *
 * Notes for maintainers:
 * - Safety and settings used to rely on client-only persistence. These handlers
 *   now own the server contract so routed pages stop faking successful state.
 * - Wallet and communications runtime have separate modules in this function
 *   bundle; this file keeps the lightweight REST endpoints used by the app shell.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Profile {
  id: string;
  full_name: string;
  email?: string;
  phone_number?: string;
  avatar_url?: string;
  wallet_balance?: number;
  trust_score?: number;
  is_verified?: boolean;
}

interface CanonicalUser {
  id: string;
  email?: string | null;
  full_name?: string | null;
  phone_number?: string | null;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
  return req.json()
    .then((value) => (value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}))
    .catch(() => ({}));
}

async function ensureCanonicalUser(
  supabaseClient: ReturnType<typeof createClient>,
  user: { email?: string | null; id: string; phone?: string | null; user_metadata?: Record<string, unknown> | null },
): Promise<CanonicalUser> {
  const { data: existingByAuth, error: existingByAuthError } = await supabaseClient
    .from('users')
    .select('id, email, full_name, phone_number')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (existingByAuthError) {
    throw new Error(existingByAuthError.message);
  }

  if (existingByAuth) {
    return existingByAuth as CanonicalUser;
  }

  const { data: existingById, error: existingByIdError } = await supabaseClient
    .from('users')
    .select('id, email, full_name, phone_number')
    .eq('id', user.id)
    .maybeSingle();

  if (existingByIdError) {
    throw new Error(existingByIdError.message);
  }

  if (existingById) {
    return existingById as CanonicalUser;
  }

  const fullName =
    normalizeString(user.user_metadata?.full_name) ||
    normalizeString(user.user_metadata?.name) ||
    normalizeString(user.email)?.split('@')[0] ||
    'Wasel User';

  const { data: inserted, error: insertError } = await supabaseClient
    .from('users')
    .insert({
      auth_user_id: user.id,
      email: normalizeString(user.email),
      full_name: fullName,
      phone_number: normalizeString(user.user_metadata?.phone_number) || normalizeString(user.phone),
      role: normalizeString(user.user_metadata?.role) || 'passenger',
    })
    .select('id, email, full_name, phone_number')
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return inserted as CanonicalUser;
}

async function getUserSettings(
  supabaseClient: ReturnType<typeof createClient>,
  canonicalUser: CanonicalUser,
) {
  const [settingsResult, communicationsResult] = await Promise.all([
    supabaseClient
      .from('user_settings')
      .select('privacy, display')
      .eq('user_id', canonicalUser.id)
      .maybeSingle(),
    supabaseClient
      .from('communication_preferences')
      .select('*')
      .eq('user_id', canonicalUser.id)
      .maybeSingle(),
  ]);

  if (settingsResult.error) {
    throw new Error(settingsResult.error.message);
  }
  if (communicationsResult.error) {
    throw new Error(communicationsResult.error.message);
  }

  const displaySource = (settingsResult.data?.display ?? {}) as Record<string, unknown>;
  const privacySource = (settingsResult.data?.privacy ?? {}) as Record<string, unknown>;
  const communications = communicationsResult.data as Record<string, unknown> | null;
  const language = displaySource.language === 'ar' || communications?.preferred_language === 'ar' ? 'ar' : 'en';

  return {
    display: {
      currency: typeof displaySource.currency === 'string' && displaySource.currency.trim()
        ? displaySource.currency
        : 'JOD',
      direction:
        displaySource.direction === 'rtl' || (displaySource.direction !== 'ltr' && language === 'ar')
          ? 'rtl'
          : 'ltr',
      language,
      theme:
        displaySource.theme === 'light' || displaySource.theme === 'system'
          ? displaySource.theme
          : 'dark',
    },
    notifications: {
      inApp: communications?.in_app_enabled !== false,
      push: communications?.push_enabled !== false,
      email: communications?.email_enabled !== false,
      sms: communications?.sms_enabled !== false,
      whatsapp: communications?.whatsapp_enabled === true,
      tripUpdates: communications?.trip_updates_enabled !== false,
      bookingRequests: communications?.booking_requests_enabled !== false,
      messages: communications?.messages_enabled !== false,
      promotions: communications?.promotions_enabled === true,
      prayerReminders: communications?.prayer_reminders_enabled !== false,
      criticalAlerts: communications?.critical_alerts_enabled !== false,
      preferredLanguage: language,
    },
    privacy: {
      dataAnalytics: normalizeBoolean(privacySource.dataAnalytics, false),
      hidePhoto: normalizeBoolean(privacySource.hidePhoto, false),
      shareLocation: normalizeBoolean(privacySource.shareLocation, true),
      showProfile: normalizeBoolean(privacySource.showProfile, true),
    },
  };
}

async function upsertUserSettings(
  supabaseClient: ReturnType<typeof createClient>,
  canonicalUser: CanonicalUser,
  patch: Record<string, unknown>,
) {
  const current = await getUserSettings(supabaseClient, canonicalUser);
  const nextDisplaySource =
    patch.display && typeof patch.display === 'object' && !Array.isArray(patch.display)
      ? patch.display as Record<string, unknown>
      : {};
  const nextPrivacySource =
    patch.privacy && typeof patch.privacy === 'object' && !Array.isArray(patch.privacy)
      ? patch.privacy as Record<string, unknown>
      : {};
  const nextNotificationsSource =
    patch.notifications && typeof patch.notifications === 'object' && !Array.isArray(patch.notifications)
      ? patch.notifications as Record<string, unknown>
      : {};

  const nextLanguage =
    nextDisplaySource.language === 'ar' || nextNotificationsSource.preferredLanguage === 'ar'
      ? 'ar'
      : current.display.language;

  const nextDisplay = {
    ...current.display,
    ...nextDisplaySource,
    direction:
      nextDisplaySource.direction === 'rtl' || (nextDisplaySource.direction !== 'ltr' && nextLanguage === 'ar')
        ? 'rtl'
        : nextDisplaySource.direction === 'ltr'
          ? 'ltr'
          : current.display.direction,
    language: nextLanguage,
    theme:
      nextDisplaySource.theme === 'light' || nextDisplaySource.theme === 'system'
        ? nextDisplaySource.theme
        : nextDisplaySource.theme === 'dark'
          ? 'dark'
          : current.display.theme,
  };

  const nextPrivacy = {
    ...current.privacy,
    ...nextPrivacySource,
  };

  const nextNotifications = {
    ...current.notifications,
    ...nextNotificationsSource,
    preferredLanguage: nextLanguage,
  };

  const updatedAt = new Date().toISOString();
  const { error: userSettingsError } = await supabaseClient
    .from('user_settings')
    .upsert({
      user_id: canonicalUser.id,
      display: nextDisplay,
      privacy: nextPrivacy,
      updated_at: updatedAt,
    }, { onConflict: 'user_id' });

  if (userSettingsError) {
    throw new Error(userSettingsError.message);
  }

  const { error: communicationsError } = await supabaseClient
    .from('communication_preferences')
    .upsert({
      user_id: canonicalUser.id,
      in_app_enabled: nextNotifications.inApp,
      push_enabled: nextNotifications.push,
      email_enabled: nextNotifications.email,
      sms_enabled: nextNotifications.sms,
      whatsapp_enabled: nextNotifications.whatsapp,
      trip_updates_enabled: nextNotifications.tripUpdates,
      booking_requests_enabled: nextNotifications.bookingRequests,
      messages_enabled: nextNotifications.messages,
      promotions_enabled: nextNotifications.promotions,
      prayer_reminders_enabled: nextNotifications.prayerReminders,
      critical_alerts_enabled: nextNotifications.criticalAlerts,
      preferred_language: nextLanguage,
      updated_at: updatedAt,
    }, { onConflict: 'user_id' });

  if (communicationsError) {
    throw new Error(communicationsError.message);
  }

  return getUserSettings(supabaseClient, canonicalUser);
}

async function getSafetyDashboard(
  supabaseClient: ReturnType<typeof createClient>,
  canonicalUser: CanonicalUser,
) {
  const [settingsResult, incidentsResult] = await Promise.all([
    supabaseClient
      .from('safety_settings')
      .select('*')
      .eq('user_id', canonicalUser.id)
      .maybeSingle(),
    supabaseClient
      .from('safety_incidents')
      .select('incident_id, incident_type, description, incident_status, submitted_at')
      .eq('user_id', canonicalUser.id)
      .order('submitted_at', { ascending: false })
      .limit(8),
  ]);

  if (settingsResult.error) {
    throw new Error(settingsResult.error.message);
  }
  if (incidentsResult.error) {
    throw new Error(incidentsResult.error.message);
  }

  const settings = settingsResult.data as Record<string, unknown> | null;
  const emergencyContacts = Array.isArray(settings?.emergency_contacts)
    ? settings?.emergency_contacts
    : [];
  const checklist =
    settings?.checklist && typeof settings.checklist === 'object' && !Array.isArray(settings.checklist)
      ? settings.checklist
      : {};

  return {
    incidents: Array.isArray(incidentsResult.data)
      ? incidentsResult.data.map((incident) => ({
          description: String(incident.description ?? ''),
          id: String(incident.incident_id),
          status:
            incident.incident_status === 'under_review' || incident.incident_status === 'resolved'
              ? incident.incident_status
              : 'submitted',
          submittedAt: String(incident.submitted_at ?? new Date().toISOString()),
          type: String(incident.incident_type ?? 'incident'),
        }))
      : [],
    settings: {
      checklist,
      cultural: {
        genderPreference:
          settings?.gender_preference === 'same_gender_only' ||
          settings?.gender_preference === 'male_drivers_only' ||
          settings?.gender_preference === 'female_drivers_only'
            ? settings.gender_preference
            : 'no_preference',
        prayerStops: settings?.prayer_stops !== false,
        ramadanMode: settings?.ramadan_mode === true,
      },
      emergencyContacts,
    },
  };
}

async function upsertSafetySettings(
  supabaseClient: ReturnType<typeof createClient>,
  canonicalUser: CanonicalUser,
  patch: Record<string, unknown>,
) {
  const current = await getSafetyDashboard(supabaseClient, canonicalUser);
  const checklist =
    patch.checklist && typeof patch.checklist === 'object' && !Array.isArray(patch.checklist)
      ? patch.checklist
      : current.settings.checklist;
  const culturalPatch =
    patch.cultural && typeof patch.cultural === 'object' && !Array.isArray(patch.cultural)
      ? patch.cultural as Record<string, unknown>
      : {};
  const emergencyContacts = Array.isArray(patch.emergencyContacts)
    ? patch.emergencyContacts
    : current.settings.emergencyContacts;

  const nextSettings = {
    checklist,
    cultural: {
      genderPreference:
        culturalPatch.genderPreference === 'same_gender_only' ||
        culturalPatch.genderPreference === 'male_drivers_only' ||
        culturalPatch.genderPreference === 'female_drivers_only'
          ? culturalPatch.genderPreference
          : current.settings.cultural.genderPreference,
      prayerStops: normalizeBoolean(culturalPatch.prayerStops, current.settings.cultural.prayerStops),
      ramadanMode: normalizeBoolean(culturalPatch.ramadanMode, current.settings.cultural.ramadanMode),
    },
    emergencyContacts,
  };

  const { error } = await supabaseClient
    .from('safety_settings')
    .upsert({
      user_id: canonicalUser.id,
      checklist: nextSettings.checklist,
      emergency_contacts: nextSettings.emergencyContacts,
      prayer_stops: nextSettings.cultural.prayerStops,
      ramadan_mode: nextSettings.cultural.ramadanMode,
      gender_preference: nextSettings.cultural.genderPreference,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    throw new Error(error.message);
  }

  return nextSettings;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      },
    );

    if (path === '/health' || path.endsWith('/health')) {
      return jsonResponse({ status: 'healthy', timestamp: new Date().toISOString() });
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const canonicalUser = await ensureCanonicalUser(supabaseClient, user);

    if (path === '/user/settings' || path.endsWith('/user/settings')) {
      if (req.method === 'GET') {
        return jsonResponse({ settings: await getUserSettings(supabaseClient, canonicalUser) });
      }

      if (req.method === 'PUT') {
        const body = await readJsonBody(req);
        return jsonResponse({ settings: await upsertUserSettings(supabaseClient, canonicalUser, body) });
      }
    }

    if (path === '/safety/settings' || path.endsWith('/safety/settings')) {
      if (req.method === 'GET') {
        return jsonResponse({ dashboard: await getSafetyDashboard(supabaseClient, canonicalUser) });
      }

      if (req.method === 'PUT') {
        const body = await readJsonBody(req);
        return jsonResponse({ settings: await upsertSafetySettings(supabaseClient, canonicalUser, body) });
      }
    }

    if (path === '/safety/incident' || path.endsWith('/safety/incident')) {
      if (req.method === 'POST') {
        const body = await readJsonBody(req);
        const description = normalizeString(body.description);
        const type = normalizeString(body.type);

        if (!description || !type) {
          return jsonResponse({ error: 'Incident type and description are required.' }, 400);
        }

        const { data, error } = await supabaseClient
          .from('safety_incidents')
          .insert({
            user_id: canonicalUser.id,
            incident_type: type,
            description,
            incident_status: 'submitted',
            metadata:
              body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
                ? body.metadata
                : {},
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('incident_id, incident_type, description, incident_status, submitted_at')
          .single();

        if (error) {
          return jsonResponse({ error: error.message }, 500);
        }

        return jsonResponse({
          incident: {
            description: String(data.description ?? ''),
            id: String(data.incident_id),
            status: String(data.incident_status ?? 'submitted'),
            submittedAt: String(data.submitted_at ?? new Date().toISOString()),
            type: String(data.incident_type ?? type),
          },
        }, 201);
      }
    }

    if (path === '/safety/sos' || path.endsWith('/safety/sos')) {
      if (req.method === 'POST') {
        const body = await readJsonBody(req);
        const latitude = typeof body.latitude === 'number' ? body.latitude : null;
        const longitude = typeof body.longitude === 'number' ? body.longitude : null;

        const { data, error } = await supabaseClient
          .from('safety_sos_alerts')
          .insert({
            user_id: canonicalUser.id,
            latitude,
            longitude,
            location_label: normalizeString(body.locationLabel),
            alert_status: 'notified',
            metadata:
              body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
                ? body.metadata
                : {},
            user_context: {
              authUserId: user.id,
              email: user.email ?? null,
              fullName:
                normalizeString(user.user_metadata?.full_name) ||
                normalizeString(user.user_metadata?.name) ||
                canonicalUser.full_name ||
                null,
              phoneNumber:
                normalizeString(user.user_metadata?.phone_number) ||
                normalizeString(user.phone) ||
                canonicalUser.phone_number ||
                null,
              activeTripId: normalizeString(body.activeTripId),
            },
            updated_at: new Date().toISOString(),
          })
          .select('alert_id, alert_status, created_at')
          .single();

        if (error) {
          return jsonResponse({ error: error.message }, 500);
        }

        return jsonResponse({
          alertId: String(data.alert_id),
          createdAt: String(data.created_at ?? new Date().toISOString()),
          notified: data.alert_status === 'notified',
          status: String(data.alert_status ?? 'created'),
        }, 201);
      }
    }

    if (path.includes('/profile')) {
      if (req.method === 'POST') {
        const body = await req.json();
        const { userId, email, firstName, lastName, fullName } = body;

        const { data, error } = await supabaseClient
          .from('profiles')
          .insert({
            id: userId,
            full_name: fullName || `${firstName} ${lastName}`.trim(),
            email,
          })
          .select()
          .single();

        if (error) {
          return jsonResponse({ error: error.message }, 400);
        }

        return jsonResponse(data);
      }

      if (req.method === 'GET') {
        const userId = path.split('/').pop();
        const { data, error } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          return jsonResponse({ error: error.message }, 404);
        }

        return jsonResponse(data);
      }

      if (req.method === 'PATCH') {
        const userId = path.split('/').pop();
        const updates = await req.json();

        if ('wallet_balance' in updates) {
          delete updates.wallet_balance;
        }

        const { data, error } = await supabaseClient
          .from('profiles')
          .update(updates)
          .eq('id', userId)
          .select()
          .single();

        if (error) {
          return jsonResponse({ error: error.message }, 400);
        }

        return jsonResponse(data);
      }
    }

    if (path.includes('/rides')) {
      if (req.method === 'POST') {
        const body = await req.json();
        const { data, error } = await supabaseClient
          .from('rides')
          .insert({ ...body, passenger_id: user.id })
          .select()
          .single();

        if (error) {
          return jsonResponse({ error: error.message }, 400);
        }

        return jsonResponse(data);
      }

      if (req.method === 'GET') {
        const { data, error } = await supabaseClient
          .from('rides')
          .select('*, trips(*), profiles(*)')
          .eq('passenger_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          return jsonResponse({ error: error.message }, 400);
        }

        return jsonResponse(data);
      }
    }

    if (path.includes('/trips')) {
      if (req.method === 'POST') {
        const body = await req.json();
        const { data, error } = await supabaseClient
          .from('trips')
          .insert({ ...body, driver_id: user.id })
          .select()
          .single();

        if (error) {
          return jsonResponse({ error: error.message }, 400);
        }

        return jsonResponse(data);
      }

      if (req.method === 'GET') {
        const { data, error } = await supabaseClient
          .from('trips')
          .select('*, profiles(*)')
          .eq('status', 'active')
          .order('departure_time', { ascending: true });

        if (error) {
          return jsonResponse({ error: error.message }, 400);
        }

        return jsonResponse(data);
      }
    }

    return jsonResponse({ error: 'Not found' }, 404);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unexpected server error' },
      500,
    );
  }
});
