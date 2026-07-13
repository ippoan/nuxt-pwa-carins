// デプロイ後にブラウザ / Service Worker が古い JS バンドルを配り続ける問題への
// version-tag ベースのキャッシュバスト (Refs ippoan/auth-worker#379)。
//
//   __APP_BUILD_VERSION__          = このバンドルがビルドされた版
//                                    (nuxt.config の Vite define で焼込み・不変)
//   runtimeConfig.public.appVersion = 現在デプロイ中のサーバの版
//                                    (SSR 由来・毎リクエスト新鮮)
//
// 両者が食い違う = 古いバンドルを掴んでいる → SW / CacheStorage を破棄し 1 回だけ
// reload する。reload 後は build == server に収束するので再発火しない。加えて
// sessionStorage の per-server-version ガードで「1 セッション 1 回」に抑え、万一
// 収束しなくても無限 reload を物理的に不可能にする (login ループ再発防止と同じ発想)。

declare const __APP_BUILD_VERSION__: string

export default defineNuxtPlugin(() => {
  const build = String(__APP_BUILD_VERSION__ ?? '').trim()
  const server = String(useRuntimeConfig().public.appVersion ?? '').trim()

  // 版が取れない / dev ビルド / 既に一致 → 何もしない
  if (!build || !server || build === 'dev' || server === 'dev' || build === server) return

  // 診断: 発火の直接証拠を残す (③ 検証・本番のキャッシュバスト観測用)
  console.info('[version-reload] stale build detected', { build, server })

  // ループ防止: この server 版には既に 1 回 reload 済みなら二度としない
  const guardKey = `carins:freshreload:${server}`
  try {
    if (window.sessionStorage.getItem(guardKey)) return
    window.sessionStorage.setItem(guardKey, '1')
  } catch {
    // sessionStorage 不可 (private mode 等) の時は安全側で何もしない (loop より stale を選ぶ)
    return
  }

  // SW / CacheStorage を破棄してから hard reload。PWA precache を確実に無効化する。
  const nuke = async (): Promise<void> => {
    try {
      const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? []
      await Promise.all(regs.map((r) => r.unregister()))
    } catch {
      // 破棄失敗でも reload は行う
    }
    try {
      const keys = (await window.caches?.keys?.()) ?? []
      await Promise.all(keys.map((k) => caches.delete(k)))
    } catch {
      // 破棄失敗でも reload は行う
    }
    console.info('[version-reload] reloading to converge', { build, server })
    window.location.reload()
  }
  void nuke()
})
