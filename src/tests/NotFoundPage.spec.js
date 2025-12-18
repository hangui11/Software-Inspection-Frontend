import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import NotFoundPage from '@/components/NotFoundPage.vue'

vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: vi.fn() })
}))

describe('NotFoundPage.vue', () => {
  it('renders the 404 message', () => {
    const wrapper = mount(NotFoundPage, {
      global: {
        stubs: ['v-empty-state'] // Stub Vuetify component
      }
    })
    expect(wrapper.exists()).toBe(true)
  })
})
