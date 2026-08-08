import { getSupabase } from '~/composables/useSupabase'
import { usePurchasesStore } from '~/stores/purchases'
import { useProfileStore } from '~/stores/profile'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server && !import.meta.client) {
    return
  }

  const profileStore = useProfileStore()
  const purchasesStore = usePurchasesStore()
  const guestRoutes = new Set(['/', '/shopping-list'])

  try {
    const supabase = getSupabase()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session && !guestRoutes.has(to.path)) {
      profileStore.clear()
      purchasesStore.reset()
      return navigateTo('/')
    }

    if (!session) {
      profileStore.clear()
      purchasesStore.reset()
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
    if (!guestRoutes.has(to.path)) {
      return navigateTo('/')
    }
  }
})
