<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePurchasesStore } from '~/stores/purchases'
import { UNIT_OPTIONS, UNIT_CONVERSIONS, convertQty } from '~/composables/usePurchaseUnits'

useHead({ title: 'Products | Kitchen App' })

type HistoryRange = 'all' | 'monthly' | 'yearly'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const purchasesStore = usePurchasesStore()
const { items } = storeToRefs(purchasesStore)
const { loadPurchases } = purchasesStore

const selectedProduct = ref<string>('')
const historyRange = ref<HistoryRange>('all')
const historyYear = ref(new Date().getFullYear())
const historyMonth = ref(new Date().getMonth() + 1)
const historyCompareUnit = ref<string>('each')

const rangeOptions: { label: string; value: HistoryRange }[] = [
  { label: 'All time', value: 'all' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
]

/** All unique product names sorted alphabetically. */
const uniqueProductNames = computed(() => {
  const names = new Set<string>()
  for (const item of items.value)
    if (item.productName.trim()) names.add(item.productName.trim())
  return [...names].sort((a, b) => a.localeCompare(b))
})

const productNameOptions = computed(() =>
  uniqueProductNames.value.map(n => ({ label: n, value: n })),
)

/** All entries grouped by normalised product name. */
const productPurchaseHistory = computed(() => {
  const map = new Map<string, typeof items.value>()
  for (const item of items.value) {
    const key = item.productName.trim().toLowerCase()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return map
})

const productSummaries = computed(() =>
  uniqueProductNames.value.map(name => ({ name })),
)

/** All purchases for the selected product, sorted oldest → newest. */
const selectedProductHistory = computed(() => {
  const key = selectedProduct.value.trim().toLowerCase()
  const entries = productPurchaseHistory.value.get(key) ?? []
  return [...entries].sort(
    (a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime(),
  )
})

const historyAvailableYears = computed(() => {
  const years = new Set<number>()
  for (const e of selectedProductHistory.value)
    if (e.purchaseDate) years.add(new Date(`${e.purchaseDate}T00:00:00`).getFullYear())
  return [...years].sort((a, b) => a - b)
})

const historyAvailableMonths = computed(() => {
  const months = new Set<number>()
  for (const e of selectedProductHistory.value) {
    if (!e.purchaseDate) continue
    const d = new Date(`${e.purchaseDate}T00:00:00`)
    if (d.getFullYear() === historyYear.value) months.add(d.getMonth() + 1)
  }
  return [...months].sort((a, b) => a - b)
})

const yearOptions = computed(() =>
  historyAvailableYears.value.map(y => ({ label: String(y), value: y })),
)

const monthOptions = computed(() =>
  historyAvailableMonths.value.map(m => ({ label: MONTH_NAMES[m - 1]!, value: m })),
)

const filteredProductHistory = computed(() => {
  const all = selectedProductHistory.value
  if (historyRange.value === 'yearly')
    return all.filter(e => e.purchaseDate && new Date(`${e.purchaseDate}T00:00:00`).getFullYear() === historyYear.value)
  if (historyRange.value === 'monthly')
    return all.filter(e => {
      if (!e.purchaseDate) return false
      const d = new Date(`${e.purchaseDate}T00:00:00`)
      return d.getFullYear() === historyYear.value && (d.getMonth() + 1) === historyMonth.value
    })
  return all
})

const filteredTotalQuantity = computed(() => {
  let sum = 0
  for (const item of filteredProductHistory.value) {
    const qty = parseFloat(item.quantity)
    if (isNaN(qty)) continue
    const c = convertQty(qty, item.unit || 'each', historyCompareUnit.value)
    sum += c ?? 0
  }
  return +sum.toFixed(3).replace(/\.?0+$/, '')
})

const filteredAvgQuantity = computed(() => {
  const convertible = filteredProductHistory.value.filter(item => {
    const qty = parseFloat(item.quantity)
    return !isNaN(qty) && convertQty(qty, item.unit || 'each', historyCompareUnit.value) !== null
  })
  if (convertible.length === 0) return '—'
  const total = convertible.reduce((sum, item) => {
    const qty = parseFloat(item.quantity)
    return sum + (convertQty(qty, item.unit || 'each', historyCompareUnit.value) ?? 0)
  }, 0)
  const avg = total / convertible.length
  return +avg.toFixed(3).replace(/\.?0+$/, '')
})

const historyDataUnits = computed(() => {
  const s = new Set<string>()
  for (const e of filteredProductHistory.value) s.add(e.unit || 'each')
  return [...s]
})

const historyCompareUnitOptions = computed(() => {
  const cats = new Set(historyDataUnits.value.map(u => UNIT_CONVERSIONS[u]?.category).filter(Boolean))
  return UNIT_OPTIONS.filter(opt => {
    const c = UNIT_CONVERSIONS[opt.value]
    return c && cats.has(c.category)
  })
})

const hasIncompatibleUnits = computed(() => {
  const cats = new Set(historyDataUnits.value.map(u => UNIT_CONVERSIONS[u]?.category))
  return cats.size > 1
})

const rangeLabel = computed(() => {
  if (historyRange.value === 'yearly') return String(historyYear.value)
  if (historyRange.value === 'monthly') return `${MONTH_NAMES[historyMonth.value - 1]} ${historyYear.value}`
  return 'All time'
})

const bestDeal = computed(() => {
  let best: { pricePerUnit: number; unit: string; entry: (typeof items.value)[0] } | null = null
  for (const e of filteredProductHistory.value) {
    const price = parseFloat(e.price)
    const qty = parseFloat(e.quantity)
    if (isNaN(price) || isNaN(qty) || price <= 0 || qty <= 0) continue
    const convertedQty = convertQty(qty, e.unit || 'each', historyCompareUnit.value)
    if (convertedQty === null || convertedQty <= 0) continue
    const pricePerUnit = price / convertedQty
    if (!best || pricePerUnit < best.pricePerUnit)
      best = { pricePerUnit, unit: historyCompareUnit.value, entry: e }
  }
  return best
})

function formatPrice(value: string | number | null) {
  if (value === null || value === undefined || value === '') return '—'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num)
}

function formatPurchaseDate(value: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function selectProduct(name: string) {
  selectedProduct.value = name
  historyRange.value = 'all'
  const key = name.toLowerCase()
  const entries = productPurchaseHistory.value.get(key) ?? []
  const latestYear = entries.reduce((max, e) => {
    const y = e.purchaseDate ? new Date(`${e.purchaseDate}T00:00:00`).getFullYear() : 0
    return y > max ? y : max
  }, new Date().getFullYear())
  historyYear.value = latestYear
  historyMonth.value = new Date().getMonth() + 1
  const unitCounts = new Map<string, number>()
  for (const e of entries) {
    const u = e.unit || 'each'
    unitCounts.set(u, (unitCounts.get(u) ?? 0) + 1)
  }
  historyCompareUnit.value = [...unitCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'each'
}

// When the select changes, re-init the defaults
watch(selectedProduct, (name) => {
  if (name) selectProduct(name)
})

onMounted(async () => {
  try {
    await loadPurchases()
  } catch (error) {
    console.warn('Failed to load product history:', error)
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
          <h1 class="text-3xl font-bold tracking-tight">Products</h1>
          <p class="mt-2 max-w-2xl text-muted">Browse purchase trends and stats for each product.</p>
        </div>
        <UColorModeSwitch />
      </div>

      <!-- Product filter -->
      <div class="flex items-center gap-3">
        <USelect
          v-model="selectedProduct"
          :items="productNameOptions"
          value-key="value"
          label-key="label"
          placeholder="Filter by product…"
          class="w-64"
        />
        <UButton
          v-if="selectedProduct"
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          @click="selectedProduct = ''"
        >
          Clear
        </UButton>
      </div>

      <!-- Overview: all products -->
      <div v-if="!selectedProduct">
        <div v-if="productSummaries.length === 0" class="text-sm text-muted">
          No products found. Add some purchases on the Purchase History page.
        </div>
        <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <UCard
            v-for="p in productSummaries"
            :key="p.name"
            class="p-5 cursor-pointer hover:ring-2 hover:ring-primary/40 transition-shadow"
            @click="selectProduct(p.name)"
          >
            <p class="font-semibold text-base">{{ p.name }}</p>
            <div class="mt-3">
              <UButton size="xs" color="primary" variant="soft" icon="i-lucide-chart-line">
                View stats
              </UButton>
            </div>
          </UCard>
        </div>
      </div>

      <!-- Detail: selected product stats -->
      <div v-else class="space-y-5">
        <div class="flex items-center gap-2">
          <h2 class="text-xl font-semibold">{{ selectedProduct }}</h2>
          <UBadge color="primary" variant="soft">{{ selectedProductHistory.length }} purchase{{ selectedProductHistory.length !== 1 ? 's' : '' }}</UBadge>
        </div>

        <!-- Range toggle -->
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex items-center gap-1 rounded-lg border border-default bg-elevated/40 p-1">
            <UButton
              v-for="opt in rangeOptions"
              :key="opt.value"
              size="sm"
              :color="historyRange === opt.value ? 'primary' : 'neutral'"
              :variant="historyRange === opt.value ? 'solid' : 'ghost'"
              @click="historyRange = opt.value"
            >
              {{ opt.label }}
            </UButton>
          </div>

          <USelect
            v-if="historyRange !== 'all'"
            v-model="historyYear"
            :items="yearOptions"
            value-key="value"
            label-key="label"
            placeholder="Year"
            class="w-28"
          />

          <USelect
            v-if="historyRange === 'monthly'"
            v-model="historyMonth"
            :items="monthOptions"
            value-key="value"
            label-key="label"
            placeholder="Month"
            class="w-36"
          />
        </div>

        <!-- Compare unit selector -->
        <div v-if="filteredProductHistory.length > 0" class="flex flex-wrap items-center gap-3">
          <span class="text-sm text-muted font-medium whitespace-nowrap">Compare in:</span>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="opt in historyCompareUnitOptions"
              :key="opt.value"
              size="xs"
              :color="historyCompareUnit === opt.value ? 'primary' : 'neutral'"
              :variant="historyCompareUnit === opt.value ? 'solid' : 'outline'"
              @click="historyCompareUnit = opt.value"
            >
              {{ opt.label }}
            </UButton>
          </div>
        </div>

        <!-- Incompatible units warning -->
        <UAlert
          v-if="hasIncompatibleUnits"
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="Mixed unit types"
          description="Some purchases use incompatible units. Entries that can't be converted to the selected unit are excluded from calculations."
        />

        <!-- Stats cards -->
        <div class="grid grid-cols-3 gap-3">
          <UCard variant="soft" class="p-4">
            <p class="text-xs text-muted">Purchases</p>
            <p class="mt-1 text-2xl font-semibold">{{ filteredProductHistory.length }}</p>
            <p class="mt-0.5 text-xs text-muted">{{ rangeLabel }}</p>
          </UCard>
          <UCard variant="soft" class="p-4">
            <p class="text-xs text-muted">Total qty</p>
            <p class="mt-1 text-2xl font-semibold">{{ filteredTotalQuantity }} <span class="text-sm font-normal text-muted">{{ historyCompareUnit }}</span></p>
            <p class="mt-0.5 text-xs text-muted">{{ rangeLabel }}</p>
          </UCard>
          <UCard variant="soft" class="p-4">
            <p class="text-xs text-muted">Avg per purchase</p>
            <p class="mt-1 text-2xl font-semibold">{{ filteredAvgQuantity }} <span class="text-sm font-normal text-muted">{{ historyCompareUnit }}</span></p>
            <p class="mt-0.5 text-xs text-muted">{{ rangeLabel }}</p>
          </UCard>
        </div>

        <!-- Best deal -->
        <UCard variant="soft" class="p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-muted">Best deal</p>
              <p class="mt-1 text-2xl font-semibold text-primary">
                {{ bestDeal ? formatPrice(bestDeal.pricePerUnit) + ' / ' + bestDeal.unit : '—' }}
              </p>
              <p class="mt-0.5 text-xs text-muted">Lowest price per unit — {{ rangeLabel }}</p>
            </div>
            <UIcon name="i-lucide-tag" class="text-primary opacity-40 text-4xl" />
          </div>
        </UCard>

        <!-- Purchase table -->
        <div class="overflow-hidden rounded-xl border border-default">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-default">
              <thead class="bg-elevated/50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">#</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Purchase Date</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Qty / Unit</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Price</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Price / Unit</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Notes</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default bg-default">
                <tr
                  v-for="(entry, index) in filteredProductHistory"
                  :key="entry.id"
                  :class="bestDeal && entry.id === bestDeal.entry.id ? 'bg-primary/5' : ''"
                >
                  <td class="px-4 py-3 text-sm text-muted">{{ index + 1 }}</td>
                  <td class="px-4 py-3 text-sm font-medium">{{ formatPurchaseDate(entry.purchaseDate) }}</td>
                  <td class="px-4 py-3 text-sm text-muted">{{ entry.quantity }} {{ entry.unit }}</td>
                  <td class="px-4 py-3 text-sm font-medium">{{ formatPrice(entry.price) }}</td>
                  <td class="px-4 py-3 text-sm font-medium" :class="bestDeal && entry.id === bestDeal.entry.id ? 'text-primary' : ''">
                    {{
                      (() => {
                        const price = parseFloat(entry.price)
                        const qty = parseFloat(entry.quantity)
                        if (isNaN(price) || isNaN(qty) || price <= 0 || qty <= 0) return '—'
                        const converted = convertQty(qty, entry.unit || 'each', historyCompareUnit)
                        if (converted === null || converted <= 0) return '—'
                        return formatPrice(price / converted) + ' / ' + historyCompareUnit
                      })()
                    }}
                    <UBadge v-if="bestDeal && entry.id === bestDeal.entry.id" color="primary" variant="soft" size="sm" class="ml-1">Best deal</UBadge>
                  </td>
                  <td class="px-4 py-3 text-sm">
                    <UPopover v-if="entry.notes" mode="hover">
                      <UButton icon="i-lucide-sticky-note" color="neutral" variant="ghost" size="xs" aria-label="View note" />
                      <template #content>
                        <div class="p-3 max-w-xs text-sm">{{ entry.notes }}</div>
                      </template>
                    </UPopover>
                  </td>
                </tr>
                <tr v-if="filteredProductHistory.length === 0">
                  <td colspan="6" class="px-4 py-8 text-center text-sm text-muted">
                    No purchases found for <span class="font-medium">{{ rangeLabel }}</span>.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p class="text-xs text-muted text-right">
          Showing {{ filteredProductHistory.length }} of {{ selectedProductHistory.length }} total purchases
        </p>
      </div>
    </div>
  </UContainer>
</template>
