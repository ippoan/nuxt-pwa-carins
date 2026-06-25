import { requireDeviceTenant } from '../utils/device-auth'

/**
 * device-token 専用ファイル受信 API (Phase 2 / ohishi-exp/smb-watch#1)。
 *
 * 人間用の `/api/recieve` (cookie / share_target) とは分離した **machine 経路**。
 * smb-watch が `Authorization: Bearer <device JWT>` + multipart で叩く。
 *
 *   1. requireDeviceTenant — auth-worker introspect (service binding) で device JWT を
 *      検証し、**検証済み tenant_id** を得る (client の X-Tenant-ID は信頼しない)
 *   2. multipart を base64 化し rust-alc-api `/api/files` に forward。X-Tenant-ID は
 *      検証済み tenant_id を server 側で注入 (= box は tenant を詐称できない)
 *
 * Google を runtime から排除した経路。署名検証 / ACL は auth-worker 側。
 */
export default defineEventHandler(async (event) => {
  // 認証 gate (Bearer device JWT を introspect 検証 → 検証済 tenant_id)。body 読取前に弾く。
  const tenantId = await requireDeviceTenant(event)

  const ap = await readMultipartFormData(event)
  const file = ap?.find((p) => p.filename)
  if (!file) {
    throw createError({ statusCode: 400, statusMessage: 'no file part' })
  }

  const config = useRuntimeConfig(event)
  const backendUrl =
    config.alcApiUrl || 'https://rust-alc-api-747065218280.asia-northeast1.run.app'

  const content = Buffer.from(file.data).toString('base64')

  try {
    const res = await $fetch<{ uuid?: string }>(`${backendUrl}/api/files`, {
      method: 'POST',
      body: JSON.stringify({
        filename: file.filename || 'unnamed',
        type: file.type || 'application/octet-stream',
        content,
      }),
      headers: {
        'Content-Type': 'application/json',
        // 検証済み tenant_id のみを注入。client 由来の X-Tenant-ID は使わない。
        'X-Tenant-ID': tenantId,
      },
    })
    return { uuid: res?.uuid || '', message: '送信完了しました' }
  } catch (e) {
    console.error('device-upload forward failed:', e)
    throw createError({ statusCode: 502, statusMessage: 'backend upload failed' })
  }
})
