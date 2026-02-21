/**
 * Auth プラグイン (ブラウザ専用)
 *
 * アプリ起動時に JWT を復元/検証し、未認証ならログイン画面へリダイレクト
 * enforce: 'pre' で grpc-client.client.ts より先に実行される
 *
 * LINE WORKS 自動ログイン:
 * ?lw=<domain> パラメータを検出してドメインを保存し、
 * redirectToLogin() が LINE WORKS OAuth を直接開始する
 *
 * WOFF SDK 認証:
 * ?woff&lw=<domain> → WOFF SDK 動的ロード → DB から woff_id 解決 → JWT 取得
 * WOFF コンテナ外 or WOFF ID 未設定時は OAuth フローにフォールバック
 */

/** WOFF SDK を動的にロード */
function loadWoffSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof woff !== 'undefined') { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://static.worksmobile.net/static/wm/woff/edge/3.6/sdk.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load WOFF SDK'))
    document.head.appendChild(script)
  })
}

export default defineNuxtPlugin({
  name: 'auth',
  enforce: 'pre',
  async setup() {
    const config = useRuntimeConfig()
    const backend = config.public.apiBackend as string

    // rust-logi 以外では何もしない
    if (backend !== 'rust-logi') return

    const { consumeFragment, loadFromStorage, recoverFromCookie, isAuthenticated, redirectToLogin, authState, saveLwDomain, getLwDomain } = useAuth()

    // 0. ?lw=<domain> パラメータ → LINE WORKS ドメイン保存
    const urlParams = new URLSearchParams(window.location.search)
    const lwParam = urlParams.get('lw')
    if (lwParam) {
      saveLwDomain(lwParam)
    }

    // 0.5. ?woff → WOFF SDK を動的ロードして認証を試行
    if (urlParams.has('woff')) {
      const domain = lwParam || getLwDomain()
      if (domain) {
        try {
          const authWorkerUrl = config.public.authWorkerUrl as string
          // DB から WOFF ID を解決
          const configRes = await fetch(`${authWorkerUrl}/auth/woff-config?domain=${encodeURIComponent(domain)}`)
          if (configRes.ok) {
            const configData = await configRes.json() as { woffId: string }
            // WOFF SDK をオンデマンドでロード
            await loadWoffSdk()
            await woff.init({ woffId: configData.woffId })
            if (woff.isInClient()) {
              const accessToken = woff.getAccessToken()
              if (accessToken) {
                const authRes = await fetch(`${authWorkerUrl}/auth/woff`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    accessToken,
                    domainId: domain,
                    redirectUri: window.location.origin,
                  }),
                })
                if (authRes.ok) {
                  const data = await authRes.json() as { token: string; expiresAt: string; orgId: string }
                  const expiresAt = Math.floor(new Date(data.expiresAt).getTime() / 1000)
                  authState.value = { token: data.token, orgId: data.orgId, expiresAt }
                  localStorage.setItem('logi_auth', JSON.stringify(authState.value))
                  const _pd = (() => { const p = window.location.hostname.split('.'); return p.length > 2 ? '.' + p.slice(-2).join('.') : window.location.hostname })()
                  document.cookie = `logi_auth_token=${data.token}; Domain=${_pd}; path=/; max-age=86400; secure; samesite=lax`
                  // URL クリーンアップ
                  history.replaceState(null, '', window.location.pathname)
                  return
                }
              }
            }
          }
        } catch (e) {
          console.warn('WOFF auth failed, falling back to OAuth', e)
        }
      }
      // WOFF 認証失敗 → ?woff を除去して通常 OAuth フローへ
      urlParams.delete('woff')
      urlParams.delete('lw')
      const newSearch = urlParams.toString()
      const cleanUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash
      history.replaceState(null, '', cleanUrl)
    } else if (lwParam) {
      // ?lw パラメータのみの場合は URL から除去
      urlParams.delete('lw')
      const newSearch = urlParams.toString()
      const cleanUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash
      history.replaceState(null, '', cleanUrl)
    }

    // 1. URL fragment からトークン取得を試行（auth-worker リダイレクト後）
    const foundInFragment = consumeFragment()

    if (foundInFragment) {
      // lw_domain cookie → localStorage 同期（サーバーミドルウェアが設定した cookie を永続化）
      const lwCookie = document.cookie.split('; ').find(c => c.startsWith('lw_domain='))
      if (lwCookie) {
        const domain = decodeURIComponent(lwCookie.split('=')[1] || '')
        if (domain) saveLwDomain(domain)
      }
      // ?lw_callback パラメータを URL からクリーンアップ
      const currentUrl = new URL(window.location.href)
      if (currentUrl.searchParams.has('lw_callback')) {
        currentUrl.searchParams.delete('lw_callback')
        const cleanPath = currentUrl.pathname + (currentUrl.search || '')
        history.replaceState(null, '', cleanPath)
      }
    }

    if (!foundInFragment) {
      // 2. localStorage から復元
      loadFromStorage()
    }

    // 2.5. Cookie からの復旧（トップページや他アプリで認証済みの場合）
    if (!isAuthenticated.value) {
      recoverFromCookie()
    }

    // 3. 未認証 → ログイン画面へ（redirectToLogin 内で lw_domain をチェック）
    if (!isAuthenticated.value) {
      redirectToLogin()
      return
    }

    // 4. 認証済み → 期限切れタイマーを設定
    const setupExpiryTimer = () => {
      const state = authState.value
      if (!state) return
      const now = Math.floor(Date.now() / 1000)
      const msUntilExpiry = (state.expiresAt - now) * 1000
      if (msUntilExpiry > 0) {
        setTimeout(() => {
          if (!isAuthenticated.value) {
            redirectToLogin()
          }
        }, msUntilExpiry)
      }
    }
    setupExpiryTimer()
  },
})
