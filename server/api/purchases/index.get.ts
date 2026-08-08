import { toPurchaseItem } from "~~/server/utils/purchase-items"
import { requireAuth } from "~~/server/utils/supabase/auth"

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
  const { data, error } = await supabase
    .schema('purchase-app')
    .from('Item')
    .select('id, user_id, product_name, quantity, unit, price, store_name, purchase_date, notes, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .returns<ItemRow[]>()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return (data ?? []).map(toPurchaseItem)
})
