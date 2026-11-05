import 'vue-router'

// Typed route meta: makes `to.meta.title` a string instead of `unknown`
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
  }
}


