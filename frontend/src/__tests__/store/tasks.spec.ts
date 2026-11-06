import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'

import { tasksApi } from '@/api/tasks'
import { createAppStore } from '@/store'
import type { Paginated } from '@/types/api'
import type { Task, TaskPayload } from '@/types/task'
import { makeTask, paginated } from '../fixtures/tasks'

vi.mock('@/api/tasks', () => ({
  tasksApi: {
    list: vi.fn<typeof tasksApi.list>(),
    get: vi.fn<typeof tasksApi.get>(),
    create: vi.fn<typeof tasksApi.create>(),
    update: vi.fn<typeof tasksApi.update>(),
  },
}))

describe('tasks store module', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads a page of tasks with the total count', async () => {
    const items = [makeTask({ id: 1 }), makeTask({ id: 2 })]
    vi.mocked(tasksApi.list).mockResolvedValue(paginated(items, { total: 32 }))
    const store = createAppStore()

    const pending = store.dispatch('tasks/fetchTasks', { page: 2, per_page: 15 })
    expect(store.state.tasks.loading).toBe(true)
    await pending

    expect(tasksApi.list).toHaveBeenCalledWith({ page: 2, per_page: 15 })
    expect(store.state.tasks.items).toEqual(items)
    expect(store.state.tasks.total).toBe(32)
    expect(store.state.tasks.loading).toBe(false)
    expect(store.state.tasks.error).toBeNull()
  })

  it('stores an error message when the request fails', async () => {
    vi.mocked(tasksApi.list).mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
    const store = createAppStore()

    await store.dispatch('tasks/fetchTasks', { page: 1 })

    expect(store.state.tasks.error).toBe('Cannot reach the server. Please check your connection.')
    expect(store.state.tasks.items).toEqual([])
    expect(store.state.tasks.loading).toBe(false)
  })

  it('ignores a slow response that arrives after a newer one', async () => {
    let resolveSlow!: (value: Paginated<Task>) => void
    vi.mocked(tasksApi.list)
      .mockReturnValueOnce(new Promise((resolve) => (resolveSlow = resolve)))
      .mockResolvedValueOnce(paginated([makeTask({ id: 2, title: 'Page 2' })]))
    const store = createAppStore()

    const slow = store.dispatch('tasks/fetchTasks', { page: 1 })
    await store.dispatch('tasks/fetchTasks', { page: 2 })
    resolveSlow(paginated([makeTask({ id: 1, title: 'Page 1' })]))
    await slow

    expect(store.state.tasks.items.map((task) => task.title)).toEqual(['Page 2'])
  })

  describe('fetchTask', () => {
    it('loads a single task', async () => {
      const task = makeTask({ id: 7 })
      vi.mocked(tasksApi.get).mockResolvedValue(task)
      const store = createAppStore()

      const pending = store.dispatch('tasks/fetchTask', 7)
      expect(store.state.tasks.currentLoading).toBe(true)
      await pending

      expect(tasksApi.get).toHaveBeenCalledWith(7)
      expect(store.state.tasks.current).toEqual(task)
      expect(store.state.tasks.currentLoading).toBe(false)
    })

    it('shows a friendly message when the task does not exist', async () => {
      const config = { headers: new AxiosHeaders() }
      const notFound = new AxiosError('Not Found', 'ERR_BAD_REQUEST', config, null, {
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config,
        data: { message: 'No query results for model [App\\Models\\Task] 999' },
      })
      vi.mocked(tasksApi.get).mockRejectedValue(notFound)
      const store = createAppStore()

      await store.dispatch('tasks/fetchTask', 999)

      expect(store.state.tasks.current).toBeNull()
      expect(store.state.tasks.currentError).toBe('Task not found.')
    })

    it('clears the previous task while loading another one', async () => {
      vi.mocked(tasksApi.get).mockResolvedValueOnce(makeTask({ id: 1 }))
      const store = createAppStore()
      await store.dispatch('tasks/fetchTask', 1)

      vi.mocked(tasksApi.get).mockReturnValueOnce(new Promise(() => {}))
      void store.dispatch('tasks/fetchTask', 2)

      expect(store.state.tasks.current).toBeNull()
    })
  })

  describe('createTask / updateTask', () => {
    const payload: TaskPayload = {
      title: 'New task',
      description: null,
      status: 'todo',
      assigned_to: 1,
      due_date: '2026-12-01',
    }

    it('creates a task and returns it', async () => {
      const created = makeTask({ id: 10, title: 'New task' })
      vi.mocked(tasksApi.create).mockResolvedValue(created)
      const store = createAppStore()

      const result = await store.dispatch('tasks/createTask', payload)

      expect(tasksApi.create).toHaveBeenCalledWith(payload)
      expect(result).toEqual(created)
    })

    it('lets API errors reach the caller (the form shows them)', async () => {
      vi.mocked(tasksApi.create).mockRejectedValue(new Error('Invalid'))
      const store = createAppStore()

      await expect(store.dispatch('tasks/createTask', payload)).rejects.toThrow('Invalid')
    })

    it('updates the task on the detail page and in the list', async () => {
      vi.mocked(tasksApi.list).mockResolvedValue(
        paginated([makeTask({ id: 1, title: 'Old' }), makeTask({ id: 2, title: 'Other' })]),
      )
      vi.mocked(tasksApi.get).mockResolvedValue(makeTask({ id: 1, title: 'Old' }))
      const updated = makeTask({ id: 1, title: 'Updated', status: 'done' })
      vi.mocked(tasksApi.update).mockResolvedValue(updated)
      const store = createAppStore()
      await store.dispatch('tasks/fetchTasks', { page: 1 })
      await store.dispatch('tasks/fetchTask', 1)

      const result = await store.dispatch('tasks/updateTask', {
        id: 1,
        payload: { title: 'Updated', status: 'done' },
      })

      expect(tasksApi.update).toHaveBeenCalledWith(1, { title: 'Updated', status: 'done' })
      expect(result).toEqual(updated)
      expect(store.state.tasks.current).toEqual(updated)
      expect(store.state.tasks.items.map((task) => task.title)).toEqual(['Updated', 'Other'])
    })
  })
})
