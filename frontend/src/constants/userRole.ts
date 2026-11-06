import type { UserRole } from '@/types/user'

export const USER_ROLES: UserRole[] = ['admin', 'user']

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  user: 'User',
}

/** Options for v-select */
export const USER_ROLE_OPTIONS = USER_ROLES.map((role) => ({
  title: USER_ROLE_LABELS[role],
  value: role,
}))
