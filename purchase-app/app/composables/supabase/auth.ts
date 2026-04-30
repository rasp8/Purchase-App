import type { AuthError, Session } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from './client'

const missingConfigMessage =
  'Supabase is not configured yet. Set NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_ANON_KEY to enable auth.'

type ValidateCodeResult = {
  session: Session | null
  error: AuthError | Error | null
}

export async function sendMagicLink(email: string): Promise<{ success: boolean; message: string }> {
  if (!email) {
    return { success: false, message: 'Please enter a valid email address.' }
  }

  if (!isSupabaseConfigured()) {
    return { success: false, message: missingConfigMessage }
  }

  try {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.href : '',
      },
    })

    if (error) {
      return { success: false, message: `Error sending magic link: ${error.message}` }
    }

    return { success: true, message: 'Verification code sent. Check your email.' }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown authentication error.' }
  }
}

export async function validateCode(email: string, code: string): Promise<ValidateCodeResult> {
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
