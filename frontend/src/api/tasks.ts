import http from './http'
import type { Paginated } from '@/types/api'
import type { Task, TaskStatus } from '@/types/task'

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
}
