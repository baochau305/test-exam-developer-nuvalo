import axios from 'axios'
import type { Module } from 'vuex'

import { getErrorMessage } from '@/api/errors'
import { tasksApi, type TaskListParams } from '@/api/tasks'
import type { Task, TaskPayload } from '@/types/task'
import type { RootState } from '../types'

export interface TasksState {
  items: Task[]
  /** Total number of tasks on the server (all pages), used by the table pagination */
  total: number
  loading: boolean
  error: string | null

  /** Task opened on the detail page */
  current: Task | null
  currentLoading: boolean
  currentError: string | null
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

    current: null,
    currentLoading: false,
    currentError: null,
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

    FETCH_ONE_START(state) {
      // Clear the previous task so it is not shown while the new one loads
      state.current = null
      state.currentLoading = true
      state.currentError = null
    },
    FETCH_ONE_SUCCESS(state, task: Task) {
      state.current = task
      state.currentLoading = false
    },
    FETCH_ONE_FAILURE(state, error: string) {
      state.currentError = error
      state.currentLoading = false
    },

    /** Puts the saved version of a task everywhere it is displayed */
    TASK_UPDATED(state, task: Task) {
      if (state.current?.id === task.id) {
        state.current = task
      }

      const index = state.items.findIndex((item) => item.id === task.id)
      if (index !== -1) {
        state.items[index] = task
      }
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

    async fetchTask({ commit }, id: number) {
      commit('FETCH_ONE_START')

      try {
        commit('FETCH_ONE_SUCCESS', await tasksApi.get(id))
      } catch (error) {
        // Laravel's 404 message ("No query results for model ...") is not user friendly
        const message =
          axios.isAxiosError(error) && error.response?.status === 404
            ? 'Task not found.'
            : getErrorMessage(error, 'Could not load the task.')

        commit('FETCH_ONE_FAILURE', message)
      }
    },

    // create/update let errors bubble up: the form shows them (e.g. 422 under each field)

    async createTask(_, payload: TaskPayload): Promise<Task> {
      // Not added to `items`: the list is paginated/filtered by the server, so the page reloads it
      return tasksApi.create(payload)
    },

    async updateTask({ commit }, { id, payload }: { id: number; payload: Partial<TaskPayload> }) {
      const task = await tasksApi.update(id, payload)
      commit('TASK_UPDATED', task)

      return task
    },
  },
}
