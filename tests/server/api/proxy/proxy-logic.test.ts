import { describe, it } from 'vitest'

// proxy-logic.ts は @ippoan/auth-client/server (proxyCore) に集約され削除された
// (Refs ippoan/auth-worker#257)。挙動テストは lib 側 (auth-worker
// packages/auth-client test/proxyCore.test.ts) にある。
describe.skip('proxy-logic (removed — see @ippoan/auth-client/server proxyCore)', () => {
  it('placeholder', () => {})
})
