import { describe, it, expect, beforeEach } from 'vitest'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

import { routes } from '@/router'

describe('router', () => {
  let router: Router

  beforeEach(() => {
    router = createRouter({ history: createMemoryHistory(), routes })
  })

  it('redirects / to the tasks list', async () => {
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('tasks')
  })

  it.each([
    ['/login', 'login'],
    ['/tasks', 'tasks'],
    ['/tasks/42', 'task-detail'],
  ])('resolves %s to the "%s" route', (path, name) => {
    expect(router.resolve(path).name).toBe(name)
  })

  it('passes the task id to the detail view as a number', async () => {
    await router.push('/tasks/42')
    const route = router.currentRoute.value
    const props = route.matched[0]?.props.default

    expect(typeof props === 'function' ? props(route) : props).toEqual({ id: 42 })
  })

  it.each(['/tasks/abc', '/unknown'])(
    'redirects unknown path %s to the tasks list',
    async (path) => {
      await router.push(path)
      expect(router.currentRoute.value.name).toBe('tasks')
    },
  )
})
