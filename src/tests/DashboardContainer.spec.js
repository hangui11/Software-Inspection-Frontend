import { shallowMount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import DashboardContainer from '@/components/DashboardContainer.vue'

// 1. Mock Stores
vi.mock('@/store/searchStore', () => ({
  useSearchStore: () => ({}),
  userInformationStore: () => ({
    calendar_messages: { value: [] }
  })
}))

vi.mock('pinia', () => ({ storeToRefs: (val) => val }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

// 2. Mock Appwrite
vi.mock('@/lib/appwrite', () => ({
  logOut: vi.fn(),
  readAllMessages: vi.fn(),
  joinProject: vi.fn(),
  updateInvitationStatus: vi.fn()
}))

describe('DashboardContainer.vue', () => {
  it('renders with required props', async () => {
    const wrapper = shallowMount(DashboardContainer, {
      props: {
        avatar: 'http://img.url',
        username: 'TestUser',
        projects: [],
        user_id: 'u1',
        loadProjects: vi.fn(),
        invitationMessages: [],
        requestMessages: []
      },
      global: {
        stubs: ['v-progress-circular']
      }
    })

    await flushPromises()
    expect(wrapper.exists()).toBe(true)
  })
})
