import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import { tasksApi } from '@/api/tasks'
import { usersApi } from '@/api/users'
import vuetify from '@/plugins/vuetify'
import { routes } from '@/router'
import { createAppStore, key } from '@/store'
import TaskForm from '@/components/TaskForm.vue'
import TaskDetailView from '@/views/TaskDetailView.vue'
import { makeTask, paginated, userFixture } from '../fixtures/tasks'

vi.mock('@/api/tasks', () => ({
  tasksApi: { get: vi.fn<typeof tasksApi.get>() },
}))
vi.mock('@/api/users', () => ({
  usersApi: { list: vi.fn<typeof usersApi.list>(async () => paginated([userFixture])) },
}))

let store: ReturnType<typeof createAppStore>

async function mountView(id: number) {
  store = createAppStore()
  store.commit('auth/SET_USER', userFixture)
  const router = createRouter({ history: createMemoryHistory(), routes })

  const wrapper = mount(TaskDetailView, {
    props: { id },
    attachTo: document.body,
    global: { plugins: [vuetify, router, [store, key]] },
  })
  await flushPromises()

  return wrapper
}

describe('TaskDetailView', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shows the task details', async () => {
    vi.mocked(tasksApi.get).mockResolvedValue(
      makeTask({ id: 3, title: 'Deploy', description: 'Ship it', status: 'done' }),
    )

    const wrapper = await mountView(3)

    expect(tasksApi.get).toHaveBeenCalledWith(3)
    expect(wrapper.find('.v-card-title').text()).toContain('Deploy')
    expect(wrapper.find('.v-chip').text()).toBe('Done')
    expect(wrapper.text()).toContain('Ship it')
    expect(wrapper.text()).toContain('Admin')
    expect(wrapper.text()).toContain('2026-11-30')
  })

  it('shows a placeholder when there is no description', async () => {
    vi.mocked(tasksApi.get).mockResolvedValue(makeTask({ description: null }))

    const wrapper = await mountView(1)

    expect(wrapper.text()).toContain('No description.')
  })

  it('shows an error and retries', async () => {
    vi.mocked(tasksApi.get).mockRejectedValueOnce(new Error('Server exploded'))
    vi.mocked(tasksApi.get).mockResolvedValueOnce(makeTask({ title: 'Recovered' }))
    const wrapper = await mountView(1)

    expect(wrapper.find('.v-alert').text()).toContain('Server exploded')

    await wrapper.find('.v-alert button').trigger('click')
    await flushPromises()

    expect(wrapper.find('.v-alert').exists()).toBe(false)
    expect(wrapper.text()).toContain('Recovered')
  })

  it('loads the new task when the id changes', async () => {
    vi.mocked(tasksApi.get).mockResolvedValueOnce(makeTask({ id: 1, title: 'First' }))
    vi.mocked(tasksApi.get).mockResolvedValueOnce(makeTask({ id: 2, title: 'Second' }))
    const wrapper = await mountView(1)

    await wrapper.setProps({ id: 2 })
    await flushPromises()

    expect(tasksApi.get).toHaveBeenLastCalledWith(2)
    expect(wrapper.text()).toContain('Second')
  })

  it('edits the task in a dialog and shows the saved values', async () => {
    vi.mocked(tasksApi.get).mockResolvedValue(makeTask({ id: 1, title: 'Before' }))
    const wrapper = await mountView(1)

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Edit')
      ?.trigger('click')
    await flushPromises()
    expect(document.querySelector('.v-overlay--active input')).not.toBeNull()

    // TaskForm saves through the store, which replaces the current task
    store.commit('tasks/TASK_UPDATED', makeTask({ id: 1, title: 'After' }))
    wrapper.findComponent(TaskForm).vm.$emit('saved', makeTask({ id: 1, title: 'After' }))
    await flushPromises()

    expect(wrapper.find('.v-card-title').text()).toContain('After')
    expect(document.body.textContent).toContain('Task updated.')
  })
})
