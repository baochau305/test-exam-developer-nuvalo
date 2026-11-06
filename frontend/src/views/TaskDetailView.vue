<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import TaskForm from '@/components/TaskForm.vue'
import TaskStatusChip from '@/components/TaskStatusChip.vue'
import { useAssignees } from '@/composables/useAssignees'
import { useStore } from '@/store'

const props = defineProps<{
  id: number
}>()

const store = useStore()
const { nameOf } = useAssignees()

const task = computed(() => store.state.tasks.current)
const loading = computed(() => store.state.tasks.currentLoading)
const error = computed(() => store.state.tasks.currentError)

function loadTask() {
  return store.dispatch('tasks/fetchTask', props.id)
}

// Reload when navigating from one task to another (same component instance is reused)
watch(() => props.id, loadTask, { immediate: true })

const dialog = ref(false)
// New key on every open, so the form starts from the latest task data
const formKey = ref(0)
const snackbar = ref(false)

function openForm() {
  formKey.value++
  dialog.value = true
}

// The store already replaced `current` with the saved task
function onSaved() {
  dialog.value = false
  snackbar.value = true
}

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : '-'
}
</script>

<template>
  <v-btn variant="text" prepend-icon="mdi-arrow-left" :to="{ name: 'tasks' }" class="mb-4">
    Back to tasks
  </v-btn>

  <v-progress-linear v-if="loading" indeterminate />

  <v-alert v-else-if="error" type="error" variant="tonal" density="compact">
    {{ error }}
    <template #append>
      <v-btn variant="text" size="small" @click="loadTask">Retry</v-btn>
    </template>
  </v-alert>

  <v-card v-else-if="task" border flat>
    <v-card-title class="d-flex align-center ga-2">
      <span>{{ task.title }}</span>
      <TaskStatusChip :status="task.status" />
      <v-spacer />
      <v-btn variant="text" prepend-icon="mdi-pencil" @click="openForm">Edit</v-btn>
    </v-card-title>

    <v-card-text>
      <p class="mb-4" :class="{ 'text-medium-emphasis': !task.description }">
        {{ task.description || 'No description.' }}
      </p>

      <v-table density="compact">
        <tbody>
          <tr>
            <th class="w-25">Assignee</th>
            <td>{{ nameOf(task.assigned_to) }}</td>
          </tr>
          <tr>
            <th>Due date</th>
            <td>{{ task.due_date ?? '-' }}</td>
          </tr>
          <tr>
            <th>Created at</th>
            <td>{{ formatDateTime(task.created_at) }}</td>
          </tr>
          <tr>
            <th>Updated at</th>
            <td>{{ formatDateTime(task.updated_at) }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card-text>
  </v-card>

  <v-dialog v-model="dialog" max-width="600">
    <v-card title="Edit task">
      <v-card-text>
        <TaskForm :key="formKey" :task="task" @saved="onSaved" @cancel="dialog = false" />
      </v-card-text>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="snackbar" color="success" :timeout="3000">Task updated.</v-snackbar>
</template>
