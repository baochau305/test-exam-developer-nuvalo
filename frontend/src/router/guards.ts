import type { NavigationGuard } from 'vue-router'
import type { Store } from 'vuex'

import type { AppState } from '@/store/types'
// RouteMeta typings (requiresAuth, guestOnly, roles)
import './types'

export function createAuthGuard(store: Store<AppState>): NavigationGuard {
  return async (to) => {
    const isAuthenticated: boolean = store.getters['auth/isAuthenticated']

    if (to.meta.requiresAuth && !isAuthenticated) {
      // Remember where the user wanted to go, LoginView sends them back after login
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    if (to.meta.guestOnly && isAuthenticated) {
      return { name: 'tasks' }
    }

    // Token restored from localStorage after a reload: load the user it belongs to
    if (isAuthenticated && !store.state.auth.user) {
      try {
        await store.dispatch('auth/fetchMe')
      } catch {
        // Token expired or revoked
        store.commit('auth/CLEAR')
        return to.meta.requiresAuth ? { name: 'login', query: { redirect: to.fullPath } } : true
      }
    }

    // Checked after fetchMe, so the role is known even right after a reload
    const role = store.state.auth.user?.role
    if (to.meta.roles && (!role || !to.meta.roles.includes(role))) {
      return { name: 'tasks' }
    }

    return true
  }
}
