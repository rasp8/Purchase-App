import type { AuthError, Session } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from './client'

const missingConfigMessage =
  'Supabase is not configured yet. Set NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_ANON_KEY to enable auth.'

type ValidateCodeResult = {
  session: Session | null
  error: AuthError | Error | null
}

export async function validateCode(email: string, code: string): Promise<ValidateCodeResult> {
  if (!email || !code) {
    return { session: null, error: new Error('Email and verification code are required.') }
  }

  if (!isSupabaseConfigured()) {
    return { session: null, error: new Error(missingConfigMessage) }
  }

  try {
    const supabase = getSupabase()
    const {
      data: { session },
      error,
    } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })

    return { session, error }
  } catch (error) {
    return {
      session: null,
      error: error instanceof Error ? error : new Error('Invalid code or authentication error.'),
    }
  }
}

export async function getSession() {
  if (!isSupabaseConfigured()) {
    return null
  }

  const supabase = getSupabase()
  const { data: auth } = await supabase.auth.getSession()
  return auth.session
}

export async function signOut() {
  if (!isSupabaseConfigured()) {
    await navigateTo('/')
    return
  }

  const supabase = getSupabase()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  await navigateTo('/')
}
