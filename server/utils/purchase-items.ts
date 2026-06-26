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

type ItemInput = {
  productName?: unknown
  quantity?: unknown
  unit?: unknown
  price?: unknown
  purchaseDate?: unknown
  notes?: unknown
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeItemInput(input: ItemInput) {
  const productName = normalizeString(input.productName)

  if (!productName) {
    throw createError({ statusCode: 400, message: 'Product name is required.' })
  }

  const purchaseDate = normalizeString(input.purchaseDate)

  if (purchaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
    throw createError({ statusCode: 400, message: 'Purchase date must use YYYY-MM-DD.' })
  }

  const unit = normalizeString(input.unit) || 'each'
  const quantity = normalizeString(input.quantity) || '-'
  const price = normalizeString(input.price)
  const notes = normalizeString(input.notes)

  return {
    product_name: productName,
    quantity,
    unit,
    price,
    purchase_date: purchaseDate || null,
    notes: notes || null,
  }
}

export function toPurchaseItem(row: ItemRow) {
  return {
    id: row.id,
    productName: row.product_name,
    quantity: row.quantity,
    unit: row.unit,
    price: row.price,
    purchaseDate: row.purchase_date ?? '',
    notes: row.notes ?? undefined,
  }
}
