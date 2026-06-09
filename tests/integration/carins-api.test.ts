// @vitest-environment node
/**
 * carins ↔ rust-alc-api live integration test (Release Wave compatibility edge)
 *
 * docker-compose.test.yml で起動した rust-alc-api コンテナ (API_BASE_URL) を
 * 相手に、nuxt-pwa-carins が server/api/proxy 経由で叩く carins 系エンドポイント
 * (車検証 / ファイル / NFC タグ) を直接検証する。
 *
 * - API_BASE_URL 未設定時 (= 通常の `npm test` / unit job) は全 skip。
 *   CI の `API Integration` job だけが API_BASE_URL=http://localhost:18080 を
 *   渡して live で走らせ、その時 compat report が ci-dashboard に送られる。
 * - 認証は require_tenant ミドルウェアの X-Tenant-ID フォールバックを使う
 *   (carins の server proxy が JWT から tenant_id を抽出して付ける経路と等価)。
 * - シード ID は tests/fixtures/seed.sql と一致させること。
 */
import { describe, it, expect, beforeAll } from 'vitest'

const API_BASE = process.env.API_BASE_URL ?? ''
const TEST_TENANT_ID = '11111111-1111-1111-1111-111111111111'
const SEED_CAR_INSPECTION_ID = 901
const SEED_CAR_ID = 'CARINS-CAR-001'
const SEED_FILE_UUID = 'bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb'
// backend が normalize (小文字化 + コロン除去) して保存する正規化済みの形
const SEED_NFC_UUID = '04a1b2c3d4e5f6'
// 正規化前の raw 形。search に渡すと normalize_nfc_uuid で SEED_NFC_UUID に一致する
const SEARCH_NFC_RAW = '04:A1:B2:C3:D4:E5:F6'

function tenantHeaders(): Record<string, string> {
  return { 'X-Tenant-ID': TEST_TENANT_ID }
}

async function waitForApi(maxRetries = 60): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${API_BASE}/api/health`)
      if (res.ok) return
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`API not ready after ${maxRetries}s`)
}

describe.skipIf(!API_BASE)('carins ↔ rust-alc-api live integration', () => {
  beforeAll(async () => {
    await waitForApi()
  }, 90_000)

  it('GET /api/car-inspections/current — 現在有効な車検証一覧 (carInspections wrapper)', async () => {
    const res = await fetch(`${API_BASE}/api/car-inspections/current`, { headers: tenantHeaders() })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { carInspections: Array<Record<string, unknown>> }
    expect(Array.isArray(body.carInspections)).toBe(true)
    const ids = body.carInspections.map((c) => c.CarId)
    expect(ids).toContain(SEED_CAR_ID)
  })

  it('GET /api/car-inspections/{id} — ID 指定取得 (PascalCase カラムをそのまま返す)', async () => {
    const res = await fetch(`${API_BASE}/api/car-inspections/${SEED_CAR_INSPECTION_ID}`, {
      headers: tenantHeaders(),
    })
    expect(res.status).toBe(200)
    const row = (await res.json()) as Record<string, unknown>
    expect(row.CarId).toBe(SEED_CAR_ID)
    expect(row.ElectCertMgNo).toBe('ECMN-CARINS-001')
  })

  it('GET /api/car-inspection-files/current — 車検証ファイル current (files wrapper)', async () => {
    const res = await fetch(`${API_BASE}/api/car-inspection-files/current`, { headers: tenantHeaders() })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { files: unknown[] }
    expect(Array.isArray(body.files)).toBe(true)
  })

  it('GET /api/files — ファイル一覧 (files wrapper)', async () => {
    const res = await fetch(`${API_BASE}/api/files`, { headers: tenantHeaders() })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { files: Array<{ uuid: string; filename: string }> }
    expect(Array.isArray(body.files)).toBe(true)
    expect(body.files.some((f) => f.uuid === SEED_FILE_UUID)).toBe(true)
  })

  it('GET /api/files/recent — 最近のファイル (deleted_at IS NULL でテナントスコープ)', async () => {
    const res = await fetch(`${API_BASE}/api/files/recent`, { headers: tenantHeaders() })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { files: Array<{ uuid: string }> }
    expect(Array.isArray(body.files)).toBe(true)
    expect(body.files.some((f) => f.uuid === SEED_FILE_UUID)).toBe(true)
  })

  it('GET /api/nfc-tags — NFC タグ一覧', async () => {
    const res = await fetch(`${API_BASE}/api/nfc-tags`, { headers: tenantHeaders() })
    expect(res.status).toBe(200)
    const tags = (await res.json()) as Array<{ nfcUuid: string; carInspectionId: number }>
    expect(Array.isArray(tags)).toBe(true)
    expect(tags.some((t) => t.nfcUuid === SEED_NFC_UUID)).toBe(true)
  })

  it('GET /api/nfc-tags/search?uuid= — NFC UUID から車検証を逆引き (normalize 経由)', async () => {
    const url = `${API_BASE}/api/nfc-tags/search?uuid=${encodeURIComponent(SEARCH_NFC_RAW)}`
    const res = await fetch(url, { headers: tenantHeaders() })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      nfc_tag: { nfcUuid: string; carInspectionId: number }
      car_inspection: Record<string, unknown> | null
    }
    expect(body.nfc_tag.nfcUuid).toBe(SEED_NFC_UUID)
    expect(body.nfc_tag.carInspectionId).toBe(SEED_CAR_INSPECTION_ID)
    expect(body.car_inspection).not.toBeNull()
    expect(body.car_inspection?.CarId).toBe(SEED_CAR_ID)
  })

  it('X-Tenant-ID 無しは 401 (require_tenant が拒否)', async () => {
    const res = await fetch(`${API_BASE}/api/car-inspections/current`)
    expect(res.status).toBe(401)
  })
})
