export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

export interface Task {
  id: number
  title: string
  description: string | null
  status: TaskStatus
  due_date: string | null
  assigned_to: number
  created_at: string
  updated_at: string
}

/** Body of POST /api/tasks (all fields) and PUT /api/tasks/{id} (any subset) */
export interface TaskPayload {
  title: string
  description: string | null
  status: TaskStatus
  assigned_to: number
  due_date: string | null
}
