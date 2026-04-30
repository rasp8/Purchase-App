<script setup lang="ts">
import { getSession, isSupabaseConfigured, sendMagicLink, validateCode } from '~/composables/supabase'

useHead({ title: 'Kitchen App' })

const email = ref('')
const loading = ref(false)
const pin = ref('')
const codeRequested = ref(false)
const statusMessage = ref('')

const supabaseReady = computed(() => isSupabaseConfigured())

onMounted(async () => {
  if (!supabaseReady.value) return

  const session = await getSession()
  if (session) {
    await navigateTo('/home')
  }
})

async function handleSendMagicLink() {
  loading.value = true
  try {
    const result = await sendMagicLink(email.value)
    statusMessage.value = result.message
    codeRequested.value = result.success
  } finally {
    loading.value = false
  }
}

watch(pin, async (newPin) => {
  const value = Array.isArray(newPin) ? newPin.join('') : newPin
  if (value.length === 6) {
    await handleVerificationCode()
  }
})

async function handleVerificationCode() {
  const pinCode = Array.isArray(pin.value) ? pin.value.join('') : pin.value
  const result = await validateCode(email.value, pinCode)

  if (result.session) {
    await navigateTo('/home')
    return
  }

  if (result.error) {
    statusMessage.value = result.error.message
    pin.value = ''
    codeRequested.value = false
  }
}
</script>

<template>
  <UMain>
    <UContainer class="py-16">
      <div class="mx-auto flex min-h-[70vh] max-w-5xl items-center">
        <div class="grid w-full gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <UCard class="p-8 md:p-10">
            <div class="space-y-6">
              <div class="space-y-3">
                <UBadge color="primary" variant="soft">Blank scaffold</UBadge>
                <h1 class="text-4xl font-bold tracking-tight">Kitchen-App</h1>
                <p class="text-lg text-muted">
                  This is an empty Nuxt starter derived from the Finance-App architecture, with Supabase
                  client and auth wiring kept in place for later integration.
                </p>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <UCard variant="soft" class="p-4">
                  <p class="font-semibold">Included</p>
                  <p class="text-sm text-muted">Nuxt 4, Nuxt UI, Pinia, static generation, and shared app shell.</p>
                </UCard>
                <UCard variant="soft" class="p-4">
                  <p class="font-semibold">Deferred</p>
                  <p class="text-sm text-muted">Supabase project connection, schema, and all kitchen-specific features.</p>
                </UCard>
              </div>

              <div class="flex flex-wrap gap-3">
                <UButton to="/home" color="primary">Open homepage</UButton>
                <UButton
                  to="https://nuxt.com/docs/getting-started/introduction"
                  target="_blank"
                  color="neutral"
                  variant="soft"
                >
                  Nuxt docs
                </UButton>
              </div>
            </div>
          </UCard>

          <UCard class="p-8">
            <div v-if="supabaseReady" class="space-y-5">
              <div class="space-y-2">
                <h2 class="text-2xl font-semibold">Sign in</h2>
                <p class="text-sm text-muted">Use email OTP once the Supabase project is connected.</p>
              </div>

              <div v-if="codeRequested" class="space-y-4">
                <p class="text-sm text-muted">Enter the 6-digit code sent to your email.</p>
                <UPinInput v-model="pin" :length="6" color="primary" highlight size="xl" class="w-full justify-center" />
              </div>

              <UFormField v-else label="Email">
                <UInput
                  v-model="email"
                  type="email"
                  size="xl"
                  class="w-full"
                  placeholder="name@example.com"
                  :disabled="loading"
                />
              </UFormField>

              <UButton
                v-if="!codeRequested"
                class="w-full"
                color="primary"
                size="xl"
                :loading="loading"
                @click="handleSendMagicLink"
              >
                Send verification code
              </UButton>

              <p v-if="statusMessage" class="text-sm text-muted">{{ statusMessage }}</p>
            </div>

            <div v-else class="space-y-4">
              <div class="space-y-2">
                <h2 class="text-2xl font-semibold">Supabase pending</h2>
                <p class="text-sm text-muted">
                  Add your public URL and anon key when the new Supabase project is ready.
                </p>
              </div>

              <UAlert
                color="warning"
                variant="soft"
                title="Auth is disabled until configuration is added."
                description="Set NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_ANON_KEY to enable OTP sign-in."
              />
            </div>
          </UCard>
        </div>
      </div>
    </UContainer>
  </UMain>
</template>
