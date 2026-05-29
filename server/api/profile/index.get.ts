export default defineEventHandler(async (event) => {
  const { user, supabase } = await requireAuth(event)
  return getProfile(supabase, user.id)
})
