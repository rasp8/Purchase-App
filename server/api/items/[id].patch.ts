type UpdateItemBody = {
  productName?: unknown
  quantity?: unknown
  unit?: unknown
  price?: unknown
  purchaseDate?: unknown
  notes?: unknown
}

type ItemRow = {
  id: string
  user_id: string
  product_name: string
  quantity: string
  unit: string
  price: string
  purchase_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, 'id')

  if (!itemId) {
    throw createError({ statusCode: 400, message: 'Item id is required.' })
  }

  const { user, supabase } = await requireAuth(event)
  const payload = normalizeItemInput(await readBody<UpdateItemBody>(event))
  const { data, error } = await supabase
    .schema('purchase-app')
    .from('Item')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('user_id', user.id)
    .select('id, user_id, product_name, quantity, unit, price, purchase_date, notes, created_at, updated_at')
    .maybeSingle<ItemRow>()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  if (!data) {
    throw createError({ statusCode: 404, message: 'Item not found.' })
  }

  return toKitchenItem(data)
})
