export type TwoFactorSetupPayload = {
  secret: string;
  otpauthUrl: string;
  backupCodes: string[];
};

const TOTP_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function generateTOTPSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((byte) => TOTP_ALPHABET[byte % TOTP_ALPHABET.length])
    .join('');
}

export function buildOtpAuthUrl(secret: string, userLabel: string): string {
  const issuer = 'Wasel';
  const label = `${issuer}:${userLabel}`;
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}

export function generateQRCode(secret: string, userLabel: string): string {
  return buildOtpAuthUrl(secret, userLabel);
}

export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    return bytesToHex(bytes).toUpperCase().slice(0, 8);
  });
}

export async function hashBackupCode(code: string): Promise<string> {
  const normalized = code.trim().toUpperCase();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  return bytesToHex(new Uint8Array(digest));
}

export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => hashBackupCode(code)));
}

export async function verifyBackupCode(input: string, hashedCodes: string[] | null | undefined): Promise<boolean> {
  if (!hashedCodes || hashedCodes.length === 0) {
    return false;
  }

  const hashedInput = await hashBackupCode(input);
  return hashedCodes.includes(hashedInput);
}

export function sanitizeAuthenticatorCode(code: string): string {
  return code.replace(/\s+/g, '').trim();
}

function decodeBase32Secret(secret: string): Uint8Array {
  const normalized = secret.toUpperCase().replace(/=+$/, '');
  let bits = '';

  for (const char of normalized) {
    const index = TOTP_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error('Invalid TOTP secret');
    }
    bits += index.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }

  return new Uint8Array(bytes);
}

async function generateTOTPCode(secretKey: Uint8Array, counter: number): Promise<string> {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, Math.floor(counter / 0x100000000), false);
  view.setUint32(4, counter >>> 0, false);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    secretKey.slice().buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );

  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, buffer));
  const offset = signature[signature.length - 1] & 0x0f;
  const binary =
    ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff);

  return String(binary % 1_000_000).padStart(6, '0');
}

export async function verifyTOTPCode(secret: string, code: string, now = Date.now()): Promise<boolean> {
  const normalized = sanitizeAuthenticatorCode(code);
  if (!/^\d{6}$/.test(normalized)) {
    return false;
  }

  const secretKey = decodeBase32Secret(secret);
  const counter = Math.floor(now / 30_000);

  for (let offset = -1; offset <= 1; offset += 1) {
    if ((await generateTOTPCode(secretKey, counter + offset)) === normalized) {
      return true;
    }
  }

  return false;
}

export async function verifyTwoFactorChallenge(args: {
  secret: string | null | undefined;
  code: string;
  backupCodeHashes: string[] | null | undefined;
  allowBackupCode?: boolean;
}): Promise<{ ok: boolean; usedBackupCode: boolean }> {
  const secret = args.secret?.trim();
  const code = sanitizeAuthenticatorCode(args.code);

  if (!secret || !code) {
    return { ok: false, usedBackupCode: false };
  }

  const totpValid = await verifyTOTPCode(secret, code);
  if (totpValid) {
    return { ok: true, usedBackupCode: false };
  }

  if (args.allowBackupCode === false) {
    return { ok: false, usedBackupCode: false };
  }

  const backupValid = await verifyBackupCode(code, args.backupCodeHashes);
  return { ok: backupValid, usedBackupCode: backupValid };
}
