export type KitchenItem = {
  id: string
  productName: string
  quantity: string
  unit: string
  price: string
  purchaseDate: string
  notes?: string
}

export type KitchenItemInput = Omit<KitchenItem, 'id'>

export type PurchaseAppProfile = {
  id: string
  userId: string
  firstName: string | null
  lastName: string | null
  email: string | null
  avatarLink: string | null
  householdId: string | null
}
