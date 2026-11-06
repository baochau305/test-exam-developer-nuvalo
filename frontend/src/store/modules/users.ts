import type { Module } from 'vuex'

import { getErrorMessage } from '@/api/errors'
import { usersApi, type UserListParams } from '@/api/users'
import type { User, UserPayload } from '@/types/user'
import type { AppState, RootState } from '../types'

// Backend max page size (Pagination::MAX_PER_PAGE). Enough for the assignee
// select in this app; a bigger user base would need a searchable autocomplete.
const MAX_PER_PAGE = 100

export interface UsersState {
  /** All users, for the assignee select */
  items: User[]
  loaded: boolean
  loading: boolean
  error: string | null

  /** One page of the user management table (filtered / paginated by the server) */
  page: {
    items: User[]
    total: number
    loading: boolean
    error: string | null
  }
}

// Same idea as in the tasks module: drop responses of outdated page requests
let latestPageRequestId = 0

export const users: Module<UsersState, RootState> = {
  namespaced: true,

  state: () => ({
    items: [],
    loaded: false,
    loading: false,
    error: null,

    page: {
      items: [],
      total: 0,
      loading: false,
      error: null,
    },
  }),

  mutations: {
    FETCH_START(state) {
      state.loading = true
      state.error = null
    },
    FETCH_SUCCESS(state, items: User[]) {
      state.items = items
      state.loaded = true
      state.loading = false
    },
    FETCH_FAILURE(state, error: string) {
      state.error = error
      state.loading = false
    },
    /** Users changed: the assignee select reloads them next time it is shown */
    INVALIDATE(state) {
      state.loaded = false
    },

    FETCH_PAGE_START(state) {
      state.page.loading = true
      state.page.error = null
    },
    FETCH_PAGE_SUCCESS(state, { items, total }: { items: User[]; total: number }) {
      state.page.items = items
      state.page.total = total
      state.page.loading = false
    },
    FETCH_PAGE_FAILURE(state, error: string) {
      state.page.items = []
      state.page.total = 0
      state.page.error = error
      state.page.loading = false
    },
  },

  actions: {
    /** Loads users for the assignee select. Cached: only hits the API once unless `force` */
    async fetchUsers({ state, commit }, { force = false }: { force?: boolean } = {}) {
      if ((state.loaded && !force) || state.loading) return

      commit('FETCH_START')

      try {
        const response = await usersApi.list({ per_page: MAX_PER_PAGE })
        commit('FETCH_SUCCESS', response.data)
      } catch (error) {
        commit('FETCH_FAILURE', getErrorMessage(error, 'Could not load users.'))
      }
    },

    async fetchUsersPage({ commit }, params: UserListParams) {
      const requestId = ++latestPageRequestId
      commit('FETCH_PAGE_START')

      try {
        const response = await usersApi.list(params)
        if (requestId !== latestPageRequestId) return

        commit('FETCH_PAGE_SUCCESS', { items: response.data, total: response.meta.total })
      } catch (error) {
        if (requestId !== latestPageRequestId) return

        commit('FETCH_PAGE_FAILURE', getErrorMessage(error, 'Could not load users.'))
      }
    },

    // create/update/delete let errors bubble up, the caller shows them

    async createUser({ commit }, payload: UserPayload): Promise<User> {
      const user = await usersApi.create(payload)
      commit('INVALIDATE')

      return user
    },

    async updateUser(
      { commit, rootState },
      { id, payload }: { id: number; payload: Partial<UserPayload> },
    ): Promise<User> {
      const user = await usersApi.update(id, payload)
      commit('INVALIDATE')

      // Editing yourself: keep the name in the top bar up to date
      // (rootState is typed as the empty RootState, modules live on AppState)
      if ((rootState as AppState).auth.user?.id === user.id) {
        commit('auth/SET_USER', user, { root: true })
      }

      return user
    },

    async deleteUser({ commit }, id: number) {
      await usersApi.delete(id)
      commit('INVALIDATE')
    },
  },
}
