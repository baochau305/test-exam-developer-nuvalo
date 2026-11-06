import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { AxiosError, AxiosHeaders } from 'axios'

import { tasksApi } from '@/api/tasks'
import { usersApi } from '@/api/users'
import TaskForm from '@/components/TaskForm.vue'
import vuetify from '@/plugins/vuetify'
import { createAppStore, key } from '@/store'
import type { Task } from '@/types/task'
import type { User } from '@/types/user'
import { makeTask, paginated, userFixture } from '../fixtures/tasks'

vi.mock('@/api/tasks', () => ({
  tasksApi: {
    create: vi.fn<typeof tasksApi.create>(),
    update: vi.fn<typeof tasksApi.update>(),
  },
}))
vi.mock('@/api/users', () => ({
  usersApi: { list: vi.fn<typeof usersApi.list>() },
}))

const otherUser: User = { ...userFixture, id: 2, name: 'User 1', role: 'user' }

async function mountForm(
  task?: Task,
  { stubs = {}, user = userFixture }: { stubs?: Record<string, object>; user?: User } = {},
) {
  const store = createAppStore()
  store.commit('auth/SET_USER', user)

  const wrapper = mount(TaskForm, {
    props: { task },
    global: { plugins: [vuetify, [store, key]], stubs },
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

/** v-select renders its menu in a teleport, so set the value through the component */
function selectValue(wrapper: VueWrapper, label: string, value: unknown) {
  const select = wrapper
    .findAllComponents({ name: 'VSelect' })
    .find((component) => component.props('label').replace(' *', '') === label)

  if (!select) throw new Error(`Select "${label}" not found`)
  select.vm.$emit('update:modelValue', value)
}

async function submit(wrapper: VueWrapper) {
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

function validationError(errors: Record<string, string[]>) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('Unprocessable', 'ERR_BAD_REQUEST', config, null, {
    status: 422,
    statusText: 'Unprocessable Content',
    headers: {},
    config,
    data: { message: 'Invalid data', errors },
  })
}

describe('TaskForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(usersApi.list).mockResolvedValue(paginated([userFixture, otherUser]))
  })

  function assigneeSelect(wrapper: VueWrapper) {
    return wrapper
      .findAllComponents({ name: 'VSelect' })
      .find((c) => c.props('label') === 'Assignee *')
  }

  it('lets an admin pick any user as assignee', async () => {
    const wrapper = await mountForm()

    expect(usersApi.list).toHaveBeenCalledOnce()
    expect(assigneeSelect(wrapper)?.props('items')).toEqual([userFixture, otherUser])
    expect(assigneeSelect(wrapper)?.props('disabled')).toBe(false)
  })

  describe('as a regular user', () => {
    it('assigns to themselves with the assignee select disabled', async () => {
      const wrapper = await mountForm(undefined, { user: otherUser })

      // GET /api/users is admin-only
      expect(usersApi.list).not.toHaveBeenCalled()
      expect(assigneeSelect(wrapper)?.props('disabled')).toBe(true)
      expect(assigneeSelect(wrapper)?.props('items')).toEqual([otherUser])
      expect(field(wrapper, 'Assignee').text()).toContain('User 1')
    })

    it('creates the task assigned to themselves', async () => {
      vi.mocked(tasksApi.create).mockResolvedValue(makeTask({ assigned_to: otherUser.id }))
      const wrapper = await mountForm(undefined, { user: otherUser })

      await field(wrapper, 'Title').find('input').setValue('My task')
      await submit(wrapper)

      expect(tasksApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'My task', assigned_to: otherUser.id }),
      )
    })

    it('keeps the assignee disabled when editing', async () => {
      const wrapper = await mountForm(makeTask({ assigned_to: otherUser.id }), { user: otherUser })

      expect(assigneeSelect(wrapper)?.props('disabled')).toBe(true)
      expect(field(wrapper, 'Assignee').text()).toContain('User 1')
    })
  })

  describe('create mode', () => {
    it('starts empty and shows a Create button', async () => {
      const wrapper = await mountForm()

      expect(field(wrapper, 'Title').find('input').element.value).toBe('')
      expect(wrapper.find('button[type="submit"]').text()).toBe('Create')
    })

    it('does not submit when required fields are missing', async () => {
      const wrapper = await mountForm()

      await submit(wrapper)

      expect(tasksApi.create).not.toHaveBeenCalled()
      expect(field(wrapper, 'Title').text()).toContain('This field is required.')
      expect(field(wrapper, 'Assignee').text()).toContain('This field is required.')
    })

    it('creates the task with a clean payload and emits saved', async () => {
      const created = makeTask({ id: 10, title: 'New task' })
      vi.mocked(tasksApi.create).mockResolvedValue(created)
      const wrapper = await mountForm()

      await field(wrapper, 'Title').find('input').setValue('  New task  ')
      await field(wrapper, 'Description').find('textarea').setValue('   ')
      selectValue(wrapper, 'Status', 'in_progress')
      selectValue(wrapper, 'Assignee', 2)
      await submit(wrapper)

      expect(tasksApi.create).toHaveBeenCalledWith({
        title: 'New task',
        description: null,
        status: 'in_progress',
        assigned_to: 2,
        due_date: null,
      })
      expect(wrapper.emitted('saved')).toEqual([[created]])
    })

    it('shows API validation errors under the matching inputs', async () => {
      vi.mocked(tasksApi.create).mockRejectedValue(
        validationError({ title: ['The title has already been taken.'] }),
      )
      const wrapper = await mountForm()

      await field(wrapper, 'Title').find('input').setValue('Duplicate')
      selectValue(wrapper, 'Assignee', 1)
      await submit(wrapper)

      expect(field(wrapper, 'Title').text()).toContain('The title has already been taken.')
      expect(wrapper.emitted('saved')).toBeUndefined()

      // The server error goes away once the user edits the field
      await field(wrapper, 'Title').find('input').setValue('Something else')
      expect(field(wrapper, 'Title').text()).not.toContain('already been taken')
    })

    it('shows other errors in an alert', async () => {
      vi.mocked(tasksApi.create).mockRejectedValue(new Error('Server exploded'))
      const wrapper = await mountForm()

      await field(wrapper, 'Title').find('input').setValue('Task')
      selectValue(wrapper, 'Assignee', 1)
      await submit(wrapper)

      expect(wrapper.find('.v-alert').text()).toContain('Server exploded')
    })
  })

  describe('edit mode', () => {
    const task = makeTask({
      id: 5,
      title: 'Existing',
      description: 'Some text',
      status: 'done',
      assigned_to: 2,
      due_date: '2026-12-24',
    })

    it('is filled with the task values and shows a Save button', async () => {
      const wrapper = await mountForm(task)

      expect(field(wrapper, 'Title').find('input').element.value).toBe('Existing')
      expect(field(wrapper, 'Description').find('textarea').element.value).toBe('Some text')
      expect(field(wrapper, 'Due date').find('input').element.value).toBe('2026-12-24')
      expect(wrapper.find('button[type="submit"]').text()).toBe('Save')
    })

    it('updates the task and emits saved', async () => {
      const updated = { ...task, title: 'Renamed' }
      vi.mocked(tasksApi.update).mockResolvedValue(updated)
      const wrapper = await mountForm(task)

      await field(wrapper, 'Title').find('input').setValue('Renamed')
      await submit(wrapper)

      expect(tasksApi.update).toHaveBeenCalledWith(5, {
        title: 'Renamed',
        description: 'Some text',
        status: 'done',
        assigned_to: 2,
        due_date: '2026-12-24',
      })
      expect(wrapper.emitted('saved')).toEqual([[updated]])
    })
  })

  it('sets the due date from the date picker as YYYY-MM-DD', async () => {
    vi.mocked(tasksApi.create).mockResolvedValue(makeTask())
    // VMenu needs browser layout APIs JSDOM lacks: render the activator and the picker inline
    const VMenu = { template: '<div><slot name="activator" :props="{}" /><slot /></div>' }
    const wrapper = await mountForm(undefined, { stubs: { VMenu } })

    await field(wrapper, 'Title').find('input').setValue('Task')
    selectValue(wrapper, 'Assignee', 1)
    wrapper
      .findComponent({ name: 'VDatePicker' })
      .vm.$emit('update:modelValue', new Date(2026, 11, 31))
    await flushPromises()

    expect(field(wrapper, 'Due date').find('input').element.value).toBe('2026-12-31')

    await submit(wrapper)
    expect(tasksApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ due_date: '2026-12-31' }),
    )
  })

  it('emits cancel', async () => {
    const wrapper = await mountForm()

    const cancel = wrapper.findAll('button').find((button) => button.text() === 'Cancel')
    await cancel?.trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
