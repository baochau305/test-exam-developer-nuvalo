import type { InjectionKey } from 'vue'
import { createStore, useStore as baseUseStore, type Store } from 'vuex'

import { auth } from './modules/auth'
import type { AppState, RootState } from './types'

export function createAppStore() {
  return createStore<RootState>({
    modules: { auth },
    // Throws when state is mutated outside a mutation (dev only, it is costly)
    strict: import.meta.env.DEV,
  }) as Store<AppState>
}

const store = createAppStore()

export const key: InjectionKey<Store<AppState>> = Symbol('store')

/** Typed version of Vuex's useStore, so `store.state.auth` is not `any` */
export function useStore() {
  return baseUseStore(key)
}

export default store
