import type { SupabaseClient } from '@supabase/supabase-js'

type ProfileRow = {
  id: string
  user_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  avatar_link: string | null
  household_id: string | null
}

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('Profile')
    .select('id, user_id, first_name, last_name, email, avatar_link, household_id')
    .eq('user_id', userId)
    .single<ProfileRow>()

  if (error || !data) {
    throw createError({ statusCode: 404, message: 'Profile not found' })
  }

  return {
    id: data.id,
    userId: data.user_id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    avatarLink: data.avatar_link,
    householdId: data.household_id,
  }
}
