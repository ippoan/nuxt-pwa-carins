import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const mockToken = ref<string | null>('test-token')
mockNuxtImport('useAuth', () => () => ({ token: mockToken }))

const mockGlobalFetch = vi.fn()

const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
const mockRevokeObjectURL = vi.fn()

const mockClick = vi.fn()
const mockAnchor: Record<string, any> = { href: '', target: '', download: '', click: mockClick }

const mockWindowOpen = vi.fn()

function mockBlobResponse(ok: boolean) {
  const blob = new Blob(['data'])
  mockGlobalFetch.mockResolvedValue({
    ok,
    blob: () => Promise.resolve(blob),
  })
  return blob
}

describe('useFileDownload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockToken.value = 'test-token'
    mockAnchor.href = ''
    mockAnchor.target = ''
    mockAnchor.download = ''

    vi.stubGlobal('fetch', mockGlobalFetch)
    vi.stubGlobal('URL', { createObjectURL: mockCreateObjectURL, revokeObjectURL: mockRevokeObjectURL })
    vi.stubGlobal('document', { createElement: vi.fn(() => mockAnchor) })
    vi.stubGlobal('window', { open: mockWindowOpen })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('download', () => {
    it('downloads file and triggers anchor click', async () => {
      mockBlobResponse(true)
      const { useFileDownload } = await import('~/composables/useFileDownload')
      const { download } = useFileDownload()
      const result = await download('uuid-1', 'file.pdf')

      expect(mockGlobalFetch).toHaveBeenCalledWith('/api/proxy/files/uuid-1/download', {
        headers: { Authorization: 'Bearer test-token' },
      })
      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockAnchor.download).toBe('file.pdf')
      expect(mockAnchor.target).toBe('_blank')
      expect(mockClick).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('uses "noname" when filename is empty', async () => {
      mockBlobResponse(true)
      const { useFileDownload } = await import('~/composables/useFileDownload')
      const { download } = useFileDownload()
      await download('uuid-1', '')
      expect(mockAnchor.download).toBe('noname')
    })

    it('returns false when fetch fails (not ok)', async () => {
      mockBlobResponse(false)
      const { useFileDownload } = await import('~/composables/useFileDownload')
      const { download } = useFileDownload()
      const result = await download('uuid-1', 'file.pdf')
      expect(result).toBe(false)
    })

    it('returns false on network error', async () => {
      mockGlobalFetch.mockRejectedValue(new Error('network'))
      const { useFileDownload } = await import('~/composables/useFileDownload')
      const { download } = useFileDownload()
      const result = await download('uuid-1', 'file.pdf')
      expect(result).toBe(false)
    })

    it('sends empty headers when no token', async () => {
      mockToken.value = null
      mockBlobResponse(true)
      const { useFileDownload } = await import('~/composables/useFileDownload')
      const { download } = useFileDownload()
      await download('uuid-1', 'file.pdf')
      expect(mockGlobalFetch).toHaveBeenCalledWith('/api/proxy/files/uuid-1/download', {
        headers: {},
      })
    })

    it('revokes object URL after timeout', async () => {
      mockBlobResponse(true)
      const { useFileDownload } = await import('~/composables/useFileDownload')
      const { download } = useFileDownload()
      await download('uuid-1', 'file.pdf')
      vi.advanceTimersByTime(1000)
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })
  })

  describe('preview', () => {
    it('opens blob in new window', async () => {
      mockBlobResponse(true)
      const { useFileDownload } = await import('~/composables/useFileDownload')
      const { preview } = useFileDownload()
      const result = await preview('uuid-2')

      expect(mockGlobalFetch).toHaveBeenCalledWith('/api/proxy/files/uuid-2/download', {
        headers: { Authorization: 'Bearer test-token' },
      })
      expect(mockWindowOpen).toHaveBeenCalledWith('blob:mock-url', '_blank')
      expect(result).toBe(true)
    })

    it('returns false when fetch fails', async () => {
      mockBlobResponse(false)
      const { useFileDownload } = await import('~/composables/useFileDownload')
      const { preview } = useFileDownload()
      const result = await preview('uuid-2')
      expect(result).toBe(false)
    })

    it('revokes object URL after 60s', async () => {
      mockBlobResponse(true)
      const { useFileDownload } = await import('~/composables/useFileDownload')
      const { preview } = useFileDownload()
      await preview('uuid-2')
      vi.advanceTimersByTime(60000)
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })
  })
})
