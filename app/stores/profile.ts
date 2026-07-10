import { defineStore } from 'pinia'
import type { PurchaseAppProfile } from '~/types/purchase'
import { getSupabase } from '~/composables/useSupabase'
import { apiFetch } from '~/composables/useApiToken'

export const useProfileStore = defineStore('profile', () => {
  const profile = ref<PurchaseAppProfile | null>(null)

  const isReady = computed(() => profile.value !== null)
  const householdId = computed(() => profile.value?.householdId ?? null)

  function getProfile() {
    return apiFetch<PurchaseAppProfile>('/api/profile')
  }

  async function init() {
    const supabase = getSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    profile.value = await getProfile()
  }

  function clear() {
    profile.value = null
  }

  return { profile, isReady, householdId, init, clear }
})
