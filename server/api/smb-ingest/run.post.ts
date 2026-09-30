import { cfEnv } from '../../utils/cf-env'
import { requireAuth } from '../../utils/auth'
import { isSameOrigin, mapIngestResponse } from '../../utils/smb-ingest-logic'

/**
 * 「SMB から取り込む」: Service Binding SMB_INGEST 経由で smb-ingest の POST /run を叩く。
 * 許可の判断は server/utils/smb-ingest-logic.ts 冒頭を参照。
 * 応答は受付の可否 (202 / 409 / 502) だけで、上流の body は返さない。
 */
export default defineEventHandler(async (event) => {
  // CSRF 対策: 同一オリジンからの呼び出しだけ通す。
  const url = getRequestURL(event)
  if (!isSameOrigin(getHeader(event, 'origin'), getHeader(event, 'host') ?? url.host, url.protocol.replace(':', ''))) {
    throw createError({ statusCode: 403, statusMessage: 'forbidden origin' })
  }

  await requireAuth(event)

  const smbIngest = cfEnv(event).SMB_INGEST as { fetch: typeof fetch } | undefined
  if (!smbIngest) {
    throw createError({
      statusCode: 503,
      statusMessage: 'SMB_INGEST service binding が未設定です',
    })
  }

  const dryRun = String(getQuery(event).dryRun ?? '') === '1'
  const res = await smbIngest.fetch(`https://smb-ingest/run${dryRun ? '?dry_run=1' : ''}`, {
    method: 'POST',
  })
  const text = await res.text().catch(() => '')
  const mapped = mapIngestResponse(res.status, text)

  if (mapped.status === 502) {
    // 上流の status と body の先頭だけ残す (切り分け用。body 全体は残さない)。
    console.error(`smb-ingest /run failed: status=${res.status} body=${text.slice(0, 200)}`)
    throw createError({ statusCode: 502, statusMessage: 'smb-ingest の呼び出しに失敗しました' })
  }

  setResponseStatus(event, mapped.status)
  return mapped.body
})
