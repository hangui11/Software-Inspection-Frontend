import { describe, it, expect, vi, beforeEach } from 'vitest'

// 1. Hoist spies to access them in both factory and tests
const mocks = vi.hoisted(() => {
  return {
    account: {
      createEmailPasswordSession: vi.fn(),
      deleteSession: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      getSession: vi.fn()
    },
    databases: {
      listDocuments: vi.fn(),
      createDocument: vi.fn(),
      updateDocument: vi.fn(),
      deleteDocument: vi.fn()
    },
    storage: {
      createFile: vi.fn(),
      getFileView: vi.fn(),
      getFileDownload: vi.fn()
    },
    client: {
      setEndpoint: vi.fn().mockReturnThis(),
      setProject: vi.fn().mockReturnThis()
    }
  }
})

// 2. Mock Appwrite Module
vi.mock('appwrite', () => {
  return {
    Client: vi.fn(function() { return mocks.client }),
    Account: vi.fn(function() { return mocks.account }),
    Databases: vi.fn(function() { return mocks.databases }),
    Storage: vi.fn(function() { return mocks.storage }),
    ID: { unique: () => 'unique_id' },
    Query: {
      equal: vi.fn(),
      orderDesc: vi.fn(),
      search: vi.fn(),
      lessThan: vi.fn(),
      contains: vi.fn(),
      limit: vi.fn(),
      select: vi.fn(),
      notEqual: vi.fn(),
      or: vi.fn() // Added 'or' since you use Query.or() in existUserOrEmail
    }
  }
})

// 3. Stub global alert to silence "Window's alert() method" errors
vi.stubGlobal('alert', vi.fn())

// 4. Import System Under Test
import { signIn, logOut, getCurrentUser, getUserProjects } from '@/lib/appwrite'

describe('appwrite.js', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('signIn calls account.createEmailPasswordSession', async () => {
    mocks.account.createEmailPasswordSession.mockResolvedValue({ id: 'session123' })
    const result = await signIn('test@email.com', 'password123')

    expect(mocks.account.createEmailPasswordSession).toHaveBeenCalledWith('test@email.com', 'password123')
    expect(result).toEqual({ id: 'session123' })
  })

  it('logOut calls account.deleteSession', async () => {
    mocks.account.deleteSession.mockResolvedValue(true)
    await logOut()
    expect(mocks.account.deleteSession).toHaveBeenCalledWith('current')
  })

  it('getCurrentUser gets the current account and fetches user profile', async () => {
    // A. Mock the Account call (Returns Auth ID)
    const mockAuthAccount = { $id: 'auth_user_123' }
    mocks.account.get.mockResolvedValue(mockAuthAccount)

    // B. Mock the Database call (Returns User Profile)
    // The code uses listDocuments based on account_id
    const mockUserProfile = { $id: 'profile_1', username: 'Test User', email: 'test@email.com' }
    mocks.databases.listDocuments.mockResolvedValue({
      documents: [mockUserProfile],
      total: 1
    })

    const result = await getCurrentUser()

    // Assertions
    expect(mocks.account.get).toHaveBeenCalled()
    expect(mocks.databases.listDocuments).toHaveBeenCalled()
    // The function returns currentUser.documents[0]
    expect(result).toEqual(mockUserProfile)
  })

  it('getUserProjects calls database listDocuments', async () => {
    mocks.databases.listDocuments.mockResolvedValue({
      documents: [{ $id: 'p1', name: 'Project A' }]
    })

    const result = await getUserProjects('user123')

    expect(mocks.databases.listDocuments).toHaveBeenCalled()
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Project A')
  })
})
