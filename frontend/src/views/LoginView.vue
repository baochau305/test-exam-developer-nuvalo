<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import type { VForm } from 'vuetify/components'

import type { LoginCredentials } from '@/api/auth'
import { getErrorMessage } from '@/api/errors'
import { useStore } from '@/store'
import type { ValidationErrorBody } from '@/types/api'

const store = useStore()
const route = useRoute()
const router = useRouter()

const formRef = ref<VForm>()
const form = reactive<LoginCredentials>({ email: '', password: '' })

const loading = ref(false)
const error = ref<string | null>(null)
const fieldErrors = ref<Partial<Record<keyof LoginCredentials, string[]>>>({})

const rules = {
  required: (value: string) => !!value || 'This field is required.',
  email: (value: string) => /.+@.+\..+/.test(value) || 'Email must be valid.',
}

/** Only allow internal paths, so ?redirect= cannot send the user to another site */
function redirectPath(): string {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
    ? redirect
    : '/tasks'
}

async function submit() {
  const result = await formRef.value?.validate()
  if (!result?.valid) return

  loading.value = true
  error.value = null
  fieldErrors.value = {}

  try {
    await store.dispatch('auth/login', form)
    await router.push(redirectPath())
  } catch (e) {
    // 422: wrong credentials / invalid input, shown under the fields
    if (axios.isAxiosError<ValidationErrorBody>(e) && e.response?.status === 422) {
      fieldErrors.value = e.response.data.errors
    } else {
      error.value = getErrorMessage(e)
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-row justify="center">
    <v-col cols="12" sm="8" md="5" lg="4">
      <v-card class="mt-12" border flat>
        <v-card-title>Login</v-card-title>

        <v-card-text>
          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">
            {{ error }}
          </v-alert>

          <v-form ref="formRef" @submit.prevent="submit">
            <v-text-field
              v-model="form.email"
              label="Email"
              type="email"
              autocomplete="email"
              :rules="[rules.required, rules.email]"
              :error-messages="fieldErrors.email"
            />
            <v-text-field
              v-model="form.password"
              label="Password"
              type="password"
              autocomplete="current-password"
              :rules="[rules.required]"
              :error-messages="fieldErrors.password"
            />
            <v-btn type="submit" color="primary" block :loading="loading">Login</v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>
