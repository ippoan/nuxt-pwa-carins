/**
 * REST API プロキシ
 * /api/proxy/* → rust-alc-api の /api/* に転送
 */
export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') || ''
  const config = useRuntimeConfig()
  const backendUrl = config.alcApiUrl || 'https://rust-alc-api-747065218280.asia-northeast1.run.app'

  const targetUrl = `${backendUrl}/api/${path}`

  // リクエストヘッダーを転送
  const headers: Record<string, string> = {}
  const contentType = getHeader(event, 'content-type')
  if (contentType) headers['Content-Type'] = contentType

  // JWT を Authorization ヘッダーで転送（JWT_SECRET 統一済み）
  const authHeader = getHeader(event, 'authorization')
  if (authHeader) {
    headers['Authorization'] = authHeader
    // tenant_id をフォールバック用に X-Tenant-ID にも設定
    const token = authHeader.replace('Bearer ', '')
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const tenantId = payload.tenant_id || payload.org
      if (tenantId) headers['X-Tenant-ID'] = tenantId
    } catch {
      // JWT parse failure — skip
    }
  }
  // 明示的な X-Tenant-ID ヘッダーがあればそちらを優先
  const tenantHeader = getHeader(event, 'x-tenant-id')
  if (tenantHeader) headers['X-Tenant-ID'] = tenantHeader

  const method = event.method
  const query = getQuery(event)

  // クエリパラメータを URL に追加
  const url = new URL(targetUrl)
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value))
    }
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  }

  // POST/PUT/PATCH の場合は body を転送
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      const body = await readBody(event)
      if (body) {
        fetchOptions.body = JSON.stringify(body)
        headers['Content-Type'] = 'application/json'
      }
    } catch {
      // body なし（DELETE 等）
    }
  }

  const response = await fetch(url.toString(), fetchOptions)

  // レスポンスヘッダーを転送
  const responseContentType = response.headers.get('content-type')
  if (responseContentType) {
    setHeader(event, 'content-type', responseContentType)
  }
  const contentDisposition = response.headers.get('content-disposition')
  if (contentDisposition) {
    setHeader(event, 'content-disposition', contentDisposition)
  }

  setResponseStatus(event, response.status)

  // ダウンロードエンドポイント — 常にバイナリとして転送
  if (path.includes('/download')) {
    const buffer = await response.arrayBuffer()
    return Buffer.from(buffer)
  }

  // バイナリレスポンス（ダウンロード）の場合
  if (responseContentType && !responseContentType.includes('application/json')) {
    const buffer = await response.arrayBuffer()
    return Buffer.from(buffer)
  }

  // JSON レスポンス
  if (response.status === 204) return null
  return await response.json()
})
