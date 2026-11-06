<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import axios from 'axios'
import type { VForm } from 'vuetify/components'

import { getErrorMessage } from '@/api/errors'
import { TASK_STATUS_OPTIONS } from '@/constants/taskStatus'
import { useStore } from '@/store'
import type { ValidationErrorBody } from '@/types/api'
import type { Task, TaskPayload, TaskStatus } from '@/types/task'
import { fromIsoDate, toIsoDate } from '@/utils/date'

/**
 * Create / edit form for a task.
 * - without `task`: creates a new task (POST /api/tasks)
 * - with `task`: edits it (PUT /api/tasks/{id})
 * Emits `saved` with the task returned by the API.
 */
const props = defineProps<{
  task?: Task | null
}>()

const emit = defineEmits<{
  saved: [task: Task]
  cancel: []
}>()

interface FormState {
  title: string
  description: string
  status: TaskStatus
  // null until the user picks one
  assigned_to: number | null
  due_date: string | null
}

type FieldErrors = Partial<Record<keyof TaskPayload, string[]>>

const store = useStore()

const isEdit = computed(() => !!props.task)

const formRef = ref<VForm>()
const form = reactive<FormState>(emptyForm())

const submitting = ref(false)
const error = ref<string | null>(null)
// 422 errors from the API, shown under the matching input
const fieldErrors = ref<FieldErrors>({})

const dateMenu = ref(false)

const users = computed(() => store.state.users.items)
const usersLoading = computed(() => store.state.users.loading)
const usersError = computed(() => store.state.users.error)

const rules = {
  required: (value: unknown) => (value !== null && value !== '') || 'This field is required.',
  maxLength: (max: number) => (value: string) =>
    value.length <= max || `Must be at most ${max} characters.`,
}

function emptyForm(): FormState {
  return { title: '', description: '', status: 'todo', assigned_to: null, due_date: null }
}

function fillForm(task?: Task | null) {
  Object.assign(
    form,
    task
      ? {
          title: task.title,
          description: task.description ?? '',
          status: task.status,
          assigned_to: task.assigned_to,
          due_date: task.due_date,
        }
      : emptyForm(),
  )

  fieldErrors.value = {}
  error.value = null
  formRef.value?.resetValidation()
}

watch(() => props.task, fillForm, { immediate: true })

// Hide a server error as soon as the user changes that field
for (const field of Object.keys(form) as (keyof FormState)[]) {
  watch(
    () => form[field],
    () => delete fieldErrors.value[field],
  )
}

onMounted(() => store.dispatch('users/fetchUsers'))

// v-date-picker works with Date objects, the API with 'YYYY-MM-DD'
const dueDate = computed(() => (form.due_date ? fromIsoDate(form.due_date) : null))

function onDatePicked(value: unknown) {
  if (value instanceof Date) {
    form.due_date = toIsoDate(value)
  }
  dateMenu.value = false
}

function toPayload(): TaskPayload {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    status: form.status,
    // Checked by the `required` rule before submit
    assigned_to: form.assigned_to as number,
    due_date: form.due_date,
  }
}

async function submit() {
  const result = await formRef.value?.validate()
  if (!result?.valid) return

  submitting.value = true
  error.value = null
  fieldErrors.value = {}

  try {
    const payload = toPayload()
    const saved: Task = props.task
      ? await store.dispatch('tasks/updateTask', { id: props.task.id, payload })
      : await store.dispatch('tasks/createTask', payload)

    emit('saved', saved)
  } catch (e) {
    if (axios.isAxiosError<ValidationErrorBody>(e) && e.response?.status === 422) {
      fieldErrors.value = e.response.data.errors
    } else {
      error.value = getErrorMessage(e, 'Could not save the task.')
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <v-form ref="formRef" @submit.prevent="submit">
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">
      {{ error }}
    </v-alert>

    <v-text-field
      v-model="form.title"
      label="Title *"
      counter="255"
      :rules="[rules.required, rules.maxLength(255)]"
      :error-messages="fieldErrors.title"
    />

    <v-textarea
      v-model="form.description"
      label="Description"
      variant="outlined"
      rows="3"
      auto-grow
      :error-messages="fieldErrors.description"
    />

    <v-row dense>
      <v-col cols="12" sm="6">
        <v-select
          v-model="form.status"
          :items="TASK_STATUS_OPTIONS"
          label="Status *"
          :rules="[rules.required]"
          :error-messages="fieldErrors.status"
        />
      </v-col>

      <v-col cols="12" sm="6">
        <v-select
          v-model="form.assigned_to"
          :items="users"
          item-title="name"
          item-value="id"
          label="Assignee *"
          :loading="usersLoading"
          :rules="[rules.required]"
          :error-messages="usersError ?? fieldErrors.assigned_to"
        />
      </v-col>
    </v-row>

    <v-menu v-model="dateMenu" :close-on-content-click="false">
      <template #activator="{ props: menuProps }">
        <v-text-field
          v-bind="menuProps"
          :model-value="form.due_date"
          label="Due date"
          placeholder="YYYY-MM-DD"
          prepend-inner-icon="mdi-calendar"
          readonly
          clearable
          :error-messages="fieldErrors.due_date"
          @click:clear="form.due_date = null"
        />
      </template>

      <v-date-picker :model-value="dueDate" @update:model-value="onDatePicked" />
    </v-menu>

    <div class="d-flex justify-end ga-2">
      <v-btn variant="text" :disabled="submitting" @click="emit('cancel')">Cancel</v-btn>
      <v-btn type="submit" color="primary" :loading="submitting">
        {{ isEdit ? 'Save' : 'Create' }}
      </v-btn>
    </div>
  </v-form>
</template>
