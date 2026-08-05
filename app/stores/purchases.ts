import { defineStore } from 'pinia'
import type { PurchaseItem, PurchaseItemInput } from '~/types/purchase'
import { apiFetch } from '~/composables/useApiToken'

export const usePurchasesStore = defineStore('purchases', () => {
  const items = ref<PurchaseItem[]>([])
  const isLoaded = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  function listPurchases() {
    return apiFetch<PurchaseItem[]>('/api/purchases')
  }

  function createPurchasesRequest(items: PurchaseItemInput[]) {
    return apiFetch<PurchaseItem[]>('/api/purchases', {
      method: 'POST',
      body: { items },
    })
  }

  function updatePurchaseRequest(id: string, item: PurchaseItemInput) {
    return apiFetch<PurchaseItem>(`/api/purchases/${id}`, {
      method: 'PATCH',
      body: item,
    })
  }

  function deletePurchaseRequest(id: string) {
    return apiFetch<{ success: true }>(`/api/purchases/${id}`, {
      method: 'DELETE',
    })
  }

  async function loadPurchases(force = false) {
    if (isLoading.value) return items.value
    if (isLoaded.value && !force) return items.value

    isLoading.value = true
    try {
      items.value = await listPurchases()
      isLoaded.value = true
      error.value = null
      return items.value
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Failed to load purchases.'
      throw caughtError
    } finally {
      isLoading.value = false
    }
  }

  async function createPurchases(payload: PurchaseItemInput[]) {
    const createdPurchases = await createPurchasesRequest(payload)
    items.value = [...createdPurchases, ...items.value.filter(existing => !createdPurchases.some(item => item.id === existing.id))]
    isLoaded.value = true
    error.value = null
    return createdPurchases
  }

  async function updatePurchase(id: string, payload: PurchaseItemInput) {
    const updatedPurchase = await updatePurchaseRequest(id, payload)
    const itemIndex = items.value.findIndex(item => item.id === id)

    if (itemIndex === -1) {
      items.value = [updatedPurchase, ...items.value]
    } else {
      items.value[itemIndex] = updatedPurchase
      items.value = [...items.value]
    }

    error.value = null
    return updatedPurchase
  }

  async function deletePurchase(id: string) {
    await deletePurchaseRequest(id)
    items.value = items.value.filter(item => item.id !== id)
    error.value = null
  }

  function reset() {
    items.value = []
    isLoaded.value = false
    isLoading.value = false
    error.value = null
  }

  return { items, isLoaded, isLoading, error, loadPurchases, createPurchases, updatePurchase, deletePurchase, reset }
})
