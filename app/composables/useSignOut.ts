import { signOut } from '~/composables/supabase'
import { useKitchenStore } from '~/composables/useKitchenStore'
import { useProfileStore } from '~/stores/profile'

export function useSignOut() {
  async function handleSignOut() {
    if (!window.confirm('Are you sure you want to sign out?')) return

    const profileStore = useProfileStore()
    const kitchenStore = useKitchenStore()

    await signOut()
    profileStore.clear()
    kitchenStore.reset()
  }

  return { handleSignOut }
}
