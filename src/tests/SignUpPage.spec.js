import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import SignUpPage from '@/components/SignUpPage.vue'

// 1. Mock Appwrite
vi.mock('@/lib/appwrite', () => ({
  signUp: vi.fn().mockResolvedValue({ status: 'success' })
}))

// 2. Mock Router
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() })
}))

// 3. Stub Alert
vi.stubGlobal('alert', vi.fn())

describe('SignUpPage.vue', () => {
  it('renders the sign up form correctly', () => {
    const wrapper = mount(SignUpPage)

    // Check if the three main inputs exist (Email, Username, Password)
    const inputs = wrapper.findAll('input')
    expect(inputs.length).toBeGreaterThanOrEqual(3)

    // Check if the button exists
    expect(wrapper.find('button').exists()).toBe(true)
  })
})
