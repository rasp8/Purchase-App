<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { getSession, isSupabaseConfigured } from '~/composables/supabase'
import { useSignOut } from '~/composables/useSignOut'
import { usePurchasesStore } from '~/stores/purchases'
import type { PurchaseItem, PurchaseItemInput } from '~/types/purchase'

type HomepageItem = PurchaseItem

type HomepageDraftRow = {
  id: number
  productName: string
  quantity: string
  unit: string
  price: string
  purchaseDate: string
  notes: string
}

useHead({ title: 'Purchase History | Kitchen App' })

const { handleSignOut } = useSignOut()
const supabaseReady = computed(() => isSupabaseConfigured())
const sessionEmail = ref<string | null>(null)
const showAddModal = ref(false)
const showEditModal = ref(false)
const editingItemId = ref<string | null>(null)
const toast = useToast()

const purchasesStore = usePurchasesStore()
const { items: homepageItems, isLoading: itemsLoading } = storeToRefs(purchasesStore)
const {
  loadPurchases,
  createPurchases,
  updatePurchase,
  deletePurchase: deletePurchaseRequest,
} = purchasesStore

/** Unique product names already entered, for autocomplete suggestions. */
const uniqueProductNames = computed(() => {
  const names = new Set<string>()
  for (const item of homepageItems.value)
    if (item.productName.trim()) names.add(item.productName.trim())
  return [...names].sort((a, b) => a.localeCompare(b))
})

function createDraftRow(): HomepageDraftRow {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    productName: '',
    quantity: '',
    unit: 'each',
    price: '',
    purchaseDate: '',
    notes: '',
  }
}

const draftRows = ref<HomepageDraftRow[]>([createDraftRow()])
const editForm = reactive({
  productName: '',
  quantity: '',
  unit: 'each',
  price: '',
  purchaseDate: '',
  notes: '',
})
const validDraftRows = computed(() =>
  draftRows.value.filter(row =>
    [row.productName, row.quantity, row.purchaseDate].some(value => value.trim().length > 0),
  ),
)
const canAddItem = computed(() =>
  validDraftRows.value.some(row => row.productName.trim().length > 0),
)
const canSaveEdit = computed(() => editForm.productName.trim().length > 0)

// ── purchase history ───────────────────────────────────────────────────────

/** All entries grouped by normalised product name. */
const productPurchaseHistory = computed(() => {
  const map = new Map<string, HomepageItem[]>()
  for (const item of homepageItems.value) {
    const key = item.productName.trim().toLowerCase()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return map
})

function formatPrice(value: string | number | null) {
  if (value === null || value === undefined || value === '') return '—'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num)
}

function purchaseCount(item: HomepageItem) {
  const key = item.productName.trim().toLowerCase()
  return productPurchaseHistory.value.get(key)?.length ?? 1
}

const quickStats = computed(() => [
  { label: 'Products on homepage', value: homepageItems.value.length.toString() },
  { label: 'Signed-in state', value: sessionEmail.value ? 'Active' : 'Guest' },
  { label: 'Supabase', value: supabaseReady.value ? 'Connected' : 'Pending' },
])

onMounted(async () => {
  if (!supabaseReady.value) return

  try {
    const session = await getSession()
    sessionEmail.value = session?.user?.email ?? null

    if (session) {
      await loadPurchases()
    }
  } catch (error) {
    console.warn('Failed to initialize purchase history:', error)
  }
})

function openAddModal() {
  showAddModal.value = true
}

function resetDraftRows() {
  draftRows.value = [createDraftRow()]
}

function closeAddModal() {
  showAddModal.value = false
  resetDraftRows()
}

function resetEditForm() {
  editingItemId.value = null
  showEditModal.value = false
  editForm.productName = ''
  editForm.quantity = ''
  editForm.unit = 'each'
  editForm.price = ''
  editForm.purchaseDate = ''
  editForm.notes = ''
}

function closeEditModal() {
  resetEditForm()
}

function addDraftRow() {
  draftRows.value.push(createDraftRow())
}

function removeDraftRow(id: number) {
  if (draftRows.value.length === 1) {
    resetDraftRows()
    return
  }

  draftRows.value = draftRows.value.filter(row => row.id !== id)
}

function formatPurchaseDate(value: string) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function openEditModal(item: HomepageItem) {
  editingItemId.value = item.id
  editForm.productName = item.productName
  editForm.quantity = item.quantity
  editForm.unit = item.unit || 'each'
  editForm.price = item.price
  editForm.purchaseDate = item.purchaseDate
  editForm.notes = item.notes || ''
  showEditModal.value = true
}

async function deleteItem(id: string) {
  try {
    await deletePurchaseRequest(id)
  } catch (error) {
    toast.add({
      title: 'Unable to delete item',
      description: error instanceof Error ? error.message : 'Please try again.',
      color: 'error',
    })
  }
}

async function saveEditedItem() {
  if (!editingItemId.value || !canSaveEdit.value) return

  const payload: PurchaseItemInput = {
    productName: editForm.productName.trim(),
    quantity: String(editForm.quantity).trim() || '-',
    unit: editForm.unit,
    price: String(editForm.price).trim(),
    purchaseDate: editForm.purchaseDate,
    notes: editForm.notes.trim() || undefined,
  }

  try {
    await updatePurchase(editingItemId.value, payload)
    resetEditForm()
  } catch (error) {
    toast.add({
      title: 'Unable to save item',
      description: error instanceof Error ? error.message : 'Please try again.',
      color: 'error',
    })
  }
}

async function handleAddItem() {
  if (!canAddItem.value) return

  const rowsToAdd: PurchaseItemInput[] = validDraftRows.value
    .filter(row => row.productName.trim().length > 0)
    .map(row => ({
      productName: row.productName.trim(),
      quantity: String(row.quantity).trim() || '-',
      unit: row.unit || 'each',
      price: String(row.price).trim(),
      purchaseDate: row.purchaseDate || '',
      notes: row.notes.trim() || undefined,
    }))

  try {
    await createPurchases(rowsToAdd)
    closeAddModal()
  } catch (error) {
    toast.add({
      title: 'Unable to add items',
      description: error instanceof Error ? error.message : 'Please try again.',
      color: 'error',
    })
  }
}
</script>

<template>
  <UContainer class="py-8 lg:py-10">
    <div class="space-y-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="text-sm font-medium text-primary">Kitchen-App</p>
          <h1 class="text-3xl font-bold tracking-tight">Purchase History</h1>
          <p class="mt-2 max-w-2xl text-muted">
            A simple starting dashboard for planning and tracking kitchen work in one place.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UColorModeSwitch />
          <UButton
            color="primary"
            icon="i-lucide-plus"
            @click="openAddModal"
          >
            Add item
          </UButton>
          <UButton
            v-if="sessionEmail"
            color="neutral"
            variant="ghost"
            @click="handleSignOut"
          >
            Sign out
          </UButton>
        </div>
      </div>

      <div class="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <UCard class="p-6">
          <div class="space-y-5">
            <div class="flex items-center justify-between gap-4">
              <div>
                <h2 class="text-xl font-semibold">Overview</h2>
              </div>
            <UBadge color="primary" variant="soft">
              {{ itemsLoading ? 'Loading…' : `${homepageItems.length} items` }}
            </UBadge>
            </div>

            <div class="grid gap-4 sm:grid-cols-3">
              <UCard
                v-for="stat in quickStats"
                :key="stat.label"
                variant="soft"
                class="p-4"
              >
                <p class="text-sm text-muted">{{ stat.label }}</p>
                <p class="mt-2 text-2xl font-semibold">{{ stat.value }}</p>
              </UCard>
            </div>

            <div class="overflow-hidden rounded-xl border border-default">
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-default">
                  <thead class="bg-elevated/50">
                    <tr>
                      <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Product Name</th>
                      <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Qty / Unit</th>
                      <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Price</th>
                      <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Purchase Date</th>
                      <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">Action</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-default bg-default">
                    <tr v-for="item in homepageItems" :key="item.id">
                        <td class="px-4 py-4 text-sm text-muted">
                          <div class="flex items-center gap-2">
                            {{ item.productName }}
                            <UBadge
                              v-if="purchaseCount(item) > 1"
                              color="primary"
                              variant="soft"
                              size="sm"
                            >
                              {{ purchaseCount(item) }}×
                            </UBadge>
                          </div>
                        </td>
                        <td class="px-4 py-4 text-sm text-muted">{{ item.quantity }} {{ item.unit }}</td>
                        <td class="px-4 py-4 text-sm text-muted">{{ formatPrice(item.price) }}</td>
                        <td class="px-4 py-4 text-sm text-muted">{{ formatPurchaseDate(item.purchaseDate) }}</td>
                        <td class="px-4 py-4 text-right">
                          <div class="flex items-center justify-end gap-2">
                            <UPopover v-if="item.notes" mode="hover">
                              <UButton
                                color="neutral"
                                variant="ghost"
                                icon="i-lucide-sticky-note"
                                aria-label="View note"
                              />
                              <template #content>
                                <div class="p-3 max-w-xs text-sm">{{ item.notes }}</div>
                              </template>
                            </UPopover>
                            <UButton
                              color="neutral"
                              variant="soft"
                              icon="i-lucide-pencil"
                              @click="openEditModal(item)"
                            >
                              Edit
                            </UButton>
                            <UButton
                              color="error"
                              variant="ghost"
                              icon="i-lucide-trash-2"
                              aria-label="Delete item"
                              @click="deleteItem(item.id)"
                            />
                          </div>
                        </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <UModal
      v-model:open="showAddModal"
      title="Add product entries"
      description="Fill in the table rows below. Product IDs are assigned automatically when you save."
      :content="{ class: 'sm:max-w-5xl' }"
      @update:open="value => !value && closeAddModal()"
    >
      <template #body>
        <div class="space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="font-medium">Tabular entry</p>
              <p class="text-sm text-muted">Use the date field to open your device or browser date picker.</p>
            </div>
            <UButton color="neutral" variant="soft" icon="i-lucide-plus" @click="addDraftRow">
              Add row
            </UButton>
          </div>

          <div class="overflow-hidden rounded-xl border border-default">
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-default">
                <thead class="bg-elevated/50">
                  <tr>
                    <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Product Name</th>
                    <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Quantity</th>
                    <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Unit</th>
                    <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Price</th>
                    <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Purchase Date</th>
                    <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Notes</th>
                    <th class="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-default bg-default">
                  <tr v-for="row in draftRows" :key="row.id">
                    <td class="px-3 py-3 align-top">
                      <UInput v-model="row.productName" placeholder="Tomatoes" list="product-names-datalist" autocomplete="off" />
                    </td>
                    <td class="px-3 py-3 align-top">
                      <UInput v-model="row.quantity" placeholder="2" />
                    </td>
                    <td class="px-3 py-3 align-top">
                      <USelect v-model="row.unit" :items="UNIT_OPTIONS" value-key="value" label-key="label" class="w-32" />
                    </td>
                    <td class="px-3 py-3 align-top">
                      <UInput v-model="row.price" placeholder="0.00" type="number" min="0" step="0.01" />
                    </td>
                    <td class="px-3 py-3 align-top">
                      <UInput v-model="row.purchaseDate" type="date" />
                    </td>
                    <td class="px-3 py-3 align-top">
                      <UInput v-model="row.notes" placeholder="Optional note…" class="w-44" />
                    </td>
                    <td class="px-3 py-3 text-right align-top">
                      <UButton
                        color="error"
                        variant="ghost"
                        icon="i-lucide-trash-2"
                        @click="removeDraftRow(row.id)"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="soft" @click="closeAddModal">Cancel</UButton>
          <UButton color="primary" :disabled="!canAddItem" @click="handleAddItem">Save rows</UButton>
        </div>
      </template>
    </UModal>

    <!-- Edit product modal -->
    <UModal
      v-model:open="showEditModal"
      title="Edit product entry"
      description="Update the details for this purchase record."
      :content="{ class: 'sm:max-w-lg' }"
      @update:open="value => !value && closeEditModal()"
    >
      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Product Name</label>
            <UInput v-model="editForm.productName" placeholder="Product name" list="product-names-datalist" autocomplete="off" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium mb-1">Quantity</label>
              <UInput v-model="editForm.quantity" placeholder="Qty" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Unit</label>
              <USelect v-model="editForm.unit" :items="UNIT_OPTIONS" value-key="value" label-key="label" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium mb-1">Price</label>
              <UInput v-model="editForm.price" type="number" min="0" step="0.01" placeholder="0.00" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Purchase Date</label>
              <UInput v-model="editForm.purchaseDate" type="date" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Notes</label>
            <UInput v-model="editForm.notes" placeholder="Optional note…" />
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="soft" @click="closeEditModal">Cancel</UButton>
          <UButton color="primary" :disabled="!canSaveEdit" @click="saveEditedItem">Save</UButton>
        </div>
      </template>
    </UModal>

    <!-- Autocomplete suggestions for product names -->
    <datalist id="product-names-datalist">
      <option v-for="name in uniqueProductNames" :key="name" :value="name" />
    </datalist>
  </UContainer>
</template>
