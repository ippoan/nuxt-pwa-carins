/**
 * サーバーサイド認証ミドルウェア
 *
 * logi_auth_token cookie がなければ auth-worker のログイン画面へ 302 リダイレクト。
 * HTML 描画前にリダイレクトするため、未認証時にページが一瞬見えるのを防ぐ。
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const backend = config.public.apiBackend as string
  if (backend !== 'rust-logi') return

  // auth-worker からのコールバック（fragment 付き）はスルー
  const url = getRequestURL(event)
  if (url.pathname.startsWith('/api/')) return

  const cookie = getCookie(event, 'logi_auth_token')
  if (cookie) return

  const authWorkerUrl = config.public.authWorkerUrl as string
  if (!authWorkerUrl) return

  const redirectUri = `${url.origin}/`
  return sendRedirect(event, `${authWorkerUrl}/login?redirect_uri=${encodeURIComponent(redirectUri)}`)
})
