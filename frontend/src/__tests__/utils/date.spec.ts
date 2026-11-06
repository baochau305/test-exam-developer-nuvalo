import { describe, it, expect } from 'vitest'

import { fromIsoDate, toIsoDate } from '@/utils/date'

describe('date utils', () => {
  it('formats a date as YYYY-MM-DD using the local date', () => {
    expect(toIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(toIsoDate(new Date(2026, 10, 30, 0, 0))).toBe('2026-11-30')
  })

  it('parses YYYY-MM-DD as local midnight', () => {
    const date = fromIsoDate('2026-11-30')

    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(10)
    expect(date.getDate()).toBe(30)
    expect(date.getHours()).toBe(0)
  })

  it('round-trips', () => {
    expect(toIsoDate(fromIsoDate('2026-02-28'))).toBe('2026-02-28')
  })
})
