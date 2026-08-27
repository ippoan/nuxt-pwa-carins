// 正典は @ippoan/mcp-cf-workers/auth/secret (v0.4.0) の resolveSecret。
// あちらは framework-agnostic で、!binding → null / .get() の try/catch /
// 空文字 → null と、こちらより堅い。ただし peerDeps が hono・agents・
// @modelcontextprotocol/* ・jose・zod と重く、exports が生の .ts を指すため
// build.transpile への追加も要る。agents が vite>=6 を要求し carins の
// vitest (vite5) と衝突する既知の穴もあるので、本 repo では採用していない。
// cfEnv 相当はあちらに存在しない (Hono 前提で c.env を直接使う設計)。
// 寄せ直すときはこのファイルだけを差し替えれば済む。
import type { H3Event } from 'h3'

/**
 * Cloudflare Workers の env binding を H3Event から取り出す。
 * nitro preset `cloudflare-module` では `event.context.cloudflare.env` に載る。
 */
export function cfEnv(event: H3Event): Record<string, unknown> {
  return (event.context.cloudflare as { env?: Record<string, unknown> } | undefined)?.env ?? {}
}

/** Secrets Store binding (`.get()`) / 文字列 のいずれでも値を取り出す。 */
export async function resolveSecret(binding: unknown): Promise<string | null> {
  if (typeof binding === 'string') return binding
  if (binding && typeof (binding as { get?: unknown }).get === 'function') {
    return (await (binding as { get(): Promise<string> }).get()) ?? null
  }
  return null
}
