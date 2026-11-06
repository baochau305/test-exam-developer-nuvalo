import { describe, it, expect, vi, beforeEach } from 'vitest'

import { usersApi } from '@/api/users'
import { createAppStore } from '@/store'
import { paginated, userFixture } from '../fixtures/tasks'

vi.mock('@/api/users', () => ({
  usersApi: {
    list: vi.fn<typeof usersApi.list>(),
    create: vi.fn<typeof usersApi.create>(),
    update: vi.fn<typeof usersApi.update>(),
    delete: vi.fn<typeof usersApi.delete>(),
  },
}))

describe('users store module', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads users with the maximum page size', async () => {
    vi.mocked(usersApi.list).mockResolvedValue(paginated([userFixture]))
    const store = createAppStore()

    await store.dispatch('users/fetchUsers')

    expect(usersApi.list).toHaveBeenCalledWith({ per_page: 100 })
    expect(store.state.users.items).toEqual([userFixture])
    expect(store.state.users.loaded).toBe(true)
  })

  it('only calls the API once, unless forced', async () => {
    vi.mocked(usersApi.list).mockResolvedValue(paginated([userFixture]))
    const store = createAppStore()

    await store.dispatch('users/fetchUsers')
    await store.dispatch('users/fetchUsers')
    expect(usersApi.list).toHaveBeenCalledOnce()

    await store.dispatch('users/fetchUsers', { force: true })
    expect(usersApi.list).toHaveBeenCalledTimes(2)
  })

  it('does not start a second request while one is in flight', async () => {
    vi.mocked(usersApi.list).mockResolvedValue(paginated([userFixture]))
    const store = createAppStore()

    await Promise.all([store.dispatch('users/fetchUsers'), store.dispatch('users/fetchUsers')])

    expect(usersApi.list).toHaveBeenCalledOnce()
  })

  it('stores an error and allows retrying', async () => {
    vi.mocked(usersApi.list).mockRejectedValueOnce(new Error('Server exploded'))
    vi.mocked(usersApi.list).mockResolvedValueOnce(paginated([userFixture]))
    const store = createAppStore()

    await store.dispatch('users/fetchUsers')
    expect(store.state.users.error).toBe('Server exploded')
    expect(store.state.users.loaded).toBe(false)

    await store.dispatch('users/fetchUsers')
    expect(store.state.users.error).toBeNull()
    expect(store.state.users.items).toEqual([userFixture])
  })

  describe('user management', () => {
    const otherUser = { ...userFixture, id: 2, name: 'User 1', role: 'user' as const }

    it('loads one page of users with filters', async () => {
      vi.mocked(usersApi.list).mockResolvedValue(paginated([otherUser], { total: 30 }))
      const store = createAppStore()

      await store.dispatch('users/fetchUsersPage', {
        page: 2,
        per_page: 15,
        role: 'user',
        search: 'us',
      })

      expect(usersApi.list).toHaveBeenCalledWith({
        page: 2,
        per_page: 15,
        role: 'user',
        search: 'us',
      })
      expect(store.state.users.page.items).toEqual([otherUser])
      expect(store.state.users.page.total).toBe(30)
      expect(store.state.users.page.loading).toBe(false)
    })

    it('stores page errors', async () => {
      vi.mocked(usersApi.list).mockRejectedValue(new Error('Server exploded'))
      const store = createAppStore()

      await store.dispatch('users/fetchUsersPage', { page: 1 })

      expect(store.state.users.page.error).toBe('Server exploded')
    })

    it.each([
      ['createUser', () => vi.mocked(usersApi.create).mockResolvedValue(otherUser), { name: 'x' }],
      [
        'updateUser',
        () => vi.mocked(usersApi.update).mockResolvedValue(otherUser),
        { id: 2, payload: {} },
      ],
      ['deleteUser', () => vi.mocked(usersApi.delete).mockResolvedValue(), 2],
    ])('%s makes the assignee select reload users', async (action, mock, payload) => {
      mock()
      vi.mocked(usersApi.list).mockResolvedValue(paginated([userFixture]))
      const store = createAppStore()
      await store.dispatch('users/fetchUsers')

      await store.dispatch(`users/${action}`, payload)
      await store.dispatch('users/fetchUsers')

      expect(usersApi.list).toHaveBeenCalledTimes(2)
    })

    it('updates the logged-in user when they edit themselves', async () => {
      const renamed = { ...userFixture, name: 'Renamed' }
      vi.mocked(usersApi.update).mockResolvedValue(renamed)
      const store = createAppStore()
      store.commit('auth/SET_USER', userFixture)

      await store.dispatch('users/updateUser', { id: userFixture.id, payload: { name: 'Renamed' } })

      expect(store.state.auth.user).toEqual(renamed)
    })

    it('does not touch the logged-in user when editing someone else', async () => {
      vi.mocked(usersApi.update).mockResolvedValue(otherUser)
      const store = createAppStore()
      store.commit('auth/SET_USER', userFixture)

      await store.dispatch('users/updateUser', { id: 2, payload: { name: 'User 1' } })

      expect(store.state.auth.user).toEqual(userFixture)
    })

    it('lets delete errors reach the caller', async () => {
      vi.mocked(usersApi.delete).mockRejectedValue(new Error('You cannot delete your own account.'))
      const store = createAppStore()

      await expect(store.dispatch('users/deleteUser', 1)).rejects.toThrow(
        'You cannot delete your own account.',
      )
    })
  })
})
