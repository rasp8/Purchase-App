export type ShoppingListSortMode = 'manual' | 'store-asc' | 'store-desc'

export type ShoppingListItem = {
  id: number
  productName: string
  quantity: string | number
  unit: string
  cost: string | number
  storeName: string
  notes: string
  checked: boolean
}

export type SavedShoppingList = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  sortMode: ShoppingListSortMode
  items: ShoppingListItem[]
}
