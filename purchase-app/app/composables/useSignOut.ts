import { signOut } from '~/composables/supabase'

export function useSignOut() {
  async function handleSignOut() {
    if (!window.confirm('Are you sure you want to sign out?')) return

    await signOut()
  }

  return { handleSignOut }
}
