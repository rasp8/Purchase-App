import { randomUUID } from 'node:crypto'

type CreateItemsBody = {
  items?: Array<{
    productName?: unknown
    quantity?: unknown
    unit?: unknown
    price?: unknown
    purchaseDate?: unknown
    notes?: unknown
  }>
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
  const { user, supabase } = await requireAuth(event)
  const body = await readBody<CreateItemsBody>(event)

  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw createError({ statusCode: 400, message: 'At least one item is required.' })
  }

  const rows = body.items.map((item) => ({
    id: randomUUID(),
    user_id: user.id,
    ...normalizeItemInput(item),
  }))

  const { data, error } = await supabase
    .schema('purchase-app')
    .from('Item')
    .insert(rows)
    .select('id, user_id, product_name, quantity, unit, price, purchase_date, notes, created_at, updated_at')
    .returns<ItemRow[]>()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return (data ?? []).map(toPurchaseItem)
})
