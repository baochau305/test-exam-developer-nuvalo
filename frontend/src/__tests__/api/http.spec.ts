import { describe, it, expect, afterEach } from 'vitest'
import type { AxiosAdapter } from 'axios'

import http from '@/api/http'
import { tokenStorage } from '@/api/token'

// Fake adapter: echoes the outgoing request config back instead of hitting the network
const echoAdapter: AxiosAdapter = async (config) => ({
  data: config,
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
})

describe('http client', () => {
  afterEach(() => tokenStorage.clear())

  it('sends requests to /api and asks for JSON', async () => {
    const { data } = await http.get('/tasks', { adapter: echoAdapter })

    expect(data.baseURL).toBe('/api')
    expect(data.headers.Accept).toBe('application/json')
  })

  it('attaches the bearer token when one is stored', async () => {
    tokenStorage.set('abc123')

    const { data } = await http.get('/tasks', { adapter: echoAdapter })

    expect(data.headers.Authorization).toBe('Bearer abc123')
  })

  it('does not send an Authorization header without a token', async () => {
    const { data } = await http.get('/tasks', { adapter: echoAdapter })

    expect(data.headers.Authorization).toBeUndefined()
  })
})
