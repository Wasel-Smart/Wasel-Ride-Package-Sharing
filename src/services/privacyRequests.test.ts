import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchWithRetry, getAuthDetails } = vi.hoisted( () => ( {
  fetchWithRetry: vi.fn(),
  getAuthDetails: vi.fn(),
} ) );

vi.mock( '@/services/core', () => ( {
  API_URL: 'https://api.example.test',
  fetchWithRetry,
  getAuthDetails,
  supabase: {},
} ) );

import { requestAccountDeletion, requestDataExport } from './privacyRequests';

describe( 'requestDataExport', () => {
  beforeEach( () => {
    vi.clearAllMocks();
    getAuthDetails.mockResolvedValue( { token: 'user-access-token', userId: 'user-1' } );
  } );

  it( 'requests a server-generated export with the signed-in session', async () => {
    const expiresAt = Date.now() + 600_000;
    fetchWithRetry.mockResolvedValue( new Response( JSON.stringify( {
      downloadUrl: 'https://storage.example.test/signed-export',
      expiresAt,
    } ), { status: 200, headers: { 'Content-Type': 'application/json' } } ) );

    await expect( requestDataExport() ).resolves.toEqual( {
      downloadUrl: 'https://storage.example.test/signed-export',
      expiresAt,
    } );
    expect( fetchWithRetry ).toHaveBeenCalledWith( 'https://api.example.test/gdpr/data-exports', expect.objectContaining( {
      method: 'POST',
      headers: expect.objectContaining( { Authorization: 'Bearer user-access-token' } ),
      body: '{}',
    } ) );
  } );

  it( 'surfaces a safe server error when export creation fails', async () => {
    fetchWithRetry.mockResolvedValue( new Response( JSON.stringify( { error: 'Export storage is unavailable.' } ), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    } ) );

    await expect( requestDataExport() ).rejects.toThrow( 'Export storage is unavailable.' );
  } );

  it( 'submits account deletion through the authenticated privacy API', async () => {
    fetchWithRetry.mockResolvedValue( new Response( JSON.stringify( { status: 'pending' } ), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    } ) );

    await expect( requestAccountDeletion() ).resolves.toBeUndefined();
    expect( fetchWithRetry ).toHaveBeenCalledWith( 'https://api.example.test/gdpr/deletions', expect.objectContaining( {
      method: 'POST',
      headers: expect.objectContaining( { Authorization: 'Bearer user-access-token' } ),
      body: '{}',
    } ) );
  } );

  it( 'surfaces account deletion API errors', async () => {
    fetchWithRetry.mockResolvedValue( new Response( JSON.stringify( { error: 'A deletion request is already pending.' } ), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    } ) );

    await expect( requestAccountDeletion() ).rejects.toThrow( 'A deletion request is already pending.' );
  } );
} );
