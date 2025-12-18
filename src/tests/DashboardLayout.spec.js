import { shallowMount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import DashboardLayout from '@/components/DashboardLayout.vue'

// 1. Mock Store
vi.mock('@/store/searchStore', () => ({
  userInformationStore: () => ({
    setSearchResults: vi.fn(),
    setUserCalendar: vi.fn(),
    calendar_messages: []
  }),
  useSearchStore: () => ({})
}))

// 2. Mock Router
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ path: '/dashboard' })
}))

// 3. Mock Appwrite (Kitchen Sink)
vi.mock('@/lib/appwrite', () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ $id: 'u1', name: 'Test User' }),
  getUserProjects: vi.fn().mockResolvedValue([]),
  logOut: vi.fn(),
  showUserCalendar: vi.fn().mockResolvedValue([]),
  showUserInvitation: vi.fn().mockResolvedValue([]),
  showUserRequest: vi.fn().mockResolvedValue([]),
  getProjectById: vi.fn(),
  getUserCalendar: vi.fn().mockResolvedValue([]),
  deletePastUserCalendar: vi.fn()
}))

// 4. Mock Pinia
vi.mock('pinia', () => ({
  storeToRefs: (store) => store
}))

describe('DashboardLayout.vue', () => {
  it('renders without crashing', async () => {
    const wrapper = shallowMount(DashboardLayout, {
      global: {
        stubs: {
          // Stub children to avoid deep errors
          DashboardContainer: true,
          'router-view': true,
          'v-progress-circular': true
        }
      }
    })

    await flushPromises()
    expect(wrapper.exists()).toBe(true)
  })
})
