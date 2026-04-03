import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const mockToken = ref<string | null>('test-token')
mockNuxtImport('useAuth', () => () => ({ token: mockToken }))

// Mock $fetch at global level
const mockFetchFn = vi.fn()
vi.stubGlobal('$fetch', mockFetchFn)

// Track useAsyncData calls to extract handler
let lastHandler: (() => Promise<any>) | null = null
mockNuxtImport('useAsyncData', () => (key: string, handler: () => Promise<any>, opts?: any) => {
  lastHandler = handler
  return { data: ref(null), pending: ref(false), status: ref('idle'), error: ref(null), refresh: vi.fn() }
})

describe('useCarInspectionData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockToken.value = 'test-token'
    lastHandler = null
  })

  it('fetches current car inspections with auth header', async () => {
    mockFetchFn.mockResolvedValue({ carInspections: [{ id: 1 }] })
    const { useCarInspectionData } = await import('~/composables/useCarInspectionData')
    useCarInspectionData()
    expect(lastHandler).toBeTruthy()
    const result = await lastHandler!()
    expect(mockFetchFn).toHaveBeenCalledWith('/api/proxy/car-inspections/current', {
      headers: { Authorization: 'Bearer test-token' },
    })
    expect(result).toEqual([{ id: 1 }])
  })

  it('sends empty headers when no token', async () => {
    mockToken.value = null
    mockFetchFn.mockResolvedValue({ carInspections: [] })
    const { useCarInspectionData } = await import('~/composables/useCarInspectionData')
    useCarInspectionData()
    await lastHandler!()
    expect(mockFetchFn).toHaveBeenCalledWith('/api/proxy/car-inspections/current', {
      headers: {},
    })
  })

  it('returns undefined when response is null', async () => {
    mockFetchFn.mockResolvedValue(null)
    const { useCarInspectionData } = await import('~/composables/useCarInspectionData')
    useCarInspectionData()
    const result = await lastHandler!()
    expect(result).toBeUndefined()
  })
})

describe('useExpiredCarInspectionData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockToken.value = 'test-token'
    lastHandler = null
  })

  it('fetches expired car inspections with auth header', async () => {
    mockFetchFn.mockResolvedValue({ carInspections: [{ id: 2 }] })
    const { useExpiredCarInspectionData } = await import('~/composables/useCarInspectionData')
    useExpiredCarInspectionData()
    const result = await lastHandler!()
    expect(mockFetchFn).toHaveBeenCalledWith('/api/proxy/car-inspections/expired', {
      headers: { Authorization: 'Bearer test-token' },
    })
    expect(result).toEqual([{ id: 2 }])
  })

  it('sends empty headers when no token', async () => {
    mockToken.value = null
    mockFetchFn.mockResolvedValue({ carInspections: [] })
    const { useExpiredCarInspectionData } = await import('~/composables/useCarInspectionData')
    useExpiredCarInspectionData()
    await lastHandler!()
    expect(mockFetchFn).toHaveBeenCalledWith('/api/proxy/car-inspections/expired', {
      headers: {},
    })
  })
})
