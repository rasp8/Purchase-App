import { getSupabase } from '~/composables/supabase/client'

export async function getApiToken(): Promise<string> {
  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return session.access_token
}

export async function apiFetch<T>(path: string, opts: Parameters<typeof $fetch>[1] = {}): Promise<T> {
  const token = await getApiToken()
  return $fetch<T>(path, {
    ...opts,
    headers: {
      ...((opts.headers as Record<string, string>) || {}),
      Authorization: `Bearer ${token}`,
    },
  })
}
