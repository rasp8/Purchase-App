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

/** Shared purchase-history state across all pages. */
export function useKitchenStore() {
  const items = useState<KitchenItem[]>('kitchen-items', () => [...SEED_ITEMS])
  return { items }
}
