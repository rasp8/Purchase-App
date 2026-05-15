import { useKitchenStore } from '~/composables/useKitchenStore'

/**
 * Client-only plugin: hydrates the kitchen-items store from localStorage on
 * first load, and persists any mutations back to localStorage so data survives
 * browser refreshes and hard navigations.
 */
export default defineNuxtPlugin(() => {
  const { items } = useKitchenStore()

  // Restore saved data (skip if nothing stored yet)
  const saved = localStorage.getItem('kitchen-items')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        items.value = parsed
      }
    } catch {
      // Corrupt data — leave seed items in place
    }
  }

  const save = () => localStorage.setItem('kitchen-items', JSON.stringify(items.value))

  // flush:'sync' writes to localStorage immediately on every mutation, so a hard
  // navigation (URL bar / F5) right after a check-off never loses data.
  watch(items, save, { deep: true, immediate: true, flush: 'sync' })

  // Belt-and-suspenders: also save right before the page unloads.
  window.addEventListener('beforeunload', save)
})
