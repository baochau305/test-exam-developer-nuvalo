import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import { tasksApi } from '@/api/tasks'
import { usersApi } from '@/api/users'
import vuetify from '@/plugins/vuetify'
import { routes } from '@/router'
import { createAppStore, key } from '@/store'
import TaskForm from '@/components/TaskForm.vue'
import UserAutocomplete from '@/components/UserAutocomplete.vue'
import TasksListView from '@/views/TasksListView.vue'
import type { User } from '@/types/user'
import { makeTask, paginated, userFixture } from '../fixtures/tasks'

vi.mock('@/api/tasks', () => ({
  tasksApi: {
    list: vi.fn<typeof tasksApi.list>(),
    create: vi.fn<typeof tasksApi.create>(),
    update: vi.fn<typeof tasksApi.update>(),
  },
}))
vi.mock('@/api/users', () => ({
  usersApi: { list: vi.fn<typeof usersApi.list>(async () => paginated([userFixture])) },
}))

const regularUser: User = { ...userFixture, id: 2, name: 'User 1', role: 'user' }

async function mountView({ user = userFixture }: { user?: User } = {}) {
  const store = createAppStore()
  store.commit('auth/SET_USER', user)
  const router = createRouter({ history: createMemoryHistory(), routes })

  // attachTo: v-dialog content is teleported to <body>
  const wrapper = mount(TasksListView, {
    attachTo: document.body,
    global: { plugins: [vuetify, router, [store, key]] },
  })
  await flushPromises()

  return wrapper
}

function goToNextPage(wrapper: VueWrapper) {
  return wrapper
    .find('.v-data-table-footer__pagination button[aria-label="Next page"]')
    .trigger('click')
}

describe('TasksListView', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('fetches the first page and renders one row per task', async () => {
    vi.mocked(tasksApi.list).mockResolvedValue(
      paginated([
        makeTask({ id: 1, title: 'Write tests' }),
        makeTask({ id: 2, title: 'Fix bug', due_date: null }),
      ]),
    )

    const wrapper = await mountView()

    expect(tasksApi.list).toHaveBeenCalledWith({ page: 1, per_page: 15 })

    const headers = wrapper.findAll('thead th').map((th) => th.text())
    expect(headers).toEqual(['Title', 'Assignee', 'Status', 'Due Date', 'Actions'])

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.text()).toContain('Write tests')
    expect(rows[0]?.text()).toContain('Admin')
    expect(rows[0]?.text()).toContain('2026-11-30')
    expect(rows[1]?.text()).toContain('Fix bug')
    expect(rows[0]?.find('a').attributes('href')).toBe('/tasks/1')
  })

  it('requests the next page from the server', async () => {
    vi.mocked(tasksApi.list).mockResolvedValue(paginated([makeTask()], { total: 40 }))
    const wrapper = await mountView()

    await goToNextPage(wrapper)
    await flushPromises()

    expect(tasksApi.list).toHaveBeenLastCalledWith({ page: 2, per_page: 15 })
  })

  it('renders the status as a chip', async () => {
    vi.mocked(tasksApi.list).mockResolvedValue(paginated([makeTask({ status: 'in_progress' })]))
    const wrapper = await mountView()

    expect(wrapper.find('tbody .v-chip').text()).toBe('In progress')
  })

  it('filters by status and goes back to the first page', async () => {
    vi.mocked(tasksApi.list).mockResolvedValue(paginated([makeTask()], { total: 40 }))
    const wrapper = await mountView()
    await goToNextPage(wrapper)
    await flushPromises()

    wrapper.findComponent({ name: 'VSelect' }).vm.$emit('update:modelValue', 'done')
    await flushPromises()

    expect(tasksApi.list).toHaveBeenLastCalledWith({ page: 1, per_page: 15, status: 'done' })
  })

  it('searches by title once the user stops typing', async () => {
    vi.useFakeTimers()
    vi.mocked(tasksApi.list).mockResolvedValue(paginated([makeTask()]))
    const wrapper = await mountView()
    vi.mocked(tasksApi.list).mockClear()

    const input = wrapper.find('input[type="text"]')
    await input.setValue('wri')
    await input.setValue('write ')
    await vi.advanceTimersByTimeAsync(399)
    expect(tasksApi.list).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()

    expect(tasksApi.list).toHaveBeenCalledOnce()
    expect(tasksApi.list).toHaveBeenCalledWith({ page: 1, per_page: 15, search: 'write' })
  })

  describe('assignee', () => {
    it('lets an admin filter by assignee and goes back to the first page', async () => {
      vi.mocked(tasksApi.list).mockResolvedValue(paginated([makeTask()], { total: 40 }))
      const wrapper = await mountView()
      await goToNextPage(wrapper)
      await flushPromises()

      wrapper.findComponent(UserAutocomplete).vm.$emit('update:modelValue', 1)
      await flushPromises()

      expect(tasksApi.list).toHaveBeenLastCalledWith({ page: 1, per_page: 15, assigned_to: 1 })
    })

    it('hides the assignee filter from regular users and shows their own name', async () => {
      vi.mocked(tasksApi.list).mockResolvedValue(
        paginated([makeTask({ assigned_to: regularUser.id })]),
      )
      const wrapper = await mountView({ user: regularUser })

      expect(wrapper.findComponent(UserAutocomplete).exists()).toBe(false)
      // GET /api/users is admin-only
      expect(usersApi.list).not.toHaveBeenCalled()
      expect(wrapper.find('tbody tr').text()).toContain('User 1')
    })
  })

  it('shows an error with a retry button when loading fails', async () => {
    vi.mocked(tasksApi.list).mockRejectedValueOnce(new Error('Server exploded'))
    vi.mocked(tasksApi.list).mockResolvedValueOnce(paginated([makeTask()]))
    const wrapper = await mountView()

    expect(wrapper.find('.v-alert').text()).toContain('Server exploded')

    await wrapper.find('.v-alert button').trigger('click')
    await flushPromises()

    expect(tasksApi.list).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.v-alert').exists()).toBe(false)
  })

  describe('create / edit dialog', () => {
    function dialog() {
      return document.querySelector('.v-overlay--active .v-card')
    }

    it('opens an empty form with "New task"', async () => {
      vi.mocked(tasksApi.list).mockResolvedValue(paginated([makeTask()]))
      const wrapper = await mountView()

      const newButton = wrapper.findAll('button').find((b) => b.text() === 'New task')
      await newButton?.trigger('click')
      await flushPromises()

      expect(dialog()?.textContent).toContain('New task')
      expect(dialog()?.querySelector<HTMLInputElement>('input')?.value).toBe('')
    })

    it('opens a filled form with the row "Edit" button', async () => {
      vi.mocked(tasksApi.list).mockResolvedValue(paginated([makeTask({ title: 'Existing' })]))
      const wrapper = await mountView()

      const editButton = wrapper.findAll('tbody button').find((b) => b.text() === 'Edit')
      await editButton?.trigger('click')
      await flushPromises()

      expect(dialog()?.textContent).toContain('Edit task')
      expect(dialog()?.querySelector<HTMLInputElement>('input')?.value).toBe('Existing')
    })

    it('closes, shows a snackbar and reloads the list after saving', async () => {
      vi.mocked(tasksApi.list).mockResolvedValue(paginated([makeTask()]))
      const wrapper = await mountView()
      await wrapper
        .findAll('button')
        .find((b) => b.text() === 'New task')
        ?.trigger('click')
      await flushPromises()
      vi.mocked(tasksApi.list).mockClear()

      wrapper.findComponent(TaskForm).vm.$emit('saved', makeTask({ id: 99 }))
      await flushPromises()

      expect(tasksApi.list).toHaveBeenCalledWith({ page: 1, per_page: 15 })
      expect(document.body.textContent).toContain('Task created.')
    })
  })
})
