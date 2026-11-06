import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import store, { key } from './store'
import vuetify from './plugins/vuetify'
import { onUnauthorized } from './api/interceptors'

const app = createApp(App)

app.use(store, key)
app.use(router)
app.use(vuetify)

// Token expired or revoked while using the app: drop it and go back to login
onUnauthorized(() => {
  store.commit('auth/CLEAR')

  const current = router.currentRoute.value
  if (current.meta.requiresAuth) {
    router.push({ name: 'login', query: { redirect: current.fullPath } })
  }
})

// Wait for the initial navigation so the correct layout is picked on first render
router.isReady().then(() => app.mount('#app'))
