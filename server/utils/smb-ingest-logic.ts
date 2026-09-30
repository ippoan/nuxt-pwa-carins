// smb-ingest Worker の POST /run を叩く /api/smb-ingest/run の純粋ロジック。
//
// 許可の判断: requireAuth を通れば誰でも押せる。効果は smb-ingest の取り込みを早めるだけで、
// 取り込み先 tenant は auth-worker 側で固定、応答は受付の可否だけなので他 tenant への情報漏れは無い。
// 連打は smb-ingest の lease (409) が同時実行を止める。

export type IngestResult =
  | { status: 202; body: { status: 'accepted'; dryRun: boolean } }
  | { status: 409; body: { status: 'busy' } }
  | { status: 502; body: { status: 'error' } }

/** 上流 (smb-ingest) の status と body から carins の応答を決める。上流の body は返さない。 */
export function mapIngestResponse(upstreamStatus: number, rawBody: string): IngestResult {
  if (upstreamStatus === 409) return { status: 409, body: { status: 'busy' } }
  if (upstreamStatus === 202) {
    try {
      const parsed = JSON.parse(rawBody) as { dry_run?: unknown } | null
      return { status: 202, body: { status: 'accepted', dryRun: parsed?.dry_run === true } }
    } catch {
      return { status: 502, body: { status: 'error' } }
    }
  }
  return { status: 502, body: { status: 'error' } }
}

/** Origin ヘッダが carins 自身のオリジン (Host から組み立てる) と一致するか。欠落は不一致。 */
export function isSameOrigin(origin: string | undefined, host: string | undefined, proto: string): boolean {
  if (!origin || !host) return false
  return origin === `${proto}://${host}`
}
