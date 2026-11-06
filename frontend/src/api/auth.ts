import http from './http'
import type { ApiResource } from '@/types/api'
import type { User } from '@/types/user'

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResult {
  token: string
  token_type: 'Bearer'
  user: User
}

export const authApi = {
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    const { data } = await http.post<ApiResource<LoginResult>>('/auth/login', credentials)
    return data.data
  },

  async me(): Promise<User> {
    const { data } = await http.get<ApiResource<User>>('/auth/me')
    return data.data
  },

  async logout(): Promise<void> {
    await http.post('/auth/logout')
  },
}
