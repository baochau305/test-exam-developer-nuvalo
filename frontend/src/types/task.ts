import type { User } from './user'

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

export interface Task {
  id: number
  title: string
  description: string | null
  status: TaskStatus
  due_date: string | null
  assigned_to: number
  assignee?: User
  created_at: string
  updated_at: string
}
