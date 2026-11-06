import { TASK_STATUSES, type TaskStatus } from '@/types/task'

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Todo',
  in_progress: 'In progress',
  done: 'Done',
}

/** Vuetify color names used by the status chip */
export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'grey',
  in_progress: 'blue',
  done: 'green',
}

/** Options for v-select */
export const TASK_STATUS_OPTIONS = TASK_STATUSES.map((status) => ({
  title: TASK_STATUS_LABELS[status],
  value: status,
}))
