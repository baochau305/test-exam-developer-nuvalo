<script setup lang="ts">
defineProps<{
  id: number
}>()
</script>

<template>
  <h1 class="text-h5">Task #{{ id }}</h1>
</template>
