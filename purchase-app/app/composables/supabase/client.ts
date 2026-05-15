import { createClient } from '@supabase/supabase-js'

let client: ReturnType<typeof createClient> | null = null

export function isSupabaseConfigured() {
  return Boolean(
    import.meta.env.NUXT_PUBLIC_SUPABASE_URL &&
    import.meta.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export function getSupabase() {
  const url = import.meta.env.NUXT_PUBLIC_SUPABASE_URL as string
  const key = import.meta.env.NUXT_PUBLIC_SUPABASE_ANON_KEY as string

  if (!url || !key) {
    throw new Error(
      'Supabase is not configured. Set NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }

  if (client) {
    return client
  }

  client = createClient(url, key)
  return client
}
