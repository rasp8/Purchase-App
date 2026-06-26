import type { PurchaseItem, PurchaseItemInput } from '~/types/purchase'
import { apiFetch } from '~/composables/useApiToken'

export function usePurchasesApi() {
  function listPurchases() {
    return apiFetch<PurchaseItem[]>('/api/purchases')
  }

  function createPurchases(items: PurchaseItemInput[]) {
    return apiFetch<PurchaseItem[]>('/api/purchases', {
      method: 'POST',
      body: { items },
    })
  }

  function updatePurchase(id: string, item: PurchaseItemInput) {
    return apiFetch<PurchaseItem>(`/api/purchases/${id}`, {
      method: 'PATCH',
      body: item,
    })
  }

  function deletePurchase(id: string) {
    return apiFetch<{ success: true }>(`/api/purchases/${id}`, {
      method: 'DELETE',
    })
  }

  return { listPurchases, createPurchases, updatePurchase, deletePurchase }
}
