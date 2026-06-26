export const UNIT_OPTIONS = [
  { label: 'Each (count)', value: 'each' },
  { label: 'Grams (g)', value: 'g' },
  { label: 'Kilograms (kg)', value: 'kg' },
  { label: 'Pounds (lb)', value: 'lb' },
  { label: 'Ounces (oz)', value: 'oz' },
  { label: 'Millilitres (ml)', value: 'ml' },
  { label: 'Litres (L)', value: 'L' },
  { label: 'Fluid oz (fl oz)', value: 'fl oz' },
]

export const UNIT_CONVERSIONS: Record<string, { category: string; toBase: number }> = {
  each: { category: 'count', toBase: 1 },
  g: { category: 'weight', toBase: 1 },
  kg: { category: 'weight', toBase: 1000 },
  lb: { category: 'weight', toBase: 453.592 },
  oz: { category: 'weight', toBase: 28.3495 },
  ml: { category: 'volume', toBase: 1 },
  L: { category: 'volume', toBase: 1000 },
  'fl oz': { category: 'volume', toBase: 29.5735 },
}

export function convertQty(qty: number, fromUnit: string, toUnit: string): number | null {
  if (fromUnit === toUnit) return qty
  const from = UNIT_CONVERSIONS[fromUnit]
  const to = UNIT_CONVERSIONS[toUnit]
  if (!from || !to || from.category !== to.category) return null
  return (qty * from.toBase) / to.toBase
}
