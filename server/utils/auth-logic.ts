/**
 * 認証ミドルウェアのコアロジック（テスタブル）
 */

/** ホスト名から親ドメインを取得（cross-subdomain cookie 用） */
export function getParentDomainFromHost(hostname: string): string | undefined {
  const parts = hostname.split('.')
  return parts.length > 2 ? '.' + parts.slice(-2).join('.') : undefined
}

export interface AuthConfig {
  apiBackend: string
  authWorkerUrl: string
}

export interface AuthRequest {
  pathname: string
  origin: string
  hostname: string
  searchParams: URLSearchParams
  cookie: string | undefined         // logi_auth_token
  lwDomainCookie: string | undefined  // lw_domain
}

export type AuthAction =
  | { type: 'pass' }
  | { type: 'set-cookie-and-pass'; name: string; value: string; domain: string | undefined }
  | { type: 'set-cookie-and-redirect'; name: string; value: string; domain: string | undefined; redirectUrl: string }
  | { type: 'redirect'; redirectUrl: string }

export function resolveAuthAction(config: AuthConfig, req: AuthRequest): AuthAction {
  if (config.apiBackend !== 'rust-logi' && config.apiBackend !== 'rust-alc-api') {
    return { type: 'pass' }
  }

  if (req.pathname.startsWith('/api/')) return { type: 'pass' }
  if (req.cookie) return { type: 'pass' }
  if (!config.authWorkerUrl) return { type: 'pass' }
  if (req.searchParams.has('lw_callback')) return { type: 'pass' }
  if (req.searchParams.has('logout')) return { type: 'pass' }

  const domain = getParentDomainFromHost(req.hostname)
  const redirectUri = `${req.origin}/?lw_callback=1`

  // ?woff — WOFF SDK
  if (req.searchParams.has('woff')) {
    const lwParam = req.searchParams.get('lw')
    if (lwParam) {
      return { type: 'set-cookie-and-pass', name: 'lw_domain', value: lwParam, domain }
    }
    return { type: 'pass' }
  }

  // ?lw=<domain> — LINE WORKS 自動ログイン
  const lwParam = req.searchParams.get('lw')
  if (lwParam) {
    const params = new URLSearchParams({ domain: lwParam, redirect_uri: redirectUri })
    return {
      type: 'set-cookie-and-redirect',
      name: 'lw_domain',
      value: lwParam,
      domain,
      redirectUrl: `${config.authWorkerUrl}/api/auth/lineworks/redirect?${params.toString()}`,
    }
  }

  // lw_domain cookie — 自動ログイン
  if (req.lwDomainCookie) {
    const params = new URLSearchParams({ domain: req.lwDomainCookie, redirect_uri: redirectUri })
    return {
      type: 'redirect',
      redirectUrl: `${config.authWorkerUrl}/api/auth/lineworks/redirect?${params.toString()}`,
    }
  }

  // デフォルト
  return {
    type: 'redirect',
    redirectUrl: `${config.authWorkerUrl}/login?redirect_uri=${encodeURIComponent(redirectUri)}`,
  }
}
