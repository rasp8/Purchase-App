export type KitchenItem = {
  id: string
  productName: string
  quantity: string
  unit: string
  price: string
  purchaseDate: string
  notes?: string
}

export const UNIT_OPTIONS = [
  { label: 'Each (count)', value: 'each'  },
  { label: 'Grams (g)',    value: 'g'     },
  { label: 'Kilograms (kg)', value: 'kg' },
  { label: 'Pounds (lb)',  value: 'lb'   },
  { label: 'Ounces (oz)',  value: 'oz'   },
  { label: 'Millilitres (ml)', value: 'ml' },
  { label: 'Litres (L)',   value: 'L'    },
  { label: 'Fluid oz (fl oz)', value: 'fl oz' },
]

export const UNIT_CONVERSIONS: Record<string, { category: string; toBase: number }> = {
  'each':  { category: 'count',  toBase: 1        },
  'g':     { category: 'weight', toBase: 1        },
  'kg':    { category: 'weight', toBase: 1000     },
  'lb':    { category: 'weight', toBase: 453.592  },
  'oz':    { category: 'weight', toBase: 28.3495  },
  'ml':    { category: 'volume', toBase: 1        },
  'L':     { category: 'volume', toBase: 1000     },
  'fl oz': { category: 'volume', toBase: 29.5735  },
}

/** Converts a quantity between compatible units. Returns null if incompatible. */
export function convertQty(qty: number, fromUnit: string, toUnit: string): number | null {
  if (fromUnit === toUnit) return qty
  const from = UNIT_CONVERSIONS[fromUnit]
  const to   = UNIT_CONVERSIONS[toUnit]
  if (!from || !to || from.category !== to.category) return null
  return (qty * from.toBase) / to.toBase
}

const SEED_ITEMS: KitchenItem[] = [
  { id: 'PRD-1001', productName: 'Tomatoes',  quantity: '6',   unit: 'each', price: '3.49', purchaseDate: '2026-04-22' },
  { id: 'PRD-1002', productName: 'Olive oil', quantity: '500', unit: 'ml',   price: '8.99', purchaseDate: '2026-04-23' },
  { id: 'PRD-1003', productName: 'Pasta',     quantity: '400', unit: 'g',    price: '2.25', purchaseDate: '2026-04-24' },
]

import { isSupabaseConfigured } from '~/composables/supabase/client'
import { getItems, insertItems, upsertItem, removeItem } from '~/composables/supabase/items'

/** Shared purchase-history state across all pages. */
export function useKitchenStore() {
  const items = useState<KitchenItem[]>('kitchen-items', () => [])
  const loaded = useState<boolean>('kitchen-items-loaded', () => false)

  async function fetchItems() {
    if (!isSupabaseConfigured()) {
      if (items.value.length === 0) items.value = [...SEED_ITEMS]
      loaded.value = true
      return
    }
    items.value = await getItems()
    loaded.value = true
  }

  async function addItems(newItems: KitchenItem[]) {
    if (isSupabaseConfigured()) await insertItems(newItems)
    items.value.unshift(...newItems)
  }

  async function editItem(id: string, data: Partial<Omit<KitchenItem, 'id'>>) {
    const existing = items.value.find(i => i.id === id)
    if (!existing) return
    const updated: KitchenItem = { ...existing, ...data }
    if (isSupabaseConfigured()) await upsertItem(updated)
    const idx = items.value.findIndex(i => i.id === id)
    if (idx !== -1) items.value[idx] = updated
  }

  async function deleteItem(id: string) {
    if (isSupabaseConfigured()) await removeItem(id)
    items.value = items.value.filter(i => i.id !== id)
  }

  return { items, loaded, fetchItems, addItems, editItem, deleteItem }
}
