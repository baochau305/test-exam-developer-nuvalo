import type { AuthState } from './modules/auth'

// Root has no state of its own, modules are added via `modules`
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RootState {}

/** Full state shape as seen from components: root + namespaced modules */
export interface AppState extends RootState {
  auth: AuthState
}
