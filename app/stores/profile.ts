import { defineStore } from 'pinia'
import type { PurchaseAppProfile } from '~/types/purchase'
import { getSupabase } from '~/composables/supabase/client'
import { useProfileApi } from '~/composables/api/useProfileApi'

export const useProfileStore = defineStore('profile', () => {
  const profile = ref<PurchaseAppProfile | null>(null)

  const isReady = computed(() => profile.value !== null)
  const householdId = computed(() => profile.value?.householdId ?? null)

  async function init() {
    const supabase = getSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    const { getProfile } = useProfileApi()
    profile.value = await getProfile()
  }

  function clear() {
    profile.value = null
  }

  return { profile, isReady, householdId, init, clear }
})
