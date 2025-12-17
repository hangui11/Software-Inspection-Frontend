import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import ExitProjectWindow from '@/components/ExitProjectWindow.vue'

// Mock Appwrite functions used in onMounted
vi.mock('@/lib/appwrite', () => ({
  getUserEmail: vi.fn().mockResolvedValue('my@email.com'),
  getProjectAllUsers: vi.fn().mockResolvedValue([{ id: '2', email: 'other@email.com' }]),
  updateUserRoles: vi.fn(),
  leaveProject: vi.fn(),
  deleteProject: vi.fn(),
}))

// Mock router
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() }))
}))

describe('ExitProjectWindow.vue', () => {
  const defaultProps = {
    projectId: 'p1',
    userId: 'u1',
    project: { members: 5 },
    loadProjects: vi.fn(),
    user_role: 'member'
  }

  it('displays "leave the project" text for non-owners', () => {
    const wrapper = mount(ExitProjectWindow, {
      props: defaultProps
    })

    expect(wrapper.text()).toContain('Are you sure to leave the project?')
    expect(wrapper.text()).not.toContain('delete the project')
  })

  it('displays "delete the project" text if owner is the only member', () => {
    const wrapper = mount(ExitProjectWindow, {
      props: {
        ...defaultProps,
        user_role: 'owner',
        project: { members: 1 }
      }
    })

    expect(wrapper.text()).toContain('Are you sure to delete the project?')
  })

  it('emits "close" event when clicking "No"', async () => {
    const wrapper = mount(ExitProjectWindow, {
      props: defaultProps
    })

    await wrapper.find('.reject-btn').trigger('click')

    expect(wrapper.emitted()).toHaveProperty('close')
  })

  it('forces owner to select new owner before leaving (if members > 1)', async () => {
    const wrapper = mount(ExitProjectWindow, {
      props: {
        ...defaultProps,
        user_role: 'owner',
        project: { members: 5 } // More than 1 member
      }
    })

    // Click Yes initially
    await wrapper.find('.accept-btn').trigger('click')

    // It should NOT close yet, but show the transfer warning
    expect(wrapper.text()).toContain('You must transfer ownership before leaving')
    expect(wrapper.find('select').exists()).toBe(true)
  })
})
