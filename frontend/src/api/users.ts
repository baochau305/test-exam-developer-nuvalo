import http from './http'
import type { ApiResource, Paginated } from '@/types/api'
import type { User, UserPayload, UserRole } from '@/types/user'

/** Query params accepted by GET /api/users */
export interface UserListParams {
  page?: number
  per_page?: number
  role?: UserRole
  /** Search by name or email */
  search?: string
}

export const usersApi = {
  async list(params: UserListParams = {}): Promise<Paginated<User>> {
    const { data } = await http.get<Paginated<User>>('/users', { params })
    return data
  },

  async create(payload: UserPayload): Promise<User> {
    const { data } = await http.post<ApiResource<User>>('/users', payload)
    return data.data
  },

  async update(id: number, payload: Partial<UserPayload>): Promise<User> {
    const { data } = await http.put<ApiResource<User>>(`/users/${id}`, payload)
    return data.data
  },

  async delete(id: number): Promise<void> {
    await http.delete(`/users/${id}`)
  },
}
