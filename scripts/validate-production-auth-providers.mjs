#!/usr/bin/env node

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || 'https://zexlxabdcsjefptmjhuq.supabase.co';
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_t2cOnKt1HH-l2KmvJIAwcg_8fpCWdN0';
const APP_URL = process.env.VITE_APP_URL || 'https://wasel14.online';
const TEST_PHONE = process.env.AUTH_PROVIDER_TEST_PHONE || '+962792084333';

const ALLOWED_DOMAINS = ['supabase.co', 'supabase.net', 'wasel14.online', 'localhost'];

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    if (parsed.hostname === 'localhost') return true;
    const privateRanges = [/^127\./, /^10\./, /^172\.(1[6-9]|2[0-9]|3[01])\./, /^192\.168\./, /^169\.254\./];
    if (privateRanges.some(p => p.test(parsed.hostname))) return false;
    return ALLOWED_DOMAINS.some(d => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

const authBase = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1`;

async function checkOAuthProvider(provider) {
   const params = new URLSearchParams({
     provider,
     redirect_to: `${APP_URL}/app/auth/callback?returnTo=%2Fapp`,
   });
   const url = `${authBase}/authorize?${params}`;
   if (!isValidUrl(url)) {
     return { name: provider, ok: false, status: 0, detail: 'Invalid or unauthorized URL' };
   }
   const response = await fetch(url, {
    redirect: 'manual',
    headers: { apikey: SUPABASE_KEY },
  });
  const location = response.headers.get('location') || '';
  const expectedHost = provider === 'google' ? 'accounts.google.com' : 'facebook.com';

  return {
    name: provider,
    ok: response.status === 302 && location.includes(expectedHost),
    status: response.status,
    detail: location ? new URL(location).hostname : 'missing redirect location',
  };
}

async function checkPhoneProvider(channel) {
   const url = `${authBase}/otp`;
   if (!isValidUrl(url)) {
     return { name: channel, ok: false, status: 0, detail: 'Invalid or unauthorized URL' };
   }
   const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      phone: TEST_PHONE,
      channel,
      create_user: true,
    }),
  });
  const body = await response.text();

  return {
    name: channel,
    ok: response.ok,
    status: response.status,
    detail: body.slice(0, 240),
  };
}

const results = [
  await checkOAuthProvider('google'),
  await checkOAuthProvider('facebook'),
  await checkPhoneProvider('sms'),
  await checkPhoneProvider('whatsapp'),
];

for (const result of results) {
  const state = result.ok ? 'PASS' : 'FAIL';
  console.log(`${state} ${result.name}: status=${result.status} ${result.detail}`);
}

if (results.some(result => !result.ok)) {
  process.exit(1);
}
