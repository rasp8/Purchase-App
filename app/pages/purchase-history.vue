<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSignOut } from '~/composables/useSignOut'
import { usePurchasesStore } from '~/stores/purchases'
import type { PurchaseItem, PurchaseItemInput } from '~/types/purchase'

definePageMeta({ alias: ['/home'] })

type PurchaseHistoryItem = PurchaseItem

type PurchaseForm = {
  productName: string
  quantity: string
  unit: string
  price: string
  storeName: string
  purchaseDate: string
  notes: string
}

type PurchaseDraftRow = PurchaseForm & {
  id: number
}

useHead({ title: 'Purchase History | Purchase App' })

const { handleSignOut } = useSignOut()
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

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const purchaseDateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})
const purchaseFormDefaults: PurchaseForm = {
  productName: '',
  quantity: '',
  unit: 'each',
  price: '',
  storeName: '',
  purchaseDate: '',
  notes: '',
}

/** Unique product names already entered, for autocomplete suggestions. */
const uniqueProductNames = computed(() => {
  return [...new Set(
    homepageItems.value
      .map(item => item.productName.trim())
      .filter(Boolean),
  )].sort((a, b) => a.localeCompare(b))
})

/** Unique store names already entered, for autocomplete suggestions. */
const uniqueStoreNames = computed(() => {
  const names = new Map<string, string>()
  for (const item of homepageItems.value) {
    const name = item.storeName?.trim()
    if (name && !names.has(name.toLowerCase())) names.set(name.toLowerCase(), name)
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b))
})

function createPurchaseForm(): PurchaseForm {
  return { ...purchaseFormDefaults }
}

function createDraftRow(): PurchaseDraftRow {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    ...createPurchaseForm(),
  }
}

function isFilledPurchaseRow(row: PurchaseForm) {
  return [row.productName, row.quantity, row.purchaseDate].some(value => value.trim().length > 0)
}

function toPurchaseInput(form: PurchaseForm): PurchaseItemInput {
  return {
    productName: form.productName.trim(),
    quantity: String(form.quantity).trim() || '-',
    unit: form.unit || 'each',
    price: String(form.price).trim(),
    storeName: form.storeName.trim() || undefined,
    purchaseDate: form.purchaseDate || '',
    notes: form.notes.trim() || undefined,
  }
}

function populatePurchaseForm(form: PurchaseForm, item: PurchaseHistoryItem) {
  Object.assign(form, {
    productName: item.productName,
    quantity: item.quantity,
    unit: item.unit || 'each',
    price: item.price,
    storeName: item.storeName || '',
    purchaseDate: item.purchaseDate,
    notes: item.notes || '',
  })
}

const draftRows = ref<PurchaseDraftRow[]>([createDraftRow()])
const editForm = reactive<PurchaseForm>(createPurchaseForm())
const validDraftRows = computed(() =>
  draftRows.value.filter(isFilledPurchaseRow),
)
const canAddItem = computed(() =>
  validDraftRows.value.some(row => row.productName.trim().length > 0),
)
const canSaveEdit = computed(() => editForm.productName.trim().length > 0)

// ── purchase history ───────────────────────────────────────────────────────

/** All entries grouped by normalised product name. */
const productPurchaseHistory = computed(() => {
  return homepageItems.value.reduce((map, item) => {
    const key = item.productName.trim().toLowerCase()
    const group = map.get(key)
    if (group) group.push(item)
    else map.set(key, [item])
    return map
  }, new Map<string, PurchaseHistoryItem[]>())
})

function formatPrice(value: string | number | null) {
  if (value === null || value === undefined || value === '') return '—'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '—'
  return currencyFormatter.format(num)
}

function purchaseCount(item: PurchaseHistoryItem) {
  const key = item.productName.trim().toLowerCase()
  return productPurchaseHistory.value.get(key)?.length ?? 1
}

const quickStats = computed(() => [
  { label: 'Products on page', value: String(homepageItems.value.length) },
  { label: 'Signed-in state', value: 'Active'},
  { label: 'Supabase', value: 'Connected' },
])

onMounted(async () => {
  try {
      await loadPurchases()
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
  Object.assign(editForm, createPurchaseForm())
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

  return purchaseDateFormatter.format(new Date(`${value}T00:00:00`))
}

function openEditModal(item: PurchaseHistoryItem) {
  editingItemId.value = item.id
  populatePurchaseForm(editForm, item)
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
    storeName: editForm.storeName.trim() || undefined,
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
    .map(toPurchaseInput)

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
                      <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Store</th>
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
                        <td class="px-4 py-4 text-sm text-muted">{{ item.storeName || '—' }}</td>
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
      class="sm:max-w-7xl"
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
                    <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Store</th>
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
                      <UInput v-model="row.storeName" placeholder="Store name" list="store-names-datalist" autocomplete="off" />
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
      class="sm:max-w-lg"
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
              <label class="block text-sm font-medium mb-1">Store</label>
              <UInput v-model="editForm.storeName" placeholder="Store name" list="store-names-datalist" autocomplete="off" />
            </div>
          </div>
          <div>
              <label class="block text-sm font-medium mb-1">Purchase Date</label>
              <UInput v-model="editForm.purchaseDate" type="date" />
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
    <datalist id="store-names-datalist">
      <option v-for="name in uniqueStoreNames" :key="name" :value="name" />
    </datalist>
  </UContainer>
</template>
