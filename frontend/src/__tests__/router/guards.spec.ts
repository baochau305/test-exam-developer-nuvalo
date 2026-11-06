import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import type { Store } from 'vuex'

import { authApi } from '@/api/auth'
import { tokenStorage } from '@/api/token'
import { routes } from '@/router'
import { createAuthGuard } from '@/router/guards'
import { createAppStore } from '@/store'
import type { AppState } from '@/store/types'
import type { User } from '@/types/user'

vi.mock('@/api/auth', () => ({
  authApi: {
    login: vi.fn<typeof authApi.login>(),
    me: vi.fn<typeof authApi.me>(),
    logout: vi.fn<typeof authApi.logout>(),
  },
}))

const user = { id: 1, name: 'Admin' } as User

describe('auth guard', () => {
  let store: Store<AppState>
  let router: Router

  function setup() {
    store = createAppStore()
    router = createRouter({ history: createMemoryHistory(), routes })
    router.beforeEach(createAuthGuard(store))
  }

  beforeEach(() => {
    vi.clearAllMocks()
    tokenStorage.clear()
  })

  it('sends guests to login and remembers the requested page', async () => {
    setup()

    await router.push('/tasks/5')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/tasks/5')
  })

  it('lets guests open the login page', async () => {
    setup()

    await router.push('/login')

    expect(router.currentRoute.value.name).toBe('login')
  })

  it('loads the user for a restored token, then allows the page', async () => {
    tokenStorage.set('token')
    vi.mocked(authApi.me).mockResolvedValue(user)
    setup()

    await router.push('/tasks')

    expect(authApi.me).toHaveBeenCalledOnce()
    expect(store.state.auth.user).toEqual(user)
    expect(router.currentRoute.value.name).toBe('tasks')
  })

  it('logs out and sends to login when the restored token is invalid', async () => {
    tokenStorage.set('expired-token')
    vi.mocked(authApi.me).mockRejectedValue(new Error('401'))
    setup()

    await router.push('/tasks')

    expect(store.getters['auth/isAuthenticated']).toBe(false)
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('sends logged-in users away from the login page', async () => {
    tokenStorage.set('token')
    setup()
    store.commit('auth/SET_USER', user)

    await router.push('/login')

    expect(router.currentRoute.value.name).toBe('tasks')
  })

  describe('role restricted pages', () => {
    it('lets admins open the users page', async () => {
      tokenStorage.set('token')
      setup()
      store.commit('auth/SET_USER', { ...user, role: 'admin' })

      await router.push('/users')

      expect(router.currentRoute.value.name).toBe('users')
    })

    it('sends non-admin users back to the tasks list', async () => {
      tokenStorage.set('token')
      setup()
      store.commit('auth/SET_USER', { ...user, role: 'user' })

      await router.push('/users')

      expect(router.currentRoute.value.name).toBe('tasks')
    })

    it('checks the role after reloading the page (user loaded by the guard)', async () => {
      tokenStorage.set('token')
      vi.mocked(authApi.me).mockResolvedValue({ ...user, role: 'user' })
      setup()

      await router.push('/users')

      expect(authApi.me).toHaveBeenCalledOnce()
      expect(router.currentRoute.value.name).toBe('tasks')
    })
  })
})
