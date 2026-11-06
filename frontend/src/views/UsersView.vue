<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { DataTableHeader } from 'vuetify'

import { getErrorMessage } from '@/api/errors'
import type { UserListParams } from '@/api/users'
import UserForm from '@/components/UserForm.vue'
import { useDebounced } from '@/composables/useDebounced'
import { USER_ROLE_LABELS, USER_ROLE_OPTIONS } from '@/constants/userRole'
import { useStore } from '@/store'
import type { User, UserRole } from '@/types/user'

const store = useStore()

const headers: DataTableHeader<User>[] = [
  { title: 'Name', key: 'name', sortable: false },
  { title: 'Email', key: 'email', sortable: false },
  { title: 'Role', key: 'role', sortable: false },
  { title: 'Tasks', key: 'tasks_count', sortable: false, align: 'end' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' },
]

const itemsPerPageOptions = [10, 15, 25, 50, 100]

const SEARCH_DEBOUNCE_MS = 400

const page = ref(1)
const itemsPerPage = ref(15)

const role = ref<UserRole | null>(null)
const search = ref<string | null>('')
const debouncedSearch = useDebounced(search, SEARCH_DEBOUNCE_MS)
const searchTerm = computed(() => debouncedSearch.value?.trim() ?? '')

watch([role, searchTerm], reloadFromFirstPage)

const users = computed(() => store.state.users.page.items)
const total = computed(() => store.state.users.page.total)
const loading = computed(() => store.state.users.page.loading)
const error = computed(() => store.state.users.page.error)
const currentUserId = computed(() => store.state.auth.user?.id)

// Called by the table on mount and on every page / page-size change (via update:options)
function loadUsers() {
  const params: UserListParams = {
    page: page.value,
    per_page: itemsPerPage.value,
    role: role.value ?? undefined,
    search: searchTerm.value || undefined,
  }

  return store.dispatch('users/fetchUsersPage', params)
}

// Changing `page` makes the table emit update:options, which reloads by itself
function reloadFromFirstPage() {
  if (page.value === 1) {
    loadUsers()
  } else {
    page.value = 1
  }
}

const snackbar = ref(false)
const snackbarText = ref('')

function notify(text: string) {
  snackbarText.value = text
  snackbar.value = true
}

// Create / edit dialog
const formDialog = ref(false)
const editingUser = ref<User | null>(null)
// New key on every open, so the form starts clean (v-dialog keeps its content mounted)
const formKey = ref(0)

function openForm(user: User | null = null) {
  editingUser.value = user
  formKey.value++
  formDialog.value = true
}

function onSaved() {
  const wasEdit = !!editingUser.value
  formDialog.value = false
  notify(wasEdit ? 'User updated.' : 'User created.')

  if (wasEdit) {
    loadUsers()
  } else {
    reloadFromFirstPage()
  }
}

// Delete confirmation dialog
const deleteDialog = ref(false)
const deletingUser = ref<User | null>(null)
const deleting = ref(false)
const deleteError = ref<string | null>(null)

function confirmDelete(user: User) {
  deletingUser.value = user
  deleteError.value = null
  deleteDialog.value = true
}

async function deleteUser() {
  if (!deletingUser.value) return

  deleting.value = true
  deleteError.value = null

  try {
    await store.dispatch('users/deleteUser', deletingUser.value.id)
    deleteDialog.value = false
    notify('User deleted.')

    // Deleted the last row of a page: go back one page instead of showing an empty one
    if (users.value.length === 1 && page.value > 1) {
      page.value--
    } else {
      loadUsers()
    }
  } catch (e) {
    deleteError.value = getErrorMessage(e, 'Could not delete the user.')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="d-flex align-center mb-4">
    <h1 class="text-h5">Users</h1>
    <v-spacer />
    <v-btn color="primary" prepend-icon="mdi-plus" @click="openForm()">New user</v-btn>
  </div>

  <v-row dense class="mb-2">
    <v-col cols="12" sm="6" md="4">
      <v-text-field
        v-model="search"
        label="Search by name or email"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        hide-details
        clearable
      />
    </v-col>
    <v-col cols="12" sm="6" md="3">
      <v-select
        v-model="role"
        :items="USER_ROLE_OPTIONS"
        label="Role"
        density="compact"
        hide-details
        clearable
      />
    </v-col>
  </v-row>

  <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">
    {{ error }}
    <template #append>
      <v-btn variant="text" size="small" @click="loadUsers">Retry</v-btn>
    </template>
  </v-alert>

  <v-data-table-server
    v-model:page="page"
    v-model:items-per-page="itemsPerPage"
    :headers="headers"
    :items="users"
    :items-length="total"
    :items-per-page-options="itemsPerPageOptions"
    :loading="loading"
    loading-text="Loading users..."
    no-data-text="No users found."
    border
    @update:options="loadUsers"
  >
    <template #[`item.role`]="{ item }">
      {{ USER_ROLE_LABELS[item.role] }}
    </template>

    <template #[`item.tasks_count`]="{ item }">
      {{ item.tasks_count ?? 0 }}
    </template>

    <template #[`item.actions`]="{ item }">
      <v-btn variant="text" size="small" @click="openForm(item)">Edit</v-btn>
      <!-- The backend refuses to delete the logged-in user -->
      <v-btn
        variant="text"
        size="small"
        color="error"
        :disabled="item.id === currentUserId"
        @click="confirmDelete(item)"
      >
        Delete
      </v-btn>
    </template>
  </v-data-table-server>

  <v-dialog v-model="formDialog" max-width="500">
    <v-card :title="editingUser ? 'Edit user' : 'New user'">
      <v-card-text>
        <UserForm
          :key="formKey"
          :user="editingUser"
          @saved="onSaved"
          @cancel="formDialog = false"
        />
      </v-card-text>
    </v-card>
  </v-dialog>

  <v-dialog v-model="deleteDialog" max-width="400" :persistent="deleting">
    <v-card v-if="deletingUser" title="Delete user">
      <v-card-text>
        <v-alert v-if="deleteError" type="error" variant="tonal" density="compact" class="mb-4">
          {{ deleteError }}
        </v-alert>

        <p>
          Delete <strong>{{ deletingUser.name }}</strong> ({{ deletingUser.email }})?
        </p>
        <!-- tasks.assigned_to is ON DELETE CASCADE in the database -->
        <p v-if="deletingUser.tasks_count" class="mt-2">
          Their {{ deletingUser.tasks_count }} task(s) will also be deleted.
        </p>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="deleting" @click="deleteDialog = false">Cancel</v-btn>
        <v-btn color="error" :loading="deleting" @click="deleteUser">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="snackbar" color="success" :timeout="3000">
    {{ snackbarText }}
  </v-snackbar>
</template>
