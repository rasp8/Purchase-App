import { getSession, isSupabaseConfigured } from '~/composables/supabase'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server && !import.meta.client) {
    return
  }

  if (!isSupabaseConfigured()) {
    return
  }

  try {
    const session = await getSession()

    if (!session && to.path !== '/') {
      return navigateTo('/')
    }

    if (session && to.path === '/') {
      return navigateTo('/home')
    }
  } catch (error) {
    console.warn('Auth check failed:', error)
    if (to.path !== '/') {
      return navigateTo('/')
    }
  }
})
