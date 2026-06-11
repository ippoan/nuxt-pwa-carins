/**
 * 認証ミドルウェアのコアロジック
 *
 * 実装は @ippoan/auth-client/server に集約済み (Refs ippoan/auth-worker#257、
 * nuxt-ichibanboshi との相互コピーを 1 本化)。ここは既存 import /
 * Nitro auto-import 互換のための re-export。
 */
export {
  getParentDomainFromHost,
  resolveAuthAction,
  checkTenantId,
  type AuthConfig,
  type AuthRequest,
  type AuthAction,
  type TenantCheckResult,
} from '@ippoan/auth-client/server'
