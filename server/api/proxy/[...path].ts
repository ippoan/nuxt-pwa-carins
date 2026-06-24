/**
 * REST API プロキシ
 * /api/proxy/* → rust-alc-api の /api/* に転送
 *
 * 転送ロジック (Authorization 転送 / JWT→X-Tenant-ID 変換 / binary・JSON 透過)
 * は @ippoan/auth-client/server に集約済み (Refs ippoan/auth-worker#257)。
 *
 * #290 Phase 4: forward 前段で requireAuth (auth-worker introspect) を挟み、
 * 署名 + APP_TENANT_ACL を edge で検証する。不正署名 / 別アプリ cookie /
 * 不許可テナントは backend 到達前に 401 で弾く (defense-in-depth)。
 */
import { createApiProxyHandler } from '@ippoan/auth-client/server'
import { requireAuth } from '../../utils/auth'

const proxy = createApiProxyHandler({
  backendUrl: event =>
    (useRuntimeConfig(event).alcApiUrl as string) || 'https://rust-alc-api-747065218280.asia-northeast1.run.app',
})

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  return proxy(event)
})
