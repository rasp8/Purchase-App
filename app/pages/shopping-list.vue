<script setup lang="ts">
import {
  useKitchenStore,
  UNIT_OPTIONS,
  UNIT_CONVERSIONS,
} from '~/composables/useKitchenStore'

useHead({ title: 'Shopping List | Kitchen App' })

const { items } = useKitchenStore()

// ── types ─────────────────────────────────────────────────────────────────────

type ShoppingRow = {
  id: number
  productName: string
  quantity: string | number
  unit: string
  cost: string | number
  notes: string
  checked: boolean
}

// ── state ─────────────────────────────────────────────────────────────────────

let nextRowId = 1

function createEmptyRow(): ShoppingRow {
  return { id: nextRowId++, productName: '', quantity: '', unit: 'each', cost: '', notes: '', checked: false }
}

const shoppingList = ref<ShoppingRow[]>([createEmptyRow(), createEmptyRow()])

// Ensure there is always exactly one trailing ghost (empty) row
watch(
  shoppingList,
  () => {
    const last = shoppingList.value[shoppingList.value.length - 1]
    if (last && last.productName.trim()) {
      shoppingList.value.push(createEmptyRow())
    }
  },
  { deep: true },
)

// ── product helpers ───────────────────────────────────────────────────────────

/** Unique product names from purchase history, alphabetically sorted. */
const uniqueProductNames = computed(() => {
  const names = new Set<string>()
  for (const item of items.value) names.add(item.productName.trim())
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

function onRowChecked(row: ShoppingRow, checked: boolean) {
  row.checked = checked
  if (!checked || !row.productName.trim()) return

  const today = new Date().toISOString().split('T')[0]  // YYYY-MM-DD

  const newEntry = {
    id:           `PRD-${Date.now()}`,
    productName:  row.productName.trim(),
    quantity:     String(row.quantity).trim() || '1',
    unit:         row.unit || 'each',
    price:        String(row.cost).trim() || '',
    purchaseDate: today,
    notes:        row.notes.trim() || undefined,
  }

  items.value = [newEntry, ...items.value]

  // Explicitly persist to localStorage as a failsafe for hard-navigation scenarios
  localStorage.setItem('kitchen-items', JSON.stringify(items.value))

  toast.add({ title: `✓ "${newEntry.productName}" added to purchase list`, color: 'success', duration: 4000 })
}

function removeRow(id: number) {
  // Keep at least one real row; reset it instead of removing
  const realRows = shoppingList.value.slice(0, -1)
  if (realRows.length <= 1 && realRows[0]?.id === id) {
    const row = shoppingList.value.find(r => r.id === id)
    if (row) Object.assign(row, { productName: '', quantity: '', cost: '' })
    return
  }
  shoppingList.value = shoppingList.value.filter(r => r.id !== id)
}

function clearList() {
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
</script>

<template>
  <UContainer class="py-8 lg:py-10">
    <div class="space-y-6">

      <!-- Header -->
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="text-sm font-medium text-primary">Kitchen-App</p>
          <h1 class="text-3xl font-bold tracking-tight">Shopping List</h1>
          <p class="mt-2 max-w-2xl text-muted">
            Fill in what you need. Product names from your purchase history will auto-suggest.
          </p>
        </div>
        <UColorModeSwitch />
      </div>

      <!-- Fillable table -->
      <div class="overflow-hidden rounded-xl border border-default">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-default">
            <thead class="bg-elevated/50">
              <tr>
                <th class="px-4 py-3 w-10" />
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Product</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Quantity</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Unit</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Est. Cost</th>
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
                ]"
              >
                <!-- Checkbox (hidden on ghost row) -->
                <td class="px-4 py-3 text-center">
                  <input
                    v-if="index !== shoppingList.length - 1"
                    type="checkbox"
                    :checked="row.checked"
                    class="w-4 h-4 cursor-pointer accent-primary"
                    @change="onRowChecked(row, ($event.target as HTMLInputElement).checked)"
                  />
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
                <td colspan="5" class="px-4 py-3 text-sm font-semibold text-right">
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

    </div>
  </UContainer>
</template>
