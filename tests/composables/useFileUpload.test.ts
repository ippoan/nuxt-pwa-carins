import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const mockToken = ref<string | null>('test-token')
mockNuxtImport('useAuth', () => () => ({ token: mockToken }))

const mockFetchFn = vi.fn()
vi.stubGlobal('$fetch', mockFetchFn)

function createMockFile(name: string, content: string, type: string): File {
  const buffer = new TextEncoder().encode(content).buffer
  return new File([buffer], name, { type })
}

describe('useFileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockToken.value = 'test-token'
  })

  it('uploads file with base64 content', async () => {
    mockFetchFn.mockResolvedValue({ uuid: 'file-uuid', filename: 'test.pdf' })
    const { useFileUpload } = await import('~/composables/useFileUpload')
    const { upload } = useFileUpload()
    const file = createMockFile('test.pdf', 'hello', 'application/pdf')
    const result = await upload(file)

    expect(mockFetchFn).toHaveBeenCalledWith('/api/proxy/files', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
      body: {
        filename: 'test.pdf',
        type: 'application/pdf',
        content: expect.any(String),
      },
    })
    expect(result).toEqual({ uuid: 'file-uuid', message: '送信完了しました' })
  })

  it('uses default filename and type when empty', async () => {
    mockFetchFn.mockResolvedValue({ uuid: 'u', filename: '' })
    const { useFileUpload } = await import('~/composables/useFileUpload')
    const { upload } = useFileUpload()
    const file = new File([new ArrayBuffer(0)], '', { type: '' })
    await upload(file)

    expect(mockFetchFn).toHaveBeenCalledWith('/api/proxy/files', expect.objectContaining({
      body: expect.objectContaining({
        filename: 'unnamed',
        type: 'application/octet-stream',
      }),
    }))
  })

  it('returns empty uuid when response has no uuid', async () => {
    mockFetchFn.mockResolvedValue({})
    const { useFileUpload } = await import('~/composables/useFileUpload')
    const { upload } = useFileUpload()
    const file = createMockFile('a.txt', 'x', 'text/plain')
    const result = await upload(file)
    expect(result.uuid).toBe('')
  })

  it('sends empty headers when no token', async () => {
    mockToken.value = null
    mockFetchFn.mockResolvedValue({ uuid: 'u' })
    const { useFileUpload } = await import('~/composables/useFileUpload')
    const { upload } = useFileUpload()
    const file = createMockFile('a.txt', 'x', 'text/plain')
    await upload(file)
    expect(mockFetchFn).toHaveBeenCalledWith('/api/proxy/files', expect.objectContaining({
      headers: {},
    }))
  })
})
