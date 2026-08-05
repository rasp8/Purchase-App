import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

export function useUserSupabase(event: H3Event) {
  const config = useRuntimeConfig()
  const authorization = getHeader(event, 'authorization') ?? ''
  const token = authorization.replace(/^Bearer\s+/i, '')


  return createClient(config.public.supabaseUrl, config.public.supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
