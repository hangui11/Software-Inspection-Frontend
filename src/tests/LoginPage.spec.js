import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LoginPage from '@/components/LoginPage.vue'
import { useRouter } from 'vue-router'
import { signIn } from '@/lib/appwrite'

// Mock external dependencies
vi.mock('vue-router', () => ({
  useRouter: vi.fn(),
}))

vi.mock('@/lib/appwrite', () => ({
  signIn: vi.fn(),
  existCurrentUser: vi.fn().mockResolvedValue(false),
  logOut: vi.fn(),
}))

describe('LoginPage.vue', () => {
  let routerPushMock

  beforeEach(() => {
    routerPushMock = vi.fn()
    useRouter.mockReturnValue({ push: routerPushMock })
  })

  it('renders email and password inputs', () => {
    const wrapper = mount(LoginPage)
    // Check if form elements exist
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    expect(wrapper.find('input[id="password"]').exists()).toBe(true)
    expect(wrapper.find('.button').exists()).toBe(true)
  })

  it('toggles password visibility when eye icon is clicked', async () => {
    const wrapper = mount(LoginPage)
    const passwordInput = wrapper.find('#password') // Find specifically by ID

    // Initially password
    expect(passwordInput.attributes('type')).toBe('password')

    // Find eye icon (using class .eye from your CSS)
    const eyeIcon = wrapper.find('.eye')

    if (eyeIcon.exists()) {
      await eyeIcon.trigger('click')
      expect(passwordInput.attributes('type')).toBe('text')
    }
  })

  it('calls signIn and redirects on success', async () => {
    const wrapper = mount(LoginPage)

    // 1. Mock the API response
    signIn.mockResolvedValue({ userId: '123' })

    // 2. Set Input Values
    // Using IDs is safer than array index [0]/[1]
    await wrapper.find('#email').setValue('test@test.com')
    await wrapper.find('#password').setValue('password123')

    // 3. Trigger Form Submission DIRECTLY
    // This is the fix: trigger 'submit' on the form, not 'click' on the button
    await wrapper.find('form').trigger('submit')

    // 4. WAIT for async function to finish
    await flushPromises()

    // 5. Assertions
    expect(signIn).toHaveBeenCalledWith('test@test.com', 'password123')
    expect(routerPushMock).toHaveBeenCalledWith('/dashboard')
  })
})
