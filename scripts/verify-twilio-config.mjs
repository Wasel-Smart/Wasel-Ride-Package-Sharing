#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(process.cwd());
const env = process.env || {};

function safeResolve(filePath) {
  const resolved = path.resolve(PROJECT_ROOT, filePath);
  if (!resolved.startsWith(PROJECT_ROOT)) {
    throw new Error(`Path traversal detected: ${filePath} resolves outside project root`);
  }
  return resolved;
}

const ALLOWED_ENV_VAR_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*=/;
const ENV_FILES = ['.env', '.env.local', '.env.production', '.env.production.local'];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const safePath = safeResolve(filePath);

  for (const rawLine of fs.readFileSync(safePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    const separatorIndex = normalized.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = normalized.slice(0, separatorIndex).trim();
    if (!ALLOWED_ENV_VAR_PATTERN.test(key)) continue;
    if (env[key]) continue;

    let value = normalized.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      env[key] = value;
    }
  }
}

for (const fileName of ENV_FILES) {
  loadEnvFile(path.join(process.cwd(), fileName));
}

const requiredTwilioEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
];

for (const varName of requiredTwilioEnvVars) {
  if (!env[varName]) {
    console.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}

const accountSid = env.TWILIO_ACCOUNT_SID?.trim();
const authToken = env.TWILIO_AUTH_TOKEN?.trim();
const apiKeySid = env.TWILIO_API_KEY_SID?.trim();
const apiKeySecret = env.TWILIO_API_KEY_SECRET?.trim();
const messagingServiceSid = env.TWILIO_MESSAGING_SERVICE_SID?.trim();
const smsFrom = env.TWILIO_SMS_FROM?.trim();
const verifyServiceSid = env.TWILIO_VERIFY_SERVICE_SID?.trim();
const whatsappFrom = env.TWILIO_WHATSAPP_FROM?.trim();
const requireApiKeyAuth = env.REQUIRE_TWILIO_API_KEY_AUTH === 'true';

function requireValue(name, value, pattern) {
  if (!value) {
    throw new Error(`${name} is missing`);
  }

  if (pattern && !pattern.test(value)) {
    throw new Error(`${name} has an invalid format`);
  }
}

function authHeader() {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;
}

function apiKeyAuthHeader() {
  return `Basic ${Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString('base64')}`;
}

const TWILIO_ALLOWED_DOMAINS = ['twilio.com', 'api.twilio.com', 'messaging.twilio.com', 'verify.twilio.com', 'localhost'];

function isValidTwilioUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    if (parsed.hostname === 'localhost') return true;
    const privateRanges = [/^127\./, /^10\./, /^172\.(1[6-9]|2[0-9]|3[01])\./, /^192\.168\./, /^169\.254\./];
    if (privateRanges.some(p => p.test(parsed.hostname))) return false;
    return TWILIO_ALLOWED_DOMAINS.some(d => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

async function twilioGet(url, authorization = authHeader()) {
  if (!isValidTwilioUrl(url)) {
    throw new Error(`Invalid or unauthorized Twilio URL: ${url}`);
  }
  const response = await fetch(url, {
    headers: {
      Authorization: authorization,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `Twilio request failed (${response.status})`);
  }

  return payload;
}

async function main() {
  requireValue('TWILIO_ACCOUNT_SID', accountSid, /^AC[a-f0-9]{32}$/i);
  requireValue('TWILIO_AUTH_TOKEN', authToken, /^[a-f0-9]{32}$/i);
  requireValue('TWILIO_API_KEY_SID', apiKeySid, /^SK[a-f0-9]{32}$/i);
  requireValue('TWILIO_API_KEY_SECRET', apiKeySecret);
  requireValue('TWILIO_VERIFY_SERVICE_SID', verifyServiceSid, /^VA[a-f0-9]{32}$/i);

  if (!messagingServiceSid && !smsFrom) {
    throw new Error('TWILIO_MESSAGING_SERVICE_SID or TWILIO_SMS_FROM is required for SMS');
  }

  if (messagingServiceSid) {
    requireValue('TWILIO_MESSAGING_SERVICE_SID', messagingServiceSid, /^MG[a-f0-9]{32}$/i);
  }

  if (smsFrom) {
    requireValue('TWILIO_SMS_FROM', smsFrom, /^\+\d{8,15}$/);
  }

  if (whatsappFrom) {
    requireValue('TWILIO_WHATSAPP_FROM', whatsappFrom, /^whatsapp:\+\d{8,15}$/);
  }

  const account = await twilioGet(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
  );

  if (account.status !== 'active') {
    throw new Error(`Twilio account is not active: ${account.status}`);
  }

  let apiKeyAuthOk = false;
  try {
    if (messagingServiceSid) {
      const service = await twilioGet(
        `https://messaging.twilio.com/v1/Services/${messagingServiceSid}`,
        apiKeyAuthHeader(),
      );
      if (service.sid !== messagingServiceSid) {
        throw new Error('Twilio API key authenticated but returned the wrong Messaging Service');
      }
    }

    const verifyService = await twilioGet(
      `https://verify.twilio.com/v2/Services/${verifyServiceSid}`,
      apiKeyAuthHeader(),
    );
    apiKeyAuthOk = verifyService.sid === verifyServiceSid;
  } catch {
    apiKeyAuthOk = false;
  }

  if (requireApiKeyAuth && !apiKeyAuthOk) {
    throw new Error('Twilio API key does not authenticate against the configured account');
  }

  if (messagingServiceSid) {
    await twilioGet(`https://messaging.twilio.com/v1/Services/${messagingServiceSid}`);
  }

  if (smsFrom) {
    const numbers = await twilioGet(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(smsFrom)}&PageSize=1`,
    );
    const number = numbers.incoming_phone_numbers?.[0];
    if (!number?.capabilities?.sms) {
      throw new Error('TWILIO_SMS_FROM is not an SMS-capable Twilio number on this account');
    }
  }

  await twilioGet(`https://verify.twilio.com/v2/Services/${verifyServiceSid}`);

  console.log('Twilio configuration verified');
  console.log(`Account: ${account.friendly_name || account.sid} (${account.status}, ${account.type})`);
  console.log(`API key auth: ${apiKeyAuthOk ? 'verified' : 'configured but not accepted by Twilio REST auth'}`);
  console.log(`SMS sender: ${messagingServiceSid ? 'Messaging Service' : 'Twilio number'}`);
  console.log('Verify OTP: configured');
  console.log(`WhatsApp sender: ${whatsappFrom ? 'configured' : 'not configured'}`);

  if (String(account.type).toLowerCase() === 'trial') {
    console.log('Production note: account is Trial; outbound SMS is limited to verified recipients until upgraded.');
  }
}

main().catch(error => {
  console.error(`Twilio verification failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
