<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePurchasesStore } from '~/stores/purchases'
import { UNIT_OPTIONS, UNIT_CONVERSIONS } from '~/composables/usePurchaseUnits'
import { getSupabase } from '~/composables/useSupabase'
import type { SavedShoppingList, ShoppingListItem, ShoppingListSortMode } from '~/types/shopping-list'

useHead({ title: 'Shopping List | Kitchen App' })

const purchasesStore = usePurchasesStore()
const { items } = storeToRefs(purchasesStore)
const { loadPurchases, createPurchases } = purchasesStore

// ── types ─────────────────────────────────────────────────────────────────────

type ShoppingRow = ShoppingListItem

// ── state ─────────────────────────────────────────────────────────────────────

let nextRowId = 1
const STORAGE_KEY = 'purchase-app.shopping-lists.v1'

function createEmptyRow(): ShoppingRow {
  return { id: nextRowId++, productName: '', quantity: '', unit: 'each', cost: '', storeName: '', notes: '', checked: false }
}

function hasRowContent(row: ShoppingRow) {
  return Boolean(
    row.productName.trim()
    || String(row.quantity).trim()
    || String(row.cost).trim()
    || row.storeName.trim()
    || row.notes.trim(),
  )
}

const savedLists = ref<SavedShoppingList[]>([])
const activeListId = ref<string | null>(null)
const shoppingList = ref<ShoppingRow[]>([])
const sortMode = ref<ShoppingListSortMode>('manual')
const draggedRowId = ref<number | null>(null)
const dragOverRowId = ref<number | null>(null)
const newListName = ref('')
const renameListId = ref<string | null>(null)
const renameListName = ref('')
const storageReady = ref(false)
const sortOptions = [
  { label: 'Manual order', value: 'manual' },
  { label: 'Store: A to Z', value: 'store-asc' },
  { label: 'Store: Z to A', value: 'store-desc' },
]

const activeList = computed(() =>
  savedLists.value.find(list => list.id === activeListId.value) ?? null,
)

function createListId() {
  return globalThis.crypto?.randomUUID?.() ?? `list-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeSavedLists(value: unknown): SavedShoppingList[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return []
    const list = candidate as Partial<SavedShoppingList>
    if (typeof list.id !== 'string' || typeof list.name !== 'string' || !Array.isArray(list.items)) return []

    const items = list.items.flatMap((candidateItem) => {
      if (!candidateItem || typeof candidateItem !== 'object') return []
      const item = candidateItem as Partial<ShoppingListItem>
      if (typeof item.id !== 'number' || typeof item.productName !== 'string') return []

      return [{
        id: item.id,
        productName: item.productName,
        quantity: typeof item.quantity === 'string' || typeof item.quantity === 'number' ? item.quantity : '',
        unit: typeof item.unit === 'string' ? item.unit : 'each',
        cost: typeof item.cost === 'string' || typeof item.cost === 'number' ? item.cost : '',
        storeName: typeof item.storeName === 'string' ? item.storeName : '',
        notes: typeof item.notes === 'string' ? item.notes : '',
        checked: item.checked === true,
      }]
    })
    const now = new Date().toISOString()
    const validSortModes: ShoppingListSortMode[] = ['manual', 'store-asc', 'store-desc']

    return [{
      id: list.id,
      name: list.name.trim() || 'Untitled list',
      createdAt: typeof list.createdAt === 'string' ? list.createdAt : now,
      updatedAt: typeof list.updatedAt === 'string' ? list.updatedAt : now,
      sortMode: validSortModes.includes(list.sortMode as ShoppingListSortMode)
        ? list.sortMode as ShoppingListSortMode
        : 'manual',
      items,
    }]
  })
}

function persistSavedLists() {
  if (!import.meta.client || !storageReady.value) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, lists: savedLists.value }))
  } catch (error) {
    console.warn('Unable to save shopping lists locally:', error)
  }
}

function loadSavedLists() {
  if (!import.meta.client) return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { lists?: unknown }
      savedLists.value = normalizeSavedLists(parsed.lists)
    }
  } catch (error) {
    console.warn('Unable to restore saved shopping lists:', error)
  } finally {
    nextRowId = Math.max(0, ...savedLists.value.flatMap(list => list.items.map(item => item.id))) + 1
    storageReady.value = true
  }
}

function createSavedList() {
  const name = newListName.value.trim() || `Shopping List ${savedLists.value.length + 1}`
  const now = new Date().toISOString()
  const list: SavedShoppingList = {
    id: createListId(),
    name,
    createdAt: now,
    updatedAt: now,
    sortMode: 'manual',
    items: [],
  }
  savedLists.value.unshift(list)
  newListName.value = ''
  persistSavedLists()
  openSavedList(list.id)
}

function openSavedList(listId: string) {
  const list = savedLists.value.find(candidate => candidate.id === listId)
  if (!list) return

  activeListId.value = list.id
  sortMode.value = list.sortMode
  const rows = list.items.map(item => ({ ...item }))
  shoppingList.value = rows.length > 0
    ? [...rows, createEmptyRow()]
    : [createEmptyRow(), createEmptyRow()]
}

function closeSavedList() {
  saveActiveList()
  activeListId.value = null
  shoppingList.value = []
  endDrag()
}

function saveActiveList() {
  const list = activeList.value
  if (!list || shoppingList.value.length === 0) return

  list.items = shoppingList.value
    .slice(0, -1)
    .filter(hasRowContent)
    .map(row => ({ ...row }))
  list.sortMode = sortMode.value
  list.updatedAt = new Date().toISOString()
  persistSavedLists()
}

function duplicateSavedList(list: SavedShoppingList) {
  const now = new Date().toISOString()
  savedLists.value.unshift({
    ...list,
    id: createListId(),
    name: `${list.name} copy`,
    createdAt: now,
    updatedAt: now,
    items: list.items.map(item => ({ ...item, id: nextRowId++ })),
  })
  persistSavedLists()
}

function startRenamingList(list: SavedShoppingList) {
  renameListId.value = list.id
  renameListName.value = list.name
}

function finishRenamingList() {
  const list = savedLists.value.find(candidate => candidate.id === renameListId.value)
  const name = renameListName.value.trim()
  if (list && name) {
    list.name = name
    list.updatedAt = new Date().toISOString()
    persistSavedLists()
  }
  renameListId.value = null
  renameListName.value = ''
}

function deleteSavedList(list: SavedShoppingList) {
  if (!window.confirm(`Delete "${list.name}"? This cannot be undone.`)) return
  savedLists.value = savedLists.value.filter(candidate => candidate.id !== list.id)
  persistSavedLists()
}

function remainingItemCount(list: SavedShoppingList) {
  return list.items.filter(item => !item.checked).length
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .format(new Date(value))
}

// Ensure there is always exactly one trailing ghost (empty) row
watch(
  shoppingList,
  () => {
    const last = shoppingList.value[shoppingList.value.length - 1]
    if (last && hasRowContent(last)) {
      shoppingList.value.push(createEmptyRow())
    }
  },
  { deep: true },
)

watch(
  [shoppingList, sortMode],
  () => saveActiveList(),
  { deep: true, flush: 'post' },
)

watch(sortMode, (mode) => {
  if (mode === 'manual') return

  const ghostRow = shoppingList.value.at(-1)
  if (!ghostRow) return

  const sortedRows = shoppingList.value.slice(0, -1)
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const aStore = a.row.storeName.trim()
      const bStore = b.row.storeName.trim()

      // Keep rows without a store at the end in either direction.
      if (!aStore && !bStore) return a.index - b.index
      if (!aStore) return 1
      if (!bStore) return -1

      const comparison = aStore.localeCompare(bStore, undefined, { sensitivity: 'base' })
      return comparison === 0
        ? a.index - b.index
        : mode === 'store-asc' ? comparison : -comparison
    })
    .map(({ row }) => row)

  shoppingList.value = [...sortedRows, ghostRow]
})

function onDragStart(event: DragEvent, rowId: number) {
  draggedRowId.value = rowId
  event.dataTransfer?.setData('text/plain', String(rowId))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onDragOver(event: DragEvent, rowId: number) {
  event.preventDefault()
  dragOverRowId.value = rowId
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

function onDrop(targetRowId: number) {
  const sourceRowId = draggedRowId.value
  if (sourceRowId === null || sourceRowId === targetRowId) {
    endDrag()
    return
  }

  const ghostRow = shoppingList.value.at(-1)
  if (!ghostRow) return

  const realRows = shoppingList.value.slice(0, -1)
  const sourceIndex = realRows.findIndex(row => row.id === sourceRowId)
  const targetIndex = realRows.findIndex(row => row.id === targetRowId)
  if (sourceIndex === -1 || targetIndex === -1) {
    endDrag()
    return
  }

  const [movedRow] = realRows.splice(sourceIndex, 1)
  if (!movedRow) return
  realRows.splice(targetIndex, 0, movedRow)
  shoppingList.value = [...realRows, ghostRow]
  sortMode.value = 'manual'
  endDrag()
}

function endDrag() {
  draggedRowId.value = null
  dragOverRowId.value = null
}

// ── product helpers ───────────────────────────────────────────────────────────

/** Unique product names from purchase history, alphabetically sorted. */
const uniqueProductNames = computed(() => {
  const names = new Set<string>()
  for (const item of items.value) names.add(item.productName.trim())
  for (const list of savedLists.value) {
    for (const item of list.items) {
      if (item.productName.trim()) names.add(item.productName.trim())
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b))
})

/** History names, excluding products already present in the real rows. */
const datalistNames = computed(() => {
  const used = new Set(
    shoppingList.value
      .slice(0, -1)
      .map(r => r.productName.trim().toLowerCase())
      .filter(Boolean),
  )
  return uniqueProductNames.value.filter(n => !used.has(n.toLowerCase()))
})

/** Unique store names from purchase history, alphabetically sorted. */
const storeNames = computed(() => {
  const names = new Map<string, string>()
  for (const item of items.value) {
    const name = item.storeName?.trim()
    if (name && !names.has(name.toLowerCase())) names.set(name.toLowerCase(), name)
  }
  for (const list of savedLists.value) {
    for (const item of list.items) {
      const name = item.storeName.trim()
      if (name && !names.has(name.toLowerCase())) names.set(name.toLowerCase(), name)
    }
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b))
})

/** Units compatible with a product's purchase history. Falls back to all units. */
function getCompatibleUnits(name: string) {
  const history = items.value.filter(
    i => i.productName.trim().toLowerCase() === name.trim().toLowerCase(),
  )
  if (history.length === 0) return UNIT_OPTIONS
  const cats = new Set(
    history.map(e => UNIT_CONVERSIONS[e.unit || 'each']?.category).filter(Boolean),
  )
  return UNIT_OPTIONS.filter(opt => {
    const c = UNIT_CONVERSIONS[opt.value]
    return c && cats.has(c.category)
  })
}

// ── check-off & record purchase ───────────────────────────────────────────────

const toast = useToast()

async function onRowChecked(row: ShoppingRow, checked: boolean) {
  row.checked = checked
  if (!checked || !row.productName.trim()) return

  const { data: { session } } = await getSupabase().auth.getSession()
  if (!session) {
    toast.add({ title: `“${row.productName.trim()}” checked off`, color: 'success', duration: 2500 })
    return
  }

  const today = new Date().toISOString().split('T')[0]  // YYYY-MM-DD

  const newEntry = {
    productName:  row.productName.trim(),
    quantity:     String(row.quantity).trim() || '1',
    unit:         row.unit || 'each',
    price:        String(row.cost).trim() || '',
    storeName:    row.storeName.trim() || undefined,
    purchaseDate: today,
    notes:        row.notes.trim() || undefined,
  }

  try {
    await createPurchases([newEntry])
    toast.add({ title: `✓ "${newEntry.productName}" added to purchase list`, color: 'success', duration: 4000 })
  } catch (error) {
    row.checked = false
    toast.add({
      title: 'Unable to add purchase',
      description: error instanceof Error ? error.message : 'Please try again.',
      color: 'error',
      duration: 4000,
    })
  }
}

function removeRow(id: number) {
  // Keep at least one real row; reset it instead of removing
  const realRows = shoppingList.value.slice(0, -1)
  if (realRows.length <= 1 && realRows[0]?.id === id) {
    const row = shoppingList.value.find(r => r.id === id)
    if (row) Object.assign(row, {
      productName: '',
      quantity: '',
      unit: 'each',
      cost: '',
      storeName: '',
      notes: '',
      checked: false,
    })
    return
  }
  shoppingList.value = shoppingList.value.filter(r => r.id !== id)
}

function clearList() {
  sortMode.value = 'manual'
  shoppingList.value = [createEmptyRow(), createEmptyRow()]
}

// ── totals ────────────────────────────────────────────────────────────────────

/** Sum of est. costs for unchecked real rows. */
const grandTotal = computed(() => {
  let total = 0
  let hasAny = false
  for (const row of shoppingList.value.slice(0, -1)) {
    if (row.checked) continue
    const c = parseFloat(row.cost)
    if (!isNaN(c) && c > 0) { total += c; hasAny = true }
  }
  return hasAny ? total : null
})

function fmt(v: number | null): string {
  if (v === null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)
}

onMounted(async () => {
  loadSavedLists()

  try {
    const { data: { session } } = await getSupabase().auth.getSession()
    if (session) await loadPurchases()
  } catch (error) {
    console.warn('Failed to load shopping history:', error)
  }
})
</script>
<template>
  <UContainer class="py-8 lg:py-10">
    <div class="space-y-6">

      <!-- Header -->
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="text-sm font-medium text-primary">Kitchen-App</p>
          <h1 class="text-3xl font-bold tracking-tight">{{ activeList?.name ?? 'Shopping Lists' }}</h1>
          <p class="mt-2 max-w-2xl text-muted">
            {{ activeList
              ? 'Changes are saved automatically in this browser.'
              : 'Choose a saved list to continue, or create a new one.'
            }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            v-if="activeList"
            color="neutral"
            variant="soft"
            icon="i-lucide-arrow-left"
            @click="closeSavedList"
          >
            My lists
          </UButton>
          <UColorModeSwitch />
        </div>
      </div>

      <template v-if="!activeList">
        <UCard class="p-5">
          <form class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="createSavedList">
            <div class="flex-1">
              <label class="mb-1 block text-sm font-medium">New list name</label>
              <UInput
                v-model="newListName"
                placeholder="Weekly groceries"
                autocomplete="off"
                class="w-full"
              />
            </div>
            <UButton type="submit" icon="i-lucide-plus">
              Create list
            </UButton>
          </form>
        </UCard>

        <div v-if="savedLists.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <UCard v-for="list in savedLists" :key="list.id" class="p-5">
            <div class="space-y-4">
              <form
                v-if="renameListId === list.id"
                class="flex items-center gap-2"
                @submit.prevent="finishRenamingList"
              >
                <UInput v-model="renameListName" autofocus class="flex-1" />
                <UButton type="submit" size="sm" icon="i-lucide-check" aria-label="Save list name" />
                <UButton
                  type="button"
                  size="sm"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-x"
                  aria-label="Cancel renaming"
                  @click="renameListId = null"
                />
              </form>
              <div v-else>
                <h2 class="text-lg font-semibold">{{ list.name }}</h2>
                <p class="mt-1 text-sm text-muted">
                  {{ remainingItemCount(list) }} remaining · Updated {{ formatUpdatedAt(list.updatedAt) }}
                </p>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <UButton class="flex-1" icon="i-lucide-list-checks" @click="openSavedList(list.id)">
                  Open
                </UButton>
                <UButton
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-pencil"
                  aria-label="Rename list"
                  @click="startRenamingList(list)"
                />
                <UButton
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-copy"
                  aria-label="Duplicate list"
                  @click="duplicateSavedList(list)"
                />
                <UButton
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  aria-label="Delete list"
                  @click="deleteSavedList(list)"
                />
              </div>
            </div>
          </UCard>
        </div>

        <UCard v-else class="p-10 text-center">
          <UIcon name="i-lucide-list-plus" class="mx-auto size-10 text-muted" />
          <h2 class="mt-3 text-lg font-semibold">No saved lists yet</h2>
          <p class="mt-1 text-sm text-muted">Create your first list above. It will save automatically as you work.</p>
        </UCard>
      </template>

      <template v-else>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p class="text-sm text-muted">
          Drag rows by the grip to arrange them manually.
        </p>
        <div class="w-full sm:w-48">
          <label class="mb-1 block text-sm font-medium">Sort shopping list</label>
          <USelect
            v-model="sortMode"
            :items="sortOptions"
            value-key="value"
            label-key="label"
          />
        </div>
      </div>

      <!-- Fillable table -->
      <div class="overflow-hidden rounded-xl border border-default">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-default">
            <thead class="bg-elevated/50">
              <tr>
                <th class="px-4 py-3 w-20" />
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Product</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Quantity</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Unit</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Est. Cost</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Store</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Notes</th>
                <th class="px-4 py-3 w-12" />
              </tr>
            </thead>

            <tbody class="divide-y divide-default bg-default">
              <tr
                v-for="(row, index) in shoppingList"
                :key="row.id"
                :class="[
                  index === shoppingList.length - 1
                    ? 'opacity-40'
                    : row.checked ? 'opacity-40' : '',
                  draggedRowId === row.id ? 'opacity-25' : '',
                  dragOverRowId === row.id && draggedRowId !== row.id ? 'ring-2 ring-inset ring-primary' : '',
                ]"
                @dragover="index !== shoppingList.length - 1 && onDragOver($event, row.id)"
                @drop.prevent="index !== shoppingList.length - 1 && onDrop(row.id)"
              >
                <!-- Drag handle and checkbox (hidden on ghost row) -->
                <td class="px-4 py-3 text-center">
                  <div v-if="index !== shoppingList.length - 1" class="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      draggable="true"
                      class="cursor-grab text-muted hover:text-default active:cursor-grabbing"
                      aria-label="Drag to rearrange row"
                      title="Drag to rearrange"
                      @dragstart="onDragStart($event, row.id)"
                      @dragend="endDrag"
                    >
                      <UIcon name="i-lucide-grip-vertical" class="size-5" />
                    </button>
                    <input
                      type="checkbox"
                      :checked="row.checked"
                      class="w-4 h-4 cursor-pointer accent-primary"
                      @change="onRowChecked(row, ($event.target as HTMLInputElement).checked)"
                    />
                  </div>
                </td>

                <!-- Product name with datalist suggestions -->
                <td class="px-4 py-3">
                  <UInput
                    v-model="row.productName"
                    list="sl-product-datalist"
                    autocomplete="off"
                    placeholder="Product name…"
                    :class="[row.checked ? 'line-through' : '', 'w-44']"
                  />
                  <datalist id="sl-product-datalist">
                    <option v-for="name in datalistNames" :key="name" :value="name" />
                  </datalist>
                </td>

                <!-- Quantity -->
                <td class="px-4 py-3">
                  <UInput
                    v-model="row.quantity"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Qty"
                    class="w-24"
                  />
                </td>

                <!-- Unit -->
                <td class="px-4 py-3">
                  <USelect
                    v-model="row.unit"
                    :items="getCompatibleUnits(row.productName)"
                    value-key="value"
                    label-key="label"
                    class="w-36"
                  />
                </td>

                <!-- Est. Cost (manual) -->
                <td class="px-4 py-3">
                  <UInput
                    v-model="row.cost"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="$0.00"
                    class="w-28"
                  />
                </td>

                <!-- Store name with saved-history suggestions -->
                <td class="px-4 py-3">
                  <UInput
                    v-model="row.storeName"
                    list="sl-store-datalist"
                    autocomplete="off"
                    placeholder="Store name…"
                    class="w-40"
                  />
                </td>

                <!-- Notes -->
                <td class="px-4 py-3">
                  <UInput
                    v-model="row.notes"
                    placeholder="Optional note…"
                    class="w-44"
                  />
                </td>

                <!-- Delete (hidden on ghost row) -->
                <td class="px-4 py-3 text-right">
                  <UButton
                    v-if="index !== shoppingList.length - 1"
                    color="error"
                    variant="ghost"
                    icon="i-lucide-trash-2"
                    size="sm"
                    @click="removeRow(row.id)"
                  />
                </td>
              </tr>
            </tbody>

            <!-- Total row -->
            <tfoot class="border-t-2 border-default bg-elevated/50">
              <tr>
                <td colspan="6" class="px-4 py-3 text-sm font-semibold text-right">
                  Remaining estimated spend
                </td>
                <td class="px-4 py-3 text-base font-bold text-primary">
                  {{ fmt(grandTotal) }}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Footer: clear -->
      <div class="flex items-center justify-end">
        <UButton color="neutral" variant="soft" icon="i-lucide-trash-2" @click="clearList">
          Clear list
        </UButton>
      </div>

      <datalist id="sl-store-datalist">
        <option v-for="name in storeNames" :key="name" :value="name" />
      </datalist>
      </template>

    </div>
  </UContainer>
</template>
