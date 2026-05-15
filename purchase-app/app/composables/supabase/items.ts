import { getSupabase } from './client'
import type { KitchenItem } from '~/types/kitchen'

function getClient() {
  return getSupabase().schema('purchase-app')
}

function toKitchenItem(row: Record<string, unknown>): KitchenItem {
  return {
    id: row.id as string,
    productName: row.product_name as string,
    quantity: row.quantity as string,
    unit: row.unit as string,
    price: row.price as string,
    purchaseDate: (row.purchase_date as string) ?? '',
    notes: (row.notes as string | undefined) ?? undefined,
  }
}

export async function getItems(): Promise<KitchenItem[]> {
  const { data, error } = await getClient()
    .from('Item')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(toKitchenItem)
}

export async function insertItems(items: KitchenItem[]): Promise<void> {
  const { data: { user } } = await getSupabase().auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const rows = items.map(item => ({
    id: item.id,
    user_id: user.id,
    product_name: item.productName,
    quantity: item.quantity,
    unit: item.unit,
    price: item.price,
    purchase_date: item.purchaseDate || null,
    notes: item.notes ?? null,
  }))

  const { error } = await getClient().from('Item').insert(rows)
  if (error) throw error
}

export async function upsertItem(item: KitchenItem): Promise<void> {
  const { data: { user } } = await getSupabase().auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await getClient().from('Item').upsert({
    id: item.id,
    user_id: user.id,
    product_name: item.productName,
    quantity: item.quantity,
    unit: item.unit,
    price: item.price,
    purchase_date: item.purchaseDate || null,
    notes: item.notes ?? null,
  })
  if (error) throw error
}

export async function removeItem(id: string): Promise<void> {
  const { error } = await getClient().from('Item').delete().eq('id', id)
  if (error) throw error
}
