/**
 * ファイルダウンロード Composable
 * rust-alc-api REST API 経由（バイナリダウンロード）
 */

export const useFileDownload = () => {
  const { token } = useAuth()

  const fetchBlob = async (uuid: string): Promise<Blob | null> => {
    try {
      const res = await fetch(`/api/proxy/files/${uuid}/download`, {
        headers: token.value ? { Authorization: `Bearer ${token.value}` } : {},
      })
      if (!res.ok) return null
      return await res.blob()
    } catch (e) {
      console.error('Download failed:', e)
      return null
    }
  }

  const download = async (uuid: string, filename: string): Promise<boolean> => {
    const blob = await fetchBlob(uuid)
    if (!blob) return false

    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.target = '_blank'
    a.download = filename || 'noname'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    return true
  }

  const preview = async (uuid: string): Promise<boolean> => {
    const blob = await fetchBlob(uuid)
    if (!blob) return false

    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
    return true
  }

  return { download, preview }
}
