import type { KitchenItem, KitchenItemInput } from '~/types/purchase'
import { apiFetch } from '~/composables/useApiToken'

export function useItemsApi() {
  function listItems() {
    return apiFetch<KitchenItem[]>('/api/items')
  }

  function createItems(items: KitchenItemInput[]) {
    return apiFetch<KitchenItem[]>('/api/items', {
      method: 'POST',
      body: { items },
    })
  }

  function updateItem(id: string, item: KitchenItemInput) {
    return apiFetch<KitchenItem>(`/api/items/${id}`, {
      method: 'PATCH',
      body: item,
    })
  }

  function deleteItem(id: string) {
    return apiFetch<{ success: true }>(`/api/items/${id}`, {
      method: 'DELETE',
    })
  }

  return { listItems, createItems, updateItem, deleteItem }
}
