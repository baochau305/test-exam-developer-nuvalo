import type { Paginated } from '@/types/api'
import type { Task } from '@/types/task'
import type { User } from '@/types/user'

export const userFixture: User = {
  id: 1,
  name: 'Admin',
  email: 'admin@gmail.com',
  role: 'admin',
  created_at: '2026-11-05T00:00:00.000000Z',
  updated_at: '2026-11-05T00:00:00.000000Z',
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: 'Write tests',
    description: null,
    status: 'todo',
    due_date: '2026-11-30',
    assigned_to: userFixture.id,
    created_at: '2026-11-05T00:00:00.000000Z',
    updated_at: '2026-11-05T00:00:00.000000Z',
    ...overrides,
  }
}

export function paginated<T>(
  items: T[],
  { total = items.length, page = 1, perPage = 15 } = {},
): Paginated<T> {
  return {
    data: items,
    links: { first: null, last: null, prev: null, next: null },
    meta: {
      current_page: page,
      last_page: Math.max(1, Math.ceil(total / perPage)),
      per_page: perPage,
      total,
      from: items.length ? 1 : null,
      to: items.length || null,
    },
  }
}
