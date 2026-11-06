import { describe, it, expect, vi, afterEach } from 'vitest'
import { nextTick, ref } from 'vue'

import { useDebounced } from '@/composables/useDebounced'

describe('useDebounced', () => {
  afterEach(() => vi.useRealTimers())

  it('only takes the last value once changes stop for the delay', async () => {
    vi.useFakeTimers()
    const source = ref('a')
    const debounced = useDebounced(source, 300)

    source.value = 'ab'
    await nextTick()
    vi.advanceTimersByTime(200)
    source.value = 'abc'
    await nextTick()
    vi.advanceTimersByTime(299)
    expect(debounced.value).toBe('a')

    vi.advanceTimersByTime(1)
    expect(debounced.value).toBe('abc')
  })
})
