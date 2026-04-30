import { createBrowserClient } from '@supabase/ssr'
import { getSupabasePublicEnv } from './supabaseEnv'

export function createClient() {
  const { url, publishableKey } = getSupabasePublicEnv()

  return createBrowserClient(
    url,
    publishableKey
  )
}
