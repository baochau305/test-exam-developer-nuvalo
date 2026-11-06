import 'vue-router'

import type { UserRole } from '@/types/user'

// Typed route meta: makes `to.meta.title` a string instead of `unknown`
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    /** Layout wrapping the page, defaults to 'default' (app bar + navigation drawer) */
    layout?: 'default' | 'blank'
    /** Page needs a logged-in user, guests are sent to /login */
    requiresAuth?: boolean
    /** Page is only for guests (e.g. login), logged-in users are sent to /tasks */
    guestOnly?: boolean
    /** Only users with one of these roles can open the page, others are sent to /tasks */
    roles?: UserRole[]
  }
}
