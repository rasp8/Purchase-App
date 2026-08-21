export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, 'id')

  if (!itemId) {
    throw createError({ statusCode: 400, message: 'Item id is required.' })
  }

  const { user, supabase } = await requireAuth(event)
  const { data, error } = await supabase
    .schema('purchase-app')
    .from('purchase_history')
    .delete()
    .eq('id', itemId)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle<{ id: string }>()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  if (!data) {
    throw createError({ statusCode: 404, message: 'Item not found.' })
  }

  return { success: true }
})
