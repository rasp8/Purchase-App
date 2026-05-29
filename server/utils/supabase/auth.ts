import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function requireAuth(event: H3Event): Promise<{
  user: { id: string; email?: string }
  supabase: SupabaseClient
}> {
  const supabase = useUserSupabase(event)
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  return { user: { id: user.id, email: user.email }, supabase }
}
