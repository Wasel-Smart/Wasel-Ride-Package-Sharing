#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ENV_FILES = ['.env', '.env.local', '.env.production', '.env.production.local'];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    const separatorIndex = normalized.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = normalized.slice(0, separatorIndex).trim();
    if (process.env[key]) continue;

    let value = normalized.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

for (const fileName of ENV_FILES) {
  loadEnvFile(path.join(process.cwd(), fileName));
}

const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
const apiKeySid = process.env.TWILIO_API_KEY_SID?.trim();
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET?.trim();
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
const smsFrom = process.env.TWILIO_SMS_FROM?.trim();
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM?.trim();
const requireApiKeyAuth = process.env.REQUIRE_TWILIO_API_KEY_AUTH === 'true';

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

async function twilioGet(url, authorization = authHeader()) {
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
