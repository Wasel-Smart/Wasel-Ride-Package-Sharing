/**
 * Client-side encryption utilities for sensitive data storage
 * Uses Web Crypto API for secure encryption
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

/**
 * Generate a cryptographic key from a password
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const safeSalt = Uint8Array.from(salt);
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: safeSalt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Get or create encryption key for the session
 */
async function getSessionKeyAndSalt(): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const sessionId = sessionStorage.getItem('wasel_session_id');
  if (!sessionId) {
    throw new Error('No active session');
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const key = await deriveKey(sessionId, salt);
  return { key, salt };
}

/**
 * Encrypt sensitive data before storing in localStorage
 */
export async function encryptData(data: string): Promise<string> {
  try {
    const { key, salt } = await getSessionKeyAndSalt();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);

    const encryptedData = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encodedData);

    // Combine salt + IV + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data from localStorage
 */
export async function decryptData(encryptedData: string): Promise<string> {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // Extract salt, IV and encrypted data
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const data = combined.slice(SALT_LENGTH + IV_LENGTH);

    const sessionId = sessionStorage.getItem('wasel_session_id');
    if (!sessionId) {
      throw new Error('No active session');
    }

    const key = await deriveKey(sessionId, salt);

    const decryptedData = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, data);

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Secure storage wrapper with encryption
 */
export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    const encrypted = await encryptData(value);
    localStorage.setItem(`secure_${key}`, encrypted);
  },

  async getItem(key: string): Promise<string | null> {
    const encrypted = localStorage.getItem(`secure_${key}`);
    if (!encrypted) return null;

    try {
      return await decryptData(encrypted);
    } catch {
      // If decryption fails, remove corrupted data
      localStorage.removeItem(`secure_${key}`);
      return null;
    }
  },

  removeItem(key: string): void {
    localStorage.removeItem(`secure_${key}`);
  },

  clear(): void {
    const keys = Object.keys(localStorage);
    const secureKeys = keys.filter(key => key.startsWith('secure_'));
    secureKeys.forEach(key => {
      localStorage.removeItem(key);
    });
  },
};

/**
 * Generate cryptographically secure random ID
 */
export function generateSecureId(length = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash sensitive data (one-way)
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Clear master encryption key (on logout)
 */
export function clearMasterKey(): void {
  sessionStorage.removeItem('wasel_session_id');
  secureStorage.clear();
}
