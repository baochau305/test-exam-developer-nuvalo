<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { DataTableHeader } from 'vuetify'

import type { TaskListParams } from '@/api/tasks'
import TaskForm from '@/components/TaskForm.vue'
import TaskStatusChip from '@/components/TaskStatusChip.vue'
import { TASK_STATUS_OPTIONS } from '@/constants/taskStatus'
import { useStore } from '@/store'
import type { Task, TaskStatus } from '@/types/task'

const store = useStore()

const headers: DataTableHeader<Task>[] = [
  { title: 'Title', key: 'title', sortable: false },
  { title: 'Assignee', key: 'assignee', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Due Date', key: 'due_date', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' },
]

// Same default and max as the backend (Pagination::DEFAULT_PER_PAGE / MAX_PER_PAGE)
const itemsPerPageOptions = [10, 15, 25, 50, 100]

const SEARCH_DEBOUNCE_MS = 400

const page = ref(1)
const itemsPerPage = ref(15)

// Filters. `null` comes from the clearable inputs
const status = ref<TaskStatus | null>(null)
const search = ref<string | null>('')
// Value actually sent to the API, updated only when the user stops typing
const debouncedSearch = ref('')

watch(search, (value, _, onCleanup) => {
  const timer = setTimeout(() => (debouncedSearch.value = value?.trim() ?? ''), SEARCH_DEBOUNCE_MS)
  onCleanup(() => clearTimeout(timer))
})

// A new filter means a new result set: go back to page 1
watch([status, debouncedSearch], reloadFromFirstPage)

const tasks = computed(() => store.state.tasks.items)
const total = computed(() => store.state.tasks.total)
const loading = computed(() => store.state.tasks.loading)
const error = computed(() => store.state.tasks.error)

// Called by the table on mount and on every page / page-size change (via update:options),
// at that point v-model has already updated `page` and `itemsPerPage`
function loadTasks() {
  const params: TaskListParams = {
    page: page.value,
    per_page: itemsPerPage.value,
    // undefined params are left out of the query string by axios
    status: status.value ?? undefined,
    search: debouncedSearch.value || undefined,
  }

  return store.dispatch('tasks/fetchTasks', params)
}

// Changing `page` makes the table emit update:options, which reloads by itself
function reloadFromFirstPage() {
  if (page.value === 1) {
    loadTasks()
  } else {
    page.value = 1
  }
}

// Create / edit dialog
const dialog = ref(false)
const editingTask = ref<Task | null>(null)
// New key on every open, so the form starts clean (v-dialog keeps its content mounted)
const formKey = ref(0)

const snackbar = ref(false)
const snackbarText = ref('')

function openForm(task: Task | null = null) {
  editingTask.value = task
  formKey.value++
  dialog.value = true
}

function onSaved() {
  const wasEdit = !!editingTask.value
  dialog.value = false

  snackbarText.value = wasEdit ? 'Task updated.' : 'Task created.'
  snackbar.value = true

  // New tasks come first (sorted by latest); an edit may move the task out of the current filter
  if (wasEdit) {
    loadTasks()
  } else {
    reloadFromFirstPage()
  }
}
</script>

<template>
  <div class="d-flex align-center mb-4">
    <h1 class="text-h5">Tasks</h1>
    <v-spacer />
    <v-btn color="primary" prepend-icon="mdi-plus" @click="openForm()">New task</v-btn>
  </div>

  <v-row dense class="mb-2">
    <v-col cols="12" sm="6" md="4">
      <v-text-field
        v-model="search"
        label="Search by title"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        hide-details
        clearable
      />
    </v-col>
    <v-col cols="12" sm="6" md="3">
      <v-select
        v-model="status"
        :items="TASK_STATUS_OPTIONS"
        label="Status"
        density="compact"
        hide-details
        clearable
      />
    </v-col>
  </v-row>

  <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">
    {{ error }}
    <template #append>
      <v-btn variant="text" size="small" @click="loadTasks">Retry</v-btn>
    </template>
  </v-alert>

  <v-data-table-server
    v-model:page="page"
    v-model:items-per-page="itemsPerPage"
    :headers="headers"
    :items="tasks"
    :items-length="total"
    :items-per-page-options="itemsPerPageOptions"
    :loading="loading"
    loading-text="Loading tasks..."
    no-data-text="No tasks found."
    border
    @update:options="loadTasks"
  >
    <template #[`item.status`]="{ item }">
      <TaskStatusChip :status="item.status" />
    </template>

    <template #[`item.assignee`]="{ item }">
      {{ item.assignee?.name ?? '-' }}
    </template>

    <template #[`item.due_date`]="{ item }">
      {{ item.due_date ?? '-' }}
    </template>

    <template #[`item.actions`]="{ item }">
      <v-btn variant="text" size="small" :to="{ name: 'task-detail', params: { id: item.id } }">
        View
      </v-btn>
      <v-btn variant="text" size="small" @click="openForm(item)">Edit</v-btn>
    </template>
  </v-data-table-server>

  <v-dialog v-model="dialog" max-width="600">
    <v-card :title="editingTask ? 'Edit task' : 'New task'">
      <v-card-text>
        <TaskForm :key="formKey" :task="editingTask" @saved="onSaved" @cancel="dialog = false" />
      </v-card-text>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="snackbar" color="success" :timeout="3000">
    {{ snackbarText }}
  </v-snackbar>
</template>
