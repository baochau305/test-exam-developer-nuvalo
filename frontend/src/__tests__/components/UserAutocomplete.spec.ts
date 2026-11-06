import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'

import { usersApi } from '@/api/users'
import UserAutocomplete from '@/components/UserAutocomplete.vue'
import vuetify from '@/plugins/vuetify'
import type { User } from '@/types/user'
import { paginated, userFixture } from '../fixtures/tasks'

vi.mock('@/api/users', () => ({
  usersApi: { list: vi.fn<typeof usersApi.list>() },
}))

const otherUser: User = { ...userFixture, id: 2, name: 'User 1', email: 'user1@gmail.com' }

function mountAutocomplete() {
  return mount(UserAutocomplete, {
    props: { modelValue: null },
    global: { plugins: [vuetify] },
  })
}

function autocomplete(wrapper: VueWrapper) {
  return wrapper.findComponent({ name: 'VAutocomplete' })
}

async function typeSearch(wrapper: VueWrapper, text: string) {
  autocomplete(wrapper).vm.$emit('update:search', text)
  await vi.advanceTimersByTimeAsync(400)
  await flushPromises()
}

describe('UserAutocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.mocked(usersApi.list).mockResolvedValue(paginated([userFixture, otherUser]))
  })
  afterEach(() => vi.useRealTimers())

  it('loads the first users only when the list is opened', async () => {
    const wrapper = mountAutocomplete()
    await flushPromises()
    expect(usersApi.list).not.toHaveBeenCalled()

    autocomplete(wrapper).vm.$emit('update:menu', true)
    await flushPromises()

    expect(usersApi.list).toHaveBeenCalledWith({ per_page: 20 })
    expect(autocomplete(wrapper).props('items')).toEqual([userFixture, otherUser])
  })

  it('searches the API once the user stops typing', async () => {
    const wrapper = mountAutocomplete()
    vi.mocked(usersApi.list).mockResolvedValue(paginated([otherUser]))

    autocomplete(wrapper).vm.$emit('update:search', 'us')
    await vi.advanceTimersByTimeAsync(200)
    await typeSearch(wrapper, ' user1 ')

    expect(usersApi.list).toHaveBeenCalledOnce()
    expect(usersApi.list).toHaveBeenCalledWith({ search: 'user1', per_page: 20 })
    expect(autocomplete(wrapper).props('items')).toEqual([otherUser])
  })

  it('ignores results of an older search that come back late', async () => {
    let resolveFirst!: (value: ReturnType<typeof paginated<User>>) => void
    vi.mocked(usersApi.list)
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce(paginated([otherUser]))
    const wrapper = mountAutocomplete()

    await typeSearch(wrapper, 'a')
    await typeSearch(wrapper, 'user1')
    resolveFirst(paginated([userFixture]))
    await flushPromises()

    expect(autocomplete(wrapper).props('items')).toEqual([otherUser])
  })

  it('emits the id of the selected user, and null when cleared', async () => {
    const wrapper = mountAutocomplete()

    autocomplete(wrapper).vm.$emit('update:modelValue', otherUser)
    await flushPromises()
    autocomplete(wrapper).vm.$emit('update:modelValue', null)
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toEqual([[2], [null]])
  })

  it('does not search again for the name of the selected user', async () => {
    const wrapper = mountAutocomplete()
    autocomplete(wrapper).vm.$emit('update:modelValue', otherUser)

    await typeSearch(wrapper, 'User 1')

    expect(usersApi.list).not.toHaveBeenCalled()
  })

  it('shows a load error in the list', async () => {
    vi.mocked(usersApi.list).mockRejectedValue(new Error('Server exploded'))
    const wrapper = mountAutocomplete()

    await typeSearch(wrapper, 'x')

    expect(autocomplete(wrapper).props('noDataText')).toBe('Server exploded')
  })
})
