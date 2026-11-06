import { describe, it, expect } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'

import { getErrorMessage } from '@/api/errors'

function axiosErrorWithResponse(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() }

  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  })
}

describe('getErrorMessage', () => {
  it('uses the message returned by the API', () => {
    const error = axiosErrorWithResponse(422, { message: 'The email field is required.' })

    expect(getErrorMessage(error)).toBe('The email field is required.')
  })

  it('falls back when the API response has no message', () => {
    expect(getErrorMessage(axiosErrorWithResponse(500, ''), 'Failed')).toBe('Failed')
  })

  it('reports network errors', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK')

    expect(getErrorMessage(error)).toBe('Cannot reach the server. Please check your connection.')
  })

  it('handles non-axios errors', () => {
    expect(getErrorMessage(new Error('Boom'))).toBe('Boom')
    expect(getErrorMessage('???', 'Failed')).toBe('Failed')
  })
})
