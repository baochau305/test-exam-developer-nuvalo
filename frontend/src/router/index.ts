import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import store from '@/store'
import { createAuthGuard } from './guards'

const APP_NAME = 'Task Management'

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: 'Login', layout: 'blank', guestOnly: true },
  },
  {
    path: '/tasks',
    name: 'tasks',
    component: () => import('@/views/TasksListView.vue'),
    meta: { title: 'Tasks', requiresAuth: true },
  },
  {
    // Only numeric ids match, so /tasks/abc falls through to the catch-all
    path: '/tasks/:id(\\d+)',
    name: 'task-detail',
    component: () => import('@/views/TaskDetailView.vue'),
    props: (route) => ({ id: Number(route.params.id) }),
    meta: { title: 'Task detail', requiresAuth: true },
  },
  {
    path: '/users',
    name: 'users',
    component: () => import('@/views/UsersView.vue'),
    meta: { title: 'Users', requiresAuth: true, roles: ['admin'] },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'tasks' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(createAuthGuard(store))

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | ${APP_NAME}` : APP_NAME
})

export default router
