export type UserRole = 'admin' | 'user'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  tasks_count?: number
  created_at: string
  updated_at: string
}

export interface UserPayload {
  name: string
  email: string
  password?: string
  role: UserRole
}
