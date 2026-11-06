import axios from 'axios'

import http from './http'

/**
 * Calls `onUnauthorized` whenever an authenticated request gets a 401
 * (token expired or revoked). Registered from main.ts so the api layer
 * does not depend on the store or the router.
 */
export function onUnauthorized(handler: () => void) {
  return http.interceptors.response.use(undefined, (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      error.config?.headers.Authorization
    ) {
      handler()
    }

    return Promise.reject(error)
  })
}
