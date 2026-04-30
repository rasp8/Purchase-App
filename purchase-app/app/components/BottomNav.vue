<template>
  <nav class="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 pb-safe">
    <div class="flex items-center justify-center h-16 px-4">
      <NuxtLink
        v-for="item in navigation"
        :key="item.label"
        :to="item.to"
        class="flex min-w-32 items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-gray-500"
        active-class="text-primary-500"
      >
        <span>{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
const navigation = [{ label: 'Purchase History', to: '/home' }, { label: 'Products', to: '/products' }, { label: 'Shopping List', to: '/shopping-list' }]
</script>
