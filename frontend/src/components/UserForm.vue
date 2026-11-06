<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import axios from 'axios'
import type { VForm } from 'vuetify/components'

import { getErrorMessage } from '@/api/errors'
import { USER_ROLE_OPTIONS } from '@/constants/userRole'
import { useStore } from '@/store'
import type { ValidationErrorBody } from '@/types/api'
import type { User, UserPayload, UserRole } from '@/types/user'

/**
 * Create / edit form for a user.
 * - without `user`: creates a new user (POST /api/users), password required
 * - with `user`: edits it (PUT /api/users/{id}), password optional
 * Emits `saved` with the user returned by the API.
 */
const props = defineProps<{
  user?: User | null
}>()

const emit = defineEmits<{
  saved: [user: User]
  cancel: []
}>()

interface FormState {
  name: string
  email: string
  password: string
  role: UserRole
}

type FieldErrors = Partial<Record<keyof UserPayload, string[]>>

const PASSWORD_MIN_LENGTH = 8

const store = useStore()

const isEdit = computed(() => !!props.user)
// Changing your own role could lock you out of this page
const isSelf = computed(() => !!props.user && props.user.id === store.state.auth.user?.id)

const formRef = ref<VForm>()
const form = reactive<FormState>(emptyForm())
const showPassword = ref(false)

const submitting = ref(false)
const error = ref<string | null>(null)
const fieldErrors = ref<FieldErrors>({})

const rules = {
  required: (value: string) => !!value || 'This field is required.',
  email: (value: string) => /.+@.+\..+/.test(value) || 'Email must be valid.',
  maxLength: (max: number) => (value: string) =>
    value.length <= max || `Must be at most ${max} characters.`,
  // Empty is allowed here: required-ness depends on create/edit, see passwordRules
  minLength: (min: number) => (value: string) =>
    !value || value.length >= min || `Must be at least ${min} characters.`,
}

const passwordRules = computed(() =>
  isEdit.value
    ? [rules.minLength(PASSWORD_MIN_LENGTH)]
    : [rules.required, rules.minLength(PASSWORD_MIN_LENGTH)],
)

function emptyForm(): FormState {
  return { name: '', email: '', password: '', role: 'user' }
}

function fillForm(user?: User | null) {
  Object.assign(
    form,
    user ? { name: user.name, email: user.email, password: '', role: user.role } : emptyForm(),
  )

  fieldErrors.value = {}
  error.value = null
  formRef.value?.resetValidation()
}

watch(() => props.user, fillForm, { immediate: true })

// Hide a server error as soon as the user changes that field
for (const field of Object.keys(form) as (keyof FormState)[]) {
  watch(
    () => form[field],
    () => delete fieldErrors.value[field],
  )
}

function toPayload(): UserPayload {
  const payload: UserPayload = {
    name: form.name.trim(),
    email: form.email.trim(),
    role: form.role,
  }

  // On edit an empty password means "keep the current one"
  if (form.password) {
    payload.password = form.password
  }

  return payload
}

async function submit() {
  const result = await formRef.value?.validate()
  if (!result?.valid) return

  submitting.value = true
  error.value = null
  fieldErrors.value = {}

  try {
    const payload = toPayload()
    const saved: User = props.user
      ? await store.dispatch('users/updateUser', { id: props.user.id, payload })
      : await store.dispatch('users/createUser', payload)

    emit('saved', saved)
  } catch (e) {
    if (axios.isAxiosError<ValidationErrorBody>(e) && e.response?.status === 422) {
      fieldErrors.value = e.response.data.errors
    } else {
      error.value = getErrorMessage(e, 'Could not save the user.')
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
      v-model="form.name"
      label="Name *"
      :rules="[rules.required, rules.maxLength(255)]"
      :error-messages="fieldErrors.name"
    />

    <v-text-field
      v-model="form.email"
      label="Email *"
      type="email"
      :rules="[rules.required, rules.email, rules.maxLength(255)]"
      :error-messages="fieldErrors.email"
    />

    <v-text-field
      v-model="form.password"
      :label="isEdit ? 'New password' : 'Password *'"
      :type="showPassword ? 'text' : 'password'"
      :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
      :hint="isEdit ? 'Leave empty to keep the current password.' : undefined"
      :persistent-hint="isEdit"
      autocomplete="new-password"
      :rules="passwordRules"
      :error-messages="fieldErrors.password"
      @click:append-inner="showPassword = !showPassword"
    />

    <v-select
      v-model="form.role"
      :items="USER_ROLE_OPTIONS"
      label="Role *"
      :disabled="isSelf"
      :hint="isSelf ? 'You cannot change your own role.' : undefined"
      :persistent-hint="isSelf"
      :error-messages="fieldErrors.role"
    />

    <div class="d-flex justify-end ga-2 mt-2">
      <v-btn variant="text" :disabled="submitting" @click="emit('cancel')">Cancel</v-btn>
      <v-btn type="submit" color="primary" :loading="submitting">
        {{ isEdit ? 'Save' : 'Create' }}
      </v-btn>
    </div>
  </v-form>
</template>
