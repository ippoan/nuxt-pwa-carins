// @vitest-environment node
/**
 * rust-alc-api live integration test (Release Wave compatibility edge)
 *
 * docker-compose.test.yml で起動した rust-alc-api コンテナ (API_BASE_URL) を相手に回す。
 *
 * 車検証・ファイル・NFC タグの口は ippoan/alc-carins-worker へ移り、rust-alc-api から消えた
 * (W3、Refs ippoan/rust-alc-api#680。本番は auth-worker の振り分けで worker に回る)。
 * nuxt-pwa-carins が rust-alc-api に頼る口はもう無いので、ここでは rust-alc-api が起動して
 * 応答することだけを確かめる (compat report は今までどおり ci-dashboard に送られる)。
 *
 * - API_BASE_URL 未設定時 (= 通常の `npm test` / unit job) は全 skip。
 *   CI の `API Integration` job だけが API_BASE_URL=http://localhost:18080 を渡して live で走らせる。
 * - ファイルを丸ごと消すと `npx vitest run tests/integration/` が「テストのファイルが無い」で落ちるので残す。
 */
import { describe, it, expect, beforeAll } from 'vitest'

const API_BASE = process.env.API_BASE_URL ?? ''

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

describe.skipIf(!API_BASE)('rust-alc-api live integration (health)', () => {
  beforeAll(async () => {
    await waitForApi()
  }, 90_000)

  it('GET /api/health — rust-alc-api が起動して応答する', async () => {
    const res = await fetch(`${API_BASE}/api/health`)
    expect(res.ok).toBe(true)
  })
})
