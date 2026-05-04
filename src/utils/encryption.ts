/**
 * Encryption Utility for Sensitive Data
 *
 * Provides AES-GCM encryption for sensitive data stored in localStorage.
 * Uses Web Crypto API for secure encryption.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt: string;
}

/**
 * Generate encryption key from password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const baseKey = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, [
    'deriveBits',
    'deriveKey',
  ]);

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Get or generate master key for encryption
 */
function getMasterKey(): string {
  if (typeof sessionStorage === 'undefined') {
    throw new Error('SessionStorage not available');
  }

  let key = sessionStorage.getItem('wasel-master-key');

  if (!key) {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    key = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem('wasel-master-key', key);
  }

  return key;
}

/**
 * Encrypt data using AES-GCM
 */
export async function encrypt(data: string): Promise<string> {
  if (!data) return data;

  try {
    const masterKey = getMasterKey();
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const key = await deriveKey(masterKey, salt);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, dataBuffer);

    const encrypted: EncryptedData = {
      ciphertext: arrayBufferToBase64(ciphertext),
      iv: arrayBufferToBase64(iv),
      salt: arrayBufferToBase64(salt),
    };

    return JSON.stringify(encrypted);
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-GCM
 */
export async function decrypt(encryptedData: string): Promise<string> {
  if (!encryptedData) return encryptedData;

  try {
    const encrypted: EncryptedData = JSON.parse(encryptedData);
    const masterKey = getMasterKey();

    const salt = base64ToArrayBuffer(encrypted.salt);
    const iv = base64ToArrayBuffer(encrypted.iv);
    const ciphertext = base64ToArrayBuffer(encrypted.ciphertext);

    const key = await deriveKey(masterKey, new Uint8Array(salt));

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: new Uint8Array(iv) },
      key,
      ciphertext,
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Secure localStorage wrapper with encryption
 */
export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    if (typeof localStorage === 'undefined') return;

    try {
      const encrypted = await encrypt(value);
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Failed to store encrypted data:', error);
      throw error;
    }
  },

  async getItem(key: string): Promise<string | null> {
    if (typeof localStorage === 'undefined') return null;

    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;

      return await decrypt(encrypted);
    } catch (error) {
      console.error('Failed to retrieve encrypted data:', error);
      return null;
    }
  },

  removeItem(key: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
  },

  clear(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.clear();
  },
};

/**
 * Convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/**
 * Convert Base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Clear master key (on logout)
 */
export function clearMasterKey(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('wasel-master-key');
  }
}

/**
 * Check if encryption is available
 */
export function isEncryptionAvailable(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.getRandomValues !== 'undefined'
  );
}

export default {
  encrypt,
  decrypt,
  secureStorage,
  clearMasterKey,
  isEncryptionAvailable,
};
