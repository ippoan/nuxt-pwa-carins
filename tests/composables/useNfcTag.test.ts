import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const mockToken = ref<string | null>('test-token')
mockNuxtImport('useAuth', () => () => ({ token: mockToken }))

const mockFetchFn = vi.fn()
vi.stubGlobal('$fetch', mockFetchFn)

describe('useNfcTag', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockToken.value = 'test-token'
  })

  describe('searchByNfcUuid', () => {
    it('searches with uuid param and auth header', async () => {
      mockFetchFn.mockResolvedValue({ nfc_tag: { id: 1 } })
      const { useNfcTag } = await import('~/composables/useNfcTag')
      const { searchByNfcUuid } = useNfcTag()
      await searchByNfcUuid('abc-123')
      expect(mockFetchFn).toHaveBeenCalledWith('/api/proxy/nfc-tags/search', {
        params: { uuid: 'abc-123' },
        headers: { Authorization: 'Bearer test-token' },
      })
    })

    it('sends empty headers when no token', async () => {
      mockToken.value = null
      mockFetchFn.mockResolvedValue({})
      const { useNfcTag } = await import('~/composables/useNfcTag')
      const { searchByNfcUuid } = useNfcTag()
      await searchByNfcUuid('abc')
      expect(mockFetchFn).toHaveBeenCalledWith('/api/proxy/nfc-tags/search', {
        params: { uuid: 'abc' },
        headers: {},
      })
    })
  })

  describe('registerNfcTag', () => {
    it('posts nfc_uuid and car_inspection_id', async () => {
      mockFetchFn.mockResolvedValue({ success: true })
      const { useNfcTag } = await import('~/composables/useNfcTag')
      const { registerNfcTag } = useNfcTag()
      await registerNfcTag('uuid-1', 42)
      expect(mockFetchFn).toHaveBeenCalledWith('/api/proxy/nfc-tags', {
        method: 'POST',
        headers: { Authorization: 'Bearer test-token' },
        body: { nfc_uuid: 'uuid-1', car_inspection_id: 42 },
      })
    })
  })

  describe('listNfcTags', () => {
    it('lists with car_inspection_id param', async () => {
      mockFetchFn.mockResolvedValue({ tags: [] })
      const { useNfcTag } = await import('~/composables/useNfcTag')
      const { listNfcTags } = useNfcTag()
      await listNfcTags(10)
      expect(mockFetchFn).toHaveBeenCalledWith('/api/proxy/nfc-tags', {
        params: { car_inspection_id: 10 },
        headers: { Authorization: 'Bearer test-token' },
      })
    })

    it('lists without param when no carInspectionId', async () => {
      mockFetchFn.mockResolvedValue({ tags: [] })
      const { useNfcTag } = await import('~/composables/useNfcTag')
      const { listNfcTags } = useNfcTag()
      await listNfcTags()
      expect(mockFetchFn).toHaveBeenCalledWith('/api/proxy/nfc-tags', {
        params: {},
        headers: { Authorization: 'Bearer test-token' },
      })
    })
  })

  describe('deleteNfcTag', () => {
    it('sends DELETE request with uuid in path', async () => {
      mockFetchFn.mockResolvedValue({})
      const { useNfcTag } = await import('~/composables/useNfcTag')
      const { deleteNfcTag } = useNfcTag()
      await deleteNfcTag('uuid-del')
      expect(mockFetchFn).toHaveBeenCalledWith('/api/proxy/nfc-tags/uuid-del', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer test-token' },
      })
    })
  })
})
