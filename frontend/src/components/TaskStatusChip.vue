<script setup lang="ts">
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '@/constants/taskStatus'
import type { TaskStatus } from '@/types/task'

defineProps<{
  status: TaskStatus
}>()
</script>

<template>
  <v-chip :color="TASK_STATUS_COLORS[status]" size="small" label>
    {{ TASK_STATUS_LABELS[status] }}
  </v-chip>
</template>
