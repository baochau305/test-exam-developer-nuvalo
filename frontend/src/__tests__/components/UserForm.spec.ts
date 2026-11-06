import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { AxiosError, AxiosHeaders } from 'axios'

import { usersApi } from '@/api/users'
import UserForm from '@/components/UserForm.vue'
import vuetify from '@/plugins/vuetify'
import { createAppStore, key } from '@/store'
import type { User } from '@/types/user'
import { userFixture } from '../fixtures/tasks'

vi.mock('@/api/users', () => ({
  usersApi: {
    create: vi.fn<typeof usersApi.create>(),
    update: vi.fn<typeof usersApi.update>(),
  },
}))

const otherUser: User = {
  ...userFixture,
  id: 2,
  name: 'User 1',
  email: 'user1@gmail.com',
  role: 'user',
}

async function mountForm(user?: User) {
  const store = createAppStore()
  // Logged in as the admin fixture
  store.commit('auth/SET_USER', userFixture)

  const wrapper = mount(UserForm, {
    props: { user },
    global: { plugins: [vuetify, [store, key]] },
  })
  await flushPromises()

  return wrapper
}

function field(wrapper: VueWrapper, label: string) {
  const input = wrapper
    .findAll('.v-input')
    .find((el) => el.find('label').text().replace(' *', '') === label)
  if (!input) throw new Error(`Field "${label}" not found`)
  return input
}

function roleSelect(wrapper: VueWrapper) {
  return wrapper.findComponent({ name: 'VSelect' })
}

async function submit(wrapper: VueWrapper) {
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('UserForm', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('create mode', () => {
    it('requires name, email and password', async () => {
      const wrapper = await mountForm()

      await submit(wrapper)

      expect(usersApi.create).not.toHaveBeenCalled()
      for (const label of ['Name', 'Email', 'Password']) {
        expect(field(wrapper, label).text()).toContain('This field is required.')
      }
    })

    it('checks the email format and the password length', async () => {
      const wrapper = await mountForm()

      await field(wrapper, 'Email').find('input').setValue('not-an-email')
      await field(wrapper, 'Password').find('input').setValue('short')
      await submit(wrapper)

      expect(field(wrapper, 'Email').text()).toContain('Email must be valid.')
      expect(field(wrapper, 'Password').text()).toContain('Must be at least 8 characters.')
    })

    it('creates the user with role "user" by default', async () => {
      vi.mocked(usersApi.create).mockResolvedValue(otherUser)
      const wrapper = await mountForm()

      await field(wrapper, 'Name').find('input').setValue(' User 1 ')
      await field(wrapper, 'Email').find('input').setValue('user1@gmail.com')
      await field(wrapper, 'Password').find('input').setValue('secret123')
      await submit(wrapper)

      expect(usersApi.create).toHaveBeenCalledWith({
        name: 'User 1',
        email: 'user1@gmail.com',
        password: 'secret123',
        role: 'user',
      })
      expect(wrapper.emitted('saved')).toEqual([[otherUser]])
    })

    it('shows API validation errors under the matching inputs', async () => {
      const config = { headers: new AxiosHeaders() }
      vi.mocked(usersApi.create).mockRejectedValue(
        new AxiosError('Unprocessable', 'ERR_BAD_REQUEST', config, null, {
          status: 422,
          statusText: '',
          headers: {},
          config,
          data: { message: 'Invalid', errors: { email: ['The email has already been taken.'] } },
        }),
      )
      const wrapper = await mountForm()

      await field(wrapper, 'Name').find('input').setValue('Admin 2')
      await field(wrapper, 'Email').find('input').setValue('admin@gmail.com')
      await field(wrapper, 'Password').find('input').setValue('secret123')
      await submit(wrapper)

      expect(field(wrapper, 'Email').text()).toContain('The email has already been taken.')
    })
  })

  describe('edit mode', () => {
    it('is filled with the user and leaves the password empty', async () => {
      const wrapper = await mountForm(otherUser)

      expect(field(wrapper, 'Name').find('input').element.value).toBe('User 1')
      expect(field(wrapper, 'Email').find('input').element.value).toBe('user1@gmail.com')
      expect(field(wrapper, 'New password').find('input').element.value).toBe('')
      expect(roleSelect(wrapper).props('modelValue')).toBe('user')
    })

    it('does not send the password when it is left empty', async () => {
      vi.mocked(usersApi.update).mockResolvedValue(otherUser)
      const wrapper = await mountForm(otherUser)

      roleSelect(wrapper).vm.$emit('update:modelValue', 'admin')
      await submit(wrapper)

      expect(usersApi.update).toHaveBeenCalledWith(2, {
        name: 'User 1',
        email: 'user1@gmail.com',
        role: 'admin',
      })
    })

    it('sends a new password when one is typed', async () => {
      vi.mocked(usersApi.update).mockResolvedValue(otherUser)
      const wrapper = await mountForm(otherUser)

      await field(wrapper, 'New password').find('input').setValue('newsecret')
      await submit(wrapper)

      expect(usersApi.update).toHaveBeenCalledWith(
        2,
        expect.objectContaining({ password: 'newsecret' }),
      )
    })

    it('does not let users change their own role', async () => {
      const wrapper = await mountForm(userFixture)

      expect(roleSelect(wrapper).props('disabled')).toBe(true)
      expect(wrapper.text()).toContain('You cannot change your own role.')
    })

    it('lets admins change the role of other users', async () => {
      const wrapper = await mountForm(otherUser)

      expect(roleSelect(wrapper).props('disabled')).toBe(false)
    })
  })
})
