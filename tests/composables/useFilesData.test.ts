import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const mockToken = ref<string | null>('test-token')
mockNuxtImport('useAuth', () => () => ({ token: mockToken }))

const mockFetchFn = vi.fn()
vi.stubGlobal('$fetch', mockFetchFn)

let lastHandler: (() => Promise<any>) | null = null
mockNuxtImport('useAsyncData', () => (_key: string, handler: () => Promise<any>, _opts?: any) => {
  lastHandler = handler
  return { data: ref(null), pending: ref(false), status: ref('idle'), error: ref(null), refresh: vi.fn() }
})

describe('useRecentFilesData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockToken.value = 'test-token'
    lastHandler = null
  })

  it('fetches recent files with auth header', async () => {
    const files = [{ uuid: 'a', filename: 'test.pdf' }]
    mockFetchFn.mockResolvedValue({ files })
    const { useRecentFilesData } = await import('~/composables/useFilesData')
    useRecentFilesData()
    const result = await lastHandler!()
    expect(mockFetchFn).toHaveBeenCalledWith('/api/proxy/files/recent', {
      headers: { Authorization: 'Bearer test-token' },
    })
    expect(result).toEqual(files)
  })

  it('sends empty headers when no token', async () => {
    mockToken.value = null
    mockFetchFn.mockResolvedValue({ files: [] })
    const { useRecentFilesData } = await import('~/composables/useFilesData')
    useRecentFilesData()
    await lastHandler!()
    expect(mockFetchFn).toHaveBeenCalledWith('/api/proxy/files/recent', {
      headers: {},
    })
  })

  it('returns undefined when response is null', async () => {
    mockFetchFn.mockResolvedValue(null)
    const { useRecentFilesData } = await import('~/composables/useFilesData')
    useRecentFilesData()
    const result = await lastHandler!()
    expect(result).toBeUndefined()
  })
})

describe('useFilesData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockToken.value = 'test-token'
    lastHandler = null
  })

  it('fetches all files with auth header', async () => {
    const files = [{ uuid: 'b', filename: 'doc.pdf' }]
    mockFetchFn.mockResolvedValue({ files })
    const { useFilesData } = await import('~/composables/useFilesData')
    useFilesData()
    const result = await lastHandler!()
    expect(mockFetchFn).toHaveBeenCalledWith('/api/proxy/files', {
      headers: { Authorization: 'Bearer test-token' },
    })
    expect(result).toEqual(files)
  })

  it('sends empty headers when no token', async () => {
    mockToken.value = null
    mockFetchFn.mockResolvedValue({ files: [] })
    const { useFilesData } = await import('~/composables/useFilesData')
    useFilesData()
    await lastHandler!()
    expect(mockFetchFn).toHaveBeenCalledWith('/api/proxy/files', {
      headers: {},
    })
  })
})
