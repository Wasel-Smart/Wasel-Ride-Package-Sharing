import { describe, expect, it } from 'vitest';
import {
  buildApiError,
  expectJsonResponse,
  parseJsonSafely,
  sanitizeEmail,
  sanitizeOptionalTextField,
  sanitizePhoneNumber,
  sanitizeTextField,
} from '../../../src/services/http';
import { AuthenticationError, ValidationError, WaselError } from '../../../src/utils/errors';

describe('services/http', () => {
  it('parses JSON responses safely', async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    await expect(parseJsonSafely<{ ok: boolean }>(response)).resolves.toEqual({ ok: true });
  });

  it('returns null for non-JSON responses', async () => {
    const response = new Response('plain text', {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    });

    await expect(parseJsonSafely(response)).resolves.toBeNull();
  });

  it('maps 401 responses to AuthenticationError', async () => {
    const response = new Response(JSON.stringify({ message: 'JWT expired' }), {
      status: 401,
      statusText: 'Unauthorized',
      headers: { 'content-type': 'application/json' },
    });

    const error = await buildApiError(response, 'Request failed');
    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.message).toBe('JWT expired');
  });

  it('maps 422 responses to ValidationError', async () => {
    const response = new Response(JSON.stringify({ error: 'Invalid payload' }), {
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: { 'content-type': 'application/json' },
    });

    const error = await buildApiError(response, 'Request failed');
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe('Invalid payload');
  });

  it('throws a WaselError when an error response is not ok', async () => {
    const response = new Response(JSON.stringify({ error: 'Trip missing' }), {
      status: 404,
      statusText: 'Not Found',
      headers: { 'content-type': 'application/json' },
    });

    await expect(expectJsonResponse(response, 'Failed to fetch trip')).rejects.toBeInstanceOf(WaselError);
  });

  it('sanitizes email and text fields consistently', () => {
    expect(sanitizeEmail(' USER@Example.com ')).toBe('user@example.com');
    expect(sanitizeTextField('  Amman   Jordan ', 'Origin', 40)).toBe('Amman Jordan');
    expect(sanitizeOptionalTextField('   ')).toBeUndefined();
    expect(sanitizePhoneNumber('+962 79-000-0000')).toBe('+962790000000');
    expect(sanitizePhoneNumber('0790000000')).toBe('+962790000000');
    expect(sanitizePhoneNumber('00962 79 000 0000')).toBe('+962790000000');
  });
});
