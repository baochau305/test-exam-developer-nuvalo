<script setup lang="ts">
import { ref, watch } from 'vue'

import { getErrorMessage } from '@/api/errors'
import { usersApi } from '@/api/users'
import { useDebounced } from '@/composables/useDebounced'
import type { User } from '@/types/user'

/**
 * Picks a user by searching the API (GET /api/users?search=...) as the user types.
 * v-model is the user id. Admin only: the endpoint is forbidden for regular users.
 * Other attributes (label, density, clearable...) are passed to v-autocomplete.
 */
const model = defineModel<number | null>({ default: null })

const SEARCH_DEBOUNCE_MS = 400
const RESULTS_LIMIT = 20

const items = ref<User[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
let loadedOnce = false

// Kept as an object (return-object), so the selection still shows when it is
// not part of the latest search results
const selected = ref<User | null>(null)

watch(selected, (user) => (model.value = user?.id ?? null))
watch(model, (id) => {
  if (id === null) selected.value = null
})

const search = ref('')
const debouncedSearch = useDebounced(search, SEARCH_DEBOUNCE_MS)

watch(debouncedSearch, (value) => {
  const term = value.trim()
  // v-autocomplete puts the selected name in the search box: nothing to search for
  if (selected.value && term === selected.value.name) return

  fetchUsers(term)
})

// Results of an older search that come back late are dropped
let latestRequestId = 0

async function fetchUsers(term: string) {
  const requestId = ++latestRequestId
  loading.value = true
  error.value = null

  try {
    const response = await usersApi.list({ search: term || undefined, per_page: RESULTS_LIMIT })
    if (requestId !== latestRequestId) return

    items.value = response.data
    loadedOnce = true
  } catch (e) {
    if (requestId !== latestRequestId) return

    items.value = []
    error.value = getErrorMessage(e, 'Could not load users.')
  } finally {
    if (requestId === latestRequestId) loading.value = false
  }
}

// Load the first users only when the list is opened, not on page load
function onMenu(open: boolean) {
  if (open && !loadedOnce && !loading.value) fetchUsers('')
}
</script>

<template>
  <v-autocomplete
    v-model="selected"
    v-model:search="search"
    :items="items"
    item-title="name"
    item-value="id"
    return-object
    no-filter
    :loading="loading"
    :no-data-text="loading ? 'Searching...' : (error ?? 'No users found.')"
    @update:menu="onMenu"
  >
    <template #item="{ props: itemProps, item }">
      <v-list-item v-bind="itemProps" :subtitle="item.raw.email" />
    </template>
  </v-autocomplete>
</template>
