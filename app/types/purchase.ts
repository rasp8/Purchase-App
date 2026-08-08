export type PurchaseItem = {
  id: string
  productName: string
  quantity: string
  unit: string
  price: string
  storeName?: string
  purchaseDate: string
  notes?: string
}

export type PurchaseItemInput = Omit<PurchaseItem, 'id'>

export type PurchaseAppProfile = {
  id: string
  userId: string
  firstName: string | null
  lastName: string | null
  email: string | null
  avatarLink: string | null
  householdId: string | null
}
