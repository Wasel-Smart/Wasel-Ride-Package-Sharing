interface SigningEnvelope {
  nonce: string;
  payloadHash: string;
  timestamp: string;
}

function encodeBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function hashValue(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return encodeBase64(digest);
}

async function signValue(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return encodeBase64(signature);
}

export async function createSignedHeaders(
  body: unknown,
  secret?: string,
): Promise<Record<string, string>> {
  if (!secret || typeof crypto?.subtle === 'undefined') {
    return {};
  }

  const envelope: SigningEnvelope = {
    nonce: crypto.randomUUID(),
    payloadHash: await hashValue(JSON.stringify(body ?? null)),
    timestamp: new Date().toISOString(),
  };
  const signature = await signValue(
    secret,
    `${envelope.nonce}:${envelope.payloadHash}:${envelope.timestamp}`,
  );

  return {
    'x-signature-nonce': envelope.nonce,
    'x-signature-payload-hash': envelope.payloadHash,
    'x-signature-timestamp': envelope.timestamp,
    'x-signature': signature,
  };
}
