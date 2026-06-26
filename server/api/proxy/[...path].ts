/**
 * REST API プロキシ
 * /api/proxy/* → auth-worker /alc-proxy/* → rust-alc-api の /api/*
 *
 * #434 step 3 (方式 B): introspect / ACL / OIDC mint / identity 注入を
 * すべて auth-worker `/alc-proxy/*` に集約し、consumer は
 * @ippoan/auth-client/server の createAuthWorkerProxyHandler で
 * **service binding (AUTH_WORKER) に thin-forward** するだけにする。
 * 旧 createIdentityProxyHandler (方式 A: consumer が自前で introspect +
 * OIDC mint、run.invoker SA key を consumer が保持) を置換。SA key を
 * consumer から排除し、方式変更を auth-worker 1 repo に閉じる。
 *
 * consumer が付けるのは X-Alc-Proxy-Secret (= INTERNAL_SHARED_SECRET、
 * consumer proof) + X-Alc-Proxy-Origin + browser JWT のみ。auth-worker 側
 * (ippoan/auth-worker#308) が X-Alc-Proxy-Secret を constant-time 検証して
 * から JWT 検証 + ACL + OIDC mint + X-Tenant-ID/X-User-* 注入を行う。
 *
 * INTERNAL_SHARED_SECRET は Secrets Store binding (.get()) のため route 側で
 * resolve してから渡す。AUTH_WORKER service binding は方式 B では必須。
 */
import type { H3Event } from 'h3'
import { createAuthWorkerProxyHandler } from '@ippoan/auth-client/server'

function cfEnv(event: H3Event): Record<string, unknown> {
  return (event.context.cloudflare as { env?: Record<string, unknown> } | undefined)?.env ?? {}
}

/** Secrets Store binding (`.get()`) / 文字列 のいずれでも値を取り出す。 */
async function resolveSecret(binding: unknown): Promise<string | null> {
  if (typeof binding === 'string') return binding
  if (binding && typeof (binding as { get?: unknown }).get === 'function') {
    return (await (binding as { get(): Promise<string> }).get()) ?? null
  }
  return null
}

export default defineEventHandler(async (event) => {
  const env = cfEnv(event)
  const sharedSecret = await resolveSecret(env.INTERNAL_SHARED_SECRET)
  if (!sharedSecret) {
    throw createError({
      statusCode: 503,
      statusMessage: 'INTERNAL_SHARED_SECRET binding が未設定です',
    })
  }
  const authWorker = env.AUTH_WORKER as { fetch: typeof fetch } | undefined
  if (!authWorker) {
    // 方式 B は AUTH_WORKER service binding 経由の forward が必須 (fail-closed)。
    throw createError({
      statusCode: 503,
      statusMessage: 'AUTH_WORKER service binding が未設定です',
    })
  }

  const proxy = createAuthWorkerProxyHandler({
    sharedSecret,
    // AUTH_WORKER service binding に /alc-proxy/* を丸投げ (worker-to-worker, in-process)。
    authWorkerFetch: () => authWorker.fetch.bind(authWorker),
  })
  return proxy(event)
})
