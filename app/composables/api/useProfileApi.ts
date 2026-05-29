import type { PurchaseAppProfile } from '~/types/purchase'
import { apiFetch } from '~/composables/useApiToken'

export function useProfileApi() {
  function getProfile() {
    return apiFetch<PurchaseAppProfile>('/api/profile')
  }

  return { getProfile }
}
