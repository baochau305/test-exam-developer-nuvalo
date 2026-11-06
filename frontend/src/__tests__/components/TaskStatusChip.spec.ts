import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import TaskStatusChip from '@/components/TaskStatusChip.vue'
import vuetify from '@/plugins/vuetify'
import type { TaskStatus } from '@/types/task'

describe('TaskStatusChip', () => {
  it.each<[TaskStatus, string, string]>([
    ['todo', 'Todo', 'grey'],
    ['in_progress', 'In progress', 'blue'],
    ['done', 'Done', 'green'],
  ])('renders %s as "%s" in %s', (status, label, color) => {
    const wrapper = mount(TaskStatusChip, {
      props: { status },
      global: { plugins: [vuetify] },
    })

    expect(wrapper.text()).toBe(label)
    expect(wrapper.find('.v-chip').classes()).toContain(`text-${color}`)
  })
})
