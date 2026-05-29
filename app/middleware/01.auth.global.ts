import { getSession, isSupabaseConfigured } from '~/composables/supabase'
import { useKitchenStore } from '~/composables/useKitchenStore'
import { useProfileStore } from '~/stores/profile'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server && !import.meta.client) {
    return
  }

  const profileStore = useProfileStore()
  const kitchenStore = useKitchenStore()

  if (!isSupabaseConfigured()) {
    if (to.path !== '/') {
      profileStore.clear()
      kitchenStore.reset()
      return navigateTo('/')
    }
    return
  }

  try {
    const session = await getSession()

    if (!session && to.path !== '/') {
      profileStore.clear()
      kitchenStore.reset()
      return navigateTo('/')
    }

    if (session && to.path === '/') {
      return navigateTo('/home')
    }

    if (session && !profileStore.isReady) {
      await profileStore.init()
    }
  } catch (error) {
    console.warn('Auth check failed:', error)
    profileStore.clear()
    kitchenStore.reset()
    if (to.path !== '/') {
      return navigateTo('/')
    }
  }
})
