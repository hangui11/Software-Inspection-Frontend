import { shallowMount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import DashboardPage from '@/components/DashboardPage.vue'

// 1. Mock Store
vi.mock('@/store/searchStore', () => ({
  userInformationStore: () => ({
    // FIX: Use plain arrays for lists.
    // The component wraps these in ref(), so passing [] works perfectly.
    recent_projects: [],
    user_calendar: [],

    // Keep userid as a "Fake Ref" because it is likely accessed directly as .value
    userid: { value: 'u1' }
  })
}))

// 2. Mock Dependencies
vi.mock('pinia', () => ({ storeToRefs: (val) => val }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/lib/appwrite', () => ({
  createProject: vi.fn(),
  joinProject: vi.fn(),
  formatAppwriteDate: vi.fn()
}))

describe('DashboardPage.vue', () => {
  it('renders successfully', async () => {
    const wrapper = shallowMount(DashboardPage, {
      props: {
        loadProjects: vi.fn()
      },
      global: {
        stubs: {
          VDatePicker: { template: '<div />' }, // Prevent calendar errors
          'v-icon': true,
          'v-btn': true,
          'v-text-field': true,
          'v-dialog': true,
          'v-card': true,
          'v-card-title': true,
          'v-card-text': true,
          'v-card-actions': true,
          'v-spacer': true,
          'v-select': true
        }
      }
    })

    await flushPromises()
    expect(wrapper.exists()).toBe(true)
  })
})
