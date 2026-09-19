/**
 * OAuth Health Check Hook
 * Checks if OAuth providers are properly configured before showing buttons
 */

import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { validateOAuthProvider, type OAuthProvider, type OAuthProviderStatus } from '../utils/oauthValidator';

export interface UseOAuthHealthResult {
  providers: OAuthProviderStatus[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Check the health/status of OAuth providers
 * 
 * @example
 * const { providers, loading } = useOAuthHealth(supabaseClient);
 * 
 * // In your component:
 * {providers.map(p => (
 *   <button disabled={!p.configured} onClick={() => signIn(p.provider)}>
 *     {p.provider} {p.configured ? '' : '(not configured)'}
 *   </button>
 * ))}
 */
export function useOAuthHealth (
  client: SupabaseClient | null,
  providers: OAuthProvider[] = [ 'google', 'facebook' ],
): UseOAuthHealthResult {
  const [ statuses, setStatuses ] = useState<OAuthProviderStatus[]>( [] );
  const [ loading, setLoading ] = useState( true );
  const [ error, setError ] = useState<string | null>( null );

  const [ trigger, setTrigger ] = useState( 0 );

  useEffect( () => {
    if ( !client ) {
      setLoading( false );
      return;
    }

    let cancelled = false;

    const checkHealth = async () => {
      setLoading( true );
      setError( null );

      try {
        const results = await Promise.all(
          providers.map( provider => validateOAuthProvider( client, provider ) ),
        );
        if ( !cancelled ) { setStatuses( results ); }
      } catch ( err ) {
        if ( !cancelled ) {
          const message = err instanceof Error ? err.message : 'Failed to check OAuth status';
          setError( message );
        }
      } finally {
        if ( !cancelled ) { setLoading( false ); }
      }
    };

    checkHealth();

    return () => { cancelled = true; };
  }, [ client, providers, trigger ] );

  const refetch = useCallback( async () => {
    setTrigger( t => t + 1 );
  }, [] );

  return {
    providers: statuses,
    loading,
    error,
    refetch,
  };
}

/**
 * Lightweight check that just verifies if a provider is enabled
 * Uses a simple heuristic based on Supabase's error patterns
 */
export function useOAuthProviderEnabled (
  client: SupabaseClient | null,
  provider: 'google' | 'facebook',
): { enabled: boolean; loading: boolean } {
  const [ enabled, setEnabled ] = useState( true ); // Optimistically assume enabled
  const [ loading, setLoading ] = useState( false );

  useEffect( () => {
    if ( !client || !import.meta.env.DEV ) { return; }

    let cancelled = false;

    const checkProvider = async () => {
      setLoading( true );

      try {
        const { error } = await client.auth.signInWithOAuth( {
          provider,
          options: {
            skipBrowserRedirect: true,
          },
        } );
        if ( !cancelled ) {
          // If we get a redirect_uri error, the provider IS enabled but misconfigured
          // If we get "provider not enabled", it's disabled
          if ( error?.message?.toLowerCase().includes( 'not enabled' ) ) {
            setEnabled( false );
          } else {
            setEnabled( true );
          }
        }
      } catch {
        if ( !cancelled ) {
          // Assume enabled on network errors
          setEnabled( true );
        }
      } finally {
        if ( !cancelled ) { setLoading( false ); }
      }
    };

    checkProvider();

    return () => { cancelled = true; };
  }, [ client, provider ] );

  return { enabled, loading };
}
