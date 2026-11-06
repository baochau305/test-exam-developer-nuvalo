import type { Module } from 'vuex'

import { authApi, type LoginCredentials } from '@/api/auth'
import { tokenStorage } from '@/api/token'
import type { User } from '@/types/user'
import type { RootState } from '../types'

export interface AuthState {
  token: string | null
  user: User | null
}

export const auth: Module<AuthState, RootState> = {
  namespaced: true,

  state: () => ({
    // Restore the token so a page reload keeps the user logged in
    token: tokenStorage.get(),
    user: null,
  }),

  getters: {
    isAuthenticated: (state) => state.token !== null,
    isAdmin: (state) => state.user?.role === 'admin',
  },

  mutations: {
    SET_TOKEN(state, token: string) {
      state.token = token
      tokenStorage.set(token)
    },
    SET_USER(state, user: User) {
      state.user = user
    },
    CLEAR(state) {
      state.token = null
      state.user = null
      tokenStorage.clear()
    },
  },

  actions: {
    async login({ commit }, credentials: LoginCredentials) {
      const { token, user } = await authApi.login(credentials)

      commit('SET_TOKEN', token)
      commit('SET_USER', user)
    },

    async fetchMe({ commit }) {
      commit('SET_USER', await authApi.me())
    },

    async logout({ commit }) {
      // Log out locally even if the server call fails (e.g. token already revoked)
      await authApi.logout().catch(() => {})
      commit('CLEAR')
    },
  },
}
