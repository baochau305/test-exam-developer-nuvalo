import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import vuetify from '@/plugins/vuetify'
import App from '../App.vue'

describe('App', () => {
  it('renders inside the Vuetify app shell', () => {
    const wrapper = mount(App, { global: { plugins: [vuetify] } })

    expect(wrapper.find('.v-application').exists()).toBe(true)
    expect(wrapper.text()).toContain('Task Management')
  })
})
