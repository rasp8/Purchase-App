import { getSession } from '~/composables/supabase/auth'
import { usePurchasesStore } from '~/stores/purchases'
import { useProfileStore } from '~/stores/profile'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server && !import.meta.client) {
    return
  }

  const profileStore = useProfileStore()
  const purchasesStore = usePurchasesStore()

  try {
    const session = await getSession()

    if (!session && to.path !== '/') {
      profileStore.clear()
      purchasesStore.reset()
      return navigateTo('/')
    }

    if (session && to.path === '/') {
      return navigateTo('/purchase-history')
    }

    if (session && !profileStore.isReady) {
      await profileStore.init()
    }
  } catch (error) {
    console.warn('Auth check failed:', error)
    profileStore.clear()
    purchasesStore.reset()
    if (to.path !== '/') {
      return navigateTo('/')
    }
  }
})
