import { createClient } from '@supabase/supabase-js'

type SendCodeBody = {
  email?: string
}

export default defineEventHandler(async (event) => {
  const { email } = await readBody<SendCodeBody>(event)
  const normalizedEmail = email?.trim().toLowerCase()

  if (!normalizedEmail) {
    throw createError({ statusCode: 400, message: 'Email is required.' })
  }

  const config = useRuntimeConfig()
  const supabase = createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey)

  const { data: authorized } = await supabase.rpc('is_authorized_email', {
    email_to_check: normalizedEmail,
  })

  if (!authorized) throw createError({ statusCode: 403, message: 'This email is not authorized.' })
  

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: { shouldCreateUser: false },
  })

  if (error) {
    if (error.message.includes('email rate limit exceeded')) {
      throw createError({ statusCode: 429, message: 'Too many requests. Try again in a little while.' })
    }

    throw createError({ statusCode: 500, message: `Error: ${error.message}.` })
  }

  return { success: true }
})
 