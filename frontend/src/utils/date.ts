// The API uses date-only strings (YYYY-MM-DD) while v-date-picker works with Date objects.
// Both helpers use local time on purpose: `new Date('2026-11-30')` is parsed as UTC midnight,
// which shows up as the previous day in timezones behind UTC.

/** Date -> 'YYYY-MM-DD' (local date) */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/** 'YYYY-MM-DD' -> Date at local midnight */
export function fromIsoDate(value: string): Date {
  const [year = 0, month = 1, day = 1] = value.split('-').map(Number)

  return new Date(year, month - 1, day)
}
