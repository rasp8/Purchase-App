import { createClient } from '@supabase/supabase-js'

let client: ReturnType<typeof createClient> | null = null

export function isSupabaseConfigured() {
  const config = useRuntimeConfig()
  return Boolean(config.public.supabaseUrl && config.public.supabaseAnonKey)
}

export function getSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }

  if (client) {
    return client
  }

  const config = useRuntimeConfig()
  client = createClient(
    config.public.supabaseUrl,
    config.public.supabaseAnonKey
  )
  return client
}
