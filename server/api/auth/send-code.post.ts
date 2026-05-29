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

  if (!config.public.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw createError({ statusCode: 500, message: 'Supabase server auth config is missing.' })
  }

  const supabase = createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey)
  const { data: authorized, error: authorizationError } = await supabase.rpc('is_authorized_email', {
    email_to_check: normalizedEmail,
  })

  if (authorizationError) {
    const isMissingAuthFunction = authorizationError.message.includes('is_authorized_email')
    const hint = isMissingAuthFunction
      ? ' Apply the Purchase-App migration to the same Supabase project or run `npx supabase db reset` for local development.'
      : ' Make sure the app is pointed at the same Supabase project that has the Purchase-App migration and seed data applied.'

    throw createError({
      statusCode: 500,
      message: `Authorization check failed: ${authorizationError.message}.${hint}`,
    })
  }

  if (!authorized) {
    throw createError({ statusCode: 403, message: 'This email is not authorized to access Purchase-App.' })
  }

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
