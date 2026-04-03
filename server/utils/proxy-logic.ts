/**
 * REST プロキシのコアロジック（テスタブル）
 */

/** JWT payload から tenant_id を抽出 */
export function extractTenantIdFromAuth(authHeader: string | undefined): { authorization?: string; tenantId?: string } {
  if (!authHeader) return {}

  const token = authHeader.replace('Bearer ', '')
  let tenantId: string | undefined
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    tenantId = payload.tenant_id || payload.org
  } catch {
    // JWT parse failure
  }

  return { authorization: authHeader, tenantId }
}

/** プロキシリクエストのヘッダーを構築 */
export function buildProxyHeaders(
  contentType: string | undefined,
  authHeader: string | undefined,
  tenantHeader: string | undefined,
): Record<string, string> {
  const headers: Record<string, string> = {}
  if (contentType) headers['Content-Type'] = contentType

  const auth = extractTenantIdFromAuth(authHeader)
  if (auth.authorization) headers['Authorization'] = auth.authorization
  if (auth.tenantId) headers['X-Tenant-ID'] = auth.tenantId

  // 明示的な X-Tenant-ID ヘッダーが優先
  if (tenantHeader) headers['X-Tenant-ID'] = tenantHeader

  return headers
}

/** レスポンスタイプの判定 */
export function isDownloadPath(path: string): boolean {
  return path.includes('/download')
}

export function isBinaryResponse(contentType: string | null | undefined): boolean {
  return !!contentType && !contentType.includes('application/json')
}
