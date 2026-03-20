/**
 * ファイルアップロード Composable
 * rust-alc-api REST API 経由
 */

export const useFileUpload = () => {
  const { token } = useAuth()

  const upload = async (file: File, _from?: string): Promise<{ uuid: string; message: string }> => {
    // Base64 エンコード
    const arrayBuffer = await file.arrayBuffer()
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    )

    const res = await $fetch<{ uuid: string; filename: string }>('/api/proxy/files', {
      method: 'POST',
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : {},
      body: {
        filename: file.name || 'unnamed',
        type: file.type || 'application/octet-stream',
        content: base64,
      },
    })

    return { uuid: res?.uuid || '', message: '送信完了しました' }
  }

  return { upload }
}
