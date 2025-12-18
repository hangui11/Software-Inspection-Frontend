import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import InsForm from '@/components/InsForm.vue'

// 1. Mock dependencies
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'p1' } }),
  useRouter: () => ({ push: vi.fn() })
}))

// 2. Mock the store purely as an object
vi.mock('@/store/searchStore', () => ({
  userInformationStore: () => ({
    projects: [],
    userid: 'u1',
    username: 'test'
  })
}))

// 3. Mock storeToRefs
vi.mock('pinia', () => ({
  storeToRefs: (store) => store
}))

// 4. Mock Appwrite
vi.mock('@/lib/appwrite.js', () => ({
  getProjectProducts: vi.fn().mockResolvedValue([]),
  getProductData: vi.fn().mockResolvedValue({}),
  createProductDocument: vi.fn(),
  addDefectTransaction: vi.fn(),
  getUsernameById: vi.fn(),
  getUserProjectById: vi.fn().mockResolvedValue({}),
  getFileView: vi.fn(),
  getProductChecklists: vi.fn().mockResolvedValue([]),
  createChecklist: vi.fn(),
  deleteChecklist: vi.fn(),
  uploadFileToStorage: vi.fn(),
  updateProjectStatus: vi.fn(),
  updateEngineerInfo: vi.fn(),
  getFileDownload: vi.fn(),
  updateChecklistShare: vi.fn(),
  addChecklistItemDB: vi.fn(),
  updateChecklistItemStatus: vi.fn(),
  deleteChecklistItemDB: vi.fn(),
}))

describe('InsForm.vue', () => {
  it('renders successfully', async () => {
    const wrapper = mount(InsForm, {
      global: {
        stubs: {
          ShareWindow: true,
          ExitProjectWindow: true,
          'v-progress-circular': true
        }
      },
      props: { loadProjects: vi.fn() }
    })

    await flushPromises()
    expect(wrapper.exists()).toBe(true)
  })
})
