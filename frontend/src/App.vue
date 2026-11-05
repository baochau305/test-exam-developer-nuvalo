<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import BlankLayout from '@/layouts/BlankLayout.vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

const route = useRoute()

const layout = computed(() => (route.meta.layout === 'blank' ? BlankLayout : DefaultLayout))
</script>

<template>
  <v-app>
    <component :is="layout">
      <RouterView />
    </component>
  </v-app>
</template>
