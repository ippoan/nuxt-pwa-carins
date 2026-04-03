/**
 * サーバーサイド認証ミドルウェア
 *
 * logi_auth_token cookie がなければ auth-worker のログイン画面へ 302 リダイレクト。
 * HTML 描画前にリダイレクトするため、未認証時にページが一瞬見えるのを防ぐ。
 *
 * LINE WORKS 自動ログイン:
 * - ?lw=<domain> → auth-worker OAuth 直接リダイレクト（ログイン画面スキップ）
 * - lw_domain cookie → 次回以降も自動ログイン
 * - ?lw_callback → OAuth コールバック戻り（リダイレクトスキップ）
 */

import { resolveAuthAction } from './auth-logic'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()

  const url = getRequestURL(event)

  const action = resolveAuthAction(
    {
      apiBackend: config.public.apiBackend as string,
      authWorkerUrl: config.public.authWorkerUrl as string,
    },
    {
      pathname: url.pathname,
      origin: url.origin,
      hostname: url.hostname,
      searchParams: url.searchParams,
      cookie: getCookie(event, 'logi_auth_token'),
      lwDomainCookie: getCookie(event, 'lw_domain'),
    },
  )

  const cookieOpts = (domain: string | undefined) => ({
    domain,
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
    secure: true,
    sameSite: 'lax' as const,
  })

  switch (action.type) {
    case 'pass':
      return
    case 'set-cookie-and-pass':
      setCookie(event, action.name, action.value, cookieOpts(action.domain))
      return
    case 'set-cookie-and-redirect':
      setCookie(event, action.name, action.value, cookieOpts(action.domain))
      return sendRedirect(event, action.redirectUrl)
    case 'redirect':
      return sendRedirect(event, action.redirectUrl)
  }
})
