import type { Module } from 'vuex'

import { getErrorMessage } from '@/api/errors'
import { tasksApi, type TaskListParams } from '@/api/tasks'
import type { Task } from '@/types/task'
import type { RootState } from '../types'

export interface TasksState {
  items: Task[]
  /** Total number of tasks on the server (all pages), used by the table pagination */
  total: number
  loading: boolean
  error: string | null
}

// Lets fetchTasks ignore responses of older requests when the user
// changes page quickly and responses come back out of order
let latestRequestId = 0

export const tasks: Module<TasksState, RootState> = {
  namespaced: true,

  state: () => ({
    items: [],
    total: 0,
    loading: false,
    error: null,
  }),

  mutations: {
    FETCH_START(state) {
      state.loading = true
      state.error = null
    },
    FETCH_SUCCESS(state, { items, total }: { items: Task[]; total: number }) {
      state.items = items
      state.total = total
      state.loading = false
    },
    FETCH_FAILURE(state, error: string) {
      state.items = []
      state.total = 0
      state.error = error
      state.loading = false
    },
  },

  actions: {
    async fetchTasks({ commit }, params: TaskListParams) {
      const requestId = ++latestRequestId
      commit('FETCH_START')

      try {
        const response = await tasksApi.list(params)
        if (requestId !== latestRequestId) return

        commit('FETCH_SUCCESS', { items: response.data, total: response.meta.total })
      } catch (error) {
        if (requestId !== latestRequestId) return

        commit('FETCH_FAILURE', getErrorMessage(error, 'Could not load tasks.'))
      }
    },
  },
}
