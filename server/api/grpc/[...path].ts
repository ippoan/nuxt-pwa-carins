/**
 * gRPC-Web 透過プロキシ (catch-all)
 *
 * Service Binding経由でcf-grpc-proxyのDurable Objectにリクエストを転送
 * Browser → Connect RPC → /api/grpc/{service}/{method} → Service Binding → Durable Object → CloudRun (rust-logi)
 *
 * 既存の car-inspections.ts, files.ts は名前付きルートとして優先されるため共存可能
 */

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') || ''
  const method = event.method

  // Cloudflare環境のバインディングを取得
  const { cloudflare } = event.context
  if (!cloudflare?.env?.GRPC_PROXY_SERVICE) {
    throw createError({
      statusCode: 500,
      message: 'GRPC_PROXY_SERVICE binding not available',
    })
  }

  const grpcProxyService = cloudflare.env.GRPC_PROXY_SERVICE

  // gRPC-Webリクエストを転送
  const targetUrl = `https://cf-grpc-proxy.workers.dev/${path}`

  const headers = new Headers()
  // 必要なヘッダーをコピー
  const contentType = getHeader(event, 'content-type')
  if (contentType) headers.set('Content-Type', contentType)
  const connectProtocol = getHeader(event, 'connect-protocol-version')
  if (connectProtocol) headers.set('Connect-Protocol-Version', connectProtocol)

  // Auth ヘッダーを転送（Browser → Nuxt server → cf-grpc-proxy）
  const authToken = getHeader(event, 'x-auth-token')
  if (authToken) headers.set('x-auth-token', authToken)
  const orgId = getHeader(event, 'x-organization-id')
  if (orgId) headers.set('x-organization-id', orgId)
  // リクエストボディを取得（バイナリとして読み込む）
  const body = method === 'POST' ? await readRawBody(event, false) : undefined

  // Service Binding経由でリクエスト
  const response = await grpcProxyService.fetch(targetUrl, {
    method,
    headers,
    body,
  })

  // レスポンスヘッダーを設定
  for (const [key, value] of response.headers.entries()) {
    setHeader(event, key, value)
  }

  // レスポンスボディを返す
  return response.body
})
