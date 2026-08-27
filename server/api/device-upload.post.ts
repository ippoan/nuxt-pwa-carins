import type { H3Event } from 'h3'
import { requireDeviceTenant } from '../utils/device-auth'

/**
 * device-token 専用ファイル受信 API (Phase 2 / ohishi-exp/smb-watch#1)。
 *
 * 人間用の `/api/recieve` (cookie / share_target) とは分離した **machine 経路**。
 * smb-watch が `Authorization: Bearer <device JWT>` + multipart で叩く。
 *
 *   1. requireDeviceTenant — auth-worker introspect (service binding) で device JWT を
 *      検証し、body 読取前に 401 で弾く (defense-in-depth)
 *   2. multipart を base64 化し、**AUTH_WORKER service binding 経由**で auth-worker の
 *      `/device-data-proxy/api/files` に forward。受け取った device JWT をそのまま渡す
 *
 * rust-alc-api の Cloud Run は `--no-allow-unauthenticated` でロックダウンされており、
 * Google 署名の OIDC ID token が無い呼び出しは platform 層で 403 になる。SA key は
 * auth-worker にしか bind されていないので carins は自力で token を作れない。
 * introspect / ACL / OIDC mint / tenant 注入はすべて auth-worker に集約する
 * (#434 方式 B。読み取り経路の `server/api/proxy/[...path].ts` と同じ考え方)。
 */

function cfEnv(event: H3Event): Record<string, unknown> {
  return (event.context.cloudflare as { env?: Record<string, unknown> } | undefined)?.env ?? {}
}

export default defineEventHandler(async (event) => {
  // 認証 gate (Bearer device JWT を introspect 検証)。body 読取前に弾く。
  // 検証済み tenant_id は forward しない (下記の通り auth-worker が注入する)。
  await requireDeviceTenant(event)

  const ap = await readMultipartFormData(event)
  const file = ap?.find((p) => p.filename)
  if (!file) {
    throw createError({ statusCode: 400, statusMessage: 'no file part' })
  }

  const env = cfEnv(event)
  const authWorker = env.AUTH_WORKER as { fetch: typeof fetch } | undefined
  if (!authWorker) {
    // 書き込み経路も AUTH_WORKER service binding 経由の forward が必須 (fail-closed)。
    throw createError({
      statusCode: 503,
      statusMessage: 'AUTH_WORKER service binding が未設定です',
    })
  }

  const authWorkerUrl =
    typeof env.NUXT_PUBLIC_AUTH_WORKER_URL === 'string' && env.NUXT_PUBLIC_AUTH_WORKER_URL
      ? env.NUXT_PUBLIC_AUTH_WORKER_URL
      : 'https://auth.ippoan.org'

  const content = Buffer.from(file.data).toString('base64')

  const res = await authWorker.fetch(`${authWorkerUrl}/device-data-proxy/api/files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 受け取った device JWT をそのまま渡す。auth-worker が検証し、
      // OIDC mint と tenant 注入を代行する。
      Authorization: getHeader(event, 'authorization') || '',
      // ここで tenant header を **付けない**のは設計上の要点。tenant は
      // device-data-proxy が device JWT の payload.tenant_id から注入する。
      // client 由来の値を載せると詐称の口になり、#434 が塞いだ穴を開け直す。
    },
    body: JSON.stringify({
      filename: file.filename || 'unnamed',
      type: file.type || 'application/octet-stream',
      content,
    }),
  })

  if (!res.ok) {
    // 上流の status と body を必ず残す。502 としか出ないと 403 (Cloud Run IAM) か
    // 401 (JWT) か forbidden (ACL) かの切り分けができない。
    console.error('device-upload forward failed:', res.status, await res.text())
    throw createError({ statusCode: 502, statusMessage: 'backend upload failed' })
  }

  const body = (await res.json()) as { uuid?: string }
  return { uuid: body?.uuid || '', message: '送信完了しました' }
})
