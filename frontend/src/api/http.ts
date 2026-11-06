import axios from 'axios'

import { tokenStorage } from './token'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    // Makes Laravel return JSON (incl. validation/auth errors) instead of redirects
    Accept: 'application/json',
  },
})

http.interceptors.request.use((config) => {
  const token = tokenStorage.get()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default http
