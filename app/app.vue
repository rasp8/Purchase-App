<script setup lang="ts">
const route = useRoute()

const showShellNavigation = computed(() => route.path !== '/')
</script>

<template>
  <UApp class="min-h-screen overflow-x-hidden bg-default text-default">
    <SideNav v-if="showShellNavigation" class="hidden lg:flex" />
    <div :class="showShellNavigation ? 'lg:pl-56' : ''">
      <NuxtPage />
    </div>
    <BottomNav v-if="showShellNavigation" class="lg:hidden" />
  </UApp>
</template>
