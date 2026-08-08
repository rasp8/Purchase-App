import { randomUUID } from 'node:crypto'
import { toPurchaseItem } from '~~/server/utils/purchase-items'

type CreateItemsBody = {
  items?: Array<{
    productName?: unknown
    quantity?: unknown
    unit?: unknown
    price?: unknown
    storeName?: unknown
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
  store_name: string | null
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
    .select('id, user_id, product_name, quantity, unit, price, store_name, purchase_date, notes, created_at, updated_at')
    .returns<ItemRow[]>()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return (data ?? []).map(toPurchaseItem)
})
