import { shallowMount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import CalendarPage from '@/components/CalendarPage.vue'

// 1. Mock Store
vi.mock('@/store/searchStore', () => ({
  userInformationStore: () => ({
    projects: { value: [] },      // Keep as fake ref (accessed via .value in onMounted)
    userid: { value: 'u1' },      // Keep as fake ref (accessed via .value in onMounted)
    user_calendar: []             // CHANGE: Plain array []. ref([]) makes it reactive correctly.
  })
}))

// 2. Mock Pinia helper
vi.mock('pinia', () => ({
  storeToRefs: (store) => store
}))

// 3. Mock Appwrite
vi.mock('@/lib/appwrite', () => ({
  getUserProjectById: vi.fn(),
  saveCalendarInformation: vi.fn(),
  saveCalendarProjectInformation: vi.fn(),
  changeUserCalendarReminded: vi.fn(),
}))

describe('CalendarPage.vue', () => {
  it('renders without crashing', async () => {
    const wrapper = shallowMount(CalendarPage, {
      props: {
        loadUserCalendar: vi.fn(),
        loadMessages: vi.fn(),
      },
      global: {
        stubs: {
          // Stub VDatePicker to avoid child rendering errors
          VDatePicker: { template: '<div />' },
          'v-progress-circular': true,
          'v-icon': true,
          'v-btn': true
        }
      }
    })

    await flushPromises()
    expect(wrapper.exists()).toBe(true)
  })
})
