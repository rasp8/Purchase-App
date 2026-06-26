<script setup lang="ts">
import { getSession, isSupabaseConfigured, validateCode } from '~/composables/supabase'

useHead({ title: 'Login | Purchase App' })

const email = ref('')
const loading = ref(false)
const pin = ref('')
const codeRequested = ref(false)
const statusMessage = ref('')
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const supabaseReady = computed(() => isSupabaseConfigured())

onMounted(async () => {
  if (!supabaseReady.value) return

  const session = await getSession()
  if (session) {
    await navigateTo('/purchase-history')
  }
})

async function handleSendVerificationCode() {
  const normalizedEmail = email.value.trim().toLowerCase()

  if (!emailPattern.test(normalizedEmail)) {
    statusMessage.value = 'Please enter a valid email address.'
    return
  }

  if (!supabaseReady.value) {
    statusMessage.value = 'Supabase is not configured yet. Add the environment variables to enable login.'
    return
  }

  loading.value = true
  try {
    await $fetch('/api/auth/send-code', {
      method: 'POST',
      body: { email: normalizedEmail },
    })

    email.value = normalizedEmail
    codeRequested.value = true
    statusMessage.value = 'Verification code sent. Check your email.'
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send a verification code right now.'
    statusMessage.value = message
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
    await navigateTo('/purchase-history')
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
    <UContainer>
      <div class="flex flex-col items-center justify-center pt-25 space-y-8">

        <div v-if="codeRequested">
          <div class="text-center pb-10">
            <h1 class="text-4xl font-bold mb-4">Check your email</h1>
            <p class="text-lg text-gray-400">Enter the 6-digit code below to sign in.</p>
            <p v-if="statusMessage" class="text-sm text-yellow-400 mt-2">{{ statusMessage }}</p>
          </div>
          <UPinInput v-model="pin" :length="6" color="primary" type="number" highlight size="xl" class="mt-4 w-full justify-center" />
        </div>

        <div v-else>
          <div class="text-center pb-10">
            <h1 class="text-4xl font-bold mb-4">Welcome!</h1>
            <p class="text-lg text-gray-400">Enter your email to get started.</p>
          </div>
          <UCard class="w-full max-w-md p-8">
            <UFormField class="text-lg font-semibold mb-4" required>
              <UInput
                type="email"
                variant="soft"
                size="xl"
                class="w-full"
                color="neutral"
                placeholder="Enter your email..."
                v-model="email"
                :disabled="loading"
              />
              <UButton
                class="mt-4 w-full"
                color="primary"
                :loading="loading"
                @click="handleSendVerificationCode"
              >
                Send verification code
              </UButton>
            </UFormField>
            <p v-if="statusMessage" class="text-sm text-muted mt-2">{{ statusMessage }}</p>
          </UCard>
        </div>

      </div>
    </UContainer>
  </UMain>
</template>
