import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import ForgotPwdPage from '@/components/ForgotPwdPage.vue'

// 1. Mock Dependencies
vi.mock('@/lib/appwrite', () => ({
  forgotPassword: vi.fn(),
  getUserEmail: vi.fn(),
  resetPassword: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() })
}))

// 2. Mock Alert
vi.stubGlobal('alert', vi.fn())

describe('ForgotPwdPage.vue', () => {
  it('renders the email input form by default', () => {
    const wrapper = mount(ForgotPwdPage)
    // Simply check if any input exists on the page
    expect(wrapper.find('input').exists()).toBe(true)
  })
})
