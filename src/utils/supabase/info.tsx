/**
 * Supabase credentials.
 * Priority: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY env vars (set in .env)
 * If these are empty, backend-backed features stay unavailable until configured.
 *
 * To connect a real backend:
 *   1. Copy .env.example to .env
 *   2. Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 *   3. Restart the dev server
 */
export const projectId: string =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)
    ?.replace('https://', '')
    ?.replace('.supabase.co', '') ?? '';

export const publicAnonKey: string =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';
