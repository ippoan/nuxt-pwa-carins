import type { H3Event } from 'h3'
import { requireAuth as introspectRequireAuth } from '@ippoan/auth-client/server'
import { cfEnv, resolveSecret } from './cf-env'

// browser JWT (logi_auth_token cookie / Bearer) の検証を auth-worker
// POST /auth/introspect に委譲する edge gate (ippoan/auth-worker#290 Phase 4)。
//
// 本 Worker は JWT_SECRET (署名鍵) を持たない。/api/proxy/* と /api/recieve は
// 元々 browser JWT を **署名検証せず** rust-alc-api に転送し、X-Tenant-ID も
// unsigned decode で付与していた。偽造署名 / 別アプリの .ippoan.org 共有 cookie
// が backend に届き得る穴 (#290 穴 #3) を、forward 前段で introspect を叩いて
// 塞ぐ (署名 + APP_TENANT_ACL を auth-worker 側で検証)。

/**
 * 保護経路の前段で呼ぶ introspect gate。INTERNAL_SHARED_SECRET で auth-worker の
 * introspect を叩き、active (署名 OK + 許可テナント) でなければ auth-client が
 * 401 を throw する。binding 未設定は 503。origin は auth-client が
 * getRequestURL(event).origin から解決する (custom_domain の公開 origin)。
 */
export async function requireAuth(event: H3Event): Promise<void> {
  const env = cfEnv(event)
  const sharedSecret = await resolveSecret(env.INTERNAL_SHARED_SECRET)
  if (!sharedSecret) {
    throw createError({
      statusCode: 503,
      statusMessage: 'INTERNAL_SHARED_SECRET binding が未設定です',
    })
  }
  const authWorkerUrl =
    typeof env.NUXT_PUBLIC_AUTH_WORKER_URL === 'string' && env.NUXT_PUBLIC_AUTH_WORKER_URL
      ? env.NUXT_PUBLIC_AUTH_WORKER_URL
      : 'https://auth.ippoan.org'
  await introspectRequireAuth(event, { authWorkerUrl, sharedSecret })
}
