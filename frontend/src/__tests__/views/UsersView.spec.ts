import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { AxiosError, AxiosHeaders } from 'axios'

import { usersApi } from '@/api/users'
import vuetify from '@/plugins/vuetify'
import { createAppStore, key } from '@/store'
import type { User } from '@/types/user'
import UsersView from '@/views/UsersView.vue'
import { paginated, userFixture } from '../fixtures/tasks'

vi.mock('@/api/users', () => ({
  usersApi: {
    list: vi.fn<typeof usersApi.list>(),
    delete: vi.fn<typeof usersApi.delete>(),
  },
}))

const admin: User = { ...userFixture, tasks_count: 0 }
const otherUser: User = {
  ...userFixture,
  id: 2,
  name: 'User 1',
  email: 'user1@gmail.com',
  role: 'user',
  tasks_count: 3,
}

async function mountView() {
  const store = createAppStore()
  store.commit('auth/SET_USER', admin)

  // attachTo: v-dialog content is teleported to <body>
  const wrapper = mount(UsersView, {
    attachTo: document.body,
    global: { plugins: [vuetify, [store, key]] },
  })
  await flushPromises()

  return wrapper
}

function row(wrapper: VueWrapper, name: string) {
  const found = wrapper.findAll('tbody tr').find((tr) => tr.text().includes(name))
  if (!found) throw new Error(`Row "${name}" not found`)
  return found
}

function button(wrapper: VueWrapper | ReturnType<VueWrapper['find']>, text: string) {
  return wrapper.findAll('button').find((b) => b.text() === text)
}

function dialogButton(text: string) {
  return [...document.querySelectorAll<HTMLButtonElement>('.v-overlay--active button')].find(
    (b) => b.textContent?.trim() === text,
  )
}

describe('UsersView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(usersApi.list).mockResolvedValue(paginated([admin, otherUser]))
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('lists users with their role and task count', async () => {
    const wrapper = await mountView()

    expect(usersApi.list).toHaveBeenCalledWith({ page: 1, per_page: 15 })
    expect(wrapper.findAll('thead th').map((th) => th.text())).toEqual([
      'Name',
      'Email',
      'Role',
      'Tasks',
      'Actions',
    ])
    expect(row(wrapper, 'User 1').text()).toContain('user1@gmail.com')
    expect(row(wrapper, 'User 1').text()).toContain('User')
    expect(row(wrapper, 'User 1').text()).toContain('3')
  })

  it('filters by role and goes back to the first page', async () => {
    const wrapper = await mountView()

    wrapper
      .findAllComponents({ name: 'VSelect' })
      .find((c) => c.props('label') === 'Role')
      ?.vm.$emit('update:modelValue', 'admin')
    await flushPromises()

    expect(usersApi.list).toHaveBeenLastCalledWith({ page: 1, per_page: 15, role: 'admin' })
  })

  it('does not allow deleting yourself', async () => {
    const wrapper = await mountView()

    expect(button(row(wrapper, 'Admin'), 'Delete')?.attributes('disabled')).toBeDefined()
    expect(button(row(wrapper, 'User 1'), 'Delete')?.attributes('disabled')).toBeUndefined()
  })

  it('asks for confirmation, warns about tasks, then deletes', async () => {
    vi.mocked(usersApi.delete).mockResolvedValue()
    const wrapper = await mountView()

    await button(row(wrapper, 'User 1'), 'Delete')?.trigger('click')
    await flushPromises()

    const dialogText = document.querySelector('.v-overlay--active .v-card')?.textContent
    expect(dialogText).toContain('Delete User 1 (user1@gmail.com)?')
    expect(dialogText).toContain('Their 3 task(s) will also be deleted.')
    expect(usersApi.delete).not.toHaveBeenCalled()

    vi.mocked(usersApi.list).mockClear()
    dialogButton('Delete')?.click()
    await flushPromises()

    expect(usersApi.delete).toHaveBeenCalledWith(2)
    expect(usersApi.list).toHaveBeenCalledOnce()
    expect(document.body.textContent).toContain('User deleted.')
  })

  it('shows the API error in the dialog when deleting fails', async () => {
    const config = { headers: new AxiosHeaders() }
    vi.mocked(usersApi.delete).mockRejectedValue(
      new AxiosError('Forbidden', 'ERR_BAD_REQUEST', config, null, {
        status: 403,
        statusText: '',
        headers: {},
        config,
        data: { message: 'You cannot delete your own account.' },
      }),
    )
    const wrapper = await mountView()

    await button(row(wrapper, 'User 1'), 'Delete')?.trigger('click')
    await flushPromises()
    dialogButton('Delete')?.click()
    await flushPromises()

    expect(document.querySelector('.v-overlay--active .v-alert')?.textContent).toContain(
      'You cannot delete your own account.',
    )
  })

  it('opens an empty form with "New user"', async () => {
    const wrapper = await mountView()

    await button(wrapper, 'New user')?.trigger('click')
    await flushPromises()

    expect(document.querySelector('.v-overlay--active .v-card')?.textContent).toContain('New user')
    expect(document.querySelector<HTMLInputElement>('.v-overlay--active input')?.value).toBe('')
  })

  it('opens a filled form with the row "Edit" button', async () => {
    const wrapper = await mountView()

    await button(row(wrapper, 'User 1'), 'Edit')?.trigger('click')
    await flushPromises()

    expect(document.querySelector('.v-overlay--active .v-card')?.textContent).toContain('Edit user')
    expect(document.querySelector<HTMLInputElement>('.v-overlay--active input')?.value).toBe(
      'User 1',
    )
  })
})
