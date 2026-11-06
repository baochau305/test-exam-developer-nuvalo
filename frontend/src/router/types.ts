import 'vue-router'

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
  }
}
