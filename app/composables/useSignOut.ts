import { getSupabase } from '~/composables/useSupabase'
import { usePurchasesStore } from '~/stores/purchases'
import { useProfileStore } from '~/stores/profile'

async function signOut() {
  const supabase = getSupabase()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  await navigateTo('/')
}

export function useSignOut() {
  async function handleSignOut() {
    if (!window.confirm('Are you sure you want to sign out?')) return

    const profileStore = useProfileStore()
    const purchasesStore = usePurchasesStore()

    await signOut()
    profileStore.clear()
    purchasesStore.reset()
  }

  return { handleSignOut }
}
