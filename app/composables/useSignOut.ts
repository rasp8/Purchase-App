import { signOut } from '~/composables/supabase'
import { usePurchasesStore } from '~/stores/purchases'
import { useProfileStore } from '~/stores/profile'

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
