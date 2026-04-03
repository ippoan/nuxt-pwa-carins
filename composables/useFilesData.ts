/**
 * ファイルデータ取得 Composable
 * rust-alc-api REST API 経由
 */
import type { FileRow, FileListResponse } from '~/types/alc-api'

interface UseFilesDataOptions {
  lazy?: boolean
}

/**
 * 最近アップロードされたファイル一覧を取得
 */
export const useRecentFilesData = (options?: UseFilesDataOptions) => {
  const { token } = useAuth()

  return useAsyncData('recentFiles', async () => {
    const res = await $fetch<FileListResponse>('/api/proxy/files/recent', {
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : {},
    })
    return res?.files
  }, {
    lazy: options?.lazy ?? true,
    server: false,
  })
}

/**
 * ファイル一覧を取得
 */
export const useFilesData = (options?: UseFilesDataOptions) => {
  const { token } = useAuth()

  return useAsyncData('filesList', async () => {
    const res = await $fetch<FileListResponse>('/api/proxy/files', {
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : {},
    })
    return res?.files
  }, {
    lazy: options?.lazy ?? true,
    server: false,
  })
}

export type { FileRow }
