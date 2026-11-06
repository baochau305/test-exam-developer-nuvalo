import http from './http'
import type { ApiResource, Paginated } from '@/types/api'
import type { Task, TaskPayload, TaskStatus } from '@/types/task'

/** Query params accepted by GET /api/tasks */
export interface TaskListParams {
  page?: number
  per_page?: number
  status?: TaskStatus
  assigned_to?: number
  /** Search by title */
  search?: string
}

export const tasksApi = {
  async list(params: TaskListParams = {}): Promise<Paginated<Task>> {
    const { data } = await http.get<Paginated<Task>>('/tasks', { params })
    return data
  },

  async get(id: number): Promise<Task> {
    const { data } = await http.get<ApiResource<Task>>(`/tasks/${id}`)
    return data.data
  },

  async create(payload: TaskPayload): Promise<Task> {
    const { data } = await http.post<ApiResource<Task>>('/tasks', payload)
    return data.data
  },

  async update(id: number, payload: Partial<TaskPayload>): Promise<Task> {
    const { data } = await http.put<ApiResource<Task>>(`/tasks/${id}`, payload)
    return data.data
  },
}
