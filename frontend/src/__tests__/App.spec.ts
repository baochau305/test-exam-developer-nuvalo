import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import { tasksApi } from '@/api/tasks'
import { tokenStorage } from '@/api/token'
import vuetify from '@/plugins/vuetify'
import { routes } from '@/router'
import { createAppStore, key } from '@/store'
import type { User } from '@/types/user'
import App from '../App.vue'
import { paginated, userFixture } from './fixtures/tasks'

vi.mock('@/api/tasks', () => ({
  tasksApi: { list: vi.fn<typeof tasksApi.list>(async () => paginated([])) },
}))

const admin = userFixture
const regularUser = { ...userFixture, id: 2, name: 'User 1', role: 'user' as const }

async function mountAt(path: string, { user }: { user: User | null }) {
  const store = createAppStore()
  if (user) {
    store.commit('auth/SET_TOKEN', 'token')
    store.commit('auth/SET_USER', user)
  }

  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(path)

  const wrapper = mount(App, { global: { plugins: [vuetify, router, [store, key]] } })
  await flushPromises()

  return wrapper
}

describe('App', () => {
  afterEach(() => tokenStorage.clear())

  it('renders pages with the default layout (app bar + navigation drawer)', async () => {
    const wrapper = await mountAt('/tasks', { user: admin })

    expect(wrapper.find('.v-app-bar').exists()).toBe(true)
    expect(wrapper.find('.v-app-bar').text()).toContain('Admin')
    expect(wrapper.find('.v-navigation-drawer').exists()).toBe(true)
    expect(wrapper.find('.v-main').text()).toContain('Tasks')
  })

  it('renders the login page with the blank layout', async () => {
    const wrapper = await mountAt('/login', { user: null })

    expect(wrapper.find('.v-app-bar').exists()).toBe(false)
    expect(wrapper.find('.v-navigation-drawer').exists()).toBe(false)
    expect(wrapper.find('.v-main').text()).toContain('Login')
  })

  it("shows the current user's name and role in the top bar", async () => {
    const wrapper = await mountAt('/tasks', { user: regularUser })

    expect(wrapper.find('.v-app-bar').text()).toContain('User 1 (User)')
  })

  it.each([
    ['admins', admin, true],
    ['regular users', regularUser, false],
  ])('Users menu item visibility for %s', async (_, user, visible) => {
    const wrapper = await mountAt('/tasks', { user })

    const items = wrapper.findAll('.v-navigation-drawer .v-list-item').map((item) => item.text())
    expect(items.includes('Users')).toBe(visible)
  })
})
