import type { KitchenItem, KitchenItemInput } from '~/types/purchase'

export type { KitchenItem, KitchenItemInput } from '~/types/purchase'

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

/** Shared purchase-history state across all pages. */
export function useKitchenStore() {
  const items = useState<KitchenItem[]>('kitchen-items', () => [])
  const isLoaded = useState('kitchen-items-loaded', () => false)
  const isLoading = useState('kitchen-items-loading', () => false)
  const error = useState<string | null>('kitchen-items-error', () => null)

  async function loadItems(force = false) {
    if (isLoading.value) return items.value
    if (isLoaded.value && !force) return items.value

    const { listItems } = useItemsApi()

    isLoading.value = true
    try {
      items.value = await listItems()
      isLoaded.value = true
      error.value = null
      return items.value
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Failed to load items.'
      throw caughtError
    } finally {
      isLoading.value = false
    }
  }

  async function createItems(payload: KitchenItemInput[]) {
    const { createItems: createItemsRequest } = useItemsApi()
    const createdItems = await createItemsRequest(payload)
    items.value = [...createdItems, ...items.value.filter(existing => !createdItems.some(item => item.id === existing.id))]
    isLoaded.value = true
    error.value = null
    return createdItems
  }

  async function updateItem(id: string, payload: KitchenItemInput) {
    const { updateItem: updateItemRequest } = useItemsApi()
    const updatedItem = await updateItemRequest(id, payload)
    const itemIndex = items.value.findIndex(item => item.id === id)

    if (itemIndex === -1) {
      items.value = [updatedItem, ...items.value]
    } else {
      items.value[itemIndex] = updatedItem
      items.value = [...items.value]
    }

    error.value = null
    return updatedItem
  }

  async function deleteItem(id: string) {
    const { deleteItem: deleteItemRequest } = useItemsApi()
    await deleteItemRequest(id)
    items.value = items.value.filter(item => item.id !== id)
    error.value = null
  }

  function reset() {
    items.value = []
    isLoaded.value = false
    isLoading.value = false
    error.value = null
  }

  return { items, isLoaded, isLoading, error, loadItems, createItems, updateItem, deleteItem, reset }
}
