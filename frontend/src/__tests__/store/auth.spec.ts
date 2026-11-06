import { describe, it, expect, vi, beforeEach } from 'vitest'

import { authApi } from '@/api/auth'
import { tokenStorage } from '@/api/token'
import { createAppStore } from '@/store'
import type { User } from '@/types/user'

vi.mock('@/api/auth', () => ({
  authApi: {
    login: vi.fn<typeof authApi.login>(),
    me: vi.fn<typeof authApi.me>(),
    logout: vi.fn<typeof authApi.logout>(),
  },
}))

const user: User = {
  id: 1,
  name: 'Admin',
  email: 'admin@gmail.com',
  role: 'admin',
  created_at: '2026-11-05T00:00:00.000000Z',
  updated_at: '2026-11-05T00:00:00.000000Z',
}

describe('auth store module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tokenStorage.clear()
  })

  it('restores the token from storage', () => {
    tokenStorage.set('saved-token')

    const store = createAppStore()

    expect(store.state.auth.token).toBe('saved-token')
    expect(store.getters['auth/isAuthenticated']).toBe(true)
  })

  it('stores token and user after login', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ token: 'new-token', token_type: 'Bearer', user })
    const store = createAppStore()

    await store.dispatch('auth/login', { email: user.email, password: 'secret' })

    expect(authApi.login).toHaveBeenCalledWith({ email: user.email, password: 'secret' })
    expect(store.state.auth.user).toEqual(user)
    expect(store.getters['auth/isAuthenticated']).toBe(true)
    expect(tokenStorage.get()).toBe('new-token')
  })

  it('keeps the user logged out when login fails', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid credentials'))
    const store = createAppStore()

    await expect(store.dispatch('auth/login', { email: 'x@y.z', password: 'bad' })).rejects.toThrow(
      'Invalid credentials',
    )

    expect(store.getters['auth/isAuthenticated']).toBe(false)
    expect(tokenStorage.get()).toBeNull()
  })

  it('loads the current user', async () => {
    vi.mocked(authApi.me).mockResolvedValue(user)
    const store = createAppStore()

    await store.dispatch('auth/fetchMe')

    expect(store.state.auth.user).toEqual(user)
  })

  it.each([
    ['succeeds', () => vi.mocked(authApi.logout).mockResolvedValue()],
    ['fails', () => vi.mocked(authApi.logout).mockRejectedValue(new Error('401'))],
  ])('clears the session on logout even when the API call %s', async (_, mockLogout) => {
    mockLogout()
    tokenStorage.set('token')
    const store = createAppStore()
    store.commit('auth/SET_USER', user)

    await store.dispatch('auth/logout')

    expect(store.state.auth.token).toBeNull()
    expect(store.state.auth.user).toBeNull()
    expect(tokenStorage.get()).toBeNull()
  })
})
