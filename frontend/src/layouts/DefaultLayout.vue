<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { USER_ROLE_LABELS } from '@/constants/userRole'
import { useStore } from '@/store'

interface NavItem {
  title: string
  icon: string
  to: string
  adminOnly?: boolean
}

const allNavItems: NavItem[] = [
  { title: 'Tasks', icon: 'mdi-format-list-checkbox', to: '/tasks' },
  { title: 'Users', icon: 'mdi-account-multiple', to: '/users', adminOnly: true },
]

// null lets Vuetify decide: open on desktop, closed on mobile
const drawer = ref<boolean | null>(null)

const store = useStore()
const router = useRouter()

const user = computed(() => store.state.auth.user)
const isAdmin = computed<boolean>(() => store.getters['auth/isAdmin'])

// Hiding the link is only cosmetic, the route itself is protected by the guard (meta.roles)
const navItems = computed(() => allNavItems.filter((item) => !item.adminOnly || isAdmin.value))

async function logout() {
  await store.dispatch('auth/logout')
  await router.push({ name: 'login' })
}
</script>

<template>
  <v-app-bar density="compact" border flat>
    <v-app-bar-nav-icon @click="drawer = !drawer" />
    <v-app-bar-title>Task Management</v-app-bar-title>

    <span v-if="user" class="text-body-2 mr-2">
      {{ user.name }} ({{ USER_ROLE_LABELS[user.role] }})
    </span>
    <v-btn variant="text" @click="logout">Logout</v-btn>
  </v-app-bar>

  <v-navigation-drawer v-model="drawer">
    <v-list nav density="compact">
      <v-list-item
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        :prepend-icon="item.icon"
        :title="item.title"
      />
    </v-list>
  </v-navigation-drawer>

  <v-main>
    <v-container>
      <slot />
    </v-container>
  </v-main>
</template>
