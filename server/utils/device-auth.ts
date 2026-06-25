import type { H3Event } from 'h3'
import { introspectToken } from '@ippoan/auth-client/server'

/**
 * device-token (Phase 2 / ohishi-exp/smb-watch#1) の検証 gate。
 *
 * smb-watch が `Authorization: Bearer <device JWT>` で叩く。検証は auth-worker の
 * `/auth/introspect` に委譲するが、公開 HTTP ではなく **CF service binding
 * (`AUTH_WORKER`, worker-to-worker)** 経由で内部的に叩く。
 *
 * tenant_id は **introspect が返した検証済みの値**を使う(client が送る
 * X-Tenant-ID は信頼しない)。本 Worker は JWT_SECRET を持たないので署名検証は
 * auth-worker 側、ここは active + 検証済 tenant_id を受け取るだけ。
 */

interface ServiceBinding {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

/** Secrets Store binding (`.get()`) / 文字列 のいずれでも値を取り出す。 */
async function resolveSecret(binding: unknown): Promise<string | null> {
  if (typeof binding === 'string') return binding
  if (binding && typeof (binding as { get?: unknown }).get === 'function') {
    return (await (binding as { get(): Promise<string> }).get()) ?? null
  }
  return null
}

function cfEnv(event: H3Event): Record<string, unknown> {
  return (event.context.cloudflare as { env?: Record<string, unknown> } | undefined)?.env ?? {}
}

/**
 * Bearer device JWT を auth-worker introspect (service binding 経由) で検証し、
 * **検証済み tenant_id** を返す。active でなければ 401、binding/secret 未設定は 503。
 */
export async function requireDeviceTenant(event: H3Event): Promise<string> {
  const env = cfEnv(event)

  const sharedSecret = await resolveSecret(env.INTERNAL_SHARED_SECRET)
  if (!sharedSecret) {
    throw createError({ statusCode: 503, statusMessage: 'INTERNAL_SHARED_SECRET binding が未設定です' })
  }

  const binding = env.AUTH_WORKER as ServiceBinding | undefined
  if (!binding || typeof binding.fetch !== 'function') {
    throw createError({ statusCode: 503, statusMessage: 'AUTH_WORKER service binding が未設定です' })
  }

  const authHeader = getHeader(event, 'authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const origin = getRequestURL(event).origin
  const authWorkerUrl =
    typeof env.NUXT_PUBLIC_AUTH_WORKER_URL === 'string' && env.NUXT_PUBLIC_AUTH_WORKER_URL
      ? env.NUXT_PUBLIC_AUTH_WORKER_URL
      : 'https://auth.ippoan.org'

  const result = await introspectToken({
    authWorkerUrl,
    sharedSecret,
    token,
    origin,
    // 公開経路を介さず service binding (内部) で introspect を叩く。
    fetchImpl: (url: RequestInfo | URL, init?: RequestInit) => binding.fetch(url, init),
  })

  if (!result.active || !result.tenant_id) {
    throw createError({ statusCode: 401, statusMessage: 'invalid device token' })
  }
  return result.tenant_id
}
