import { computed, onMounted } from 'vue'

import { useStore } from '@/store'
import type { User } from '@/types/user'

/**
 * Users a task can be assigned to, depending on the logged-in user's role:
 * - admin: every user (loaded from GET /api/users, cached in the store)
 * - user: only themselves (GET /api/users is admin-only, and the backend only
 *   accepts their own id as `assigned_to`)
 *
 * Tasks no longer embed their assignee, `nameOf` resolves it from this list.
 */
export function useAssignees() {
  const store = useStore()

  const isAdmin = computed<boolean>(() => store.getters['auth/isAdmin'])
  const currentUser = computed(() => store.state.auth.user)

  const users = computed<User[]>(() => {
    if (isAdmin.value) return store.state.users.items

    return currentUser.value ? [currentUser.value] : []
  })

  const loading = computed(() => isAdmin.value && store.state.users.loading)
  const error = computed(() => (isAdmin.value ? store.state.users.error : null))

  const namesById = computed(() => new Map(users.value.map((user) => [user.id, user.name])))

  function nameOf(id: number) {
    return namesById.value.get(id) ?? '-'
  }

  onMounted(() => {
    if (isAdmin.value) store.dispatch('users/fetchUsers')
  })

  return { isAdmin, currentUser, users, loading, error, nameOf }
}
